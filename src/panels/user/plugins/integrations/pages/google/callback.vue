

<script setup>
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const status = ref('processing');
const message = ref('Processing authentication...');
const details = ref('');

onMounted(() => {
    // Get code and state from URL
    const code = route.query.code;
    const state = route.query.state;
    const error = route.query.error;
    
    if (error) {
        status.value = 'error';
        message.value = `Authentication failed: ${error}`;
        return;
    }
    
    if (!code) {
        status.value = 'error';
        message.value = 'No authorization code received. Authentication failed.';
        return;
    }
    
    // Debug info
    details.value = `Code received. Sending to parent window...`;
    
    // Send message to opener window
    if (window.opener) {
        try {
            window.opener.postMessage({
                type: 'google_oauth_callback',
                code,
                state
            }, '*');  // Replace '*' with your domain in production
            
            // Update status
            status.value = 'success';
            message.value = 'Authentication successful! This window will close automatically.';
            
            // Close window after delay
            setTimeout(() => window.close(), 3000);
        } catch (err) {
            status.value = 'error';
            message.value = 'Failed to communicate with the application window.';
            details.value = err.message;
        }
    } else {
        // If opened directly (not in popup)
        status.value = 'warning';
        message.value = 'Authentication complete, but unable to communicate with the application.';
        details.value = 'Please close this window and return to the application manually.';
    }
});
</script>

<template>
    <div class="callback-container">
        <div v-if="status === 'processing'" class="status-card processing">
            <i class="icon-spinner">sync</i>
            <h1>Processing Authentication</h1>
            <p>{{ message }}</p>
            <div v-if="details" class="details">{{ details }}</div>
        </div>
        
        <div v-else-if="status === 'success'" class="status-card success">
            <i class="icon-success">check_circle</i>
            <h1>Authentication Successful</h1>
            <p>{{ message }}</p>
            <div v-if="details" class="details">{{ details }}</div>
        </div>
        
        <div v-else-if="status === 'warning'" class="status-card warning">
            <i class="icon-warning">warning</i>
            <h1>Authentication Completed</h1>
            <p>{{ message }}</p>
            <div v-if="details" class="details">{{ details }}</div>
        </div>
        
        <div v-else class="status-card error">
            <i class="icon-error">error</i>
            <h1>Authentication Error</h1>
            <p>{{ message }}</p>
            <div v-if="details" class="details">{{ details }}</div>
        </div>
    </div>
</template>

<style scoped>
.callback-container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    padding: 20px;
    background-color: var(--background-1);
}

.status-card {
    padding: 40px;
    text-align: center;
    background-color: var(--background-0);
    border-radius: 10px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    max-width: 500px;
    width: 100%;
}

.status-card i {
    font-size: 48px;
    margin-bottom: 20px;
}

.icon-spinner {
    color: var(--brand-default);
    animation: spin 2s linear infinite;
}

.icon-success {
    color: var(--green-default);
}

.icon-warning {
    color: var(--orange-default);
}

.icon-error {
    color: var(--red-default);
}

h1 {
    margin-bottom: 15px;
    font-size: 24px;
    font-weight: 600;
}

p {
    color: var(--text-secondary);
    font-size: 16px;
    line-height: 1.5;
    margin-bottom: 15px;
}

.details {
    font-size: 13px;
    background: var(--background-1);
    padding: 10px;
    border-radius: 5px;
    margin-top: 15px;
    text-align: left;
    color: var(--text-tertiary);
    word-break: break-word;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}
</style>