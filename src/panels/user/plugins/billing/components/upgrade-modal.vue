<template>
    <PopupLayout title="Upgrade Plan" class="upgrade-modal h-auto">
        <template #content>
            <div v-if="!isSuccess">
                <!-- Plan Selection -->
                <div class="plans-grid">
                    <div 
                        v-for="plan in plans" 
                        :key="plan.slug"
                        class="plan-card"
                        :class="{ 
                            'current': plan.slug === currentPlanSlug,
                            'selected': selectedPlan?.slug === plan.slug
                        }"
                        @click="selectPlan(plan)"
                    >
                        <div class="plan-content">
                            <div class="plan-header">
                                <h3>{{ plan.name }}</h3>
                                <div class="plan-price">
                                    <span v-if="plan.slug === 'enterprise'" style="font-size: 14px;font-weight: 600;color: var(--brand-blue);">Custom pricing</span>
                                    <template v-else>
                                        <span class="currency">$</span>
                                        <span class="amount">{{ plan.price_monthly / 100 }}</span>
                                        <span class="period">/month</span>
                                    </template>
                                </div>
                            </div>
                            
                            <div class="plan-features">
                                <p v-if="plan.slug === 'free'">
                                    • 1 user<br>
                                    • 2 event types<br>
                                    • 50 bookings/month<br>
                                    • Basic integrations
                                </p>
                                <p v-if="plan.slug === 'professional'">
                                    • Unlimited teams<br>
                                    • Unlimited event types<br>
                                    • All integrations<br>
                                    • Automations & workflows
                                </p>
                                <p v-if="plan.slug === 'business'">
                                    • Everything in Professional<br>
                                    • 3 seats included<br>
                                    • Advanced analytics<br>
                                    • Priority support
                                </p>
                                <p v-if="plan.slug === 'enterprise'">
                                    • Everything in Business<br>
                                    • Unlimited seats<br>
                                    • SSO & advanced security<br>
                                    • Dedicated support
                                </p>
                            </div>
                        </div>
                        
                        <div class="plan-action">
                            <div v-if="plan.slug === currentPlanSlug" class="current-badge">
                                Current Plan
                            </div>
                            <div v-else-if="selectedPlan?.slug === plan.slug" class="selected-badge">
                                <PhCheck :size="16" weight="bold" /> Selected
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Seat Selection (only for paid plans) -->
                <div v-if="selectedPlan && selectedPlan.slug !== 'free' && selectedPlan.slug !== 'enterprise'" class="seats-section">
                    <div>
                        <h3>Additional Team Seats</h3>
                        <p class="seats-info">Add team members to your organization ($9/seat/month)</p>
                    </div>
                    <div class="seats-selector">
                        <ButtonComponent
                            @click="additionalSeats = Math.max(0, additionalSeats - 1)"
                            :disabled="additionalSeats <= 0"
                            as="tertiary icon"
                            :iconLeft="{ component: PhMinus }"
                        />
                        <div class="seats-display">
                            <input 
                                v-model.number="additionalSeats" 
                                type="number" 
                                min="0" 
                                max="100"
                                class="seats-input"
                            />
                        </div>
                        <ButtonComponent
                            @click="additionalSeats = Math.min(100, additionalSeats + 1)"
                            :disabled="additionalSeats >= 100"
                            as="tertiary icon"
                            :iconLeft="{ component: PhPlus }"
                        />
                    </div>
                </div>

                <!-- Order Summary -->
                <div v-if="selectedPlan" class="order-summary">
                    <h3>Order Summary</h3>
                    <div class="summary-lines">
                        <div class="summary-line">
                            <span>{{ selectedPlan.name }} Plan</span>
                            <span>${{ selectedPlan.price_monthly / 100 }}/mo</span>
                        </div>
                        <div v-if="additionalSeats > 0" class="summary-line">
                            <span>{{ additionalSeats }} Additional {{ additionalSeats === 1 ? 'Seat' : 'Seats' }}</span>
                            <span>${{ additionalSeats * 9 }}/mo</span>
                        </div>
                        <div class="summary-line total">
                            <span>Total</span>
                            <span>${{ totalPrice }}/mo</span>
                        </div>
                    </div>
                    
                    <div class="action-buttons">
                        <ButtonComponent
                            v-if="selectedPlan.slug === 'enterprise'"
                            label="Contact Sales"
                            as="primary"
                            @click="() => window.open('https://skedi.com/enterprise', '_blank')"
                        />
                        <ButtonComponent
                            v-else
                            :label="loading ? 'Processing...' : 'Continue to Payment'"
                            as="primary"
                            :loading="loading"
                            :disabled="loading || !selectedPlan"
                            @click="proceedToCheckout"
                        />
                    </div>
                </div>
            </div>
            
            <div v-else class="success-message">
                <div class="success-icon">✓</div>
                <h3>Thank you for upgrading!</h3>
                <p>Your organization is now on the {{ upgradedPlanName }} plan.</p>
                <p class="text-secondary">This window will close in {{ countdown }} seconds...</p>
            </div>
            
        </template>
    </PopupLayout>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import PopupLayout from '@layouts/popup/view.vue';
