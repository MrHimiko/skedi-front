<!-- src/panels/user/plugins/integrations/components/oauth/OAuthPopupView.vue -->
<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { api } from '@utils/api';
import { common } from '@utils/common';
import { popup } from '@utils/popup';

import PopupLayout from '@layouts/popup/view.vue';
import Button from '@form/button/view.vue';

const props = defineProps({
    provider: {
        type: String,
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
const isDevelopmentMode = ref(true); // Set to true for development, false for production

// Generate a unique state value for security
const state = btoa(JSON.stringify({
    provider: props.provider,
    timestamp: Date.now()
}));

// Get authentication URL
async function getAuthUrl() {
    try {
        isLoading.value = true;
        error.value = null;
        
        if (isDevelopmentMode.value) {
            // In development mode, use a mock URL
            if (props.provider === 'google_calendar') {
                authUrl.value = `https://accounts.google.com/o/oauth2/auth?client_id=YOUR_CLIENT_ID&redirect_uri=YOUR_REDIRECT_URI&response_type=code&scope=https://www.googleapis.com/auth/calendar&access_type=offline&prompt=consent&state=${state}`;
            } else if (props.provider === 'google_meet') {
                authUrl.value = `https://accounts.google.com/o/oauth2/auth?client_id=YOUR_CLIENT_ID&redirect_uri=YOUR_REDIRECT_URI&response_type=code&scope=https://www.googleapis.com/auth/calendar&access_type=offline&prompt=consent&state=${state}`;
            } else {
                authUrl.value = `https://oauth.example.com/authorize?provider=${props.provider}&state=${state}`;
            }
        } else {
            // In production, use the real API endpoint
            const response = await api.get(`user/integrations/${props.provider}/auth?state=${state}`);
            if (response.success && response.data && response.data.auth_url) {
                authUrl.value = response.data.auth_url;
            } else {
                throw new Error(response.message || 'Failed to get authentication URL');
            }
        }
        
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
        if (isDevelopmentMode.value) {
            // In development mode, show a notification about simulation
            common.notification(`Simulating ${props.provider.replace('_', ' ')} authentication in development mode`, true);
            
            // Simulate a brief popup opening and closing
            const width = 600;
            const height = 700;
            const left = window.screen.width / 2 - width / 2;
            const top = window.screen.height / 2 - height / 2;
            
            // Show a brief popup with a message (it will close automatically)
            authWindow.value = window.open(
                'about:blank',
                `${props.provider}_auth`,
                `width=${width},height=${height},left=${left},top=${top}`
            );
            
            if (authWindow.value) {
                authWindow.value.document.write(`
                    <html>
                        <head>
                            <title>OAuth Simulation</title>
                            <style>
                                body {
                                    font-family: Arial, sans-serif;
                                    display: flex;
                                    justify-content: center;
                                    align-items: center;
                                    height: 100vh;
                                    margin: 0;
                                    background-color: #f8f9fa;
                                }
                                .message {
                                    text-align: center;
                                    padding: 20px;
                                    background-color: white;
                                    border-radius: 8px;
                                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                                    max-width: 80%;
                                }
                                h2 {
                                    color: #4285F4;
                                }
                            </style>
                        </head>
                        <body>
                            <div class="message">
                                <h2>Development Mode</h2>
                                <p>This is a simulated OAuth flow for development purposes.</p>
                                <p>In production, you would see the real ${props.provider.replace('_', ' ')} authorization page.</p>
                                <p>Window will close in 2 seconds...</p>
                            </div>
                        </body>
                    </html>
                `);
            }
            
            // After a short delay, simulate successful authentication
            setTimeout(() => {
                if (authWindow.value) {
                    try {
                        // We try to access this property, but it might fail due to COOP restrictions
                        // We'll catch the error and proceed anyway
                        if (!authWindow.value.closed) {
                            authWindow.value.close();
                        }
                    } catch (e) {
                        console.warn('Could not access window.closed property due to COOP restrictions');
                        // Try to close it anyway
                        try {
                            authWindow.value.close();
                        } catch (closeError) {
                            console.warn('Could not close window due to security restrictions');
                        }
                    }
                }
                
                completeAuthentication('simulated_auth_code');
            }, 2000);
        } else {
            // In production, use the real OAuth flow
            // Calculate window dimensions and position
            const width = 600;
            const height = 700;
            const left = window.screen.width / 2 - width / 2;
            const top = window.screen.height / 2 - height / 2;
            
            // Open popup window
            authWindow.value = window.open(
                authUrl.value,
                `${props.provider}_auth`,
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
        }
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

// Complete the authentication process
async function completeAuthentication(code) {
    try {
        stopPolling();
        isLoading.value = true;
        error.value = null;
        
        if (isDevelopmentMode.value) {
            // For development, simulate API response
            const mockResponse = {
                success: true,
                data: {
                    id: props.provider,
                    provider: props.provider,
                    account_email: 'user@example.com',
                    connected_at: new Date().toISOString()
                }
            };
            
            // Call callback with result
            props.callback(null, mockResponse.data, mockResponse, mockResponse.success);
            
            // Close the popup
            popup.close();
            
            // Show success notification
            common.notification(`Successfully connected to ${props.provider.replace('_', ' ')} (Development Mode)`, true);
        } else {
            // In production, call the API to complete authentication
            const response = await api.post(`user/integrations/${props.provider}/auth/callback`, { 
                code,
                state 
            });
            
            if (response.success) {
                // Call callback with result
                props.callback(null, response.data, response, response.success);
                
                // Close the popup
                popup.close();
                
                // Show success notification
                common.notification(`Successfully connected to ${props.provider.replace('_', ' ')}`, true);
            } else {
                throw new Error(response.message || 'Authentication failed');
            }
        }
    } catch (err) {
        console.error('Error completing authentication:', err);
        error.value = err.message || 'Failed to complete authentication';
        isLoading.value = false;
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
    <PopupLayout title="Connect to Provider" class="h-auto">
        <template #content>
            <div class="oauth-popup-content">
                <!-- Development mode notice -->
                <div v-if="isDevelopmentMode" class="dev-mode-notice">
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
                        <div :class="['provider-icon', provider]">
                            <span v-if="provider.includes('google')">G</span>
                            <span v-else-if="provider.includes('microsoft')">M</span>
                            <span v-else>{{ provider[0].toUpperCase() }}</span>
                        </div>
                    </div>
                    
                    <h3>Connect to {{ provider.replace('_', ' ') }}</h3>
                    <p class="description">
                        {{ isDevelopmentMode 
                            ? 'In development mode, this will simulate connecting to ' + provider.replace('_', ' ') 
                            : "You'll be redirected to the provider's authentication page. Please sign in and grant the required permissions." 
                        }}
                    </p>
                    
                    <div class="permissions">
                        <h4>This will allow us to:</h4>
                        <ul>
                            <li v-if="provider.includes('calendar')">
                                <i>check</i> View and manage your calendar
                            </li>
                            <li v-if="provider.includes('meet')">
                                <i>check</i> Create and manage video meetings
                            </li>
                            <li>
                                <i>check</i> Sync your events and availability
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

<style scoped>
.oauth-popup-content {
    min-width: 450px;
    max-width: 500px;
    padding: 10px 0;
}

.dev-mode-notice {
    display: flex;
    align-items: center;
    gap: 8px;
    background-color: #FFF3CD;
    color: #856404;
    padding: 8px 12px;
    border-radius: 4px;
    margin-bottom: 15px;
    font-size: 14px;
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

.provider-icon.google_calendar,
.provider-icon.google_meet {
    background-color: #4285F4;
}

.provider-icon.microsoft_calendar {
    background-color: #00A4EF;
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