<script setup>
import { ref, computed, watch } from 'vue';
import PopupLayout from '@layouts/popup/view.vue';
import Button from '@form/button/view.vue';
import Textarea from '@form/textarea/view.vue';
import { common } from '@utils/common';
import { popup } from '@utils/popup';
import { BookingsService } from '@user_bookings/services/bookings';
import { UserStore } from '@stores/user';

const props = defineProps({
    booking: {
        type: Object,
        required: true
    },
    callback: {
        type: Function,
        default: null
    }
});

// State
const cancellationReason = ref("Sorry, I can't make it this time. Something came up. Please use my rebooking link to schedule another meeting.");
const isLoading = ref(false);

// Computed
const characterCount = computed(() => cancellationReason.value.length);
const isOverLimit = computed(() => characterCount.value > 150);

// Reset reason when booking changes
watch(() => props.booking, () => {
    if (props.booking) {
        cancellationReason.value = "Sorry, I can't make it this time. Something came up. Please use my rebooking link to schedule another meeting.";
    }
}, { immediate: true });

// Methods
function closeModal() {
    popup.close();
}

async function cancelBooking() {
    if (!props.booking || isLoading.value || isOverLimit.value) return;
    
    isLoading.value = true;
    
    try {
        // Use the exact same organization ID resolution logic as your existing code
        const bookingId = props.booking.booking_id || props.booking.id;
        const eventId = props.booking.event_id;
        
        let organizationId = props.booking.organization_id;
        
        // Try to get organization ID from event details
        if (!organizationId && props.booking.event) {
            organizationId = props.booking.event.organization_id;
        }
        
        if (!organizationId && props.booking.event_details && props.booking.event_details.organization_id) {
            organizationId = props.booking.event_details.organization_id;
        }
        
        // Fallback to user's first organization
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
        
        const payload = {
            reason: cancellationReason.value.trim() || null
        };
        
        const response = await fetch(
            `/api/organizations/${organizationId}/events/${eventId}/bookings/${bookingId}/cancel`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // Add any auth headers your app needs
                },
                body: JSON.stringify(payload)
            }
        );
        
        const result = await response.json();
        
        if (result.success) {
            common.notification('Booking cancelled successfully. The guest has been notified.', true);
            closeModal();
            
            // Call the callback to refresh the bookings list
            if (props.callback) {
                props.callback(true);
            }
        } else {
            common.notification(result.message || 'Failed to cancel booking', false);
        }
    } catch (error) {
        console.error('Error canceling booking:', error);
        common.notification('Error canceling booking. Please try again.', false);
    } finally {
        isLoading.value = false;
    }
}

// Handle textarea input
function handleTextareaInput(event, value) {
    cancellationReason.value = value;
}
</script>

<template>
    <PopupLayout title="Cancel Booking" >
        <template #content>
            <div class="cancel-modal-content">
                <div class="cancel-description">
                    <p>Write a reason for cancellation. This message will be sent to the guest so they understand why you canceled this booking.</p>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Cancellation Reason</label>
                    <Textarea
                        :value="cancellationReason"
                        placeholder="Sorry, I can't make it this time. Something came up. Please use my rebooking link to schedule another meeting."
                        :rows="4"
                        @onInput="handleTextareaInput"
                        :class="{ 'error': isOverLimit }"
                    />
                    <div class="character-count" :class="{ 'over-limit': isOverLimit }">
                        {{ characterCount }}/150
                    </div>
                </div>
                
                <div class="modal-actions">

                    <Button 
                        :label="isLoading ? 'Cancelling...' : 'Cancel Booking'" 
                        as="red"
                        @click="cancelBooking"
                        :disabled="isLoading || isOverLimit"
                    />
                </div>
            </div>
        </template>
    </PopupLayout>
</template>

<style scoped>
.cancel-modal-content {
    padding: 20px;
}

.cancel-description {
    margin-bottom: 24px;
}

.cancel-description p {
    color: var(--text-secondary);
    line-height: 1.5;
    margin: 0;
    font-size: 14px;
}

.form-group {
    margin-bottom: 24px;
}

.form-label {
    display: block;
    margin-bottom: 8px;
    font-weight: 500;
    color: var(--text-primary);
}

.character-count {
    text-align: right;
    font-size: 12px;
    color: var(--text-tertiary);
    margin-top: 4px;
}

.character-count.over-limit {
    color: var(--red-default);
}

.modal-actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
}

/* Error state for textarea */
:deep(.error .c-input) {
    border-color: var(--red-default);
}
</style>