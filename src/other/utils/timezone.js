import { storage } from '@utils/storage';

export const timezoneUtils = {
    // Get user's timezone preference or use browser default
    getUserTimezone() {
        const savedTimezone = storage.get('user.timezone');
        return savedTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    },
    
    // Save user's timezone preference
    setUserTimezone(timezone) {
        storage.set('user.timezone', timezone);
        return timezone;
    },
    
    // Convert UTC/server time to user's timezone
    convertToUserTimezone(dateString) {
        if (!dateString) return null;
        
        // Parse the date string
        const date = new Date(dateString);
        
        // Get the timezone offset directly from user's browser
        // This handles DST automatically
        const userOffset = new Date().getTimezoneOffset() * 60000;
        const utcTime = date.getTime();
        
        // Create date that's adjusted for user's timezone
        return new Date(utcTime - userOffset);
    },
    
    // Format a date for display in user's timezone
    formatTimeDisplay(dateString) {
        const date = this.convertToUserTimezone(dateString);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
    },
    
    // Format a date for display with timezone info
    formatDateDisplay(dateString) {
        const date = this.convertToUserTimezone(dateString);
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    },
    
    // Get common timezones
    getTimezoneOptions() {
        return [
            { label: 'UTC', value: 'UTC' },
            { label: 'London (GMT)', value: 'Europe/London' },
            { label: 'Paris (CET)', value: 'Europe/Paris' },
            { label: 'Berlin (CET)', value: 'Europe/Berlin' },
            { label: 'New York (EST/EDT)', value: 'America/New_York' },
            { label: 'Chicago (CST/CDT)', value: 'America/Chicago' },
            { label: 'Denver (MST/MDT)', value: 'America/Denver' },
            { label: 'Los Angeles (PST/PDT)', value: 'America/Los_Angeles' },
            { label: 'Tokyo (JST)', value: 'Asia/Tokyo' },
            { label: 'Shanghai (CST)', value: 'Asia/Shanghai' },
            { label: 'Sydney (AEST/AEDT)', value: 'Australia/Sydney' },
            { label: 'Auckland (NZST/NZDT)', value: 'Pacific/Auckland' }
        ];
    },
    
    // Get current timezone offset for display
    getCurrentTimezoneDisplay() {
        const offset = new Date().getTimezoneOffset();
        const hours = Math.abs(Math.floor(offset / 60));
        const minutes = Math.abs(offset % 60);
        const sign = offset < 0 ? '+' : '-';
        
        return `UTC${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    },
    
    // Get the date key for grouping (convert to user's timezone)
    getDateKey(dateString) {
        const date = this.convertToUserTimezone(dateString);
        return date.toDateString();
    }
};