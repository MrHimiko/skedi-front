<script setup>
import { ref } from 'vue';
import { UserStore } from '@stores/user';
import ButtonComponent from '@form/button/view.vue';
import { common } from '@utils/common';
import { BookingsService } from '@user_bookings/services/bookings';
import { api } from '@utils/api';
import { PhCalendar, PhClock, PhUser, PhVideo, PhLink, PhDotsThree, PhCheck, PhTrash } from "@phosphor-icons/vue";
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
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  
  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  } else if (date.toDateString() === tomorrow.toDateString()) {
    return 'Tomorrow';
  } else {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }
}

// Get booking actions based on status
function getBookingActions(booking) {
  const baseActions = [];
  
  // Only add these options for active or upcoming bookings (not canceled)
  if (booking.status !== 'canceled') {
    baseActions.push({ 
      label: 'Join Meeting',
      iconComponent: PhVideo,
      weight: 'bold'
    });
    
    baseActions.push({ 
      label: 'Copy Booking Link', 
      iconComponent: PhLink,
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
      iconComponent: PhClock,
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
        await navigator.clipboard.writeText(booking.booking_url);
        common.notification('Link copied to clipboard', true);
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

// Get meeting platform icon/label
function getMeetingPlatform(booking) {
  if (!booking.location) return { name: 'No location', icon: null };
  
  const location = booking.location.toLowerCase();
  
  if (location.includes('zoom')) {
    return { name: 'Zoom', icon: 'zoom' };
  } else if (location.includes('google meet') || location.includes('gmeet')) {
    return { name: 'Google Meet', icon: 'google_meet' };
  } else if (location.includes('teams')) {
    return { name: 'MS Teams', icon: 'teams' };
  } else if (location.includes('skype')) {
    return { name: 'Skype', icon: 'skype' };
  } else {
    return { name: booking.location, icon: null };
  }
}
</script>

<template>
  <div :class="['bookings-list', highlightStyle]">
    <div v-if="isLoading" class="loading-state">
      <p>Loading bookings...</p>
    </div>
    
    <div v-else-if="bookings.length === 0" class="empty-state">
      <p>No bookings found</p>
    </div>
    
    <div v-else class="bookings-container">
      <div 
        v-for="(item, index) in bookings" 
        :key="index"
        :class="['booking-item', item.type, item.status]"
      >
        <!-- Date Header -->
        <div v-if="item.type === 'header'" class="date-header">
          {{ formatDate(item.date) }}
        </div>
        
        <!-- Booking Item -->
        <div v-else class="booking-card">
          <!-- Time indicator and color bar -->
          <div class="time-indicator">
            <div class="clr-box" :style="{ backgroundColor: item.color || '#FFDE0E' }"> </div>
            {{ item.formattedStart || '--:--' }} - {{ item.formattedEnd || '--:--' }}
          </div>
          
          <!-- Booking details -->
          <div class="booking-details">
            <div class="booking-title">
              {{ item.title }}
              {{ item.booking_id }}
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
                <PhUser weight="bold" size="14" />
                You and {{ item.attendees?.[0]?.name || 'Guest' }}
              </span>
            </div>
          </div>
          
          <!-- Platform & Actions -->
          <div class="booking-actions">
            <!-- Meeting platform -->
            <div class="meeting-platform">
              {{ getMeetingPlatform(item).name }}
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
  gap:15px;
  text-align: center;
}

.time-indicator > div {
  width: 24px;
  height: 10px;
  border-radius: 100px;
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
}

.status-badge.pending {
  background-color: #fff8e1;
  color: #ff8f00;
}

.status-badge.canceled {
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
</style>