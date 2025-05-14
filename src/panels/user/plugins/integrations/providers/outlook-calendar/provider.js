// src/panels/user/plugins/integrations/providers/outlook-calendar/provider.js

import { api } from '@utils/api';
import { BaseIntegrationProvider } from '../base';
import OutlookCalendarApi from './api';
import OutlookCalendarOAuthView from './oauth-view.vue';

/**
 * Outlook Calendar Integration Provider
 */
export class OutlookCalendarProvider extends BaseIntegrationProvider {
    constructor() {
        super({
            id: 'outlook_calendar',
            name: 'Outlook Calendar',
            description: 'Connect your Outlook Calendar to automatically manage scheduling, availability, and sync events.',
            category: 'calendar',
            icon: 'https://global.divhunt.com/41d16cde92f23c0849a7ddfd2065aa2e_3202.svg',
            scopes: [
                'offline_access',
                'User.Read',
                'Calendars.ReadWrite'
            ],
            permissions: [
                'View and manage your calendars',
                'View and edit events on your calendars'
            ],
            oauthView: OutlookCalendarOAuthView
        });
        
        this.api = new OutlookCalendarApi(this);
        this.isDevelopmentMode = false; // Set to false for real OAuth
    }
    
    // Override getOAuthUrl to match your backend endpoint
    async getOAuthUrl() {
        try {
            console.log('Getting OAuth URL for Outlook Calendar...');
            
            // Call your backend endpoint
            const response = await api.get('user/integrations/outlook/auth');
            
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
            
            const response = await api.post('user/integrations/outlook/callback', { 
                code,
                provider: 'outlook_calendar' // Add provider info to help backend route correctly
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
export default new OutlookCalendarProvider();