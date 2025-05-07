<!-- src/panels/user/plugins/integrations/components/marketplace/IntegrationCard.vue -->
<script setup>
    import { ref, onMounted, watch } from 'vue';
    import { common } from '@utils/common';
    import IntegrationProviders from '@user_integrations/providers';
    
    import Button from '@form/button/view.vue';
    import ConfirmComponent from '@floated/confirm/view.vue';
    import { popup } from '@utils/popup';
    
    const props = defineProps({
        integration: {
            type: Object,
            required: true
        }
    });
    
    const emit = defineEmits(['connect']);
    const isConnecting = ref(false);
    const isConnected = ref(false);
    const provider = ref(null);
    
    // Initialize provider and check connection status
    function initializeProvider() {
        try {
            if (props.integration && props.integration.id) {
                provider.value = IntegrationProviders.getProvider(props.integration.id);
                isConnected.value = provider.value ? provider.value.isConnected() : false;
            } else {
                provider.value = null;
                isConnected.value = false;
            }
        } catch (error) {
            console.error('Error initializing provider:', error);
            provider.value = null;
            isConnected.value = false;
        }
    }
    
    // Watch for changes to the integration prop
    watch(() => props.integration, () => {
        initializeProvider();
    }, { immediate: true });
    
    // Initial check on mount
    onMounted(() => {
        initializeProvider();
    });
    
    // Get icon class based on integration ID
    function getIconClass(integration) {
        if (!integration || !integration.id) return 'default-icon';
        
        const id = integration.id.toLowerCase();
        
        if (id.includes('google')) {
            return 'google-icon';
        } else if (id.includes('zoom')) {
            return 'zoom-icon';
        } else if (id.includes('microsoft') || id.includes('outlook')) {
            return 'microsoft-icon';
        } else if (id.includes('slack')) {
            return 'slack-icon';
        }
        
        return 'default-icon';
    }
    
    // Handle connect button click - OAuth process
    function handleConnect() {
        try {
            if (!provider.value) {
                common.notification('Provider not available', false);
                return;
            }
            
            isConnecting.value = true;
            
            // Start the OAuth flow using the provider instance directly
            provider.value.startOAuthFlow((success) => {
                isConnecting.value = false;
                
                if (success) {
                    isConnected.value = true;
                    emit('connect', props.integration.id);
                }
            });
        } catch (error) {
            console.error('Error connecting to integration:', error);
            common.notification('Failed to connect to integration', false);
            isConnecting.value = false;
        }
    }
    
    // Handle disconnect
    function handleDisconnect() {
        if (!provider.value) {
            common.notification('Provider not available', false);
            return;
        }
        
        popup.open(
            'disconnect-confirm',
            null,
            ConfirmComponent,
            {
                as: 'red',
                description: `Are you sure you want to disconnect from ${props.integration.name}?`,
                callback: async () => {
                    try {
                        const result = await provider.value.disconnect();
                        
                        if (result) {
                            isConnected.value = false;
                            emit('connect', props.integration.id);
                        }
                        
                        popup.close();
                    } catch (error) {
                        console.error('Error disconnecting:', error);
                        common.notification('Failed to disconnect integration', false);
                    }
                }
            },
            {
                position: 'center'
            }
        );
    }
    
    // Open details dialog
    function openDetails() {
        // TODO: Implement details view
        common.notification(`${props.integration.name} integration details`, true);
    }
</script>

<template>
    <div class="integration-card">
        <div class="integration-logo">
            <!-- Integration icon -->
            <div :class="['icon', getIconClass(integration)]">
                <span v-if="integration && integration.id && integration.id.includes('google')">G</span>
                <span v-else-if="integration && integration.id && integration.id.includes('zoom')">Z</span>
                <span v-else-if="integration && integration.id && integration.id.includes('microsoft')">M</span>
                <span v-else>{{ integration && integration.name ? integration.name[0] : '?' }}</span>
            </div>
        </div>
        
        <div class="integration-info">
            <h3>{{ integration ? integration.name : 'Unknown Integration' }}</h3>
            <div class="integration-category">{{ integration ? integration.category : 'unknown' }}</div>
            <p class="description">{{ integration ? integration.description : 'No description available' }}</p>
        </div>
        
        <div class="integration-actions">
            <Button 
                label="Details"
                as="tertiary"
                @click="openDetails"
            />
            
            <Button 
                v-if="!isConnected"
                :label="isConnecting ? 'Connecting...' : 'Connect'"
                :loading="isConnecting"
                @click="handleConnect"
            />
            
            <div v-else class="connected-status">
                <Button 
                    label="Disconnect"
                    as="tertiary"
                    @click="handleDisconnect"
                />
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
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    color: white;
    font-size: 18px;
}

.google-icon {
    background-color: #4285F4;
}

.microsoft-icon {
    background-color: #00A4EF;
}

.zoom-icon {
    background-color: #2D8CFF;
}

.slack-icon {
    background-color: #4A154B;
}

.default-icon {
    background-color: #6c5ce7;
}

.integration-info {
    flex: 1;
}

.integration-info h3 {
    margin: 0 0 5px 0;
    font-size: 16px;
    font-weight: 600;
}

.integration-category {
    display: inline-block;
    padding: 3px 8px;
    background-color: var(--background-1);
    border-radius: 4px;
    font-size: 12px;
    color: var(--text-secondary);
    margin-bottom: 10px;
    text-transform: capitalize;
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

.connected-status {
    display: flex;
    align-items: center;
    gap: 10px;
}

.connected-badge {
    background-color: #FACC15;
    color: #000;
    padding: 4px 8px;
    border-radius: 4px;
    font-weight: 500;
    font-size: 12px;
}
</style>