const emit = defineEmits(['refresh']);<script setup>
import { ref } from 'vue';
import ButtonComponent from '@form/button/view.vue';
import { common } from '@utils/common';
import { BookingsService } from '@user_bookings/services/bookings';
import { PhCalendar, PhClock, PhUser, PhVideo, PhLink, PhDotsThree } from "@phosphor-icons/vue";
import MenusComponent from '@global/menus/view.vue';
import BookingDetailView from '@user_bookings/components/detail/view.vue';
import { popup } from '@utils/popup';

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

// Available actions for bookings menu
const bookingActions = [
  { 
    label: 'Join Meeting',
    iconComponent: PhVideo,
    weight: 'bold'
  },
  { 
    label: 'Copy Booking Link', 
    iconComponent: PhLink,
    weight: 'bold'
  },
  { 
    label: 'Reschedule',
    iconComponent: PhCalendar,
    weight: 'bold'
  },
  { 
    label: 'Cancel',
    iconComponent: PhClock,
    weight: 'bold'
  }
];

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
      if (confirm('Are you sure you want to cancel this booking?')) {
        try {
          await BookingsService.cancelBooking(booking.id);
          common.notification('Booking canceled successfully', true);
          // Emit event to refresh the bookings list
          emit('refresh');
        } catch (error) {
          common.notification('Error canceling booking', false);
        }
      }
      break;
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
              {{ item.id }}
            </div>
            
            <!-- Details button -->
            <div class="details-button">
              <ButtonComponent 
                label="Details" 
                as="tertiary"
                @click="openBookingDetail(item)"
              />
            </div>
            
            <!-- Actions menu -->
            <div class="actions-menu">
              <ButtonComponent 
                v-dropdown="{ 
                  component: MenusComponent,
                  properties: {
                    menus: bookingActions,
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


/* Hover effect */
.booking-card:hover {

}

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
  margin-right: 50px;
  min-width: 150px;
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