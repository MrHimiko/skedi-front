// src/panels/user/plugins/_shared/utils/locationHelpers.js
// Helper functions for location icons and tooltips

import { 
    PhMapPin, 
    PhVideoCameraSlash, 
    PhGlobe, 
    PhBuildings,
    PhPhone,
    PhLink
} from '@phosphor-icons/vue';

// Custom SVG icon for Google Meet (you can add your actual SVG here)
const GoogleMeetIcon = {
    template: `
        <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 9.5v5l4 2.5v-10L12 9.5z"/>
            <path d="M8 6.5l-4 3v5l4 3 4-3v-5l-4-3z"/>
        </svg>
    `
};

/**
 * Map of location types to their icons
 * Add new location types here as they become available
 */
export const locationIconMap = {
    'google_meet': GoogleMeetIcon, // Use custom Google Meet icon
    'web_conferencing': PhGlobe,
    'web_conferencing_link': PhLink,
    'in_person': PhBuildings,
    'in_person_meeting': PhBuildings,
    'custom': PhMapPin,
    'custom_location': PhMapPin,
    'phone': PhPhone,
    'zoom': PhVideoCameraSlash,
    'teams': PhVideoCameraSlash,
    'default': PhMapPin
};

/**
 * Get the appropriate icon component for a location
 * @param {Object|String} location - Location object or type string
 * @returns {Component} Vue component for the icon
 */
export function getLocationIcon(location) {
    if (!location) {
        return locationIconMap.default;
    }
    
    const locationType = typeof location === 'string' 
        ? location 
        : (location.type || location.value || 'default');
    
    // Normalize the location type (handle different formats)
    const normalizedType = locationType.toLowerCase().replace(/\s+/g, '_');
    
    return locationIconMap[normalizedType] || locationIconMap.default;
}

/**
 * Get formatted tooltip text for a location
 * @param {Object|String} location - Location object or type string
 * @returns {String} Formatted tooltip text
 */
export function getLocationTooltip(location) {
    if (!location) {
        return 'No location set';
    }
    
    // Handle string location
    if (typeof location === 'string') {
        return formatLocationString(location);
    }
    
    // Handle object location
    const locationType = location.type || location.value;
    
    switch (locationType) {
        case 'google_meet':
            return 'Location: Google Meet';
            
        case 'web_conferencing':
        case 'web_conferencing_link':
            return location.url 
                ? `Location: Web conferencing\nLink: ${location.url}`
                : 'Location: Web conferencing link';
            
        case 'in_person':
        case 'in_person_meeting':
            if (location.address) {
                const address = typeof location.address === 'object'
                    ? formatAddress(location.address)
                    : location.address;
                return `Location: In person\nAddress: ${address}`;
            }
            return 'Location: In person meeting';
            
        case 'custom':
        case 'custom_location':
            return location.custom || location.name
                ? `Location: ${location.custom || location.name}`
                : 'Location: Custom location';
            
        case 'phone':
            return location.number
                ? `Location: Phone\nNumber: ${location.number}`
                : 'Location: Phone call';
                
        case 'zoom':
            return location.url
                ? `Location: Zoom\nLink: ${location.url}`
                : 'Location: Zoom meeting';
                
        case 'teams':
            return location.url
                ? `Location: Microsoft Teams\nLink: ${location.url}`
                : 'Location: Microsoft Teams';
            
        default:
            return 'Location set';
    }
}

/**
 * Format a location string for display
 * @param {String} locationStr - Raw location string
 * @returns {String} Formatted location string
 */
function formatLocationString(locationStr) {
    const formatted = locationStr
        .replace(/_/g, ' ')
        .replace(/\b\w/g, char => char.toUpperCase());
    
    return `Location: ${formatted}`;
}

/**
 * Format an address object for display
 * @param {Object} address - Address object
 * @returns {String} Formatted address string
 */
function formatAddress(address) {
    const parts = [];
    
    if (address.street) parts.push(address.street);
    if (address.city) parts.push(address.city);
    if (address.state) parts.push(address.state);
    if (address.zip) parts.push(address.zip);
    if (address.country) parts.push(address.country);
    
    return parts.join(', ') || address.full || 'Address provided';
}

/**
 * Check if a location requires a link
 * @param {Object|String} location - Location object or type
 * @returns {Boolean} True if location needs a link
 */
export function locationNeedsLink(location) {
    if (!location) return false;
    
    const locationType = typeof location === 'string'
        ? location
        : (location.type || location.value);
        
    const linkTypes = [
        'google_meet',
        'web_conferencing',
        'web_conferencing_link',
        'zoom',
        'teams'
    ];
    
    return linkTypes.includes(locationType);
}

/**
 * Get location display name
 * @param {Object|String} location - Location object or type
 * @returns {String} Display name for the location
 */
export function getLocationDisplayName(location) {
    if (!location) return 'Not set';
    
    const displayNames = {
        'google_meet': 'Google Meet',
        'web_conferencing': 'Web Conference',
        'web_conferencing_link': 'Web Conference',
        'in_person': 'In Person',
        'in_person_meeting': 'In Person',
        'custom': 'Custom',
        'custom_location': 'Custom',
        'phone': 'Phone',
        'zoom': 'Zoom',
        'teams': 'Microsoft Teams'
    };
    
    const locationType = typeof location === 'string'
        ? location
        : (location.type || location.value);
        
    return displayNames[locationType] || 'Location';
}