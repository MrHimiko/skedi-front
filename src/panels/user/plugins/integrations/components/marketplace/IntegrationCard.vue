<!-- src/panels/user/plugins/integrations/components/marketplace/IntegrationCard.vue -->
<script setup>
    import { ref } from 'vue';
    import { api } from '@utils/api';
    import { common } from '@utils/common';
    import { popup } from '@utils/popup';
    
    import Button from '@form/button/view.vue';
    
    const props = defineProps({
        integration: {
            type: Object,
            required: true
        }
    });
    
    const emit = defineEmits(['connect']);
    const isConnecting = ref(false);
    
    // Handle connect button click
    async function handleConnect() {
        try {
            isConnecting.value = true;
            
            if (props.integration.id === 'google_meet' || props.integration.id === 'google_calendar') {
                // Get Google Auth URL
                // In the future, use actual API:
                // const response = await api.get('user/integrations/google/auth');
                // if (response.success && response.data) {
                //     const authUrl = response.data.auth_url;
                //     window.open(authUrl, 'Google Authorization', 'width=600,height=600');
                // }
                
                // For now, just show a notification
                common.notification('Google authentication initiated', true);
                
                // Mock successful connection
                setTimeout(() => {
                    props.integration.isInstalled = true;
                    emit('connect');
                    common.notification('Successfully connected to Google', true);
                    isConnecting.value = false;
                }, 1500);
            } else {
                // Handle other integration types
                common.notification('Connecting to ' + props.integration.name, true);
            }
        } catch (error) {
            console.error('Error connecting to integration:', error);
            common.notification('Failed to connect to integration', false);
        } finally {
            isConnecting.value = false;
        }
    }
    
    // Open details page
    function openDetails() {
        // For now, just show a notification
        common.notification('Integration details coming soon', true);
    }
</script>

<template>
    <div class="integration-card">
        <div class="integration-logo">
            <!-- Replace with actual icon handling -->
            <div class="icon google-icon"></div>
        </div>
        
        <div class="integration-info">
            <h3>{{ integration.name }}</h3>
            <p class="description">{{ integration.description }}</p>
        </div>
        
        <div class="integration-actions">
            <Button 
                label="Details"
                as="tertiary"
                @click="openDetails"
            />
            
            <Button 
                v-if="!integration.isInstalled"
                :label="isConnecting ? 'Connecting...' : 'Connect'"
                :loading="isConnecting"
                @click="handleConnect"
            />
            
            <div v-else class="connected-badge">
                Connected
            </div>
        </div>
    </div>
</template>

<style scoped>
.integration-card {
    background-color: var(--background-0);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 20px;
    display: flex;
    flex-direction: column;
    height: 100%;
}

.integration-logo {
    margin-bottom: 15px;
}

.icon {
    width: 40px;
    height: 40px;
    border-radius: 8px;
    background-color: #4285F4;
}

.google-icon {
    background-color: #4285F4;
}

.integration-info {
    flex: 1;
}

.integration-info h3 {
    margin: 0 0 10px 0;
    font-size: 16px;
    font-weight: 600;
}

.description {
    font-size: 14px;
    color: var(--text-secondary);
    margin: 0 0 20px 0;
    line-height: 1.4;
}

.integration-actions {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    margin-top: auto;
    padding-top: 15px;
    border-top: 1px solid var(--border);
}

.connected-badge {
    background-color: #facc15;
    color: #000;
    padding: 8px 12px;
    border-radius: 5px;
    font-weight: 500;
    font-size: 14px;
}
</style>