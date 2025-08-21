import { api } from '@utils/api';
import { UserStore } from '@stores/user';

/**
 * CalendarService - Simple service for dashboard calendar functionality
 */
export class CalendarService {
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

            const bookings = response.data?.bookings || [];
            console.log('📋 Raw bookings:', bookings);
            console.log('📊 Bookings count:', bookings.length);

            // Process bookings into calendar events
            const calendarEvents = [];
            
            for (const booking of bookings) {
                console.log('🔄 Processing booking:', {
                    id: booking.id,
                    title: booking.title,
                    start_time: booking.start_time,
                    end_time: booking.end_time,
                    status: booking.status
                });

                if (!booking.start_time) {
                    console.log('⚠️ Skipping booking without start_time:', booking.id);
                    continue;
                }

                // Create calendar event
                const calendarEvent = {
                    id: booking.id,
                    title: booking.title || booking.event_name || 'Untitled Event',
                    start_time: new Date(booking.start_time),
                    end_time: new Date(booking.end_time || booking.start_time),
                    type: 'internal',
                    source: null,
                    status: booking.status || 'confirmed',
                    attendees: this.getAttendees(booking),
                    location: this.getLocation(booking),
                    joinUrl: booking.meeting_link,
                    raw: booking
                };

                console.log('✅ Created calendar event:', calendarEvent);
                calendarEvents.push(calendarEvent);
            }

            console.log('🎉 Final calendar events:', calendarEvents);
            console.log('📊 Total events:', calendarEvents.length);

            return calendarEvents;

        } catch (error) {
            console.error('💥 Error in getWeekEvents:', error);
            console.error('💥 Error details:', {
                message: error.message,
                stack: error.stack
            });
            return [];
        }
    }

    /**
     * Get attendees string from booking
     */
    static getAttendees(booking) {
        let attendees = 'You';
        
        if (booking.guests && Array.isArray(booking.guests) && booking.guests.length > 0) {
            const guestNames = booking.guests
                .filter(guest => guest && guest.name)
                .map(guest => guest.name)
                .slice(0, 2);
            
            if (guestNames.length > 0) {
                attendees = `You, ${guestNames.join(', ')}`;
                if (booking.guests.length > 2) {
                    attendees += ` +${booking.guests.length - 2} more`;
                }
            }
        }
        
        return attendees;
    }

    /**
     * Get location from booking
     */
    static getLocation(booking) {
        if (booking.meeting_link) {
            return 'Online Meeting';
        }
        
        if (booking.location && Array.isArray(booking.location) && booking.location.length > 0) {
            const firstLocation = booking.location[0];
            if (firstLocation.type === 'google_meet') {
                return 'Google Meet';
            }
            return firstLocation.type || 'Online Meeting';
        }
        
        return 'Location TBD';
    }

    /**
     * Format time range for display
     */
    static formatTimeRange(startTime, endTime) {
        const formatTime = (date) => {
            const hours = date.getHours();
            const minutes = date.getMinutes();
            const amPm = hours >= 12 ? "PM" : "AM";
            const formattedHours = hours % 12 === 0 ? 12 : hours % 12;
            const formattedMinutes = minutes.toString().padStart(2, '0');
            return `${formattedHours}:${formattedMinutes} ${amPm}`;
        };
        
        return `${formatTime(startTime)} - ${formatTime(endTime)}`;
    }

    /**
     * Get today's events (for today cards)
     */
    static async getTodayEvents() {
        try {
            const today = new Date();
            const startOfDay = new Date(today);
            startOfDay.setHours(0, 0, 0, 0);
            
            const endOfDay = new Date(today);
            endOfDay.setHours(23, 59, 59, 999);
            
            const events = await this.getWeekEvents(startOfDay);
            
            // Filter for today only
            const todayEvents = events.filter(event => {
                const eventDate = new Date(event.start_time);
                return eventDate.toDateString() === today.toDateString();
            });
            
            // Add timing information
            return todayEvents.map(event => this.enrichEventWithTiming(event));
            
        } catch (error) {
            console.error('Error fetching today events:', error);
            return [];
        }
    }

    /**
     * Enrich event with timing information
     */
    static enrichEventWithTiming(event) {
        const now = new Date();
        const startTime = new Date(event.start_time);
        const endTime = new Date(event.end_time);
        
        // Check if happening now
        const isNow = startTime <= now && endTime >= now;
        
        // Check if upcoming today
        const isUpcoming = startTime > now && startTime.toDateString() === now.toDateString();
        
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
        
        return {
            ...event,
            isNow,
            isUpcoming,
            startsIn,
            timeRange: this.formatTimeRange(startTime, endTime)
        };
    }
}