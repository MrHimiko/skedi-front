// Location: src/panels/user/plugins/bookings/components/detail/view.vue

<script setup>
import { ref, onMounted, computed } from 'vue';
import { BookingsService } from '@user_bookings/services/bookings';
import { common } from '@utils/common';
import { api } from '@utils/api';
import { UserStore } from '@stores/user';
import { getLocationIcon } from '@user_bookings/config/locationIcons';
import PopupView from '@layouts/popup/view.vue';
import Button from '@form/button/view.vue';
import { 
    PhCalendarCheck, PhClock, PhMapPin, PhUsers, 
    PhVideoCamera, PhClipboard, PhX, PhCheck, PhTrash,
    PhArrowSquareOut
} from "@phosphor-icons/vue";
import ConfirmComponent from '@floated/confirm/view.vue';
import { popup } from '@utils/popup';

const props = defineProps({
    bookingId: {
        type: String,
        required: true
    },
    bookingData: {
        type: Object
    },
    callback: {
        type: Function
    }
});

// State management
const booking = ref(null);
const isLoading = ref(true);

// Get location info
const locationInfo = computed(() => {
    if (!booking.value || !booking.value.location || !Array.isArray(booking.value.location) || booking.value.location.length === 0) {
        return { type: 'custom', name: 'No location specified' };
    }
    
    const location = booking.value.location[0];
    const iconConfig = getLocationIcon(location.type);
    
    return {
        type: location.type,
        name: iconConfig.name,
        icon: iconConfig.icon,
        showMeetingLink: iconConfig.showMeetingLink,
        meetingLink: booking.value.meeting_link
    };
});

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
        const bookingId = booking.booking_id || booking.id;
        const eventId = booking.event_id;
        
        let organizationId = booking.organization_id;
        
        if (!organizationId && booking.event) {
            organizationId = booking.event.organization_id;
        }
        
        if (!organizationId && booking.event_details && booking.event_details.organization_id) {
            organizationId = booking.event_details.organization_id;
        }
        
        if (!organizationId) {
            const userStore = UserStore();
            const orgs = userStore.getOrganizations();
            if (Array.isArray(orgs) && orgs.length > 0 && orgs[0].entity) {
                organizationId = orgs[0].entity.id;
            }
        }
        
        if (!bookingId || !eventId || !organizationId) {
            console.error('Missing required booking information:', { bookingId, eventId, organizationId });
            throw new Error('Missing required booking information');
        }
        
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
    if (booking.value?.meeting_link) {
        try {
            await navigator.clipboard.writeText(booking.value.meeting_link);
            common.notification('Meeting link copied to clipboard', true);
        } catch (err) {
            common.notification('Failed to copy link', false);
        }
    } else {
        common.notification('No meeting link available', false);
    }
}

// Open meeting link
function openMeetingLink() {
    if (booking.value?.meeting_link) {
        window.open(booking.value.meeting_link, '_blank');
    } else {
        common.notification('No meeting link available', false);
    }
}

// Confirm a pending booking
async function confirmBooking() {
    try {
        const updatedBooking = await changeBookingStatus(booking.value, 'confirmed');
        common.notification('Booking confirmed successfully', true);
        
        if (updatedBooking) {
            booking.value = updatedBooking;
        } else {
            await loadBookingData();
        }
        
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

                        document.querySelector('.i-popup-close').click();
                        
                        if (updatedBooking) {
                            booking.value = updatedBooking;
                        } else {
                            await loadBookingData();
                        }
                        
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
                        
                        if (props.callback) {
                            props.callback(true);
                        }
                        
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
    if (booking.value?.meeting_link) {
        window.open(booking.value.meeting_link, '_blank');
    } else {
        common.notification('No meeting link available', false);
    }
}

// Load booking data
async function loadBookingData() {
    try {
        isLoading.value = true;
        
        // Use provided booking data if available
        if (props.bookingData) {
            booking.value = props.bookingData;
        } else {
            const data = await BookingsService.getBooking(props.bookingId);
            booking.value = data;
        }
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
                    
                    <!-- Location with icon -->
                    <div class="info-item">
                        <div class="info-icon">
                            <PhMapPin weight="bold" />
                        </div>
                        <div class="info-content">
                            <div class="info-label">Location</div>
                            <div class="info-value location-value">
                                <img 
                                    v-if="locationInfo.icon"
                                    :src="locationInfo.icon" 
                                    :alt="locationInfo.name"
                                    class="location-icon"
                                />
                                {{ locationInfo.name }}

                            </div>
                        </div>
                    </div>
                    
                    <!-- Hosts -->
                    <div class="info-item" v-if="booking.hosts && booking.hosts.length > 0">
                        <div class="info-icon">
                            <PhUsers weight="bold" />
                        </div>
                        <div class="info-content">
                            <div class="info-label">Hosts</div>
                            <div class="info-value attendees-list">
                                <div class="attendee host" v-for="(host, index) in booking.hosts" :key="'host-' + index">
                                    <div class="attendee-avatar host-avatar">
                                        {{ host.name?.charAt(0) || 'H' }}
                                    </div>
                                    <div class="attendee-name">
                                        {{ host.name || 'Host' }}
                                        <span class="attendee-email">{{ host.email }}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Guests -->
                    <div class="info-item" v-if="booking.guests && booking.guests.length > 0">
                        <div class="info-icon">
                            <PhUsers weight="bold" />
                        </div>
                        <div class="info-content">
                            <div class="info-label">Guests</div>
                            <div class="info-value attendees-list">
                                <div class="attendee" v-for="(guest, index) in booking.guests" :key="'guest-' + index">
                                    <div class="attendee-avatar">
                                        {{ guest.name?.charAt(0) || 'G' }}
                                    </div>
                                    <div class="attendee-name">
                                        {{ guest.name }}
                                        <span class="attendee-email">{{ guest.email }}</span>
                                        <span v-if="guest.phone" class="attendee-phone">{{ guest.phone }}</span>
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
                    <template v-else-if="booking.status === 'upcoming' || booking.status === 'active' || booking.status === 'confirmed'">
                        <Button 
                            v-if="booking.meeting_link"
                            label="Join Meeting" 
                            :iconLeft="{ component: PhVideoCamera, weight: 'bold' }"
                            @click="joinMeeting"
                        />
                        
                        <Button 
                            v-if="booking.meeting_link"
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

.booking-detail {
  width: 100vw;
  max-width: 600px;
}


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

.booking-status.upcoming,
.booking-status.confirmed {
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

.location-value {
    display: flex;
    align-items: center;
    gap: 8px;
}

.location-icon {
    width: 20px;
    height: 20px;
    object-fit: contain;
}

.open-meeting-btn {
    margin-left: auto;
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

.host-avatar {
    background-color: #e3f2fd;
    color: #1976d2;
}

.attendee-name {
    display: flex;
    flex-direction: column;
}

.attendee-email,
.attendee-phone {
    font-size: 12px;
    color: var(--text-secondary);
}

.actions-section {
    display: flex;
    gap: 10px;
    padding-top: 15px;
    border-top: 1px solid var(--border);
}
</style>