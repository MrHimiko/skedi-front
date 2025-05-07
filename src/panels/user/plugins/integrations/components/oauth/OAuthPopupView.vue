<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { common } from '@utils/common';
import { popup } from '@utils/popup';

import PopupLayout from '@layouts/popup/view.vue';
import Button from '@form/button/view.vue';

const props = defineProps({
    provider: {
        type: Object, // Changed from String to Object
        required: true
    },
    callback: {
        type: Function,
        required: true
    }
});

const isLoading = ref(true);
const authUrl = ref('');
const authWindow = ref(null);
const error = ref(null);
const pollInterval = ref(null);
const timeoutId = ref(null);

// Get authentication URL from the provider instance
async function getAuthUrl() {
    try {
        isLoading.value = true;
        error.value = null;
        
        const url = await props.provider.getOAuthUrl();
        
        authUrl.value = url;
        isLoading.value = false;
    } catch (err) {
        console.error('Error getting auth URL:', err);
        error.value = err.message || 'An error occurred while preparing authentication';
        isLoading.value = false;
    }
}

// Start the OAuth flow
function startOAuthFlow() {
    if (!authUrl.value) {
        error.value = 'No authentication URL available';
        return;
    }
    
    try {
        // Calculate window dimensions and position
        const width = 600;
        const height = 700;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;
        
        // Open popup window
        authWindow.value = window.open(
            authUrl.value,
            `${props.provider.id}_auth`,
            `width=${width},height=${height},left=${left},top=${top}`
        );
        
        if (!authWindow.value) {
            throw new Error('Popup was blocked. Please allow popups for this site.');
        }
        
        // Start polling to check if the popup was closed
        startPolling();
        
        // Set a timeout to auto-close if taking too long (2 minutes)
        timeoutId.value = setTimeout(() => {
            try {
                if (authWindow.value && !authWindow.value.closed) {
                    authWindow.value.close();
                }
            } catch (e) {
                console.warn('Could not access window properties due to security restrictions');
            }
            
            stopPolling();
            error.value = 'Authentication timed out. Please try again.';
        }, 120000);
    } catch (err) {
        console.error('Error starting OAuth flow:', err);
        error.value = err.message || 'Failed to start authentication flow';
    }
}

// Poll to check if the popup window was closed
function startPolling() {
    pollInterval.value = setInterval(() => {
        try {
            if (authWindow.value && authWindow.value.closed) {
                stopPolling();
                
                // User closed the window manually without completing auth
                if (!error.value) {
                    error.value = 'Authentication was cancelled';
                }
            }
        } catch (e) {
            console.warn('Could not access window.closed property due to security restrictions');
            // Don't stop polling yet, as the window might still complete auth
        }
    }, 500);
}

// Stop polling
function stopPolling() {
    if (pollInterval.value) {
        clearInterval(pollInterval.value);
        pollInterval.value = null;
    }
    
    if (timeoutId.value) {
        clearTimeout(timeoutId.value);
        timeoutId.value = null;
    }
}

// Handle manual cancel
function handleCancel() {
    try {
        if (authWindow.value && !authWindow.value.closed) {
            authWindow.value.close();
        }
    } catch (e) {
        console.warn('Could not access window properties due to security restrictions');
    }
    
    stopPolling();
    popup.close();
}

// Clean up on unmount
onUnmounted(() => {
    try {
        if (authWindow.value && !authWindow.value.closed) {
            authWindow.value.close();
        }
    } catch (e) {
        console.warn('Could not access window properties due to security restrictions');
    }
    
    stopPolling();
});

// Initialize on component mount
onMounted(() => {
    getAuthUrl();
});
</script>

<template>
    <PopupLayout :title="`Connect to ${props.provider.name}`" class="h-auto">
        <template #content>
            <div class="oauth-popup-content">
                <!-- Development mode notice -->
                <div v-if="props.provider.isDevelopmentMode" class="dev-mode-notice">
                    <i>info</i>
                    <p>Development Mode: OAuth flow will be simulated</p>
                </div>
                
                <!-- Loading state -->
                <div v-if="isLoading" class="auth-state">
                    <div class="spinner">
                        <i class="spin">sync</i>
                    </div>
                    <p>Preparing authentication...</p>
                </div>
                
                <!-- Error state -->
                <div v-else-if="error" class="auth-state error">
                    <div class="icon-container">
                        <i>error</i>
                    </div>
                    <h3>Authentication Error</h3>
                    <p>{{ error }}</p>
                    
                    <div class="actions">
                        <Button label="Try Again" @click="getAuthUrl" />
                        <Button label="Cancel" as="tertiary" @click="handleCancel" />
                    </div>
                </div>
                
                <!-- Ready to authenticate state -->
                <div v-else class="auth-state">
                    <div class="icon-container">
                        <div :class="['provider-icon', props.provider.id]">
                            <span v-if="props.provider.id.includes('google')">G</span>
                            <span v-else-if="props.provider.id.includes('microsoft')">M</span>
                            <span v-else>{{ props.provider.name[0] }}</span>
                        </div>
                    </div>
                    
                    <h3>Connect to {{ props.provider.name }}</h3>
                    <p class="description">
                        {{ props.provider.isDevelopmentMode 
                            ? 'In development mode, this will simulate connecting to ' + props.provider.name 
                            : "You'll be redirected to the provider's authentication page. Please sign in and grant the required permissions." 
                        }}
                    </p>
                    
                    <div class="permissions">
                        <h4>This will allow us to:</h4>
                        <ul>
                            <li v-for="(permission, index) in props.provider.permissions" :key="index">
                                <i>check</i> {{ permission }}
                            </li>
                        </ul>
                    </div>
                    
                    <div class="actions">
                        <Button label="Authorize" @click="startOAuthFlow" />
                        <Button label="Cancel" as="tertiary" @click="handleCancel" />
                    </div>
                </div>
            </div>
        </template>
    </PopupLayout>
</template>