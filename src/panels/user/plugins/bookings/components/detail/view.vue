<script setup>
import { ref, onMounted } from 'vue';
import { BookingsService } from '@user_bookings/services/bookings';
import { common } from '@utils/common';
import PopupView from '@layouts/popup/view.vue';
import Button from '@form/button/view.vue';
import { PhCalendarCheck, PhClock, PhMapPin, PhUsers, PhVideoCamera, PhClipboard, PhX } from "@phosphor-icons/vue";

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

// Cancel booking
async function cancelBooking() {
  if (confirm('Are you sure you want to cancel this booking?')) {
    try {
      await BookingsService.cancelBooking(booking.value.id);
      common.notification('Booking canceled successfully', true);
      
      // Call callback function if provided
      if (props.callback) {
        props.callback(true);
      }
      
      // Close popup
      document.querySelector('.i-popup-close').click();
    } catch (error) {
      common.notification('Error canceling booking', false);
    }
  }
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
        
        <!-- Actions -->
        <div class="actions-section">
          <!-- Join meeting button -->
          <Button 
            v-if="booking.status === 'upcoming' || booking.status === 'active'" 
            label="Join Meeting" 
            :iconLeft="{ component: PhVideoCamera, weight: 'bold' }"
            @click="joinMeeting"
          />
          
          <!-- Copy meeting link -->
          <Button 
            v-if="booking.conference_url"
            label="Copy Meeting Link" 
            as="secondary"
            :iconLeft="{ component: PhClipboard, weight: 'bold' }"
            @click="copyMeetingLink"
          />
          
          <!-- Cancel button for upcoming bookings -->
          <Button 
            v-if="booking.status === 'upcoming'"
            label="Cancel Booking" 
            as="tertiary"
            :iconLeft="{ component: PhX, weight: 'bold' }"
            @click="cancelBooking"
          />
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