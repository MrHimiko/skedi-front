// src/panels/user/plugins/integrations/providers/outlook-calendar/api.js
import { api } from '@utils/api';

/**
 * Outlook Calendar API wrapper
 */
export default class OutlookCalendarApi {
    /**
     * Constructor
     * @param {OutlookCalendarProvider} provider - Provider instance
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
     * Make API request to Outlook Calendar
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
            throw new Error('Not connected to Outlook Calendar');
        }
        
        // In production, make actual API requests
        const headers = {
            'Authorization': `Bearer ${accessToken}`
        };
        
        // Proxy API request through backend to avoid CORS issues
        const response = await api.request({
            url: `user/integrations/outlook_calendar/proxy`,
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
        if (endpoint === 'me/calendars' && method === 'GET') {
            return {
                items: [
                    {
                        id: 'primary',
                        name: 'Primary Calendar',
                        isDefault: true,
                        color: '#4285F4'
                    },
                    {
                        id: 'AQMkADAwATM0MDAAMS0zMkftAGLvLsAARgAAA3nJVAZLjEJCrWR8tuIv',
                        name: 'Work Calendar',
                        color: '#0B8043'
                    },
                    {
                        id: 'AQMkADAwATM0MDAAMS0zMkZjAGLvLsAARgAAA3nJVAZLj45Ct5tWR8t',
                        name: 'Family Calendar',
                        color: '#8E24AA'
                    }
                ]
            };
        } else if (endpoint.includes('/events') && method === 'GET') {
            return {
                items: [
                    {
                        id: 'event1',
                        subject: 'Team Meeting',
                        bodyPreview: 'Weekly team sync',
                        start: {
                            dateTime: new Date(Date.now() + 86400000).toISOString(),
                            timeZone: 'UTC'
                        },
                        end: {
                            dateTime: new Date(Date.now() + 86400000 + 3600000).toISOString(),
                            timeZone: 'UTC'
                        },
                        location: {
                            displayName: 'Conference Room'
                        },
                        organizer: {
                            emailAddress: {
                                address: 'user@example.com'
                            }
                        }
                    },
                    {
                        id: 'event2',
                        subject: 'Lunch with Client',
                        start: {
                            dateTime: new Date(Date.now() + 172800000).toISOString(),
                            timeZone: 'UTC'
                        },
                        end: {
                            dateTime: new Date(Date.now() + 172800000 + 5400000).toISOString(),
                            timeZone: 'UTC'
                        },
                        location: {
                            displayName: 'Downtown Restaurant'
                        }
                    }
                ]
            };
        } else if (endpoint.includes('/events') && method === 'POST') {
            // Mock create event
            return {
                id: 'new-event-' + Date.now(),
                status: 'confirmed',
                webLink: 'https://outlook.office.com/calendar/deeplink/event?id=mock',
                ...data
            };
        } else if (endpoint.includes('/events/') && method === 'PUT') {
            // Mock update event
            return {
                ...data,
                updated: new Date().toISOString()
            };
        } else if (endpoint.includes('/events/') && method === 'DELETE') {
            // Mock delete event
            return {};
        } else if (endpoint === 'freeBusy' && method === 'POST') {
            // Mock freeBusy request
            const start = new Date(data.timeMin);
            const end = new Date(data.timeMax);
            
            // Randomly determine if the time is available (80% chance of being available in mock)
            const isAvailable = Math.random() > 0.2;
            
            const response = {
                calendars: {}
            };
            
            data.items.forEach(item => {
                response.calendars[item.id] = {
                    busy: []
                };
                
                if (!isAvailable) {
                    response.calendars[item.id].busy.push({
                        start: start.toISOString(),
                        end: end.toISOString()
                    });
                }
            });
            
            return response;
        }
        
        // Default fallback response
        return {};
    }
    
    /**
     * Get calendars
     * @returns {Promise<Array>} - List of calendars
     */
    async getCalendars() {
        const response = await this._makeRequest('me/calendars');
        return response.items || [];
    }
    
    /**
     * Get events from a calendar
     * @param {string} calendarId - Calendar ID
     * @param {Object} options - Options for fetching events
     * @returns {Promise<Array>} - List of events
     */
    async getEvents(calendarId, options = {}) {
        const params = new URLSearchParams();
        
        if (options.timeMin) {
            params.append('startDateTime', new Date(options.timeMin).toISOString());
        }
        
        if (options.timeMax) {
            params.append('endDateTime', new Date(options.timeMax).toISOString());
        }
        
        if (options.maxResults) {
            params.append('top', options.maxResults);
        }
        
        if (options.orderBy) {
            params.append('orderBy', options.orderBy);
        }
        
        const queryString = params.toString() ? `?${params.toString()}` : '';
        const endpoint = calendarId === 'primary' ? 
            `me/calendar/events${queryString}` : 
            `me/calendars/${calendarId}/events${queryString}`;
        
        const response = await this._makeRequest(endpoint);
        
        return response.items || [];
    }
    
    /**
     * Create an event in a calendar
     * @param {string} calendarId - Calendar ID
     * @param {Object} eventData - Event data
     * @returns {Promise<Object>} - Created event
     */
    async createEvent(calendarId, eventData) {
        const endpoint = calendarId === 'primary' ? 
            `me/calendar/events` : 
            `me/calendars/${calendarId}/events`;
            
        return await this._makeRequest(endpoint, 'POST', eventData);
    }
    
    /**
     * Update an event in a calendar
     * @param {string} calendarId - Calendar ID
     * @param {string} eventId - Event ID
     * @param {Object} eventData - Event data
     * @returns {Promise<Object>} - Updated event
     */
    async updateEvent(calendarId, eventId, eventData) {
        const endpoint = calendarId === 'primary' ? 
            `me/calendar/events/${eventId}` : 
            `me/calendars/${calendarId}/events/${eventId}`;
            
        return await this._makeRequest(endpoint, 'PUT', eventData);
    }
    
    /**
     * Delete an event from a calendar
     * @param {string} calendarId - Calendar ID
     * @param {string} eventId - Event ID
     * @returns {Promise<boolean>} - True if successful
     */
    async deleteEvent(calendarId, eventId) {
        const endpoint = calendarId === 'primary' ? 
            `me/calendar/events/${eventId}` : 
            `me/calendars/${calendarId}/events/${eventId}`;
            
        await this._makeRequest(endpoint, 'DELETE');
        return true;
    }
    
    /**
     * Check availability for a time range
     * @param {Date} startTime - Start time
     * @param {Date} endTime - End time
     * @param {Array} calendarIds - Calendar IDs to check (optional)
     * @returns {Promise<boolean>} - True if available
     */
    async checkAvailability(startTime, endTime, calendarIds = null) {
        // If no calendar IDs specified, use primary calendar
        if (!calendarIds || !calendarIds.length) {
            calendarIds = ['primary'];
        }
        
        // Outlook uses a different endpoint for free/busy check
        const requestData = {
            timeMin: startTime.toISOString(),
            timeMax: endTime.toISOString(),
            items: calendarIds.map(id => ({ id }))
        };
        
        const response = await this._makeRequest('freeBusy', 'POST', requestData);
        
        // Check if any calendar is busy during the specified time
        let isAvailable = true;
        
        if (response.calendars) {
            for (const calendarId of calendarIds) {
                if (response.calendars[calendarId] && 
                    response.calendars[calendarId].busy && 
                    response.calendars[calendarId].busy.length > 0) {
                    isAvailable = false;
                    break;
                }
            }
        }
        
        return isAvailable;
    }
}