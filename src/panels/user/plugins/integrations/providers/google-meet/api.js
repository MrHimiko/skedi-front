// src/panels/user/plugins/integrations/providers/google-meet/api.js
import { api } from '@utils/api';

/**
 * Google Meet API wrapper
 */
export default class GoogleMeetApi {
    /**
     * Constructor
     * @param {GoogleMeetProvider} provider - Provider instance
     */
    constructor(provider) {
        this.provider = provider;
    }
    
    /**
     * Get access token from provider
     * @returns {string|null} - Access token or null if not available
     * @private
     */
    _getAccessToken() {
        const connection = this.provider.getConnection();
        return connection ? connection.access_token : null;
    }
    
    /**
     * Make API request to Google Meet
     * @param {string} endpoint - API endpoint
     * @param {string} method - HTTP method
     * @param {Object} data - Request data
     * @returns {Promise<Object>} - API response
     * @private
     */
    async _makeRequest(endpoint, method = 'GET', data = null) {
        if (this.provider.isDevelopmentMode) {
            // Mock API responses in development mode
            return this._getMockResponse(endpoint, method, data);
        }
        
        const accessToken = this._getAccessToken();
        
        if (!accessToken) {
            throw new Error('Not connected to Google Meet');
        }
        
        // In production, make actual API requests
        const headers = {
            'Authorization': `Bearer ${accessToken}`
        };
        
        // Proxy API request through backend to avoid CORS issues
        const response = await api.request({
            url: `user/integrations/google_meet/proxy`,
            method: 'POST',
            data: {
                endpoint,
                method,
                data
            },
            headers
        });
        
        if (!response.success) {
            throw new Error(response.message || 'API request failed');
        }
        
        return response.data;
    }
    
    /**
     * Generate mock responses for development
     * @param {string} endpoint - API endpoint
     * @param {string} method - HTTP method
     * @param {Object} data - Request data
     * @returns {Promise<Object>} - Mock response
     * @private
     */
    async _getMockResponse(endpoint, method, data) {
        // Add a small delay to simulate API latency
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Route mock responses based on endpoint and method
        if (endpoint === 'spaces' && method === 'GET') {
            return {
                spaces: [
                    {
                        id: 'space1',
                        name: 'Team Meeting Space',
                        created: new Date(Date.now() - 86400000).toISOString()
                    },
                    {
                        id: 'space2',
                        name: 'Client Discussion',
                        created: new Date(Date.now() - 172800000).toISOString()
                    }
                ]
            };
        } else if (endpoint === 'spaces' && method === 'POST') {
            // Mock create meet space
            return {
                id: 'space-' + Date.now(),
                name: data.name || 'New Meeting',
                meetLink: `https://meet.google.com/${Math.random().toString(36).substring(2, 10)}`,
                created: new Date().toISOString()
            };
        } else if (endpoint.startsWith('spaces/') && method === 'GET') {
            // Mock get space details
            const spaceId = endpoint.split('/')[1];
            return {
                id: spaceId,
                name: 'Meeting ' + spaceId,
                meetLink: `https://meet.google.com/${spaceId}`,
                created: new Date(Date.now() - 86400000).toISOString(),
                participants: [
                    {
                        id: 'user1',
                        email: 'user@example.com',
                        role: 'organizer'
                    },
                    {
                        id: 'user2',
                        email: 'participant@example.com',
                        role: 'attendee'
                    }
                ]
            };
        } else if (endpoint.startsWith('spaces/') && method === 'DELETE') {
            // Mock delete space
            return {
                success: true
            };
        }
        
        // Default fallback response
        return {};
    }
    
    /**
     * Create a Meet link
     * @param {Object} options - Meet link options
     * @returns {Promise<Object>} - Created Meet link info
     */
    async createMeetLink(options = {}) {
        return await this._makeRequest('spaces', 'POST', {
            name: options.title || 'New Meeting',
            allowExternalParticipants: options.allowExternalParticipants !== false,
            enableRecording: !!options.enableRecording
        });
    }
    
    /**
     * Get details of a Meet space
     * @param {string} spaceId - Space ID
     * @returns {Promise<Object>} - Space details
     */
    async getMeetSpace(spaceId) {
        return await this._makeRequest(`spaces/${spaceId}`);
    }
    
    /**
     * List recent Meet spaces
     * @param {Object} options - List options
     * @returns {Promise<Array>} - List of spaces
     */
    async listMeetSpaces(options = {}) {
        const params = new URLSearchParams();
        
        if (options.pageSize) {
            params.append('pageSize', options.pageSize);
        }
        
        if (options.pageToken) {
            params.append('pageToken', options.pageToken);
        }
        
        const queryString = params.toString() ? `?${params.toString()}` : '';
        const response = await this._makeRequest(`spaces${queryString}`);
        
        return response.spaces || [];
    }
    
    /**
     * Delete a Meet space
     * @param {string} spaceId - Space ID
     * @returns {Promise<boolean>} - True if successful
     */
    async deleteMeetSpace(spaceId) {
        await this._makeRequest(`spaces/${spaceId}`, 'DELETE');
        return true;
    }
}