// src/panels/user/plugins/integrations/services/IntegrationsManager.js
import { api } from '@utils/api';
import { storage } from '@utils/storage';
import { common } from '@utils/common';
import IntegrationProviders from '../providers';

/**
 * Service for managing integrations and handling the OAuth flow
 */
export class IntegrationsManager {
    /**
     * Start the OAuth flow for a provider
     * @param {string} providerId - The integration provider ID (e.g., 'google_calendar')
     * @param {Function} callback - Optional callback after completion
     */
    static startOAuthFlow(providerId, callback = null) {
        const provider = IntegrationProviders.getProvider(providerId);
        
        if (!provider) {
            common.notification(`Provider '${providerId}' not found`, false);
            if (callback) {
                callback(false, null);
            }
            return;
        }
        
        provider.startOAuthFlow((success, data) => {
            if (callback) {
                callback(success, data);
            }
        });
    }
    
    /**
     * Check if a provider is connected
     * @param {string} providerId - The integration provider ID
     * @returns {boolean} - True if connected
     */
    static isConnected(providerId) {
        const provider = IntegrationProviders.getProvider(providerId);
        return provider ? provider.isConnected() : false;
    }
    
    /**
     * Get connection details for a provider
     * @param {string} providerId - The integration provider ID
     * @returns {Object|null} - Connection details or null if not connected
     */
    static getConnection(providerId) {
        const provider = IntegrationProviders.getProvider(providerId);
        return provider ? provider.getConnection() : null;
    }
    
    /**
     * Disconnect an integration
     * @param {string} providerId - The integration provider ID 
     * @param {Function} callback - Optional callback after completion
     * @returns {Promise<boolean>} - True if successful
     */
    static async disconnect(providerId, callback = null) {
        const provider = IntegrationProviders.getProvider(providerId);
        
        if (!provider) {
            common.notification(`Provider '${providerId}' not found`, false);
            if (callback) {
                callback(false);
            }
            return false;
        }
        
        return await provider.disconnect(callback);
    }
    
    /**
     * Get all connected integrations
     * @returns {Object} - Map of provider ID to connection details
     */
    static getAllConnections() {
        try {
            return storage.get('integrations') || {};
        } catch (error) {
            console.error('Error getting all connections:', error);
            return {};
        }
    }
    
    /**
     * Get available integration providers
     * @returns {Array} - Array of provider details
     */
    static getAvailableProviders() {
        return IntegrationProviders.getProviderDetails();
    }
    
    /**
     * Execute an API method on a provider
     * @param {string} providerId - The integration provider ID
     * @param {string} method - Method name
     * @param {Array} args - Method arguments
     * @returns {Promise<any>} - Method result
     */
    static async executeProviderMethod(providerId, method, ...args) {
        const provider = IntegrationProviders.getProvider(providerId);
        
        if (!provider) {
            throw new Error(`Provider '${providerId}' not found`);
        }
        
        if (typeof provider[method] !== 'function') {
            throw new Error(`Method '${method}' not found on provider '${providerId}'`);
        }
        
        return await provider[method](...args);
    }
}