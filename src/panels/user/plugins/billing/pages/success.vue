// src/panels/user/plugins/billing/pages/success.vue

<template>
    <div class="billing-success">
        <div class="success-container">
            <div class="success-icon">✓</div>
            <h1>Payment Successful!</h1>
            <p>Your subscription has been activated. Redirecting...</p>
        </div>
    </div>
</template>

<script setup>
import { onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { BillingStore } from '@stores/billing';
import { UserStore } from '@stores/user';
import { api } from '@utils/api';

const router = useRouter();
const route = useRoute();
const billingStore = BillingStore();
const userStore = UserStore();

onMounted(async () => {
    // Verify the session
    const sessionId = route.query.session_id;
    
    if (sessionId) {
        // Reload user data to get updated subscription
        try {
            const response = await api.get('account/user');
            if (response.success && response.data) {
                userStore.setData(response.data);
                
                // Reload billing data
                const orgs = userStore.getOrganizations();
                if (orgs && orgs.length > 0) {
                    await billingStore.loadSubscription(orgs[0].id);
                }
            }
        } catch (error) {
            console.error('Failed to reload user data:', error);
        }
    }
    
    // Redirect after 3 seconds
    setTimeout(() => {
        router.push('/teams');
    }, 3000);
});
</script>

<style scoped>
.billing-success {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--background-0);
}

.success-container {
    text-align: center;
    padding: 40px;
    background: var(--background-1);
    border-radius: 12px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.success-icon {
    width: 80px;
    height: 80px;
    background: var(--success);
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 48px;
    margin: 0 auto 24px;
}

h1 {
    margin-bottom: 16px;
    color: var(--text-primary);
}

p {
    color: var(--text-secondary);
}
</style>