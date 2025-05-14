// src/panels/user/plugins/integrations/services/OutlookCalendarService.js
import { api } from '@utils/api';
import { common } from '@utils/common';

/**
 * Service for handling Outlook Calendar operations
 */
export class OutlookCalendarService {
    /**
     * Get OAuth URL for Outlook Calendar
     * @returns {Promise<string>} - Auth URL
     */
    static async getAuthUrl() {
        try {
            const response = await api.get('user/integrations/outlook/auth');
            
            if (response.success && response.data && response.data.auth_url) {
                return response.data.auth_url;
            }
            
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
            const response = await api.post('user/integrations/outlook/callback', { code });
            
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
     * Get calendars for the connected account
     * @param {number} integrationId - Optional integration ID
     * @returns {Promise<Array>} - List of calendars
     */
    static async getCalendars(integrationId = null) {
        try {
            const params = integrationId ? `?integration_id=${integrationId}` : '';
            const response = await api.get(`user/integrations/outlook/calendars${params}`);
            
            if (response.success) {
                return response.data;
            }
            
            throw new Error(response?.message || 'Failed to fetch calendars');
        } catch (error) {
            console.error('Error fetching calendars:', error);
            throw error;
        }
    }
    
    /**
     * Sync events for a specific date range
     * @param {number} integrationId - Integration ID
     * @param {string} startDate - Start date (YYYY-MM-DD)
     * @param {string} endDate - End date (YYYY-MM-DD)
     * @returns {Promise<Object>} - Sync result
     */
    static async syncEvents(integrationId, startDate = 'today', endDate = '+30 days') {
        try {
            const response = await api.post(`user/integrations/${integrationId}/sync-outlook`, {
                start_date: startDate,
                end_date: endDate
            });
            
            if (response.success) {
                return response.data;
            }
            
            throw new Error(response?.message || 'Failed to sync events');
        } catch (error) {
            console.error('Error syncing events:', error);
            throw error;
        }
    }
    
    /**
     * Create a new event in Outlook Calendar
     * @param {number} integrationId - Integration ID
     * @param {Object} eventData - Event data
     * @returns {Promise<Object>} - Created event
     */
    static async createEvent(integrationId, eventData) {
        try {
            const response = await api.post(`user/integrations/${integrationId}/outlook-events`, eventData);
            
            if (response.success) {
                return response.data;
            }
            
            throw new Error(response?.message || 'Failed to create event');
        } catch (error) {
            console.error('Error creating event:', error);
            throw error;
        }
    }
    
    /**
     * Delete an event from Outlook Calendar
     * @param {number} integrationId - Integration ID
     * @param {string} eventId - Event ID
     * @returns {Promise<boolean>} - True if successful
     */
    static async deleteEvent(integrationId, eventId) {
        try {
            const response = await api.delete(`user/integrations/${integrationId}/outlook-events/${eventId}`);
            
            if (response.success) {
                return true;
            }
            
            throw new Error(response?.message || 'Failed to delete event');
        } catch (error) {
            console.error('Error deleting event:', error);
            return false;
        }
    }
    
    /**
     * Get events for the current user
     * @param {string} startDate - Start date (YYYY-MM-DD)
     * @param {string} endDate - End date (YYYY-MM-DD)
     * @param {boolean} autoSync - Whether to automatically sync events
     * @returns {Promise<Array>} - List of events
     */
    static async getEvents(startDate = 'today', endDate = '+7 days', autoSync = true) {
        try {
            const params = new URLSearchParams({
                start_date: startDate,
                end_date: endDate,
                sync: autoSync ? 'auto' : 'none'
            });
            
            const response = await api.get(`user/integrations/outlook/events?${params.toString()}`);
            
            if (response.success) {
                return response.data;
            }
            
            throw new Error(response?.message || 'Failed to fetch events');
        } catch (error) {
            console.error('Error fetching events:', error);
            throw error;
        }
    }
}

export default OutlookCalendarService;