import { api } from '@utils/api';
import { BaseIntegrationProvider } from '../base';
import GoogleCalendarApi from './api';
import GoogleCalendarOAuthView from './oauth-view.vue';

/**
 * Google Calendar Integration Provider
 */
export class GoogleCalendarProvider extends BaseIntegrationProvider {
    constructor() {
        super({
            id: 'google_calendar',
            name: 'Google Calendar',
            description: 'Connect your Google Calendar to automatically manage scheduling, availability, and sync events.',
            category: 'calendar',
            icon: 'google_calendar',
            scopes: [
                'https://www.googleapis.com/auth/calendar',
                'https://www.googleapis.com/auth/calendar.events'
            ],
            permissions: [
                'View and manage your calendars',
                'View and edit events on your calendars'
            ],
            oauthView: GoogleCalendarOAuthView
        });
        
        this.api = new GoogleCalendarApi(this);
        this.isDevelopmentMode = false; // Set to false for real OAuth
    }
    
    // Override getOAuthUrl to match your backend endpoint
    async getOAuthUrl() {
        try {
            // Call your backend endpoint
            const response = await api.get('user/integrations/google/auth');
            
            if (response.success && response.data && response.data.auth_url) {
                return response.data.auth_url;
            }
            
            throw new Error(response?.message || 'Failed to get authentication URL');
        } catch (error) {
            console.error(`Error getting OAuth URL:`, error);
            throw error;
        }
    }
    
    // Override completeOAuth to match your backend endpoint
    async completeOAuth(code) {
        try {
            const response = await api.post('user/integrations/google/callback', { code });
            
            return response;
        } catch (error) {
            console.error(`Error completing OAuth:`, error);
            throw error;
        }
    }
}

// Export a singleton instance
export default new GoogleCalendarProvider();