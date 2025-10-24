<!-- src/panels/user/plugins/organizations/components/plans/view.vue -->
<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { api } from '@utils/api';
import { common } from '@utils/common';
import { popup } from '@utils/popup';
import { BillingStore } from '@stores/billing';
import ButtonComponent from '@form/button/view.vue';
import PurchaseSeatsModal from '@user_shared/components/purchaseSeatsModal/view.vue';
import { 
    PhCheck, 
    PhPlus, 
    PhMinus, 
    PhShoppingCart,
    PhUsers,
    PhWarning 
} from "@phosphor-icons/vue";

const props = defineProps({
    organization: {
        type: Object,
        required: true
    },
    organizationId: {
        type: Number,
        required: true
    },
    isAdmin: {
        type: Boolean,
        default: false
    }
});

const emit = defineEmits(['refresh']);

const route = useRoute();
const billingStore = BillingStore();

// State - exactly like upgrade-modal.vue
const loading = ref(false);
const plans = ref([]);
const selectedPlan = ref(null);
const additionalSeats = ref(0);
const subscription = ref(null);
const seatInfo = ref({
    total: 1,
    used: 0,
    current_members: 0,
    pending_invitations: 0,
    available: 1
});

// Computed - exactly like upgrade-modal.vue
const currentPlanSlug = computed(() => {
    // First try to use the subscription data we loaded
    if (subscription.value?.plan?.slug) {
        return subscription.value.plan.slug;
    }
    
    // Fallback to billing store
    const levels = ['free', 'professional', 'business', 'enterprise'];
    const planLevel = billingStore.getPlanLevel(props.organizationId);
    return levels[planLevel - 1] || 'free';
});

const currentPlanName = computed(() => {
    // Use the subscription data we loaded
    if (subscription.value?.plan?.name) {
        return subscription.value.plan.name;
    }
    
    // Fallback to billing store
    const billingSubscription = billingStore.getSubscription(props.organizationId);
    if (billingSubscription?.subscription?.plan?.name) {
        return billingSubscription.subscription.plan.name;
    }
    
    // Fallback to finding by slug in plans array
    const plan = plans.value.find(p => p.slug === currentPlanSlug.value);
    return plan?.name || 'Free';
});

const totalPrice = computed(() => {
    if (!selectedPlan.value) return 0;
    const planPrice = selectedPlan.value.price_monthly / 100;
    const seatsPrice = additionalSeats.value * 9;
    return planPrice + seatsPrice;
});

// Functions - exactly like upgrade-modal.vue
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
        
        if (response.success && response.data.checkout_url) {
            window.location.href = response.data.checkout_url;
        } else {
            throw new Error(response.message || 'Failed to create checkout session');
        }
    } catch (error) {
        common.notification(error.message || 'Failed to start checkout', false);
        loading.value = false;
    }
}

// Load seat information
async function loadSeatInfo() {
    try {
        const response = await api.get(`billing/organizations/${props.organizationId}/subscription`);
        if (response.success && response.data) {
            // Store subscription data
            subscription.value = response.data.subscription;
            
            // Load members and invitations to calculate usage
            const membersResponse = await api.get(`organizations/${props.organizationId}/members`);
            const members = membersResponse.data?.members || membersResponse.data || [];
            const invitationsResponse = await api.get(`invitations/sent?organization_id=${props.organizationId}`);
            const invitations = invitationsResponse.data?.filter(inv => inv.status === 'pending') || [];
            
            // Use total_seats from subscription (included_seats + additional_seats)
            const totalSeats = subscription.value?.total_seats || subscription.value?.seats || 1;
            
            seatInfo.value = {
                total: totalSeats,
                used: members.length + invitations.length,
                current_members: members.length,
                pending_invitations: invitations.length,
                available: Math.max(0, totalSeats - members.length - invitations.length)
            };
        }
    } catch (error) {
        console.error('Failed to load seat info:', error);
    }
}

// Purchase more seats
function purchaseSeats() {
    popup.open(
        'purchase-seats',
        null,
        PurchaseSeatsModal,
        {
            organizationId: props.organizationId,
            callback: async () => {
                await loadSeatInfo();
                emit('refresh');
            }
        },
        {
            position: 'center'
        }
    );
}

onMounted(async () => {
    // Load plans - exactly like upgrade-modal.vue
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
    
    // Load seat info
    await loadSeatInfo();
});
</script>

