<!-- src/panels/user/plugins/integrations/providers/outlook-calendar/oauth-view.vue -->
<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { common } from '@utils/common';
import { popup } from '@utils/popup';

import PopupLayout from '@layouts/popup/view.vue';
import Button from '@form/button/view.vue';

const props = defineProps({
    provider: {
        type: Object,
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
const messageListenerRef = ref(null);
const timeoutId = ref(null);

// Get authentication URL from the provider
async function getAuthUrl() {
    try {
        isLoading.value = true;
        error.value = null;
        
        // Use provider instance method to get the URL
        const url = await props.provider.getOAuthUrl();
        console.log("Auth URL from backend:", url);
        
        authUrl.value = url;
        isLoading.value = false;
    } catch (err) {
        console.error('Error getting auth URL:', err);
        error.value = err.message || 'An error occurred while preparing authentication';
        isLoading.value = false;
    }
}

// Start the OAuth flow by opening the popup
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
            'outlook_calendar_auth',
            `width=${width},height=${height},left=${left},top=${top}`
        );
        
        if (!authWindow.value) {
            throw new Error('Popup was blocked. Please allow popups for this site.');
        }
        
        // Set a timeout to auto-close if taking too long (2 minutes)
        timeoutId.value = setTimeout(() => {
            closeAuthWindow();
            error.value = 'Authentication timed out. Please try again.';
        }, 120000);
    } catch (err) {
        console.error('Error starting OAuth flow:', err);
        error.value = err.message || 'Failed to start authentication flow';
    }
}

// Close the auth window safely
function closeAuthWindow() {
    if (timeoutId.value) {
        clearTimeout(timeoutId.value);
        timeoutId.value = null;
    }
    
    if (authWindow.value) {
        try {
            authWindow.value.close();
        } catch (e) {
            console.warn('Could not close auth window:', e);
        }
        authWindow.value = null;
    }
}

// Complete the authentication process with the code
async function completeAuthentication(code, state) {
    try {
        // Cancel any pending timeout
        if (timeoutId.value) {
            clearTimeout(timeoutId.value);
            timeoutId.value = null;
        }
        
        isLoading.value = true;
        error.value = null;
        
        console.log('Completing authentication with code:', code);
        
        // Use the provider's completeOAuth method
        const response = await props.provider.completeOAuth(code, state);
        
        if (response && response.success) {
            // Call callback with result
            props.callback(null, response.data, response, response.success);
            
            // Close the popup
            popup.close();
            
            // Show success notification
            common.notification(`Successfully connected to ${props.provider.name}`, true);
        } else {
            throw new Error(response?.message || 'Authentication failed');
        }
    } catch (err) {
        console.error('Error completing authentication:', err);
        error.value = err.message || 'Failed to complete authentication';
        isLoading.value = false;
    }
}

// Setup message listener for OAuth callback
function setupMessageListener() {
    const messageHandler = (event) => {
        console.log('Received message:', event.data);
        
        // Only accept messages with the right type
        if (event.data && event.data.type === 'outlook_oauth_callback') {
            const { code, state } = event.data;
            
            if (code) {
                // Complete authentication with the code
                completeAuthentication(code, state);
            } else {
                error.value = 'No authorization code received';
            }
        }
    };
    
    // Add message event listener
    window.addEventListener('message', messageHandler);
    
    // Store the handler reference to remove it later
    messageListenerRef.value = messageHandler;
    console.log('Message listener set up');
}

// Handle manual cancel
function handleCancel() {
    closeAuthWindow();
    popup.close();
}

// Clean up on unmount
onUnmounted(() => {
    closeAuthWindow();
    
    if (messageListenerRef.value) {
        window.removeEventListener('message', messageListenerRef.value);
    }
});

// Initialize on component mount
onMounted(() => {
    // Setup message listener first, so it's ready before we open the auth window
    setupMessageListener();
    
    // Get the auth URL
    getAuthUrl();
});
</script>

<template>
    <PopupLayout title="Connect to Outlook Calendar" class="h-auto">
        <template #content>
            <div class="oauth-popup-content">
                <!-- Loading state -->
                <div v-if="isLoading" class="auth-state">
                    <div class="spinner">
                        <i class="spin">sync</i>
                    </div>
                    <p>Preparing Outlook Calendar authentication...</p>
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
                        <div class="provider-icon outlook">
                            <img src="https://global.divhunt.com/41d16cde92f23c0849a7ddfd2065aa2e_3202.svg" 
                                alt="Outlook" style="width: 32px; height: 32px;" />
                        </div>
                    </div>
                    
                    <h3>Connect to Outlook Calendar</h3>
                    <p class="description">
                        You'll be redirected to Microsoft to authorize access to your calendar. 
                        Please sign in and grant the required permissions.
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
                        <Button 
                            label="Authorize with Microsoft" 
                            @click="startOAuthFlow" 
                        />
                        <Button label="Cancel" as="tertiary" @click="handleCancel" />
                    </div>
                </div>
            </div>
        </template>
    </PopupLayout>
</template>

<style scoped>
.oauth-popup-content {
    min-width: 450px;
    max-width: 500px;
    padding: 10px 0;
}

.auth-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 20px 0;
}

.icon-container {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background-color: var(--background-1);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 20px;
}

.auth-state.error .icon-container {
    color: var(--red-default);
}

.provider-icon {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    font-weight: 600;
    color: white;
}

.provider-icon.outlook {
    background-color: #0078d4;
}

.spinner {
    margin-bottom: 20px;
}

.spinner i.spin {
    font-size: 40px;
    animation: spin 2s linear infinite;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

h3 {
    margin-bottom: 10px;
    font-weight: 600;
    font-size: 18px;
}

p {
    color: var(--text-secondary);
    margin-bottom: 20px;
    max-width: 400px;
}

.description {
    margin-bottom: 20px;
}

.permissions {
    background-color: var(--background-1);
    padding: 15px;
    border-radius: 8px;
    text-align: left;
    width: 100%;
    margin-bottom: 20px;
}

.permissions h4 {
    font-weight: 500;
    font-size: 14px;
    margin-bottom: 10px;
    color: var(--text-secondary);
}

.permissions ul {
    list-style: none;
    padding: 0;
}

.permissions li {
    display: flex;
    align-items: center;
    gap: 5px;
    margin-bottom: 8px;
    font-size: 14px;
}

.permissions li i {
    color: var(--green-default);
    font-size: 16px;
}

.actions {
    display: flex;
    gap: 10px;
    margin-top: 10px;
}
</style>