import { api } from '@utils/api';
import { storage } from '@utils/storage';
import { common } from '@utils/common';
import { popup } from '@utils/popup';
import ConfirmComponent from '@floated/confirm/view.vue';

export class DisconnectService {
    /**
     * Show confirmation dialog and handle integration disconnect
     * @param {Object} integration - Integration object with id and name
     * @param {Function} onSuccess - Callback on successful disconnect
     */
    static confirmAndDisconnect(integration, onSuccess = null) {
        if (!integration) {
            common.notification('Invalid integration', false);
            return;
        }
        
        // Ensure we have the actual integration entity ID, not just the provider type
        const integrationId = integration.id || integration.entity?.id;
        
        if (!integrationId) {
            console.error('Missing integration ID for disconnect', integration);
            common.notification('Cannot disconnect: Missing integration ID', false);
            return;
        }
        
        const name = integration.name || integration.entity?.name || 'this integration';
        
        popup.open(
            'disconnect-confirm',
            null,
            ConfirmComponent,
            {
                as: 'red',
                description: `Are you sure you want to disconnect from ${name}?`,
                callback: async () => {
                    const result = await this.disconnect(integrationId, integration.provider || integration.entity?.provider);
                    
                    if (result && onSuccess) {
                        onSuccess(integrationId);
                    }
                    
                    popup.close();
                }
            },
            {
                position: 'center'
            }
        );
    }
    


    static async disconnect(integrationId, providerType) {
        try {
            // If we have a numeric ID, use the original endpoint
            if (typeof integrationId === 'number' || !isNaN(parseInt(integrationId))) {
                console.log(`Disconnecting integration by ID: ${integrationId}`);
                const response = await api.delete(`user/integrations/${integrationId}`);
                
                if (!response.success) {
                    throw new Error(response.message || 'Failed to disconnect integration');
                }
            } 
            // Otherwise, use the provider-based endpoint
            else if (providerType) {
                console.log(`Disconnecting integration by provider: ${providerType}`);
                const response = await api.delete(`user/integrations/provider/${providerType}`);
                
                if (!response.success) {
                    throw new Error(response.message || 'Failed to disconnect integration');
                }
            }
            else {
                throw new Error('Missing integration ID and provider type');
            }
            
            // Clean up local storage
            if (providerType) {
                const integrations = storage.get('integrations') || {};
                
                if (integrations[providerType]) {
                    delete integrations[providerType];
                    storage.set('integrations', integrations);
                }
            }
            
            common.notification('Integration disconnected successfully', true);
            return true;
        } catch (error) {
            console.error(`Error disconnecting integration:`, error);
            common.notification('Failed to disconnect integration', false);
            return false;
        }
    }

}

export default DisconnectService;