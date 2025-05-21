// src/panels/user/plugins/integrations/providers/google-meet/provider.js

import { api } from '@utils/api';
import { BaseIntegrationProvider } from '../base';
import GoogleMeetApi from './api';
import GoogleMeetOAuthView from './oauth-view.vue';

/**
 * Google Meet Integration Provider
 */
export class GoogleMeetProvider extends BaseIntegrationProvider {
    constructor() {
        super({
            id: 'google_meet',
            name: 'Google Meet',
            description: 'Integrate with Google Meet to create and manage video conference links for your meetings.',
            category: 'conferencing',
            icon: 'https://global.divhunt.com/6dea696e910d70e2925a5c3e453a69ff_644.svg',
            scopes: [
                'https://www.googleapis.com/auth/meetings.space.created',
                'https://www.googleapis.com/auth/meetings.space.readonly',
                'https://www.googleapis.com/auth/userinfo.email'
            ],
            permissions: [
                'Create and manage Meet conferences',
                'View your Meet spaces',
                'Access basic account information'
            ],
            oauthView: GoogleMeetOAuthView
        });
        
        this.api = new GoogleMeetApi(this);
        this.isDevelopmentMode = false; // Set to false for real OAuth
    }
    
    // Override getOAuthUrl to match your backend endpoint
    async getOAuthUrl() {
        try {
            console.log('Getting OAuth URL for Google Meet...');
            
            // Call your backend endpoint
            const response = await api.get('user/integrations/google-meet/auth');
            
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
    async completeOAuth(code, state) {
        try {
            console.log('Starting OAuth completion with code');
            
            // Log the code length for debugging (never log the full code for security)
            console.log('Code length:', code?.length || 0);
            console.log('State:', state || 'No state');
            
            // Make sure the URL matches what's configured in your backend
            const callbackEndpoint = 'user/integrations/google-meet/callback';
            console.log(`Sending OAuth code to backend endpoint: ${callbackEndpoint}`);
            
            // Call backend API with the code
            const response = await api.post(callbackEndpoint, { 
                code,
                provider: 'google_meet' // Add provider info to help backend route correctly
            });
            
            console.log('OAuth API response received:', response);
            
            if (!response || !response.success) {
                console.error('OAuth completion failed:', response?.message || 'Unknown error');
                throw new Error(response?.message || 'Authentication failed');
            }
            
            console.log('OAuth completed successfully', response.data);
            return response;
        } catch (error) {
            console.error(`Error completing OAuth:`, error);
            
            // Enhanced error handling
            let errorMessage = 'Authentication failed';
            
            if (error.response) {
                console.error('Error response:', error.response);
                errorMessage = error.response.data?.message || 'Server error during authentication';
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            throw new Error(`Authentication failed: ${errorMessage}`);
        }
    }
    
    /**
     * Create a Google Meet link
     * @param {Object} options - Options for Meet link creation
     * @returns {Promise<Object>} - Created Meet link info
     */
    async createMeetLink(options = {}) {
        try {
            const defaultTitle = 'Meeting ' + new Date().toLocaleDateString();
            const meetingOptions = {
                title: options.title || defaultTitle,
                allowExternalParticipants: options.allowExternalParticipants !== false,
                enableRecording: !!options.enableRecording
            };
            
            return await this.api.createMeetLink(meetingOptions);
        } catch (error) {
            console.error('Error creating Meet link:', error);
            throw error;
        }
    }
}

// Export a singleton instance
export default new GoogleMeetProvider();