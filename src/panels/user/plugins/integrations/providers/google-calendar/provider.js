// src/panels/user/plugins/integrations/providers/google-calendar/provider.js

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
            console.log('Getting OAuth URL for Google Calendar...');
            
            // Call your backend endpoint
            const response = await api.get('user/integrations/google/auth');
            
            if (response.success && response.data && response.data.auth_url) {
                console.log('OAuth URL received successfully');
                return response.data.auth_url;
            }
            
            console.error('Failed to get OAuth URL:', response?.message || 'Unknown error');
            throw new Error(response?.message || 'Failed to get authentication URL');
        } catch (error) {
            console.error(`Error getting OAuth URL:`, error);
            throw error;
        }
    }
    
    // Override completeOAuth to match your backend endpoint and add better error handling
    async completeOAuth(code) {
        try {
            console.log('Completing OAuth with code...');
            
            // Add request logging for debugging
            console.log('Sending request to callback endpoint with code of length:', code?.length || 0);
            
            const response = await api.post('user/integrations/google/callback', { 
                code,
                provider: 'google_calendar' // Add provider info to help backend route correctly
            });
            
            if (!response || !response.success) {
                console.error('OAuth completion failed:', response?.message || 'Unknown error');
                throw new Error(response?.message || 'Authentication failed');
            }
            
            console.log('OAuth completed successfully');
            return response;
        } catch (error) {
            console.error(`Error completing OAuth:`, error);
            
            // Enhanced error handling
            const errorMessage = error.response?.data?.message || error.message || 'Unknown server error';
            throw new Error(`Authentication failed: ${errorMessage}`);
        }
    }
}

// Export a singleton instance
export default new GoogleCalendarProvider();