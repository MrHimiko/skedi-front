// src/panels/user/plugins/integrations/services/GoogleMeetService.js
import { api } from '@utils/api';
import { common } from '@utils/common';

/**
 * Service for handling Google Meet operations
 */
export class GoogleMeetService {
    /**
     * Get OAuth URL for Google Meet
     * @returns {Promise<string>} - Auth URL
     */
    static async getAuthUrl() {
        try {
            // Check if the URL matches the backend API endpoint
            const endpoint = 'user/integrations/google-meet/auth';
            console.log(`Getting OAuth URL from endpoint: ${endpoint}`);
            
            const response = await api.get(endpoint);
            
            if (response.success && response.data && response.data.auth_url) {
                console.log('Received auth URL successfully:', response.data.auth_url.substring(0, 60) + '...');
                return response.data.auth_url;
            }
            
            console.error('Failed to get auth URL:', response?.message);
            throw new Error(response?.message || 'Failed to get authentication URL');
        } catch (error) {
            console.error('Error getting auth URL:', error);
            throw error;
        }
    }
    
    /**
     * Complete the OAuth flow with the code
     * @param {string} code - Authorization code
     * @returns {Promise<Object>} - Response data
     */
    static async completeAuth(code) {
        try {
            const response = await api.post('user/integrations/google-meet/callback', { code });
            
            if (response.success) {
                return response;
            }
            
            throw new Error(response?.message || 'Authentication failed');
        } catch (error) {
            console.error('Error completing auth:', error);
            throw error;
        }
    }
    
    /**
     * Create a new Google Meet link
     * @param {number} integrationId - Integration ID
     * @param {Object} options - Meet link options
     * @returns {Promise<Object>} - Created Meet link
     */
    static async createMeetLink(integrationId, options = {}) {
        try {
            // Ensure we have a title for the meeting
            if (!options.title) {
                options.title = `Meeting - ${new Date().toLocaleDateString()}`;
            }
            
            const response = await api.post(`user/integrations/${integrationId}/meet-links`, options);
            
            if (response.success) {
                return response.data;
            }
            
            throw new Error(response?.message || 'Failed to create Meet link');
        } catch (error) {
            console.error('Error creating Meet link:', error);
            throw error;
        }
    }
    
    /**
     * Get a Google Meet link for a specific booking
     * @param {number} bookingId - Booking ID
     * @returns {Promise<Object>} - Meet link info
     */
    static async getMeetLinkForBooking(bookingId) {
        try {
            const response = await api.get(`user/bookings/${bookingId}/meet-link`);
            
            if (response.success) {
                return response.data;
            }
            
            throw new Error(response?.message || 'Failed to get Meet link');
        } catch (error) {
            console.error('Error getting Meet link for booking:', error);
            throw error;
        }
    }
    
    /**
     * Cancel a Google Meet event
     * @param {number} meetEventId - Meet event ID
     * @returns {Promise<boolean>} - True if successful
     */
    static async cancelMeetEvent(meetEventId) {
        try {
            const response = await api.post(`user/integrations/meet-events/${meetEventId}/cancel`);
            
            if (response.success) {
                return true;
            }
            
            throw new Error(response?.message || 'Failed to cancel Meet event');
        } catch (error) {
            console.error('Error cancelling Meet event:', error);
            return false;
        }
    }
    
    /**
     * Create a Meet link and associate it with a booking
     * @param {number} integrationId - Integration ID
     * @param {number} bookingId - Booking ID
     * @param {Object} bookingData - Booking data for meeting information
     * @returns {Promise<Object>} - Meet link data
     */
    static async createMeetLinkForBooking(integrationId, bookingId, bookingData) {
        try {
            // Format the meeting options based on booking data
            const options = {
                title: bookingData.title || `Meeting with ${bookingData.attendeeName || 'Client'}`,
                description: bookingData.description || '',
                start_time: bookingData.startTime || new Date().toISOString(),
                end_time: bookingData.endTime || new Date(Date.now() + 3600000).toISOString(),
                booking_id: bookingId,
                enable_recording: bookingData.enableRecording || false,
                is_guest_allowed: bookingData.allowGuests !== false
            };
            
            // Add event ID if available
            if (bookingData.eventId) {
                options.event_id = bookingData.eventId;
            }
            
            const response = await this.createMeetLink(integrationId, options);
            
            return response;
        } catch (error) {
            console.error('Error creating Meet link for booking:', error);
            throw error;
        }
    }
}

export default GoogleMeetService;