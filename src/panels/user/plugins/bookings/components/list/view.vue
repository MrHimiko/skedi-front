<script setup>
import { ref } from 'vue';
import { UserStore } from '@stores/user';
import ButtonComponent from '@form/button/view.vue';
import { common } from '@utils/common';
import { BookingsService } from '@user_bookings/services/bookings';
import { api } from '@utils/api';
import { 
  PhCalendar, PhClock, PhMapPin, PhUsers, 
  PhVideoCamera, PhClipboard, PhX, PhCheck, PhTrash,
  PhDotsThree
} from "@phosphor-icons/vue";
import MenusComponent from '@global/menus/view.vue';
import BookingDetailView from '@user_bookings/components/detail/view.vue';
import { popup } from '@utils/popup';
import ConfirmComponent from '@floated/confirm/view.vue';

const props = defineProps({
  bookings: {
    type: Array,
    required: true
  },
  isLoading: {
    type: Boolean,
    default: false
  },
  highlightStyle: {
    type: String,
    default: '' // 'now' for highlighted current bookings
  }
});

const emit = defineEmits(['refresh']);

// Format date for headers
function formatDate(date) {
  if (!date) return 'Unknown Date';
  
  try {
    // Ensure we have a valid Date object
    const itemDate = date instanceof Date ? date : new Date(date);
    if (isNaN(itemDate.getTime())) return 'Invalid Date';
    
    // Get today and tomorrow at midnight for consistent comparison
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    // Reset time components of itemDate for comparison
    const compareDate = new Date(itemDate);
    compareDate.setHours(0, 0, 0, 0);
    
    // Compare the dates
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

// Get booking actions based on status
function getBookingActions(booking) {
  if (!booking) return [];
  
  const baseActions = [];
  
  // Only add these options for active or upcoming bookings (not canceled)
  if (booking.status !== 'canceled') {
    baseActions.push({ 
      label: 'Join Meeting',
      iconComponent: PhVideoCamera,
      weight: 'bold'
    });
    
    baseActions.push({ 
      label: 'Copy Booking Link', 
      iconComponent: PhClipboard,
      weight: 'bold'
    });
  }
  
  // Add these options for all non-canceled bookings
  if (booking.status !== 'canceled') {
    baseActions.push({ 
      label: 'Reschedule',
      iconComponent: PhCalendar,
      weight: 'bold'
    });
    
    baseActions.push({ 
      label: 'Cancel',
      iconComponent: PhX,
      weight: 'bold'
    });
  } else {
    // For canceled bookings, show 'Remove' instead of 'Cancel'
    baseActions.push({ 
      label: 'Remove',
      iconComponent: PhTrash,
      weight: 'bold'
    });
  }
  
  return baseActions;
}

// Utility function to change booking status
async function changeBookingStatus(booking, status) {
  try {
    // Extract required IDs from booking
    const bookingId = booking.booking_id;
    const eventId = booking.event_id;
    
    // Try to get organization ID
    let organizationId = booking.organization_id;
    
    // If no organization_id in booking, try to get from event
    if (!organizationId && booking.event) {
      organizationId = booking.event.organization_id;
    }
    
    // If still no organization_id, check if the booking has event_details
    if (!organizationId && booking.event_details && booking.event_details.organization_id) {
      organizationId = booking.event_details.organization_id;
    }
    
    // As a last resort, try to get from user's first organization
    if (!organizationId) {
      const userStore = UserStore();
      const orgs = userStore.getOrganizations();
      if (Array.isArray(orgs) && orgs.length > 0 && orgs[0].entity) {
        organizationId = orgs[0].entity.id;
      }
    }
    
    // If we still don't have an organization ID, we can't proceed
    if (!bookingId || !eventId || !organizationId) {
      console.error('Missing required booking information:', { bookingId, eventId, organizationId });
      throw new Error('Missing required booking information');
    }
    
    // Use API to update booking with new status
    const response = await api.put(
      `organizations/${organizationId}/events/${eventId}/bookings/${bookingId}`, 
      { status }
    );
    
    if (!response || !response.success) {
      throw new Error(`Failed to change booking status to ${status}`);
    }
    
    return response.data;
  } catch (error) {
    console.error(`Error changing booking status to ${status}:`, error);
    throw error;
  }
}

// Handle booking action clicks
async function handleBookingAction(event, action, booking) {
  if (!action || !action.label || !booking) return;



  console.log("ACTION", action.label);
  
  switch(action.label) {
    case 'Join Meeting':
      if (booking.conference_url) {
        window.open(booking.conference_url, '_blank');
      } else {
        common.notification('No conference link available', false);
      }
      break;
      
    case 'Copy Booking Link':
      if (booking.booking_url) {
        try {
          await navigator.clipboard.writeText(booking.booking_url);
          common.notification('Link copied to clipboard', true);
        } catch (error) {
          console.error('Error copying to clipboard:', error);
          common.notification('Failed to copy link', false);
        }
      } else {
        common.notification('No booking link available', false);
      }
      break;
      
    case 'Reschedule':
      // Implement rescheduling logic - could show a popup form
      common.notification('Reschedule functionality coming soon', true);
      break;
      
    case 'Cancel':
      popup.open(
        'cancel-booking-confirm',
        null,
        ConfirmComponent,
        {
          as: 'red',
          description: `Are you sure you want to cancel this booking?`,
          callback: async (event, data, response, success) => {
            if (success) {
              try {
                
                await changeBookingStatus(booking, 'canceled');
                common.notification('Booking canceled successfully', true);
                document.querySelector('.i-popup-close').click();
                // Emit event to refresh the bookings list
                emit('refresh');
              } catch (error) {
                common.notification('Error canceling booking: ' + (error.message || 'Unknown error'), false);
              }
            }
          }
        }
      );
      break;
      
    case 'Remove':
      popup.open(
        'remove-booking-confirm',
        null,
        ConfirmComponent,
        {
          as: 'red',
          description: `Are you sure you want to remove this canceled booking?`,
          callback: async (event, data, response, success) => {
            if (success) {
              try {
                await changeBookingStatus(booking, 'removed');
                common.notification('Booking removed successfully', true);
                document.querySelector('.i-popup-close').click();
                // Emit event to refresh the bookings list
                emit('refresh');
              } catch (error) {
                common.notification('Error removing booking: ' + (error.message || 'Unknown error'), false);
              }
            }
          }
        }
      );
      break;
  }
}



// Confirm a pending booking
async function confirmBooking(booking) {
  if (!booking) return;
  
  try {
    await changeBookingStatus(booking, 'confirmed');
    common.notification('Booking confirmed successfully', true);
    // Emit event to refresh the bookings list
    emit('refresh');
  } catch (error) {
    common.notification('Error confirming booking: ' + (error.message || 'Unknown error'), false);
  }
}

// Open booking detail popup
function openBookingDetail(booking) {
  if (!booking) return;
  
  popup.open(
    'booking-detail',
    null,
    BookingDetailView,
    {
      bookingId: booking.id,
      bookingData: booking, // Pass full booking data for direct access
      callback: (needsRefresh) => {
        if (needsRefresh) {
          // Emit event to refresh the bookings list
          emit('refresh');
        }
      }
    },
    {
      position: 'center'
    }
  );
}

// Open external event in its original calendar
function openExternalEvent(event) {
  if (!event) return;
  
  if (event.html_link) {
    window.open(event.html_link, '_blank');
  } else {
    common.notification('No event link available', false);
  }
}



// Get safe formatted calendar name
function getCalendarName(event) {
  if (!event) return 'Calendar';
  
  // If calendar_name is available, use it
  if (event.calendar_name) return event.calendar_name;
  
  // Otherwise, use source with some formatting
  if (event.source) {
    switch(event.source.toLowerCase()) {
      case 'google_calendar':
        return 'Google Calendar';
      case 'outlook':
        return 'Outlook';
      case 'apple_calendar':
        return 'Apple Calendar';
      default:
        return event.source || 'Calendar';
    }
  }
  
  return 'Calendar';
}



</script>

<template>
  <div :class="['bookings-list', highlightStyle]">
    <div v-if="isLoading" class="loading-state">
      <p>Loading bookings...</p>
    </div>
    
    <div v-else-if="!bookings || bookings.length === 0" class="empty-state">
      <p>No bookings found</p>
    </div>
    
    <div v-else class="bookings-container">
      <div 
        v-for="(item, index) in bookings" 
        :key="index"
        :class="['booking-item', item ? item.type : '', item ? item.status : '']"
      >
        <!-- Date Header -->
        <div v-if="item && item.type === 'header'" class="date-header">
          {{ formatDate(item.date) }}
        </div>
        
        <!-- Booking Item -->
        <div v-else-if="item && item.type === 'booking'" class="booking-card">
          <!-- Time indicator and color bar -->
          <div class="time-indicator">
            <div class="clr-box" :style="{ backgroundColor: item.color || '#FFDE0E' }"> </div>
            {{ item.formattedStart || '--:--' }} - {{ item.formattedEnd || '--:--' }}
          </div>
          
          <!-- Booking details -->
          <div class="booking-details">
            <div class="booking-title">
              {{ item.title }}
              
              <!-- Status badge for pending or canceled -->
              <span v-if="item.status === 'pending'" class="status-badge pending">
                Pending
              </span>
              <span v-if="item.status === 'canceled'" class="status-badge canceled">
                Canceled
              </span>
            </div>
            
            <div class="booking-attendees">
              <span class="attendee-label">
                <PhUsers weight="bold" size="14" />
                You and {{ item.attendees?.[0]?.name || 'Guest' }}
              </span>
            </div>
          </div>
          
          <!-- Platform & Actions -->
          <div class="booking-actions">
            <!-- Meeting platform -->
            <div class="meeting-platform">
              {{ item.location || 'No location' }}
            </div>
            
            <!-- Buttons section -->
            <div class="actions-buttons">
              <!-- Confirm button for pending bookings -->
              <ButtonComponent 
                v-if="item.status === 'pending'"
                label="Confirm" 
                as="secondary"
                :iconLeft="{ component: PhCheck, weight: 'bold' }"
                @click="confirmBooking(item)"
              />
              
              <!-- Details button for all bookings -->
              <ButtonComponent 
                label="Details" 
                as="tertiary"
                @click="openBookingDetail(item)"
              />
              
              <!-- Actions menu -->
              <ButtonComponent 
                v-dropdown="{ 
                  component: MenusComponent,
                  properties: {
                    menus: getBookingActions(item),
                    onClick: ($event, action) => handleBookingAction($event, action, item)
                  }
                }"
                as="tertiary icon size36"
                :iconLeft="{ component: PhDotsThree, weight: 'bold' }"
              />
            </div>
          </div>
        </div>
        
        <!-- External Event Item -->
        <div v-else-if="item && item.type === 'external_event'" class="booking-card external-event">
          <!-- Time indicator with icon instead of color box -->
          <div class="time-indicator">
            <div class="source-icon">

              <img 
                v-if="item.source === 'google_calendar'"
                src="https://global.divhunt.com/3858bb278694ec6c098fef9b26e059ab_2357.svg" 
                alt="Google Calendar"
                class="calendar-icon"
              />
              
            </div>
            {{ item.formattedStart || '--:--' }} - {{ item.formattedEnd || '--:--' }}
          </div>
          
          <!-- Event details -->
          <div class="booking-details">
            <div class="booking-title">
              {{ item.title || 'Untitled Event' }}
              
              <!-- Status badge if not confirmed -->
              <span v-if="item.status && item.status !== 'confirmed'" class="status-badge">
                {{ item.status }}
              </span>
              

            </div>
            
            <div class="external-source">
              <span class="source-label">
                {{ getCalendarName(item) }}
              </span>
            </div>
          </div>
          
          <!-- Actions -->
          <div class="booking-actions">
            <ButtonComponent 
              label="Go to Details" 
              as="tertiary"
              @click="openExternalEvent(item)"
            />
            
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.bookings-list {
  margin-bottom: 30px;
}

.bookings-container {
  border: 1px solid var(--border);
  overflow: hidden;
  border-radius: 6px;
}

.loading-state,
.empty-state {
  padding: 20px;
  text-align: center;
  color: var(--text-secondary);
  background: var(--background-1);
  border-radius: 10px;
}

.date-header {
  font-weight: 500;
  background-color: var(--background-1);
  padding: 10px 20px;
  border-bottom: 1px solid var(--border);
}

.booking-card {
  display: flex;
  align-items: center;
  padding: 20px;
  background-color: var(--background-0);
  border-bottom: 1px solid var(--border);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.booking-item:last-of-type .booking-card {border-bottom: none;}

.time-indicator {
  font-size: 13px;
  font-weight: 400;
  min-width: 120px;
  display: flex;
  align-items: center;
  gap: 15px;
  text-align: center;
}

.time-indicator > .clr-box {
  width: 24px;
  height: 10px;
  border-radius: 100px;
}

/* Calendar icon for external events */
.source-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
}

.calendar-icon {
  width: 18px;
  height: 18px;
}

.booking-details {
  flex: 1;
  margin-left: 65px;
}

.booking-title {
  font-weight: 600;
  margin-bottom: 5px;
  font-size: 16px;
  display: flex;
  align-items: center;
  gap: 10px;
}

/* Status badges */
.status-badge {
  font-size: 12px;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 10px;
  text-transform: capitalize;
}

.status-badge.pending {
  background-color: #fff8e1;
  color: #ff8f00;
}

.status-badge.canceled {
  background-color: #ffebee;
  color: #c62828;
}

.busy-badge {
  font-size: 12px;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 10px;
  background-color: #ffebee;
  color: #c62828;
}

.booking-attendees {
  color: var(--text-secondary);
  font-size: 13px;
  display: flex;
  align-items: center;
}

.attendee-label {
  display: flex;
  align-items: center;
  gap: 5px;
}

/* External event source styling */
.external-source {
  color: var(--text-secondary);
  font-size: 13px;
}

.source-label {
  display: flex;
  align-items: center;
  gap: 5px;
}

.booking-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.meeting-platform {
  font-size: 13px;
  color: var(--text-secondary);
  margin-right: 20px;
}

.actions-buttons {
  display: flex;
  gap: 8px;
  align-items: center;
}

/* Now section styles */
.bookings-list.now .booking-card {
  border-left: 3px solid #ffd600;
}

/* Status-based styles */
.booking-item.canceled .booking-card {
  opacity: 0.7;
}

.booking-item.canceled .booking-title {
  text-decoration: line-through;
}

.booking-item.pending .booking-card {
  border-left: 3px solid #ff9800;
}

/* External event styling */
.external-event {
  background-color: var(--background-0);
}

.external-event:hover {
  background-color: var(--background-1);
}
</style>