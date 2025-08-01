<template>
    <div class="purchase-seats-modal">
        <div class="modal-header">
            <h3>Purchase Additional Seats</h3>
        </div>
        
        <div class="modal-body">
            <div class="purchase-info">
                <p>Add more seats to invite additional team members to your organization.</p>
                <div class="price-info">
                    <i class="fas fa-tag"></i>
                    <span>$9 per seat / month</span>
                </div>
            </div>
            
            <div class="seat-selector">
                <label>Number of seats to add:</label>
                <div class="seat-controls">
                    <button @click="decrementSeats" :disabled="seatsToAdd <= 1" class="btn btn-sm">
                        <i class="fas fa-minus"></i>
                    </button>
                    <input 
                        v-model.number="seatsToAdd" 
                        type="number" 
                        min="1" 
                        max="100"
                        class="seat-input"
                    />
                    <button @click="incrementSeats" :disabled="seatsToAdd >= 100" class="btn btn-sm">
                        <i class="fas fa-plus"></i>
                    </button>
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
            </div>
        </div>
        
        <div class="modal-footer">
            <button @click="closeModal" class="btn btn-secondary">
                Cancel
            </button>
            <button 
                @click="purchaseSeats" 
                class="btn btn-primary"
                :disabled="isPurchasing"
            >
                <span v-if="isPurchasing">
                    <i class="fas fa-spinner fa-spin"></i> Processing...
                </span>
                <span v-else>
                    <i class="fas fa-credit-card"></i> Purchase {{ seatsToAdd }} {{ seatsToAdd === 1 ? 'Seat' : 'Seats' }}
                </span>
            </button>
        </div>
    </div>
</template>

<script setup>
import { ref } from 'vue';
import { api } from '@utils/api';
import { common } from '@utils/common';
import { popup } from '@utils/popup';

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

const seatsToAdd = ref(props.recommendedSeats || 1);
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
            if (response.data.checkout_url) {
                // Redirect to Stripe checkout
                window.location.href = response.data.checkout_url;
            } else {
                // Seats added successfully
                common.notification(`Successfully added ${seatsToAdd.value} seats`, true);
                popup.close();
                
                if (props.callback) {
                    props.callback();
                }
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
    width: 480px;
    background: white;
    border-radius: 8px;
    overflow: hidden;
}

.modal-header {
    padding: 20px;
    border-bottom: 1px solid #e9ecef;
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
    color: #495057;
}

.price-info {
    background: #e7f3ff;
    padding: 12px 16px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    gap: 10px;
    color: #0066cc;
    font-weight: 500;
}

.seat-selector {
    margin-bottom: 25px;
}

.seat-selector label {
    display: block;
    margin-bottom: 10px;
    font-weight: 500;
}

.seat-controls {
    display: flex;
    align-items: center;
    gap: 10px;
}

.seat-input {
    width: 80px;
    padding: 8px;
    text-align: center;
    border: 1px solid #ced4da;
    border-radius: 4px;
    font-size: 16px;
}

.purchase-summary {
    background: #f8f9fa;
    padding: 15px;
    border-radius: 4px;
}

.summary-item {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
    font-size: 14px;
}

.summary-divider {
    height: 1px;
    background: #dee2e6;
    margin: 12px 0;
}

.summary-item.total {
    font-weight: 600;
    font-size: 16px;
    margin-bottom: 0;
}

.modal-footer {
    padding: 20px;
    border-top: 1px solid #e9ecef;
    display: flex;
    gap: 10px;
    justify-content: flex-end;
}

.btn {
    padding: 10px 20px;
    border: none;
    border-radius: 4px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    display: inline-flex;
    align-items: center;
    gap: 8px;
}

.btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.btn-primary {
    background: #007bff;
    color: white;
}

.btn-primary:hover:not(:disabled) {
    background: #0056b3;
}

.btn-secondary {
    background: #6c757d;
    color: white;
}

.btn-secondary:hover:not(:disabled) {
    background: #545b62;
}

.btn-sm {
    padding: 6px 12px;
    font-size: 12px;
}
</style>