import ButtonComponent from '@form/button/view.vue';
import { api } from '@utils/api';
import { popup } from '@utils/popup';
import { BillingStore } from '@stores/billing';
import { PhCheck, PhPlus, PhMinus } from "@phosphor-icons/vue";

const props = defineProps({
    organizationId: {
        type: Number,
        required: true
    },
    message: String,
});

const route = useRoute();
const billingStore = BillingStore();

const loading = ref(false);
const plans = ref([]);
const selectedPlan = ref(null);
const additionalSeats = ref(0);
const isSuccess = ref(false);
const upgradedPlanName = ref('');
const countdown = ref(5);
let countdownInterval = null;

const currentPlanSlug = computed(() => {
    const levels = ['free', 'professional', 'business', 'enterprise'];
    const planLevel = billingStore.getPlanLevel(props.organizationId);
    return levels[planLevel - 1] || 'free';
});

const totalPrice = computed(() => {
    if (!selectedPlan.value) return 0;
    const planPrice = selectedPlan.value.price_monthly / 100;
    const seatsPrice = additionalSeats.value * 9;
    return planPrice + seatsPrice;
});

function selectPlan(plan) {
    if (plan.slug !== currentPlanSlug.value) {
        selectedPlan.value = plan;
    }
}

async function proceedToCheckout() {
    if (!selectedPlan.value) return;
    
    loading.value = true;
    
    try {
        const response = await api.post(`billing/organizations/${props.organizationId}/checkout`, {
            plan_slug: selectedPlan.value.slug,
            additional_seats: additionalSeats.value
        });
        
        if (response.success) {
            if (response.data.checkout_url) {
                // New subscription - redirect to Stripe
                window.location.href = response.data.checkout_url;
            } else if (response.data.upgraded) {
                // Direct upgrade - show success and refresh
                isSuccess.value = true;
                upgradedPlanName.value = response.data.plan_name;
                
                // Clear cache and reload subscription data
                billingStore.clearCache(props.organizationId);
                await billingStore.loadSubscription(props.organizationId, true);
                
                // Start countdown to close
                countdownInterval = setInterval(() => {
                    countdown.value--;
                    if (countdown.value <= 0) {
                        clearInterval(countdownInterval);
                        popup.close();
                    }
                }, 1000);
            }
        } else {
            throw new Error(response.message || 'Failed to process upgrade');
        }
    } catch (error) {
        common.notification(error.message || 'Failed to start checkout', false);
        loading.value = false;
    }
}

onMounted(async () => {
    const sessionId = route.query.session_id;
    if (sessionId) {
        await handleStripeReturn(sessionId);
        return;
    }
    
    try {
        plans.value = [
            {
                slug: 'free',
                name: 'Free',
                price_monthly: 0
            }
        ];
        
        const response = await api.get('billing/plans');
        if (response.success) {
            plans.value.push(...response.data);
        }
        
        plans.value.push({
            slug: 'enterprise',
            name: 'Enterprise',
            price_monthly: 0
        });
    } catch (error) {
        console.error('Failed to load plans:', error);
    }
});

