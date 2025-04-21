<script setup>
import { ref, onMounted } from 'vue';
import { BookingsService } from '@user_bookings/services/bookings';
import { common } from '@utils/common';
import { api } from '@utils/api';
import { UserStore } from '@stores/user';
import PopupView from '@layouts/popup/view.vue';
import Button from '@form/button/view.vue';
import { 
  PhCalendarCheck, PhClock, PhMapPin, PhUsers, 
  PhVideoCamera, PhClipboard, PhX, PhCheck, PhTrash 
} from "@phosphor-icons/vue";
import ConfirmComponent from '@floated/confirm/view.vue';
import { popup } from '@utils/popup';

const props = defineProps({
  bookingId: {
    type: String,
    required: true
  },
  callback: {
    type: Function
  }
});

// State management
const booking = ref(null);
const isLoading = ref(true);

// Format date for display
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long', 
    day: 'numeric',
    year: 'numeric'
  });
}

// Format time for display
function formatTime(dateString) {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Calculate duration in minutes
function getDuration(startTime, endTime) {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const durationMs = end - start;
  return Math.round(durationMs / (1000 * 60));
}

// Utility function to change booking status
async function changeBookingStatus(booking, status) {
  try {
    // Extract required IDs from booking
    const bookingId = booking.id;
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
      `/organizations/${organizationId}/events/${eventId}/bookings/${bookingId}`, 
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

// Copy meeting link to clipboard
async function copyMeetingLink() {
  if (booking.value?.conference_url) {
    try {
      await navigator.clipboard.writeText(booking.value.conference_url);
      common.notification('Meeting link copied to clipboard', true);
    } catch (err) {
      common.notification('Failed to copy link', false);
    }
  } else {
    common.notification('No meeting link available', false);
  }
}

// Confirm a pending booking
async function confirmBooking() {
  try {
    const updatedBooking = await changeBookingStatus(booking.value, 'confirmed');
    common.notification('Booking confirmed successfully', true);
    
    // Update local booking data with server response
    if (updatedBooking) {
      booking.value = updatedBooking;
    } else {
      // If no data returned, refresh booking data
      await loadBookingData();
    }
    
    // Call callback function if provided
    if (props.callback) {
      props.callback(true);
    }
  } catch (error) {
    common.notification('Error confirming booking: ' + (error.message || 'Unknown error'), false);
  }
}

// Cancel booking
function cancelBooking() {
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
            const updatedBooking = await changeBookingStatus(booking.value, 'canceled');
            common.notification('Booking canceled successfully', true);
            
            // Update local booking data with server response
            if (updatedBooking) {
              booking.value = updatedBooking;
            } else {
              // If no data returned, refresh booking data
              await loadBookingData();
            }
            
            // Call callback function if provided
            if (props.callback) {
              props.callback(true);
            }
          } catch (error) {
            common.notification('Error canceling booking: ' + (error.message || 'Unknown error'), false);
          }
        }
      }
    }
  );
}

// Remove booking (for canceled bookings)
function removeBooking() {
  popup.open(
    'remove-booking-confirm',
    null,
    ConfirmComponent,
    {
      as: 'red',
      description: `Are you sure you want to remove this booking? This action cannot be undone.`,
      callback: async (event, data, response, success) => {
        if (success) {
          try {
            await changeBookingStatus(booking.value, 'removed');
            common.notification('Booking removed successfully', true);
            
            // Call callback function if provided
            if (props.callback) {
              props.callback(true);
            }
            
            // Close popup
            document.querySelector('.i-popup-close').click();
          } catch (error) {
            common.notification('Error removing booking: ' + (error.message || 'Unknown error'), false);
          }
        }
      }
    }
  );
}

// Join meeting
function joinMeeting() {
  if (booking.value?.conference_url) {
    window.open(booking.value.conference_url, '_blank');
  } else {
    common.notification('No conference link available', false);
  }
}

// Load booking data
async function loadBookingData() {
  try {
    isLoading.value = true;
    const data = await BookingsService.getBooking(props.bookingId);
    booking.value = data;
  } catch (error) {
    console.error('Error loading booking details:', error);
    common.notification('Failed to load booking details', false);
  } finally {
    isLoading.value = false;
  }
}

// Initialize component
onMounted(() => {
  loadBookingData();
});
</script>

