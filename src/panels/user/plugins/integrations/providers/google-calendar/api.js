// src/panels/user/plugins/integrations/providers/google-calendar/api.js
import { api } from '@utils/api';

/**
 * Google Calendar API wrapper
 */
export default class GoogleCalendarApi {
    /**
     * Constructor
     * @param {GoogleCalendarProvider} provider - Provider instance
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
     * Make API request to Google Calendar
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
            throw new Error('Not connected to Google Calendar');
        }
        
        // In production, make actual API requests
        const headers = {
            'Authorization': `Bearer ${accessToken}`
        };
        
        // Proxy API request through backend to avoid CORS issues
        const response = await api.request({
            url: `user/integrations/google_calendar/proxy`,
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
        if (endpoint === 'calendarList' && method === 'GET') {
            return {
                items: [
                    {
                        id: 'primary',
                        summary: 'Primary Calendar',
                        primary: true,
                        backgroundColor: '#4285F4'
                    },
                    {
                        id: 'en.usa#holiday@group.v.calendar.google.com',
                        summary: 'Holidays in United States',
                        backgroundColor: '#B71C1C'
                    },
                    {
                        id: 'family@example.com',
                        summary: 'Family Calendar',
                        backgroundColor: '#0B8043'
                    }
                ]
            };
        } else if (endpoint.startsWith('calendars/') && endpoint.includes('/events') && method === 'GET') {
            const calendarId = endpoint.split('/')[1];
            
            return {
                items: [
                    {
                        id: 'event1',
                        summary: 'Team Meeting',
                        description: 'Weekly team sync',
                        start: {
                            dateTime: new Date(Date.now() + 86400000).toISOString(),
                            timeZone: 'UTC'
                        },
                        end: {
                            dateTime: new Date(Date.now() + 86400000 + 3600000).toISOString(),
                            timeZone: 'UTC'
                        },
                        location: 'Conference Room',
                        creator: {
                            email: 'user@example.com'
                        }
                    },
                    {
                        id: 'event2',
                        summary: 'Lunch with Client',
                        start: {
                            dateTime: new Date(Date.now() + 172800000).toISOString(),
                            timeZone: 'UTC'
                        },
                        end: {
                            dateTime: new Date(Date.now() + 172800000 + 5400000).toISOString(),
                            timeZone: 'UTC'
                        },
                        location: 'Downtown Restaurant'
                    }
                ]
            };
        } else if (endpoint.startsWith('calendars/') && endpoint.includes('/events') && method === 'POST') {
            // Mock create event
            return {
                id: 'new-event-' + Date.now(),
                status: 'confirmed',
                htmlLink: 'https://calendar.google.com/calendar/event?eid=mock',
                ...data
            };
        } else if (endpoint.startsWith('calendars/') && endpoint.includes('/events/') && method === 'PUT') {
            // Mock update event
            return {
                ...data,
                updated: new Date().toISOString()
            };
        } else if (endpoint.startsWith('calendars/') && endpoint.includes('/events/') && method === 'DELETE') {
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
        const response = await this._makeRequest('calendarList');
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
            params.append('timeMin', new Date(options.timeMin).toISOString());
        }
        
        if (options.timeMax) {
            params.append('timeMax', new Date(options.timeMax).toISOString());
        }
        
        if (options.maxResults) {
            params.append('maxResults', options.maxResults);
        }
        
        if (options.orderBy) {
            params.append('orderBy', options.orderBy);
        }
        
        const queryString = params.toString() ? `?${params.toString()}` : '';
        const response = await this._makeRequest(`calendars/${calendarId}/events${queryString}`);
        
        return response.items || [];
    }
    
    /**
     * Create an event in a calendar
     * @param {string} calendarId - Calendar ID
     * @param {Object} eventData - Event data
     * @returns {Promise<Object>} - Created event
     */
    async createEvent(calendarId, eventData) {
        return await this._makeRequest(`calendars/${calendarId}/events`, 'POST', eventData);
    }
    
    /**
     * Update an event in a calendar
     * @param {string} calendarId - Calendar ID
     * @param {string} eventId - Event ID
     * @param {Object} eventData - Event data
     * @returns {Promise<Object>} - Updated event
     */
    async updateEvent(calendarId, eventId, eventData) {
        return await this._makeRequest(`calendars/${calendarId}/events/${eventId}`, 'PUT', eventData);
    }
    
    /**
     * Delete an event from a calendar
     * @param {string} calendarId - Calendar ID
     * @param {string} eventId - Event ID
     * @returns {Promise<boolean>} - True if successful
     */
    async deleteEvent(calendarId, eventId) {
        await this._makeRequest(`calendars/${calendarId}/events/${eventId}`, 'DELETE');
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