async function handleStripeReturn(sessionId) {
    try {
        const response = await api.post(`billing/stripe/session-verify`, {
            session_id: sessionId,
            organization_id: props.organizationId
        });
        
        if (response.success) {
            isSuccess.value = true;
            upgradedPlanName.value = response.data.plan_name;
            
            await billingStore.loadSubscription(props.organizationId);
            
            countdownInterval = setInterval(() => {
                countdown.value--;
                if (countdown.value <= 0) {
                    popup.close();
                }
            }, 1000);
        }
    } catch (error) {
        popup.notification('Failed to verify payment', false);
        popup.close();
    }
}

onUnmounted(() => {
    if (countdownInterval) {
        clearInterval(countdownInterval);
    }
});
</script>

<style scoped>
.upgrade-modal {
    width: 100%;
    max-width: 900px;
}

.plans-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
    margin-bottom: 24px;
}

.plan-card {
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 20px;
    cursor: pointer;
    transition: all 0.2s;
    position: relative;
    background: var(--background-0);
}

.plan-card:hover {
    border-color: var(--brand-primary);
}

.plan-card.current {
    cursor: default;
    pointer-events: none;
}

.plan-card.selected {
    border-color: var(--brand-primary);
}

.plan-content {
    min-height: 200px;
}

.plan-header {
    margin-bottom: 16px;
}

.plan-header h3 {
    margin: 0 0 8px 0;
    font-size: 18px;
}

.plan-price {
    display: flex;
    align-items: baseline;
    gap: 2px;
    height: 42px;
}

.plan-price .currency {
    font-size: 14px;
    color: var(--text-secondary);
}

.plan-price .amount {
    font-size: 28px;
    font-weight: 700;
}

.plan-price .period {
    font-size: 12px;
    color: var(--text-secondary);
}

.plan-features {
    font-size: 13px;
    line-height: 1.6;
}

.plan-features p {
    margin: 0;
    color: var(--text-secondary);
}

.plan-action {
    margin-top: 16px;
}

.current-badge, .selected-badge {
    text-align: center;
    font-size: 12px;
    font-weight: 500;
    padding: 4px 8px;
    border-radius: 4px;
}

.current-badge {
    background: var(--background-3);
    color: var(--text-secondary);
}

.selected-badge {
    background: var(--brand-fill);
    color: var(--brand-primary);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
}

/* Seats Section */
.seats-section {
    border-radius: 8px;
    padding: 20px;
    margin-bottom: 24px;
    display: flex;
    justify-content: space-between;
    background: var(--background-0);
    align-items: center;
}

.seats-section h3 {
    margin: 0 0 8px 0;
    font-size: 16px;
}

.seats-info {
    font-size: 14px;
    color: var(--text-secondary);
}

.seats-selector {
    display: flex;
    align-items: center;
    gap: 12px;
}

.seats-display {
    display: flex;
    align-items: center;
    gap: 8px;
}

.seats-input {
    width: 60px;
    padding: 8px;
    text-align: center;
    border: 1px solid var(--border);
    border-radius: 4px;
    font-size: 16px;
    font-weight: 500;
}

.seats-label {
    font-size: 14px;
    color: var(--text-secondary);
}

/* Order Summary */
.order-summary {
    background: var(--background-1);
    border-radius: 8px;
    padding: 20px;
}

.order-summary h3 {
    margin: 0 0 16px 0;
    font-size: 16px;
}

.summary-lines {
    margin-bottom: 20px;
}

.summary-line {
    display: flex;
    justify-content: space-between;
    padding: 8px 0;
    font-size: 14px;
}

.summary-line.total {
    border-top: 1px solid var(--border);
    margin-top: 8px;
    padding-top: 16px;
    font-weight: 600;
    font-size: 16px;
}

.action-buttons {
    display: flex;
    justify-content: flex-end;
}

/* Success Message */
.success-message {
    text-align: center;
    padding: 40px;
}

.success-icon {
    width: 60px;
    height: 60px;
    background: var(--success);
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 32px;
    margin: 0 auto 20px;
}

.success-message h3 {
    margin-bottom: 12px;
}

.success-message p {
    margin-bottom: 8px;
}

@media (max-width: 768px) {
    .upgrade-modal {
        min-width: unset;
        width: 90vw;
    }
    
    .plans-grid {
        grid-template-columns: 1fr;
    }
}
</style>