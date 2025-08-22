import { api } from '@utils/api';
import { UserStore } from '@stores/user';
import { storage } from '@utils/storage';

/**
 * CalendarService - Enhanced service with timezone support for dashboard calendar
 */
export class CalendarService {
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
     * Get events for a specific week - directly using your API
     */
    static async getWeekEvents(weekStartDate) {
        try {
            console.log('🔍 CalendarService.getWeekEvents called with:', weekStartDate);
            
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

            // Build query params for your API
            const params = new URLSearchParams({
                start_time: weekStart.toISOString(),
                end_time: weekEnd.toISOString(),
                status: 'all',
                page: '1',
                page_size: '200'
            });

            const apiUrl = `user/${userId}/bookings?${params.toString()}`;
            console.log('🔗 API URL:', apiUrl);

            // Call your API directly
            console.log('📞 Making API call...');
            const response = await api.get(apiUrl);
            console.log('📦 Raw API response:', response);

            if (!response || !response.success) {
                console.log('❌ API call failed or not successful');
                return [];
            }

            // Extract bookings from response
            const bookings = response.data?.bookings || [];
            console.log('📚 Found bookings:', bookings.length);

            // Transform bookings to calendar events with timezone handling
            const events = bookings.map(booking => this.transformBookingToEvent(booking));
            console.log('🎯 Transformed events:', events);

            return events;

        } catch (error) {
            console.error('💥 Error in getWeekEvents:', error);
            return [];
        }
    }

