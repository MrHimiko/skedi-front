// File: src/panels/user/plugins/dashboard/services/calendar.js

import { api } from '@utils/api';
import { UserStore } from '@stores/user';
import { storage } from '@utils/storage';
import { BookingsService } from '@user_bookings/services/bookings';

/**
 * CalendarService - Enhanced service with timezone support for dashboard calendar
 * Now fetches ALL event types: bookings + external events + availability
 */
export class CalendarService {
    
    // Cache for out of office data (only refreshed on page load)
    static availabilityCache = {
        data: null,
        timestamp: null,
        expires: 30 * 60 * 1000 // 30 minutes cache
    };

    /**
     * Get user's timezone preference or browser default
     */
    static getUserTimezone() {
        const savedTimezone = storage.get('user.timezone');
        return savedTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    }
    
    /**
     * Convert server time (UTC) to user's timezone
     */
    static convertToUserTimezone(dateString) {
        if (!dateString) return null;
        
        // Server format: "2025-04-21 05:30:00" (treated as UTC)
        const [datePart, timePart] = dateString.split(' ');
        
        // Parse as UTC
        const utcDate = new Date(`${datePart}T${timePart}Z`);
        
        return utcDate; // JavaScript Date automatically handles timezone conversion when displayed
    }
    
    /**
     * Get ALL events for a specific date range - bookings + external + availability
     */
    static async getWeekEvents(weekStartDate) {
        try {
            console.log('🔍 CalendarService.getWeekEvents called with:', weekStartDate);
            
            // FIXED: Calculate proper end date based on current view
            // This will be overridden by the calling function if needed
            const weekStart = new Date(weekStartDate);
            weekStart.setHours(0, 0, 0, 0);
            
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);
            weekEnd.setHours(23, 59, 59, 999);
            
            console.log('📅 Week range:', {
                start: weekStart.toISOString(),
                end: weekEnd.toISOString()
            });

            // Get current user ID
            const userStore = UserStore();
            const userId = userStore.getId();
            console.log('👤 User ID:', userId);

            const startTimeISO = weekStart.toISOString();
            const endTimeISO = weekEnd.toISOString();

            // Fetch ALL event types in parallel for better performance
            const [bookingsData, externalEventsData, availabilityData] = await Promise.allSettled([
                this.fetchBookings(userId, startTimeISO, endTimeISO),
                this.fetchExternalEvents(startTimeISO, endTimeISO),
                this.fetchAvailabilityEvents() // FIXED: Cached, no date params needed
            ]);

            console.log('🔄 All API calls completed');

            // Process each data source
            let allEvents = [];

            // 1. Process internal bookings
            if (bookingsData.status === 'fulfilled' && bookingsData.value) {
                const bookingEvents = bookingsData.value.map(booking => 
                    this.transformBookingToEvent(booking)
                );
                console.log('📚 Booking events:', bookingEvents.length);
                allEvents.push(...bookingEvents);
            } else {
                console.warn('❌ Failed to fetch bookings:', bookingsData.reason);
            }

            // 2. Process external events (Google Calendar, Outlook, etc.)
            if (externalEventsData.status === 'fulfilled' && externalEventsData.value) {
                const processedExternalEvents = this.processExternalEvents(
                    externalEventsData.value,
                    allEvents // Pass existing bookings for duplicate detection
                );
                console.log('🌐 External events:', processedExternalEvents.length);
                allEvents.push(...processedExternalEvents);
            } else {
                console.warn('❌ Failed to fetch external events:', externalEventsData.reason);
            }

            // 3. Process availability events (Vacation, Out of Office, etc.)
            if (availabilityData.status === 'fulfilled' && availabilityData.value) {
                // FIXED: Filter and expand multi-day availability events for the requested range
                const availabilityEvents = this.processAvailabilityEvents(
                    availabilityData.value,
                    weekStart,
                    weekEnd
                );
                console.log('🏖️ Availability events:', availabilityEvents.length);
                allEvents.push(...availabilityEvents);
            } else {
                console.warn('❌ Failed to fetch availability events:', availabilityData.reason);
            }

            console.log('🎯 Total events combined:', allEvents.length);
            return allEvents;

        } catch (error) {
            console.error('💥 Error in CalendarService.getWeekEvents:', error);
            throw error;
        }
    }

    /**
     * FIXED: Get events for a specific date range (supports any range, not just weeks)
     */
    static async getEventsForDateRange(startDate, endDate) {
        try {
            console.log('🔍 CalendarService.getEventsForDateRange called:', {
                start: startDate.toISOString(),
                end: endDate.toISOString()
            });

            const userStore = UserStore();
            const userId = userStore.getId();

            const startTimeISO = startDate.toISOString();
            const endTimeISO = endDate.toISOString();

            // Fetch ALL event types in parallel
            const [bookingsData, externalEventsData, availabilityData] = await Promise.allSettled([
                this.fetchBookings(userId, startTimeISO, endTimeISO),
                this.fetchExternalEvents(startTimeISO, endTimeISO),
                this.fetchAvailabilityEvents() // Cached
            ]);

            // Process each data source
            let allEvents = [];

            // 1. Process internal bookings
            if (bookingsData.status === 'fulfilled' && bookingsData.value) {
                const bookingEvents = bookingsData.value.map(booking => 
                    this.transformBookingToEvent(booking)
                );
                allEvents.push(...bookingEvents);
            }

            // 2. Process external events
            if (externalEventsData.status === 'fulfilled' && externalEventsData.value) {
                const processedExternalEvents = this.processExternalEvents(
                    externalEventsData.value,
                    allEvents
                );
                allEvents.push(...processedExternalEvents);
            }

            // 3. Process availability events
            if (availabilityData.status === 'fulfilled' && availabilityData.value) {
                const availabilityEvents = this.processAvailabilityEvents(
                    availabilityData.value,
                    startDate,
                    endDate
                );
                allEvents.push(...availabilityEvents);
            }

            console.log('🎯 Total events for date range:', allEvents.length);
            return allEvents;

        } catch (error) {
            console.error('💥 Error in CalendarService.getEventsForDateRange:', error);
            throw error;
        }
    }

    /**
     * Fetch internal bookings
     */
    static async fetchBookings(userId, startTime, endTime) {
        const params = new URLSearchParams({
            start_time: startTime,
            end_time: endTime,
            status: 'all',
            page: '1',
            page_size: '200'
        });

        const apiUrl = `user/${userId}/bookings?${params.toString()}`;
        console.log('🔗 Bookings API URL:', apiUrl);

        const response = await api.get(apiUrl);
        console.log('📦 Bookings API response:', response);

        if (!response || !response.success) {
            console.log('❌ Bookings API call failed');
            return [];
        }

        return response.data?.bookings || [];
    }

    /**
     * FIXED: Fetch external calendar events with proper date formatting
     */
    static async fetchExternalEvents(startTimeISO, endTimeISO) {
        try {
            // FIXED: Use proper date formatting for the API
            const startDate = startTimeISO.split('T')[0]; // "2025-08-01"
            const endDate = endTimeISO.split('T')[0];     // "2025-08-31"
            
            console.log('🔗 External events date range:', { startDate, endDate });
            
            const params = new URLSearchParams({
                start_date: startDate,
                end_date: endDate,
                sync: 'auto' // Use auto sync, not force to avoid rate limits
            });
            
            const apiUrl = `user/integrations/events?${params.toString()}`;
            console.log('🔗 External events API URL:', apiUrl);
            
            const response = await api.get(apiUrl);
            console.log('📦 External events API response:', response);
            
            if (!response || !response.success) {
                console.log('❌ External events API call failed');
                return [];
            }
            
            return response.data?.events || [];
        } catch (error) {
            console.error('💥 Error fetching external events:', error);
            return [];
        }
    }

    /**
     * FIXED: Fetch availability events with caching (only refresh on page load)
     */
    static async fetchAvailabilityEvents() {
        try {
            // Check cache first
            const now = Date.now();
            if (
                this.availabilityCache.data &&
                this.availabilityCache.timestamp &&
                (now - this.availabilityCache.timestamp) < this.availabilityCache.expires
            ) {
                console.log('📦 Using cached availability events');
                return this.availabilityCache.data;
            }

            const apiUrl = 'user/out-of-office';
            console.log('🔗 Availability API URL:', apiUrl);
            
            const response = await api.get(apiUrl);
            console.log('📦 Availability API response:', response);
            
            if (!response || !response.success) {
                console.log('❌ Availability API call failed');
                return [];
            }

            const data = response.data || [];
            
            // Cache the results
            this.availabilityCache = {
                data: data,
                timestamp: now
            };
            
            console.log('💾 Cached availability events:', data.length);
            return data;
        } catch (error) {
            console.error('💥 Error fetching availability events:', error);
            return [];
        }
    }

    /**
     * FIXED: Process and expand multi-day availability events for date range
     */
    static processAvailabilityEvents(availabilityData, startDate, endDate) {
        const processedEvents = [];
        const startTimeMs = startDate.getTime();
        const endTimeMs = endDate.getTime();
        
        console.log('🔄 Processing availability events for date range:', {
            total: availabilityData.length,
            range: `${startDate.toDateString()} - ${endDate.toDateString()}`
        });
        
        for (const availability of availabilityData) {
            try {
                // Parse availability dates
                const availStartDate = new Date(availability.start_time + (availability.start_time.endsWith('Z') ? '' : 'Z'));
                const availEndDate = new Date(availability.end_time + (availability.end_time.endsWith('Z') ? '' : 'Z'));
                
                // Check if availability overlaps with requested range
                if (availStartDate.getTime() >= endTimeMs || availEndDate.getTime() <= startTimeMs) {
                    continue; // No overlap, skip
                }
                
                // FIXED: Create event for each day the availability spans within the range
                const currentDate = new Date(Math.max(availStartDate.getTime(), startTimeMs));
                currentDate.setHours(0, 0, 0, 0);
                
                const rangeEndDate = new Date(Math.min(availEndDate.getTime(), endTimeMs));
                
                while (currentDate <= rangeEndDate) {
                    const dayStart = new Date(currentDate);
                    const dayEnd = new Date(currentDate);
                    
                    // For the first day, use the actual start time
                    if (currentDate.toDateString() === availStartDate.toDateString()) {
                        dayStart.setHours(availStartDate.getHours(), availStartDate.getMinutes(), 0, 0);
                    } else {
                        dayStart.setHours(0, 0, 0, 0);
                    }
                    
                    // For the last day, use the actual end time
                    if (currentDate.toDateString() === availEndDate.toDateString()) {
                        dayEnd.setHours(availEndDate.getHours(), availEndDate.getMinutes(), 0, 0);
                    } else {
                        dayEnd.setHours(23, 59, 59, 999);
                    }
                    
                    // Create event for this day
                    const dailyEvent = this.transformAvailabilityToEvent(availability, dayStart, dayEnd);
                    processedEvents.push(dailyEvent);
                    
                    // Move to next day
                    currentDate.setDate(currentDate.getDate() + 1);
                }
                
            } catch (error) {
                console.error('💥 Error processing availability event:', availability, error);
            }
        }
        
        console.log('✅ Processed availability events:', processedEvents.length);
        return processedEvents;
    }

    /**
     * Transform booking to calendar event
     */
    static transformBookingToEvent(booking) {
        const userTimezone = this.getUserTimezone();
        
        // Convert times to user timezone for display
        const startUTC = this.convertToUserTimezone(booking.start_time);
        const endUTC = this.convertToUserTimezone(booking.end_time);
        
        // Determine location string
        let locationString = '';
        if (booking.location && Array.isArray(booking.location)) {
            booking.location.forEach(loc => {
                if (loc.type === 'google_meet') {
                    locationString += 'Google Meet';
                } else if (loc.type === 'link') {
                    locationString += loc.value;
                } else if (loc.type === 'address') {
                    locationString += loc.value;
                }
            });
        }
        
        // Determine attendees string
        let attendeesString = '';
        if (booking.guests && Array.isArray(booking.guests)) {
            attendeesString = booking.guests.map(g => g.name || g.email).join(', ');
        } else if (booking.attendees) {
            attendeesString = booking.attendees;
        }
        
        // Format time in user's timezone
        const userTimeFormatter = new Intl.DateTimeFormat('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: userTimezone
        });
        
        const userDateFormatter = new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long',
            timeZone: userTimezone
        });
        
        return {
            id: booking.id,
            title: booking.title || 'Untitled Event',
            start_time: booking.start_time,
            end_time: booking.end_time,
            start_date_local: startUTC,
            end_date_local: endUTC,
            formattedStart: userTimeFormatter.format(startUTC),
            formattedEnd: userTimeFormatter.format(endUTC),
            dateKey: userDateFormatter.format(startUTC),
            status: booking.status,
            location: locationString,
            description: booking.description,
            attendees: attendeesString,
            guests: booking.guests,
            meeting_link: booking.meeting_link,
            type: 'booking',
            source: 'internal',
            cancelled: booking.cancelled || false,
            booking_id: booking.id, // FIXED: Add booking_id for popup
            raw: booking // Keep original data for popup
        };
    }

    /**
     * Process external events and check for duplicates
     */
    static processExternalEvents(events, existingBookings = []) {
        const processedEvents = [];
        const userTimezone = this.getUserTimezone();
        
        console.log("🔍 Processing external events:", events.length);
        
        // Get all internal bookings for duplicate checking
        const internalBookings = existingBookings.filter(item => 
            item && item.type === 'booking'
        );
        
        for (const event of events) {
            try {
                if (!event.start_time) continue;
                
                // Check if this external event is a duplicate of any internal booking
                let isDuplicate = false;
                for (const booking of internalBookings) {
                    if (BookingsService.areEventsDuplicate && BookingsService.areEventsDuplicate(booking, event)) {
                        isDuplicate = true;
                        break;
                    }
                }
                
                // Skip if duplicate
                if (isDuplicate) {
                    console.log(`⏭️ Skipping duplicate external event: ${event.title}`);
                    continue;
                }
                
                let startDateTime, endDateTime;
                
                if (event.start_time.includes('T')) {
                    startDateTime = new Date(event.start_time);
                    endDateTime = new Date(event.end_time || event.start_time);
                } else {
                    const [startDatePart, startTimePart] = event.start_time.split(' ');
                    const [endDatePart, endTimePart] = event.end_time ? 
                        event.end_time.split(' ') : 
                        [startDatePart, startTimePart];
                    
                    startDateTime = new Date(`${startDatePart}T${startTimePart}Z`);
                    endDateTime = new Date(`${endDatePart}T${endTimePart}Z`);
                }
                
                // Format times
                const userTimeFormatter = new Intl.DateTimeFormat('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false,
                    timeZone: userTimezone
                });
                
                const userDateFormatter = new Intl.DateTimeFormat('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    weekday: 'long',
                    timeZone: userTimezone
                });
                
                const transformedEvent = {
                    id: `external_${event.id || Math.random()}`,
                    title: event.title || event.summary || 'External Event',
                    start_time: event.start_time,
                    end_time: event.end_time,
                    start_date_local: startDateTime,
                    end_date_local: endDateTime,
                    formattedStart: userTimeFormatter.format(startDateTime),
                    formattedEnd: userTimeFormatter.format(endDateTime),
                    dateKey: userDateFormatter.format(startDateTime),
                    status: event.status || 'confirmed',
                    location: event.location || '',
                    description: event.description || '',
                    type: 'external',
                    source: event.source || 'external_calendar',
                    calendar_name: event.calendar_name,
                    cancelled: false,
                    raw: event
                };
                
                processedEvents.push(transformedEvent);
                
            } catch (error) {
                console.error('💥 Error processing external event:', event, error);
            }
        }
        
        return processedEvents;
    }

    /**
     * FIXED: Transform availability entry to calendar event with custom date range
     */
    static transformAvailabilityToEvent(availability, customStartDate = null, customEndDate = null) {
        const userTimezone = this.getUserTimezone();
        
        // Use custom dates if provided (for multi-day events), otherwise use original dates
        const startDateTime = customStartDate || new Date(availability.start_time + (availability.start_time.endsWith('Z') ? '' : 'Z'));
        const endDateTime = customEndDate || new Date(availability.end_time + (availability.end_time.endsWith('Z') ? '' : 'Z'));
        
        // Format times
        const userTimeFormatter = new Intl.DateTimeFormat('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: userTimezone
        });
        
        const userDateFormatter = new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long',
            timeZone: userTimezone
        });

        // Extract reason from description for better display
        let displayTitle = availability.title || 'Unavailable';
        let reasonIcon = '';

        if (availability.description) {
            const description = availability.description;
            
            if (description.includes('Vacation')) {
                reasonIcon = '🏝️ ';
                displayTitle = 'Vacation';
            } else if (description.includes('Travel')) {
                reasonIcon = '✈️ ';
                displayTitle = 'Travel';
            } else if (description.includes('Sick leave')) {
                reasonIcon = '🤒 ';
                displayTitle = 'Sick Leave';
            } else if (description.includes('Public holiday')) {
                reasonIcon = '📅 ';
                displayTitle = 'Public Holiday';
            } else if (availability.source === 'out_of_office') {
                reasonIcon = '🚫 ';
                displayTitle = 'Out of Office';
            }
        }
        
        // Create unique ID for each day
        const dayKey = startDateTime.toISOString().split('T')[0];
        
        return {
            id: `availability_${availability.id}_${dayKey}`,
            title: `${reasonIcon}${displayTitle}`,
            start_time: startDateTime.toISOString().replace('Z', '').replace('T', ' '),
            end_time: endDateTime.toISOString().replace('Z', '').replace('T', ' '),
            start_date_local: startDateTime,
            end_date_local: endDateTime,
            formattedStart: userTimeFormatter.format(startDateTime),
            formattedEnd: userTimeFormatter.format(endDateTime),
            dateKey: userDateFormatter.format(startDateTime),
            status: availability.status || 'confirmed',
            location: '',
            description: availability.description || '',
            type: 'availability',
            source: availability.source || 'out_of_office',
            cancelled: false,
            raw: availability
        };
    }

    /**
     * Format time range for display in user's timezone
     */
    static formatTimeRange(startTime, endTime) {
        const userTimezone = this.getUserTimezone();
        const start = this.convertToUserTimezone(startTime);
        const end = this.convertToUserTimezone(endTime);
        
        const formatter = new Intl.DateTimeFormat('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: userTimezone
        });
        
        return `${formatter.format(start)} - ${formatter.format(end)}`;
    }

    /**
     * Get today's events - all types (for today cards)
     */
    static async getTodayEvents() {
        try {
            console.log('🔍 CalendarService.getTodayEvents called');
            
            const today = new Date();
            const userTimezone = this.getUserTimezone();
            
            // Get start and end of today in user's timezone
            const startOfDay = new Date(today);
            startOfDay.setHours(0, 0, 0, 0);
            
            const endOfDay = new Date(today);
            endOfDay.setHours(23, 59, 59, 999);
            
            // Use the enhanced date range method
            return await this.getEventsForDateRange(startOfDay, endOfDay);
            
        } catch (error) {
            console.error('💥 Error fetching today events:', error);
            return [];
        }
    }

    /**
     * Transform booking to today event format (for cards)
     */
    static transformBookingToTodayEvent(booking) {
        const userTimezone = this.getUserTimezone();
        
        // Convert times to user timezone for display
        const startUTC = this.convertToUserTimezone(booking.start_time);
        const endUTC = this.convertToUserTimezone(booking.end_time);
        
        // Determine location string
        let locationString = '';
        if (booking.location && Array.isArray(booking.location)) {
            booking.location.forEach(loc => {
                if (loc.type === 'google_meet') {
                    locationString += 'Google Meet';
                } else if (loc.type === 'link') {
                    locationString += loc.value;
                } else if (loc.type === 'address') {
                    locationString += loc.value;
                }
            });
        }
        
        // Determine attendees string
        let attendeesString = '';
        if (booking.guests && Array.isArray(booking.guests)) {
            attendeesString = booking.guests.map(g => g.name || g.email).join(', ');
        }
        
        // Calculate timing
        const now = new Date();
        const isNow = now >= startUTC && now <= endUTC;
        const isUpcoming = startUTC > now;
        const isPast = endUTC < now;
        
        let startsIn = '';
        if (isUpcoming) {
            const diffMs = startUTC.getTime() - now.getTime();
            const diffMins = Math.floor(diffMs / (1000 * 60));
            if (diffMins < 60) {
                startsIn = `in ${diffMins} min`;
            } else {
                const diffHours = Math.floor(diffMins / 60);
                startsIn = `in ${diffHours}h ${diffMins % 60}m`;
            }
        }
        
        return {
            id: booking.id,
            title: booking.title || 'Untitled Event',
            start_time: booking.start_time,
            end_time: booking.end_time,
            timeRange: CalendarService.formatTimeRange(booking.start_time, booking.end_time),
            status: booking.status || 'confirmed',
            location: locationString,
            attendees: attendeesString,
            type: 'booking',
            source: 'internal',
            isNow,
            isUpcoming,
            isPast,
            startsIn,
            raw: booking
        };
    }

    /**
     * Transform availability to today event format (for cards)
     */
    static transformAvailabilityToTodayEvent(availability) {
        // Parse times - availability times are stored as UTC in the database
        const startDateTime = new Date(availability.start_time + (availability.start_time.endsWith('Z') ? '' : 'Z'));
        const endDateTime = new Date(availability.end_time + (availability.end_time.endsWith('Z') ? '' : 'Z'));
        
        // Extract reason from description for better display
        let displayTitle = availability.title || 'Unavailable';
        let reasonIcon = '';

        if (availability.description) {
            const description = availability.description;
            
            if (description.includes('Vacation')) {
                reasonIcon = '🏝️ ';
                displayTitle = 'Vacation';
            } else if (description.includes('Travel')) {
                reasonIcon = '✈️ ';
                displayTitle = 'Travel';
            } else if (description.includes('Sick leave')) {
                reasonIcon = '🤒 ';
                displayTitle = 'Sick Leave';
            } else if (description.includes('Public holiday')) {
                reasonIcon = '📅 ';
                displayTitle = 'Public Holiday';
            } else if (availability.source === 'out_of_office') {
                reasonIcon = '🚫 ';
                displayTitle = 'Out of Office';
            }
        }
        
        // Calculate timing
        const now = new Date();
        const isNow = now >= startDateTime && now <= endDateTime;
        const isUpcoming = startDateTime > now;
        const isPast = endDateTime < now;
        
        return {
            id: `availability_${availability.id}`,
            title: `${reasonIcon}${displayTitle}`,
            start_time: availability.start_time,
            end_time: availability.end_time,
            timeRange: CalendarService.formatTimeRange(availability.start_time, availability.end_time),
            status: availability.status || 'confirmed',
            location: '',
            attendees: '',
            type: 'availability',
            source: availability.source || 'out_of_office',
            isNow,
            isUpcoming,
            isPast,
            startsIn: '',
            raw: availability
        };
    }

    /**
     * Transform any event to today event format (for cards)
     */
    static transformToTodayEvent(event) {
        // Calculate timing
        const now = new Date();
        const startDateTime = new Date(event.start_time);
        const endDateTime = new Date(event.end_time);
        
        const isNow = now >= startDateTime && now <= endDateTime;
        const isUpcoming = startDateTime > now;
        const isPast = endDateTime < now;
        
        let startsIn = '';
        if (isUpcoming) {
            const diffMs = startDateTime.getTime() - now.getTime();
            const diffMins = Math.floor(diffMs / (1000 * 60));
            if (diffMins < 60) {
                startsIn = `in ${diffMins} min`;
            } else {
                const diffHours = Math.floor(diffMins / 60);
                startsIn = `in ${diffHours}h ${diffMins % 60}m`;
            }
        }
        
        return {
            ...event,
            timeRange: CalendarService.formatTimeRange(event.start_time, event.end_time),
            isNow,
            isUpcoming,
            isPast,
            startsIn,
            raw: event
        };
    }

    /**
     * Clear availability cache (call on page refresh)
     */
    static clearAvailabilityCache() {
        this.availabilityCache = {
            data: null,
            timestamp: null,
            expires: 30 * 60 * 1000
        };
    }
}