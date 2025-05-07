// src/panels/user/plugins/integrations/providers/google-calendar/provider.js
import { BaseIntegrationProvider } from '../base';
import GoogleCalendarApi from './api';
import GoogleCalendarOAuthView from './oauth-view.vue';

/**
 * Google Calendar Integration Provider
 */
export class GoogleCalendarProvider extends BaseIntegrationProvider {
    /**
     * Constructor
     */
    constructor() {
        super({
            id: 'google_calendar',
            name: 'Google Calendar',
            description: 'Connect your Google Calendar to automatically manage scheduling, availability, and sync events.',
            category: 'calendar',
            icon: 'google_calendar',
            scopes: [
                'https://www.googleapis.com/auth/calendar',
                'https://www.googleapis.com/auth/calendar.events',
                'https://www.googleapis.com/auth/calendar.settings.readonly'
            ],
            permissions: [
                'View and manage your calendars',
                'View and edit events on your calendars',
                'View your calendar settings'
            ],
            oauthView: GoogleCalendarOAuthView
        });
        
        this.api = new GoogleCalendarApi(this);
    }
    
    /**
     * Get OAuth URL
     * Override to provide Google Calendar specific URL
     * @returns {Promise<string>} - OAuth URL
     */
    async getOAuthUrl() {
        if (this.isDevelopmentMode) {
            // Generate a state parameter for security
            const state = btoa(JSON.stringify({
                provider: this.id,
                timestamp: Date.now()
            }));
            
            // Mock Google OAuth URL for development
            return `https://accounts.google.com/o/oauth2/auth?client_id=YOUR_CLIENT_ID&redirect_uri=YOUR_REDIRECT_URI&response_type=code&scope=${this.scopes.join(' ')}&access_type=offline&prompt=consent&state=${state}`;
        }
        
        // In production, call the API
        return super.getOAuthUrl();
    }
    
    /**
     * Get calendars from the connected account
     * @returns {Promise<Array>} - List of calendars
     */
    async getCalendars() {
        return await this.api.getCalendars();
    }
    
    /**
     * Get events from a calendar
     * @param {string} calendarId - Calendar ID
     * @param {Object} options - Options for fetching events
     * @returns {Promise<Array>} - List of events
     */
    async getEvents(calendarId, options = {}) {
        return await this.api.getEvents(calendarId, options);
    }
    
    /**
     * Create an event in a calendar
     * @param {string} calendarId - Calendar ID
     * @param {Object} eventData - Event data
     * @returns {Promise<Object>} - Created event
     */
    async createEvent(calendarId, eventData) {
        return await this.api.createEvent(calendarId, eventData);
    }
    
    /**
     * Update an event in a calendar
     * @param {string} calendarId - Calendar ID
     * @param {string} eventId - Event ID
     * @param {Object} eventData - Event data
     * @returns {Promise<Object>} - Updated event
     */
    async updateEvent(calendarId, eventId, eventData) {
        return await this.api.updateEvent(calendarId, eventId, eventData);
    }
    
    /**
     * Delete an event from a calendar
     * @param {string} calendarId - Calendar ID
     * @param {string} eventId - Event ID
     * @returns {Promise<boolean>} - True if successful
     */
    async deleteEvent(calendarId, eventId) {
        return await this.api.deleteEvent(calendarId, eventId);
    }
    
    /**
     * Check availability for a time range
     * @param {Date} startTime - Start time
     * @param {Date} endTime - End time
     * @param {Array} calendarIds - Calendar IDs to check (optional)
     * @returns {Promise<boolean>} - True if available
     */
    async checkAvailability(startTime, endTime, calendarIds = null) {
        return await this.api.checkAvailability(startTime, endTime, calendarIds);
    }
}

// Export a singleton instance
export default new GoogleCalendarProvider();