<template>
  <PopupView title="Booking Details" customClass="h-auto booking-detail">
    <template #content>
      <div v-if="isLoading" class="loading-state">
        <p>Loading booking details...</p>
      </div>
      
      <div v-else-if="!booking" class="error-state">
        <p>Booking not found or unable to load details.</p>
        <Button label="Close" @click="document.querySelector('.i-popup-close').click()" />
      </div>
      
      <div v-else class="booking-detail-content">
        <!-- Booking title and status -->
        <div class="booking-header">
          <h2>{{ booking.title }}</h2>
          <div :class="['booking-status', booking.status]">
            {{ booking.status.charAt(0).toUpperCase() + booking.status.slice(1) }}
          </div>
        </div>
        
        <!-- Booking Information -->
        <div class="info-section">
          <!-- Date and time -->
          <div class="info-item">
            <div class="info-icon">
              <PhCalendarCheck weight="bold" />
            </div>
            <div class="info-content">
              <div class="info-label">Date</div>
              <div class="info-value">{{ formatDate(booking.start_time) }}</div>
            </div>
          </div>
          
          <!-- Time and duration -->
          <div class="info-item">
            <div class="info-icon">
              <PhClock weight="bold" />
            </div>
            <div class="info-content">
              <div class="info-label">Time</div>
              <div class="info-value">
                {{ formatTime(booking.start_time) }} - {{ formatTime(booking.end_time) }}
                <span class="duration">({{ getDuration(booking.start_time, booking.end_time) }} minutes)</span>
              </div>
            </div>
          </div>
          
          <!-- Location -->
          <div class="info-item">
            <div class="info-icon">
              <PhMapPin weight="bold" />
            </div>
            <div class="info-content">
              <div class="info-label">Location</div>
              <div class="info-value">{{ booking.location || 'No location specified' }}</div>
            </div>
          </div>
          
          <!-- Attendees -->
          <div class="info-item">
            <div class="info-icon">
              <PhUsers weight="bold" />
            </div>
            <div class="info-content">
              <div class="info-label">Attendees</div>
              <div class="info-value attendees-list">
                <div class="attendee" v-for="(attendee, index) in booking.attendees" :key="index">
                  <div class="attendee-avatar">
                    {{ attendee.name.charAt(0) }}
                  </div>
                  <div class="attendee-name">
                    {{ attendee.name }}
                    <span class="attendee-email">{{ attendee.email }}</span>
                  </div>
                </div>
                
                <!-- Host -->
                <div class="attendee host">
                  <div class="attendee-avatar">
                    {{ booking.host?.name?.charAt(0) || 'H' }}
                  </div>
                  <div class="attendee-name">
                    {{ booking.host?.name || 'Host' }} <span class="host-label">(Host)</span>
                    <span class="attendee-email">{{ booking.host?.email }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Description if available -->
          <div class="info-item description" v-if="booking.description">
            <div class="info-content">
              <div class="info-label">Description</div>
              <div class="info-value description-text">{{ booking.description }}</div>
            </div>
          </div>
        </div>
        
        <!-- Actions - conditionally show based on booking status -->
        <div class="actions-section">
          <!-- Pending booking actions -->
          <template v-if="booking.status === 'pending'">
            <Button 
              label="Confirm Booking" 
              :iconLeft="{ component: PhCheck, weight: 'bold' }"
              @click="confirmBooking"
            />
            
            <Button 
              label="Cancel" 
              as="tertiary"
              :iconLeft="{ component: PhX, weight: 'bold' }"
              @click="cancelBooking"
            />
          </template>
          
          <!-- Upcoming or active booking actions -->
          <template v-else-if="booking.status === 'upcoming' || booking.status === 'active'">
            <Button 
              label="Join Meeting" 
              :iconLeft="{ component: PhVideoCamera, weight: 'bold' }"
              @click="joinMeeting"
            />
            
            <Button 
              v-if="booking.conference_url"
              label="Copy Meeting Link" 
              as="secondary"
              :iconLeft="{ component: PhClipboard, weight: 'bold' }"
              @click="copyMeetingLink"
            />
            
            <Button 
              label="Cancel Booking" 
              as="tertiary"
              :iconLeft="{ component: PhX, weight: 'bold' }"
              @click="cancelBooking"
            />
          </template>
          
          <!-- Canceled booking actions -->
          <template v-else-if="booking.status === 'canceled'">
            <Button 
              label="Remove Booking" 
              as="tertiary"
              :iconLeft="{ component: PhTrash, weight: 'bold' }"
              @click="removeBooking"
            />
          </template>
        </div>
      </div>
    </template>
  </PopupView>
</template>


<style scoped>
.booking-detail-content {
  padding: 10px 0;
}

.loading-state,
.error-state {
  padding: 30px;
  text-align: center;
  color: var(--text-secondary);
}

.booking-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.booking-header h2 {
  font-size: 20px;
  font-weight: 600;
  margin: 0;
}

.booking-status {
  padding: 5px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.booking-status.upcoming {
  background-color: #e3f2fd;
  color: #1976d2;
}

.booking-status.past {
  background-color: #eeeeee;
  color: #616161;
}

.booking-status.canceled {
  background-color: #ffebee;
  color: #c62828;
}

.booking-status.pending {
  background-color: #fff8e1;
  color: #ff8f00;
}

.info-section {
  margin-bottom: 25px;
}

.info-item {
  display: flex;
  margin-bottom: 15px;
}

.info-icon {
  margin-right: 15px;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  width: 20px;
  color: var(--text-secondary);
}

.info-content {
  flex: 1;
}

.info-label {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 5px;
}

.info-value {
  font-size: 14px;
  color: var(--text-primary);
}

.duration {
  font-size: 12px;
  color: var(--text-secondary);
  margin-left: 5px;
}

.description {
  padding-top: 10px;
  border-top: 1px solid var(--border);
}

.description-text {
  white-space: pre-line;
  line-height: 1.6;
}

.attendees-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.attendee {
  display: flex;
  align-items: center;
}

.attendee-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: var(--background-2);
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  margin-right: 10px;
}

.host .attendee-avatar {
  background-color: #e3f2fd;
  color: #1976d2;
}

.attendee-name {
  display: flex;
  flex-direction: column;
}

.attendee-email {
  font-size: 12px;
  color: var(--text-secondary);
}

.host-label {
  font-size: 12px;
  background-color: #e3f2fd;
  color: #1976d2;
  padding: 2px 6px;
  border-radius: 10px;
  margin-left: 6px;
}

.actions-section {
  display: flex;
  gap: 10px;
  padding-top: 15px;
  border-top: 1px solid var(--border);
}
</style>