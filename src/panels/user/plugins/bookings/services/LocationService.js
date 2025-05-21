// src/panels/user/plugins/bookings/services/LocationService.js
import { api } from '@utils/api';
import { common } from '@utils/common';
import { GoogleMeetService } from '@user_integrations/services/GoogleMeetService';

/**
 * Service for handling meeting location logic
 */
export class LocationService {
    /**
     * Process location data for a booking
     * Handles special locations like Google Meet by generating links
     * 
     * @param {Object} locationData - Location data from event
     * @param {string} title - Meeting title
     * @param {string} startTime - ISO string of start time
     * @param {string} endTime - ISO string of end time
     * @param {number} eventId - Related event ID
     * @param {number} bookingId - Related booking ID
     * @returns {Promise<Object>} - Processed location data with any generated links
     */
    static async processLocation(locationData, title, startTime, endTime, eventId, bookingId) {
        try {
            // Handle different location types
            if (!locationData || (typeof locationData === 'object' && !locationData.type)) {
                return { type: 'custom', value: '' };
            }
            
            // Convert string location to object format (backwards compatibility)
            if (typeof locationData === 'string') {
                return {
                    type: 'link',
                    value: locationData
                };
            }
            
            // Process based on type
            switch (locationData.type) {
                case 'google_meet':
                    // Generate a Google Meet link
                    try {
                        if (!locationData.integration_id) {
                            // If no integration ID is provided, try to get the default one
                            const integration = await GoogleMeetService.getGoogleMeetIntegration();
                            
                            if (!integration) {
                                return {
                                    type: 'custom',
                                    value: 'Google Meet (integration not found)'
                                };
                            }
                            
                            locationData.integration_id = integration.id;
                        }
                        
                        // Create the Meet link
                        const meetData = await GoogleMeetService.createMeetLink(
                            locationData.integration_id,
                            title,
                            startTime,
                            endTime,
                            eventId,
                            bookingId
                        );
                        
                        return {
                            type: 'google_meet',
                            value: meetData.meet_link,
                            meet_id: meetData.meet_id,
                            integration_id: locationData.integration_id
                        };
                    } catch (error) {
                        console.error('Error creating Google Meet link:', error);
                        return {
                            type: 'custom',
                            value: 'Failed to generate Google Meet link'
                        };
                    }
                
                case 'link':
                    return {
                        type: 'link',
                        value: locationData.link || ''
                    };
                
                case 'in_person':
                    return {
                        type: 'in_person',
                        value: locationData.address || 'In person meeting'
                    };
                
                case 'custom':
                    return {
                        type: 'custom',
                        value: locationData.custom || ''
                    };
                
                default:
                    return {
                        type: 'custom',
                        value: ''
                    };
            }
        } catch (error) {
            console.error('Error processing location:', error);
            return {
                type: 'custom',
                value: ''
            };
        }
    }
}

export default LocationService;