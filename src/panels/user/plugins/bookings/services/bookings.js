import { api } from '@utils/api';
import { UserStore } from '@stores/user';

/**
 * BookingsService - Service for managing bookings
 */
export class BookingsService {
  // Cache bookings to reduce API calls
  static bookingsCache = {
    upcoming: { data: [], timestamp: 0 },
    past: { data: [], timestamp: 0 },
    cancelled: { data: [], timestamp: 0 },
    active: { data: [], timestamp: 0 },
    all: { data: [], timestamp: 0 }
  };
  
  // Cache expiry time (5 minutes)
  static CACHE_EXPIRY = 5 * 60 * 1000;
  
  // Pagination settings
  static DEFAULT_PAGE_SIZE = 50;
  
  /**
   * Get current user ID from user store
   */
  static getCurrentUserId() {
    const userStore = UserStore();
    return userStore.getId();
  }
  
  /**
   * Get bookings with pagination support and fetch related data
   */
  static async getBookings({
    status = 'upcoming',
    startTime = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
    endTime = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),   // 90 days in future
    page = 1,
    pageSize = this.DEFAULT_PAGE_SIZE,
    useCache = true,
    internalOnly = false,
    fetchRelatedData = true
  }) {
    const now = Date.now();
    const cacheKey = status.toLowerCase();
    
    // Check if we have valid cached data
    if (
      useCache && 
      this.bookingsCache[cacheKey]?.data.length > 0 &&
      now - this.bookingsCache[cacheKey].timestamp < this.CACHE_EXPIRY
    ) {
      console.log(`Using cached ${status} bookings`);
      return this.bookingsCache[cacheKey].data;
    }
    
    // Build query params
    const queryParams = new URLSearchParams();
    queryParams.append('start_time', startTime);
    queryParams.append('end_time', endTime);
    queryParams.append('status', status);
    queryParams.append('page', page.toString());
    queryParams.append('page_size', pageSize.toString());
    
    if (internalOnly) {
      queryParams.append('internal', 'true');
    }
    
    try {
      // Use the user/{id}/bookings endpoint from your UserBookingsController
      const userId = this.getCurrentUserId();
      const response = await api.get(`user/${userId}/bookings?${queryParams.toString()}`);
      
      if (response && response.success && response.data) {
        // Update cache
        this.bookingsCache[cacheKey] = {
          data: response.data,
          timestamp: now
        };
        
        // If fetch related data is requested and we have event_id and organization_id
        if (fetchRelatedData) {
          const bookings = response.data.bookings || [];
          
          for (let i = 0; i < bookings.length; i++) {
            const booking = bookings[i];
            
            if (booking.event_id) {
              try {
                // Get organization_id - either from the booking or from user's default org
                let organizationId = booking.organization_id;
                if (!organizationId) {
                  const userStore = UserStore();
                  organizationId = userStore.getSelectedOrganizationId();
                }
                
                if (organizationId) {
                  // Fetch event details using EventController pattern
                  const eventResponse = await api.get(`events/${booking.event_id}?organization_id=${organizationId}`);
                  if (eventResponse && eventResponse.success) {
                    booking.event = eventResponse.data;
                  }
                  
                  // If booking_id exists, fetch booking details using EventBookingController pattern
                  if (booking.booking_id) {
                    const bookingResponse = await api.get(`organizations/${organizationId}/events/${booking.event_id}/bookings/${booking.booking_id}`);
                    if (bookingResponse && bookingResponse.success) {
                      booking.booking_details = bookingResponse.data;
                    }
                  }
                }
              } catch (error) {
                console.warn(`Failed to fetch related data for booking:`, error);
              }
            }
          }
        }
        
        return response.data;
      }
      
      throw new Error(response?.message || 'Failed to fetch bookings');
    } catch (error) {
      console.error('Error fetching bookings:', error);
      throw error;
    }
  }
  
  /**
   * Get a single booking by ID
   */
  static async getBooking(id) {
    try {
      const userId = this.getCurrentUserId();
      const response = await api.get(`user/${userId}/bookings/${id}`);
      
      if (response && response.success) {
        const booking = response.data;
        
        // Fetch related data if event_id exists
        if (booking.event_id) {
          try {
            // Get organization_id
            let organizationId = booking.organization_id;
            if (!organizationId) {
              const userStore = UserStore();
              organizationId = userStore.getSelectedOrganizationId();
            }
            
            if (organizationId) {
              // Fetch event details
              const eventResponse = await api.get(`events/${booking.event_id}?organization_id=${organizationId}`);
              if (eventResponse && eventResponse.success) {
                booking.event = eventResponse.data;
              }
              
              // If booking_id exists, fetch booking details
              if (booking.booking_id) {
                const bookingResponse = await api.get(`organizations/${organizationId}/events/${booking.event_id}/bookings/${booking.booking_id}`);
                if (bookingResponse && bookingResponse.success) {
                  booking.booking_details = bookingResponse.data;
                }
              }
            }
          } catch (error) {
            console.warn(`Failed to fetch related data for booking:`, error);
          }
        }
        
        return booking;
      }
      
      throw new Error(response?.message || 'Failed to fetch booking');
    } catch (error) {
      console.error(`Error fetching booking ${id}:`, error);
      throw error;
    }
  }
  
  /**
   * Cancel a booking
   */
  static async cancelBooking(id) {
    try {
      const userId = this.getCurrentUserId();
      const booking = await this.getBooking(id);
      
      // If it's an internal booking with event_id and booking_id, use the event booking API
      if (booking.source === 'internal' && booking.event_id && booking.booking_id) {
        let organizationId = booking.organization_id;
        if (!organizationId) {
          const userStore = UserStore();
          organizationId = userStore.getSelectedOrganizationId();
        }
        
        if (organizationId) {
          // Use EventBookingController's cancel endpoint
          const response = await api.put(`organizations/${organizationId}/events/${booking.event_id}/bookings/${booking.booking_id}/cancel`);
          
          if (response && response.success) {
            // Clear all caches after cancellation
            this.clearCache();
            return response.data;
          }
        }
      } else {
        // Use the UserBookingsController cancellation method (if implemented)
        const response = await api.put(`user/${userId}/bookings/${id}/cancel`);
        
        if (response && response.success) {
          this.clearCache();
          return response.data;
        }
      }
      
      throw new Error('Failed to cancel booking');
    } catch (error) {
      console.error(`Error canceling booking ${id}:`, error);
      throw error;
    }
  }
  
  /**
   * Get bookings for a specific date range (e.g., current week Sunday-Saturday)
   */
  static async getWeekBookings(startDate, endDate, status = 'upcoming') {
    // Format dates for API
    const startTime = startDate.toISOString();
    const endTime = endDate.toISOString();
    
    return this.getBookings({
      status,
      startTime,
      endTime,
      useCache: false // Always fresh data for week view
    });
  }
  
  /**
   * Get bookings for current week (Sunday-Saturday)
   */
  static async getCurrentWeekBookings(status = 'upcoming') {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 6 = Saturday
    
    // Calculate Sunday (start of week)
    const sunday = new Date(today);
    sunday.setDate(today.getDate() - dayOfWeek);
    sunday.setHours(0, 0, 0, 0);
    
    // Calculate Saturday (end of week)
    const saturday = new Date(today);
    saturday.setDate(today.getDate() + (6 - dayOfWeek));
    saturday.setHours(23, 59, 59, 999);
    
    return this.getWeekBookings(sunday, saturday, status);
  }
  
  /**
   * Get bookings for specific week
   */
  static async getSpecificWeekBookings(year, month, day, status = 'upcoming') {
    // Create date for the Sunday of that week
    const sunday = new Date(year, month - 1, day); // month is 0-indexed in JS
    sunday.setHours(0, 0, 0, 0);
    
    // Calculate the Saturday
    const saturday = new Date(sunday);
    saturday.setDate(sunday.getDate() + 6);
    saturday.setHours(23, 59, 59, 999);
    
    return this.getWeekBookings(sunday, saturday, status);
  }
  
  /**
   * Get currently happening bookings
   */
  static async getNowBookings() {
    const now = new Date();
    
    // Create time window 15 minutes before and after current time
    const startTime = new Date(now);
    startTime.setMinutes(now.getMinutes() - 15);
    
    const endTime = new Date(now);
    endTime.setMinutes(now.getMinutes() + 15);
    
    // Use the same getBookings method but with a very narrow time window
    const result = await this.getBookings({
      status: 'active',
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      useCache: false // Always fresh data for current bookings
    });
    
    // Filter to only include bookings that are happening right now
    const bookings = result.bookings || [];
    return bookings.filter(booking => {
      const bookingStart = new Date(booking.start_time);
      const bookingEnd = new Date(booking.end_time);
      return bookingStart <= now && bookingEnd >= now;
    });
  }
  
  /**
   * Clear service cache
   */
  static clearCache(status = null) {
    if (status && this.bookingsCache[status]) {
      this.bookingsCache[status].timestamp = 0;
    } else {
      Object.keys(this.bookingsCache).forEach(key => {
        this.bookingsCache[key].timestamp = 0;
      });
    }
  }
}