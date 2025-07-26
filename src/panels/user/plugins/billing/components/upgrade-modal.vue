// src/panels/user/plugins/billing/components/upgrade-modal.vue

<template>
    <PopupLayout title="Upgrade Plan" class="upgrade-modal h-auto">
        <template #content>
            <div v-if="!isSuccess">
                <div class="plans-grid">
                    <div 
                        v-for="plan in plans" 
                        :key="plan.slug"
                        class="plan-card"
                        :class="{ 'current': plan.slug === currentPlanSlug }"
                    >
                        <div class="plan-content">
                            <div class="plan-header">
                                <h3>{{ plan.name }}</h3>
                                <div class="plan-price">
                                    <span v-if="plan.slug === 'enterprise'">Custom pricing</span>
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
                            <ButtonComponent
                                v-if="plan.slug === currentPlanSlug"
                                label="Current Plan"
                                as="tertiary"
                                disabled
                            />
                            <ButtonComponent
                                v-else-if="plan.slug === 'enterprise'"
                                label="Contact Sales"
                                as="primary"
                                @click="() => window.open('https://skedi.com/enterprise', '_blank')"
                            />
                            <ButtonComponent
                                v-else
                                :label="loading ? 'Processing...' : 'Upgrade'"
                                as="primary"
                                :disabled="loading"
                                @click="upgradeToPlan(plan)"
                            />
                        </div>
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
const isSuccess = ref(false);
const upgradedPlanName = ref('');
const countdown = ref(5);
let countdownInterval = null;

const currentPlanSlug = computed(() => {
    const levels = ['free', 'professional', 'business', 'enterprise'];
    const planLevel = billingStore.getPlanLevel(props.organizationId);
    return levels[planLevel - 1] || 'free';
});

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

function isPlanHigher(planSlug) {
    const levels = { free: 1, professional: 2, business: 3, enterprise: 4 };
    return levels[planSlug] > billingStore.planLevel;
}

async function upgradeToPlan(plan) {
    loading.value = true;
    
    try {
        const response = await api.post(`billing/organizations/${props.organizationId}/checkout`, {
            plan_slug: plan.slug
        });
        
        if (response.success && response.data.checkout_url) {
            window.location.href = response.data.checkout_url;
        } else {
            throw new Error(response.message || 'Failed to create checkout session');
        }
    } catch (error) {
        popup.notification(error.message || 'Failed to start checkout', false);
        loading.value = false;
    }
}

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
    min-width: 600px;
}

.plans-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
}

@media (min-width: 768px) {
    .plans-grid {
        grid-template-columns: repeat(4, 1fr);
    }
    
    .upgrade-modal {
        min-width: 900px;
    }
}

.plan-card {
    border: 2px solid var(--border);
    border-radius: 12px;
    padding: 24px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    min-height: 300px;
    transition: all 0.2s;
}

.plan-card:hover {
    border-color: var(--brand-primary);
}

.plan-card.current {
    background: var(--background-2);
    opacity: 0.8;
}

.plan-content {
    flex: 1;
}

.plan-header {
    margin-bottom: 20px;
}

.plan-header h3 {
    margin: 0 0 8px 0;
    font-size: 20px;
}

.plan-price {
    display: flex;
    align-items: baseline;
    gap: 4px;
}

.plan-price .currency {
    font-size: 16px;
    color: var(--text-secondary);
}

.plan-price .amount {
    font-size: 32px;
    font-weight: 700;
}

.plan-price .period {
    font-size: 14px;
    color: var(--text-secondary);
}

.plan-features {
    margin-bottom: 24px;
}

.plan-features p {
    line-height: 1.8;
    color: var(--text-secondary);
    font-size: 14px;
}

.plan-action {
    margin-top: auto;
}

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
</style>