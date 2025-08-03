<template>
    <div class="purchase-seats-modal">
        <div class="modal-header">
            <h3>Purchase Additional Seats</h3>
        </div>
        
        <div class="modal-body">
            <div class="purchase-info">
                <p>Add more seats to invite additional team members to your organization.</p>
                <div class="price-info">
                    <PhTag :size="20" />
                    <span>$9 per seat / month</span>
                </div>
            </div>
            
            <div class="seat-selector">
                <label>Number of seats to add:</label>
                <div class="seat-controls">
                    <ButtonComponent 
                        @click="decrementSeats" 
                        :disabled="seatsToAdd <= 1"
                        size="small"
                        as="secondary icon size36"
                         label="-"
                    >
                    </ButtonComponent>
                    
                    <InputComponent
                        :value="seatsToAdd"
                        type="number"
                        :min="1"
                        :max="100"
                        class="seat-input"
                        @onInput="(e, value) => handleSeatsChange(value)"
                    />
                                        
                    <ButtonComponent 
                        @click="incrementSeats" 
                        :disabled="seatsToAdd >= 100"
                        size="small"
                        as="secondary icon size36"
                        label="+"
                    >
                    </ButtonComponent>
                </div>
            </div>
            
            <div class="purchase-summary">
                <div class="summary-item">
                    <span>Additional seats:</span>
                    <span>{{ seatsToAdd }}</span>
                </div>
                <div class="summary-item">
                    <span>Price per seat:</span>
                    <span>$9/month</span>
                </div>
                <div class="summary-divider"></div>
                <div class="summary-item total">
                    <span>Total additional cost:</span>
                    <span>${{ seatsToAdd * 9 }}/month</span>
                </div>
                <div class="proration-notice">
                    <span>You won't be charged right now — the prorated amount for this billing period will be added to your next scheduled plan payment.</span>
                </div>
            </div>
        </div>
        
        <div class="modal-footer">
            <ButtonComponent 
                @click="closeModal"
                as="secondary"
                label="Cancel"
            >
                
            </ButtonComponent>
            <ButtonComponent 
                label="Get Seats"
                @click="purchaseSeats"
                as="brand"
                :loading="isPurchasing"
                :disabled="isPurchasing"
            >
                <PhCreditCard :size="20" />
            </ButtonComponent>
        </div>
    </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import { api } from '@utils/api';
import { common } from '@utils/common';
import { popup } from '@utils/popup';

// Global components
import ButtonComponent from '@form/button/view.vue';
import InputComponent from '@form/input/view.vue';

// Icons
import { PhTag, PhMinus, PhPlus, PhCreditCard, PhInfo } from '@phosphor-icons/vue';

const props = defineProps({
    organizationId: {
        type: Number,
        required: true
    },
    recommendedSeats: {
        type: Number,
        default: 1
    },
    callback: {
        type: Function,
        default: null
    }
});

const seatsToAdd = ref(1);
const isPurchasing = ref(false);

function incrementSeats() {
    if (seatsToAdd.value < 100) {
        seatsToAdd.value++;
    }
}

function decrementSeats() {
    if (seatsToAdd.value > 1) {
        seatsToAdd.value--;
    }
}

function handleSeatsChange(value) {
    const numValue = parseInt(value) || 1;
    if (numValue < 1) {
        seatsToAdd.value = 1;
    } else if (numValue > 100) {
        seatsToAdd.value = 100;
    } else {
        seatsToAdd.value = numValue;
    }
}

function closeModal() {
    popup.close();
}

async function purchaseSeats() {
    try {
        isPurchasing.value = true;
        
        const response = await api.post(`billing/organizations/${props.organizationId}/seats`, {
            seats: seatsToAdd.value
        });
        
        if (response.success) {
            common.notification(`Successfully added ${seatsToAdd.value} seats`, true);
            popup.close();
            
            if (props.callback) {
                props.callback();
            }
        } else {
            common.notification(response.message || 'Failed to purchase seats', false);
        }
    } catch (error) {
        console.error('Failed to purchase seats:', error);
        common.notification('Failed to purchase seats', false);
    } finally {
        isPurchasing.value = false;
    }
}
</script>

<style scoped>
.purchase-seats-modal {
    width: 500px;
    background: white;
    border-radius: 8px;
    overflow: hidden;
}

.modal-header {
    padding: 20px;
    border-bottom: 1px solid var(--border);
}

.modal-header h3 {
    margin: 0;
    font-size: 20px;
    font-weight: 600;
}

.modal-body {
    padding: 20px;
}

.purchase-info {
    margin-bottom: 25px;
}

.purchase-info p {
    margin: 0 0 15px 0;
    color: var(--text-secondary);
}

.price-info {
    background: var(--brand-yellow);
    padding: 12px 16px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    gap: 10px;
    color: var(--text-primary);
    font-weight: 500;
}

.seat-selector {
    margin-bottom: 25px;
}

.seat-selector label {
    display: block;
    margin-bottom: 10px;
    font-weight: 500;
    color: var(--text-primary);
}

.seat-controls {
    display: flex;
    align-items: center;
    gap: 5px;
}

.seat-input {
    width: 80px;
}

.seat-input :deep(input) {
    text-align: center;
    font-size: 18px;
    font-weight: 500;
}

.purchase-summary {
    background: var(--background-1);
    padding: 20px;
    border-radius: 8px;
}

.summary-item {
    display: flex;
    justify-content: space-between;
    padding: 8px 0;
    font-size: 14px;
    color: var(--text-secondary);
}

.summary-divider {
    height: 1px;
    background: var(--border);
    margin: 12px 0;
}

.summary-item.total {
    font-weight: 600;
    font-size: 16px;
    color: var(--text-primary);
}

.proration-notice {
    margin-top: 16px;
    padding: 12px;
    background: var(--red-default);
    border-radius: 6px;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: white;
    font-weight: 500;
    font-size: 16px;
    align-items: center;
    gap: 8px;
    font-weight: 500;
    font-size: 13px;
    display: flex;
    flex-direction: column;
    text-align: center;
    padding: 13px;
}

.proration-notice svg {
    flex-shrink: 0;
}

.modal-footer {
    padding: 20px;
    border-top: 1px solid var(--border);
    display: flex;
    gap: 10px;
    justify-content: flex-end;
}
</style>