    /**
     * Transform booking object to calendar event format with timezone handling
     */
    static transformBookingToEvent(booking) {
        const userTimezone = this.getUserTimezone();
        
        // Parse server times as UTC
        const startUTC = this.convertToUserTimezone(booking.start_time);
        const endUTC = this.convertToUserTimezone(booking.end_time);
        
        // Format location
        let locationString = '';
        if (booking.location) {
            if (typeof booking.location === 'object') {
                locationString = booking.location.name || 
                                booking.location.address || 
                                booking.location.value ||
                                JSON.stringify(booking.location);
            } else {
                locationString = booking.location;
            }
        }
        
        // Format attendees
        let attendeesString = '';
        if (booking.guests && Array.isArray(booking.guests)) {
            attendeesString = booking.guests.map(g => g.name || g.email || g).join(', ');
        } else if (booking.attendees && Array.isArray(booking.attendees)) {
            attendeesString = booking.attendees.map(a => a.name || a.email || a).join(', ');
        } else if (booking.guests) {
            attendeesString = booking.guests;
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
        
        const event = {
            id: booking.id,
            title: booking.title || 'Untitled Event',
            start_time: booking.start_time, // Keep original for calculations
            end_time: booking.end_time,     // Keep original for calculations
            start_date_local: startUTC,     // Converted to user timezone
            end_date_local: endUTC,         // Converted to user timezone
            formattedStart: userTimeFormatter.format(startUTC),
            formattedEnd: userTimeFormatter.format(endUTC),
            dateKey: userDateFormatter.format(startUTC),
            status: booking.status,
            location: locationString,
            description: booking.description,
            attendees: attendeesString,
            guests: booking.guests,
            meeting_link: booking.meeting_link,
            type: booking.is_external ? 'external' : 'internal',
            source: booking.calendar_source || null,
            source_icon: this.getSourceIcon(booking.calendar_source),
            raw: booking // Keep original booking data
        };

        console.log('🔄 Transformed booking to event with timezone:', {
            original: booking,
            transformed: event,
            timezone: userTimezone
        });

        return event;
    }

    /**
     * Get icon for calendar source
     */
    static getSourceIcon(source) {
        const icons = {
            'google_calendar': 'https://global.divhunt.com/3858bb278694ec6c098fef9b26e059ab_2357.svg',
            'outlook': 'https://global.divhunt.com/41d16cde92f23c0849a7ddfd2065aa2e_3202.svg',
            'apple_calendar': '/icons/apple-calendar.svg'
        };
        return icons[source] || null;
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
     * Get today's events (for today cards and popup) with timezone handling
     */
    static async getTodayEvents() {
        try {
            const userTimezone = this.getUserTimezone();
            
            // Get today's start and end in user's timezone
            const today = new Date();
            const startOfDay = new Date(today);
            startOfDay.setHours(0, 0, 0, 0);
            
            const endOfDay = new Date(today);
            endOfDay.setHours(23, 59, 59, 999);
            
            console.log('📅 Getting today events in timezone:', userTimezone, {
                start: startOfDay.toISOString(),
                end: endOfDay.toISOString()
            });

            // Get current user ID
            const userStore = UserStore();
            const userId = userStore.getId();

            // Build query params for today's events
            const params = new URLSearchParams({
                start_time: startOfDay.toISOString(),
                end_time: endOfDay.toISOString(),
                status: 'all',
                page: '1',
                page_size: '50'
            });

            const apiUrl = `user/${userId}/bookings?${params.toString()}`;
            console.log('🔗 Today events API URL:', apiUrl);

            // Call API
            const response = await api.get(apiUrl);
            
            if (!response || !response.success) {
                console.log('❌ Failed to fetch today events');
                return [];
            }

            // Extract and transform bookings
            const bookings = response.data?.bookings || [];
            const events = bookings.map(booking => this.transformBookingToEvent(booking));
            
            // Filter to only include events that fall on today in user's timezone
            const todayEvents = events.filter(event => {
                const eventDate = this.convertToUserTimezone(event.start_time);
                const eventDateStr = eventDate.toDateString();
                const todayStr = today.toDateString();
                return eventDateStr === todayStr;
            });
            
            // Add timing information for today's events
            const enrichedEvents = todayEvents.map(event => this.enrichEventWithTiming(event));
            
            console.log('📅 Today events enriched:', enrichedEvents);
            return enrichedEvents;
            
        } catch (error) {
            console.error('Error fetching today events:', error);
            return [];
        }
    }

    /**
     * Enrich event with timing information (for today's events)
     */
    static enrichEventWithTiming(event) {
        const now = new Date();
        const startTime = this.convertToUserTimezone(event.start_time);
        const endTime = this.convertToUserTimezone(event.end_time);
        
        // Check if happening now
        const isNow = startTime <= now && endTime >= now;
        
        // Check if upcoming today
        const isUpcoming = startTime > now && startTime.toDateString() === now.toDateString();
        
        // Check if past
        const isPast = endTime < now;
        
        // Calculate time until start
        let startsIn = null;
        if (isUpcoming) {
            const timeDiff = startTime.getTime() - now.getTime();
            const hours = Math.floor(timeDiff / (1000 * 60 * 60));
            const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
            
            if (hours > 0) {
                startsIn = `${hours}h ${minutes}m`;
            } else {
                startsIn = `${minutes}m`;
            }
        }
        
        // Format attendees list
        let attendeesString = '';
        if (event.guests && Array.isArray(event.guests)) {
            const guestNames = event.guests.map(g => g.name || g.email || g).filter(Boolean);
            attendeesString = guestNames.length > 0 ? guestNames.join(', ') : '';
        } else if (event.attendees) {
            attendeesString = event.attendees;
        }
        
        return {
            ...event,
            isNow,
            isUpcoming,
            isPast,
            startsIn,
            timeRange: this.formatTimeRange(event.start_time, event.end_time),
            attendees: attendeesString || 'No attendees'
        };
    }

    /**
     * Get events for a specific date range with timezone handling
     */
    static async getEventsForDateRange(startDate, endDate) {
        try {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            
            // Get current user ID
            const userStore = UserStore();
            const userId = userStore.getId();

            // Build query params
            const params = new URLSearchParams({
                start_time: start.toISOString(),
                end_time: end.toISOString(),
                status: 'all',
                page: '1',
                page_size: '200'
            });

            const apiUrl = `user/${userId}/bookings?${params.toString()}`;
            
            // Call API
            const response = await api.get(apiUrl);
            
            if (!response || !response.success) {
                return [];
            }

            // Extract and transform bookings
            const bookings = response.data?.bookings || [];
            return bookings.map(booking => this.transformBookingToEvent(booking));
            
        } catch (error) {
            console.error('Error fetching events for date range:', error);
            return [];
        }
    }
    
    /**
     * Get current timezone display string
     */
    static getCurrentTimezoneDisplay() {
        const userTimezone = this.getUserTimezone();
        const offset = new Date().getTimezoneOffset();
        const hours = Math.abs(Math.floor(offset / 60));
        const minutes = Math.abs(offset % 60);
        const sign = offset <= 0 ? '+' : '-';
        
        return `${userTimezone} (UTC${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')})`;
    }
}