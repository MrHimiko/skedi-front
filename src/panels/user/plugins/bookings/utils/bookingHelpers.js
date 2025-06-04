
import { getLocationIcon } from '@user_bookings/config/locationIcons';

/**
 * Get formatted attendees text for a booking
 */
export function getAttendeesText(booking) {
    if (!booking) return '';
    
    const guests = booking.guests || [];
    const hosts = booking.hosts || [];
    const totalGuests = guests.length;
    const totalHosts = hosts.length;
    
    // Simple case: 1 host (me) and 1 guest
    if (totalHosts === 1 && totalGuests === 1) {
        return `You and ${guests[0].email}`;
    }
    
    // Complex case: multiple hosts/guests
    let text = 'You';
    
    if (totalHosts > 1) {
        text += ` and ${totalHosts - 1} more host${totalHosts > 2 ? 's' : ''}`;
    }
    
    if (totalGuests > 0) {
        if (totalHosts > 1) text += ' & ';
        else text += ' and ';
        text += `${totalGuests} guest${totalGuests > 1 ? 's' : ''}`;
    }
    
    return text;
}

/**
 * Get location info for a booking
 */
export function getLocationInfo(booking) {
    if (!booking || !booking.location || !Array.isArray(booking.location) || booking.location.length === 0) {
        return { type: 'custom', name: 'No location' };
    }
    
    const location = booking.location[0];
    const iconConfig = getLocationIcon(location.type);
    
    return {
        type: location.type,
        name: iconConfig.name,
        icon: iconConfig.icon,
        showMeetingLink: iconConfig.showMeetingLink
    };
}

/**
 * Format date for headers
 */
export function formatDateHeader(date) {
    if (!date) return 'Unknown Date';
    
    try {
        const itemDate = date instanceof Date ? date : new Date(date);
        if (isNaN(itemDate.getTime())) return 'Invalid Date';
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        
        const compareDate = new Date(itemDate);
        compareDate.setHours(0, 0, 0, 0);
        
        if (compareDate.getTime() === today.getTime()) {
            return 'Today';
        } else if (compareDate.getTime() === tomorrow.getTime()) {
            return 'Tomorrow';
        } else {
            return itemDate.toLocaleDateString('en-US', { 
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });
        }
    } catch (error) {
        console.error('Error formatting date:', error);
        return 'Invalid Date';
    }
}

/**
 * Get booking actions based on status
 */
export function getBookingActions(booking) {
    if (!booking) return [];
    
    const actions = [];
    
    if (booking.status !== 'canceled') {
        // Only show Join Meeting if meeting link exists
        if (booking.meeting_link) {
            actions.push({ 
                label: 'Join Meeting',
                action: 'join'
            });
        }
        
        actions.push({ 
            label: 'Copy Booking Link', 
            action: 'copy'
        });
        
        actions.push({ 
            label: 'Reschedule',
            action: 'reschedule'
        });
        
        actions.push({ 
            label: 'Cancel',
            action: 'cancel'
        });
    } else {
        actions.push({ 
            label: 'Remove',
            action: 'remove'
        });
    }
    
    return actions;
}