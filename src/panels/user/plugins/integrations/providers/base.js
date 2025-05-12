// src/panels/user/plugins/integrations/providers/base.js
import { api } from '@utils/api';
import { storage } from '@utils/storage';
import { common } from '@utils/common';
import { popup } from '@utils/popup';
import OAuthPopupView from '@user_integrations/components/oauth/OAuthPopupView.vue';
import DisconnectService from '../services/DisconnectService';
/**
 * Base Integration Provider class
 * Provides common functionality for all integration providers
 */
export class BaseIntegrationProvider {
    /**
     * Constructor
     * @param {Object} config - Provider configuration
     */
    constructor(config) {
        this.id = config.id || '';
        this.name = config.name || '';
        this.description = config.description || '';
        this.category = config.category || '';
        this.icon = config.icon || '';
        this.scopes = config.scopes || [];
        this.permissions = config.permissions || [];
        this.oauthView = config.oauthView || OAuthPopupView;
        this.isDevelopmentMode = true; // Set to false in production
    }
    
    /**
     * Get provider details
     * @returns {Object} - Provider details
     */
    getDetails() {
        return {
            id: this.id,
            name: this.name,
            description: this.description,
            category: this.category,
            icon: this.icon
        };
    }
    
    /**
     * Check if provider is connected
     * @returns {boolean} - True if connected
     */
    isConnected() {
        try {
            const integrations = storage.get('integrations') || {};
            return !!(integrations && integrations[this.id]);
        } catch (error) {
            console.error(`[${this.id}] Error checking connection status:`, error);
            return false;
        }
    }
    
    /**
     * Get connection details
     * @returns {Object|null} - Connection details or null if not connected
     */
    getConnection() {
        try {
            const integrations = storage.get('integrations') || {};
            return integrations && integrations[this.id] ? integrations[this.id] : null;
        } catch (error) {
            console.error(`[${this.id}] Error getting connection:`, error);
            return null;
        }
    }
    
    /**
     * Start the OAuth flow
     * @param {Function} callback - Callback function after completion
     */
    startOAuthFlow(callback = null) {
        popup.open(
            `oauth-${this.id}`,
            null,
            this.oauthView,
            {
                provider: this,
                callback: (event, data, response, success) => {
                    if (success) {
                        this.storeConnectionInfo(data);
                        
                        if (callback) {
                            callback(true, data);
                        }
                    } else {
                        common.notification(`Failed to connect to ${this.name}`, false);
                        
                        if (callback) {
                            callback(false, null);
                        }
                    }
                }
            },
            {
                position: 'center'
            }
        );
    }
    
    /**
     * Store connection information
     * @param {Object} data - Connection data 
     * @private
     */
    storeConnectionInfo(data) {
        try {
            const integrations = storage.get('integrations') || {};
            
            integrations[this.id] = {
                ...data,
                lastUpdated: new Date().toISOString()
            };
            
            storage.set('integrations', integrations);
        } catch (error) {
            console.error(`[${this.id}] Error storing connection info:`, error);
        }
    }
    
    /**
     * Get the OAuth URL for this provider
     * @returns {Promise<string>} - OAuth URL
     */
    async getOAuthUrl() {
        if (this.isDevelopmentMode) {
            // Mock URL for development
            return `https://example.com/oauth/${this.id}`;
        }
        
        try {
            const response = await api.get(`user/integrations/${this.id}/auth`);
            
            if (response.success && response.data && response.data.auth_url) {
                return response.data.auth_url;
            }
            
            throw new Error(response.message || 'Failed to get authentication URL');
        } catch (error) {
            console.error(`[${this.id}] Error getting OAuth URL:`, error);
            throw error;
        }
    }
    
    /**
     * Complete the OAuth flow
     * @param {string} code - Authorization code
     * @param {string} state - State parameter
     * @returns {Promise<Object>} - Authentication result
     */
    async completeOAuth(code, state) {
        if (this.isDevelopmentMode) {
            // Mock response for development
            return {
                success: true,
                data: {
                    id: this.id,
                    provider: this.id,
                    account_email: 'user@example.com',
                    connected_at: new Date().toISOString()
                }
            };
        }
        
        try {
            const response = await api.post(`user/integrations/${this.id}/auth/callback`, { 
                code,
                state 
            });
            
            return response;
        } catch (error) {
            console.error(`[${this.id}] Error completing OAuth:`, error);
            throw error;
        }
    }
    



    async disconnect(entityId = null, callback = null) {
        // We need the actual database entity ID, not just the provider type
        if (!entityId) {
            console.error(`[${this.id}] Error disconnecting: Missing entity ID`);
            common.notification(`Failed to disconnect from ${this.name}: Missing entity ID`, false);
            if (callback) callback(false);
            return false;
        }
        
        const result = await DisconnectService.disconnect(entityId, this.id);
        
        if (callback) {
            callback(result);
        }
        
        return result;
    }
}