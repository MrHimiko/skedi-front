
<!-- src/panels/user/plugins/integrations/components/marketplace/IntegrationCard.vue -->
<script setup>
    import { ref, computed, onMounted, watch } from 'vue';
    import { api } from '@utils/api';
    import { common } from '@utils/common';
    import { storage } from '@utils/storage';
    import { popup } from '@utils/popup';
    import IntegrationProviders from '@user_integrations/providers';
    
    import Button from '@form/button/view.vue';
    import ConfirmComponent from '@floated/confirm/view.vue';
    
    const props = defineProps({
        integration: {
            type: Object,
            required: true
        }
    });

    
    const emit = defineEmits(['connect']);
    const isConnecting = ref(false);
    const isConnected = ref(false);
    const entityId = ref(null);
    const provider = ref(null);
    
    // Initialize provider and check connection/installation status
    function initialize() {
        try {
            if (!props.integration) return;
            
            // Get provider
            provider.value = IntegrationProviders.getProvider(props.integration.id);
            
            // Check if installed based on backend data if available
            if (props.integration.isInstalled !== undefined) {
                isConnected.value = props.integration.isInstalled;
                entityId.value = props.integration.entityId;
            } 
            // Fallback to local storage check
            else if (provider.value) {
                isConnected.value = provider.value.isConnected();
                
                // Try to get entity ID from connection
                const connection = provider.value.getConnection();
                if (connection && connection.id) {
                    entityId.value = connection.id;
                }
            }
            
            console.log(`Integration initialized: ${props.integration.name}`, {
                isConnected: isConnected.value,
                entityId: entityId.value
            });
        } catch (error) {
            console.error('Error initializing integration:', error);
            provider.value = null;
            isConnected.value = false;
            entityId.value = null;
        }
    }
    
    // Watch for changes to the integration prop
    watch(() => props.integration, () => {
        initialize();
    }, { immediate: true });
    
    // Initial setup on mount
    onMounted(() => {
        initialize();
    });
    

    
    // Compute icon text based on integration
    const iconText = computed(() => {
        if (!props.integration) return '?';
        
        const id = props.integration.id?.toLowerCase() || '';
        
        if (id.includes('google')) return 'G';
        if (id.includes('zoom')) return 'Z';
        if (id.includes('microsoft')) return 'M';
        
        return props.integration.name?.[0] || '?';
    });
    
    // Handle connect button click - OAuth process
    async function handleConnect() {
        if (!provider.value) {
            common.notification('Provider not available', false);
            return;
        }
        
        try {
            isConnecting.value = true;
            
            // Start the OAuth flow
            provider.value.startOAuthFlow((success, data) => {
                isConnecting.value = false;
                
                if (success) {
                    // Update state
                    isConnected.value = true;
                    
                    // Try to extract entity ID from OAuth response
                    if (data && data.id) {
                        entityId.value = data.id;
                    }
                    
                    // Notify parent to refresh integrations
                    emit('connect', props.integration.id);
                }
            });
        } catch (error) {
            console.error('Error connecting to integration:', error);
            common.notification('Failed to connect to integration', false);
            isConnecting.value = false;
        }
    }
    
    // Handle disconnect with proper entity ID
    function handleDisconnect() {
        // Find the entity ID to use for disconnection
        const idToUse = entityId.value || 
                        props.integration.entityId || 
                        (props.integration.integrationDetails?.id);
        
        if (!idToUse) {
            console.error('Missing integration entity ID for disconnect', props.integration);
            common.notification('Cannot disconnect: Integration ID not found', false);
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
                        console.log(`Disconnecting integration with ID: ${idToUse}`);
                        const response = await api.delete(`user/integrations/${idToUse}`);
                        
                        if (response.success) {
                            // Clean up local storage
                            const integrations = storage.get('integrations') || {};
                            if (integrations[props.integration.id]) {
                                delete integrations[props.integration.id];
                                storage.set('integrations', integrations);
                            }
                            
                            // Update state
                            isConnected.value = false;
                            entityId.value = null;
                            
                            // Notify parent to refresh integrations
                            emit('connect', props.integration.id);
                            common.notification('Integration disconnected successfully', true);
                        } else {
                            throw new Error(response.message || 'Failed to disconnect');
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
            <div>
                <img style="width:40px" :src="integration.icon" :alt="integration.name" />

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
    position: relative;
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
    position: absolute;
    top:10px;
    right:10px;
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