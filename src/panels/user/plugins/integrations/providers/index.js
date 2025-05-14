import GoogleCalendarProvider from './google-calendar';
import OutlookCalendarProvider from './outlook-calendar';
import GoogleMeetProvider from './google-meet';

/**
 * Map of all available integration providers
 * Key is the provider ID
 */
const PROVIDERS = {
    google_calendar: GoogleCalendarProvider,
    outlook_calendar: OutlookCalendarProvider,
    google_meet: GoogleMeetProvider,
    // For future implementation:
    // microsoft_teams: MicrosoftTeamsProvider,
    // zoom: ZoomProvider
};

/**
 * Get a provider by ID
 * @param {string} id - Provider ID
 * @returns {BaseIntegrationProvider|null} - Provider instance or null if not found
 */
export function getProvider(id) {
    return PROVIDERS[id] || null;
}

/**
 * Get all provider instances
 * @returns {Array} - Array of provider instances
 */
export function getAllProviders() {
    return Object.values(PROVIDERS);
}

/**
 * Get provider details for UI
 * @returns {Array} - Array of provider details
 */
export function getProviderDetails() {
    return Object.values(PROVIDERS).map(provider => provider.getDetails());
}

export default {
    getProvider,
    getAllProviders,
    getProviderDetails
};