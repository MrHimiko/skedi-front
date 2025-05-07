import GoogleCalendarProvider from './google-calendar';

// In the future, import other providers:
// import GoogleMeetProvider from './google-meet';
// import MicrosoftCalendarProvider from './microsoft-calendar';
// import ZoomProvider from './zoom';

/**
 * Map of all available integration providers
 * Key is the provider ID
 */
const PROVIDERS = {
    google_calendar: GoogleCalendarProvider,
    // For future implementation:
    // google_meet: GoogleMeetProvider, 
    // microsoft_calendar: MicrosoftCalendarProvider,
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