// src/panels/user/plugins/integrations/services/calendar-sync.js
import { api } from '@utils/api';
import { common } from '@utils/common';


/**
 * Sync external calendar events with the database
 * Default is 3 months before and 3 months after today
 * 
 * @returns {Promise<boolean>} - Success status
 */
export async function syncCalendarEvents() {
  try {
    // Show loading notification
    common.notification('Syncing calendar events...', true);
    
    // Create dates for 3 months before and 3 months after today
    const today = new Date();
    
    const startDate = new Date(today);
    startDate.setMonth(today.getMonth() - 3); // 3 months before
    
    const endDate = new Date(today);
    endDate.setMonth(today.getMonth() + 3); // 3 months after
    
    // Format dates in YYYY-MM-DD format
    const formattedStartDate = startDate.toISOString().split('T')[0];
    const formattedEndDate = endDate.toISOString().split('T')[0];
    
    console.log('Syncing with date range:', formattedStartDate, 'to', formattedEndDate);
    
    // Build query params with force sync
    const params = new URLSearchParams({
      start_date: formattedStartDate,
      end_date: formattedEndDate,
      sync: 'force' // This forces a full sync
    });
    
    // Call the API
    const response = await api.get(`user/integrations/events?${params.toString()}`);
    
    if (response && response.success) {
      common.notification('Calendar events synced successfully', true);
      return true;
    } else {
      throw new Error(response?.message || 'Failed to sync calendar events');
    }
  } catch (error) {
    console.error('Error syncing calendar events:', error);
    common.notification('Failed to sync calendar events: ' + (error.message || 'Unknown error'), false);
    return false;
  }
}

/**
 * Sync Google Calendar events for a specific integration
 * Default is 3 months before and 3 months after today
 * 
 * @param {number} integrationId - Integration ID
 * @returns {Promise<boolean>} - Success status
 */
export async function syncSpecificCalendar(integrationId) {
  try {
    // Show loading notification
    common.notification('Syncing calendar...', true);
    
    // Create dates for 3 months before and 3 months after today
    const today = new Date();
    
    const startDate = new Date(today);
    startDate.setMonth(today.getMonth() - 3); // 3 months before
    
    const endDate = new Date(today);
    endDate.setMonth(today.getMonth() + 3); // 3 months after
    
    // Format dates in YYYY-MM-DD format
    const formattedStartDate = startDate.toISOString().split('T')[0];
    const formattedEndDate = endDate.toISOString().split('T')[0];
    
    // Make API call to sync specific integration
    const response = await api.post(`user/integrations/${integrationId}/sync`, {
      start_date: formattedStartDate,
      end_date: formattedEndDate
    });
    
    if (response && response.success) {
      common.notification('Calendar synced successfully', true);
      return true;
    } else {
      throw new Error(response?.message || 'Failed to sync calendar');
    }
  } catch (error) {
    console.error('Error syncing specific calendar:', error);
    common.notification('Failed to sync calendar: ' + (error.message || 'Unknown error'), false);
    return false;
  }
}