<template>
    <div class="org-plans-tab">
        <div class="plans-header">
            <div class="header-info">
                <h3>Plan & Seats</h3>
                <p>Manage your subscription plan and team seats</p>
            </div>
        </div>
        
        <!-- Current Plan & Seats Info -->
        <div class="current-info-grid">
            <!-- Current Plan Card -->
            <div class="info-card">
                <div class="card-icon">
                    <PhCheck :size="24" weight="bold" />
                </div>
                <div class="card-content">
                    <h4>Current Plan</h4>
                    <p class="card-value">{{ currentPlanName }}</p>
                    <p class="card-description">Your active subscription</p>
                </div>
            </div>
            
            <!-- Seats Usage Card -->
            <div class="info-card">
                <div class="card-icon">
                    <PhUsers :size="24" weight="bold" />
                </div>
                <div class="card-content">
                    <h4>Seats Used</h4>
                    <p class="card-value">{{ seatInfo.used }} / {{ seatInfo.total }}</p>
                    <p class="card-description">
                        {{ seatInfo.current_members }} active + {{ seatInfo.pending_invitations }} pending
                    </p>
                </div>
                <div v-if="isAdmin" class="card-action">
                    <ButtonComponent
                        as="tertiary"
                        label="Buy More"
                        :iconLeft="{ component: PhShoppingCart, weight: 'bold' }"
                        @click="purchaseSeats"
                    />
                </div>
            </div>
        </div>
        

        
        <!-- Plan Selection Section (only for admins) -->
        <div v-if="isAdmin" class="plan-selection-section">
            <h3 class="section-title">Available Plans</h3>
            <p class="section-description">Choose the plan that best fits your needs</p>
            
            <!-- Plan Selection Grid - EXACT COPY from upgrade-modal.vue -->
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

            <!-- Seat Selection - EXACT COPY from upgrade-modal.vue -->
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

            <!-- Order Summary - EXACT COPY from upgrade-modal.vue -->
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
        
        <!-- Non-admin view -->
        <div v-else class="non-admin-notice">
            <p>Only organization admins can manage plans and billing.</p>
        </div>
    </div>
</template>

<style scoped>
.org-plans-tab {
    display: flex;
    flex-direction: column;
    gap: 32px;
}

.plans-header {
    margin-bottom: 8px;
}

.header-info h3 {
    margin: 0 0 8px 0;
    font-size: 20px;
    font-weight: 600;
}

.header-info p {
    margin: 0;
    color: var(--text-secondary);
    font-size: 14px;
}

/* Current Info Grid */
.current-info-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 20px;
}

.info-card {
    background: var(--background-1);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 24px;
    display: flex;
    align-items: flex-start;
    gap: 16px;
}

.card-icon {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    background: var(--brand-fill);
    color: var(--brand-primary);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.card-content {
    flex: 1;
}

.card-content h4 {
    margin: 0 0 8px 0;
    font-size: 14px;
    font-weight: 500;
    color: var(--text-secondary);
}

.card-value {
    margin: 0 0 4px 0;
    font-size: 24px;
    font-weight: 700;
    color: var(--text-primary);
}

.card-description {
    margin: 0;
    font-size: 13px;
    color: var(--text-secondary);
}

.card-action {
    flex-shrink: 0;
}

/* Seats Warning */
.seats-warning {
    background: var(--brand-yellow);
    border-radius: 8px;
    padding: 16px 20px;
    display: flex;
    align-items: center;
    gap: 16px;
}

.seats-warning strong {
    display: block;
    margin-bottom: 4px;
}

/* Plan Selection Section */
.plan-selection-section {
    background: var(--background-1);
    border-radius: 12px;
    padding: 32px;
}

.section-title {
    margin: 0 0 8px 0;
    font-size: 18px;
    font-weight: 600;
}

.section-description {
    margin: 0 0 24px 0;
    color: var(--text-secondary);
    font-size: 14px;
}

/* Plans Grid - EXACT STYLES from upgrade-modal.vue */
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

/* Seats Section - EXACT STYLES from upgrade-modal.vue */
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
    margin: 0;
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

/* Order Summary - EXACT STYLES from upgrade-modal.vue */
.order-summary {
    background: var(--background-0);
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

/* Non-admin notice */
.non-admin-notice {
    background: var(--background-1);
    border-radius: 8px;
    padding: 40px;
    text-align: center;
}

.non-admin-notice p {
    margin: 0;
    color: var(--text-secondary);
}

/* Responsive */
@media (max-width: 768px) {
    .current-info-grid {
        grid-template-columns: 1fr;
    }
    
    .info-card {
        flex-direction: column;
    }
    
    .card-action {
        width: 100%;
    }
    
    .seats-warning {
        flex-direction: column;
        align-items: flex-start;
    }
    
    .plan-selection-section {
        padding: 20px;
    }
    
    .plans-grid {
        grid-template-columns: 1fr;
    }
    
    .seats-section {
        flex-direction: column;
        gap: 16px;
        align-items: flex-start;
    }
}
</style>