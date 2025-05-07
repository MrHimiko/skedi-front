// src/panels/user/plugins/integrations/services/IntegrationsService.js
import { api } from '@utils/api';
import { storage } from '@utils/storage';

export class IntegrationsService {
    /**
     * Cache for integrations data
     */
    static cache = {
        providers: {
            data: null,
            timestamp: 0
        },
        userIntegrations: {
            data: null,
            timestamp: 0
        }
    };
    
    /**
     * Cache expiry time (5 minutes)
     */
    static CACHE_EXPIRY = 5 * 60 * 1000;
    
    /**
     * Get available integration providers with caching
     */
    static async getProviders(useCache = true) {
        try {
            const now = Date.now();
            
            // Return cached data if valid
            if (useCache && 
                this.cache.providers.data && 
                now - this.cache.providers.timestamp < this.CACHE_EXPIRY) {
                return this.cache.providers.data;
            }
            
            // Fetch fresh data
            const response = await api.get('user/integrations/providers');
            
            if (response.success) {
                // Update cache
                this.cache.providers = {
                    data: response.data,
                    timestamp: now
                };
                return response.data;
            }
            
            throw new Error(response.message || 'Failed to fetch integration providers');
        } catch (error) {
            console.error('Error fetching integration providers:', error);
            return [];
        }
    }
    
    /**
     * Get user's connected integrations with caching
     */
    static async getUserIntegrations(useCache = true) {
        try {
            const now = Date.now();
            
            // Return cached data if valid
            if (useCache && 
                this.cache.userIntegrations.data && 
                now - this.cache.userIntegrations.timestamp < this.CACHE_EXPIRY) {
                return this.cache.userIntegrations.data;
            }
            
            // Fetch fresh data
            const response = await api.get('user/integrations');
            
            if (response.success) {
                // Update cache
                this.cache.userIntegrations = {
                    data: response.data,
                    timestamp: now
                };
                return response.data;
            }
            
            throw new Error(response.message || 'Failed to fetch user integrations');
        } catch (error) {
            console.error('Error fetching user integrations:', error);
            return [];
        }
    }
    
    /**
     * Clear service cache
     */
    static clearCache() {
        this.cache = {
            providers: {
                data: null,
                timestamp: 0
            },
            userIntegrations: {
                data: null,
                timestamp: 0
            }
        };
    }
    
    /**
     * Get OAuth URL for a specific provider
     */
    static async getAuthUrl(provider) {
        try {
            const response = await api.get(`user/integrations/${provider}/auth`);
            
            if (response.success && response.data && response.data.auth_url) {
                return response.data.auth_url;
            }
            
            throw new Error(response.message || `Failed to get auth URL for ${provider}`);
        } catch (error) {
            console.error(`Error getting auth URL for ${provider}:`, error);
            return null;
        }
    }
    
    /**
     * Complete OAuth flow with code from redirect
     */
    static async completeAuth(provider, code) {
        try {
            const response = await api.post(`user/integrations/${provider}/auth/callback`, { code });
            
            if (response.success) {
                // Clear user integrations cache on successful auth
                this.cache.userIntegrations = {
                    data: null,
                    timestamp: 0
                };
                
                return {
                    success: true,
                    data: response.data
                };
            }
            
            throw new Error(response.message || `Failed to complete auth for ${provider}`);
        } catch (error) {
            console.error(`Error completing auth for ${provider}:`, error);
            return {
                success: false,
                error: error.message || `Error connecting to ${provider}`
            };
        }
    }
    
    /**
     * Disconnect an integration
     */
    static async disconnect(integrationId) {
        try {
            const response = await api.delete(`user/integrations/${integrationId}`);
            
            if (response.success) {
                // Clear user integrations cache on successful disconnect
                this.cache.userIntegrations = {
                    data: null,
                    timestamp: 0
                };
                
                return {
                    success: true,
                    data: response.data
                };
            }
            
            throw new Error(response.message || `Failed to disconnect ${integrationId}`);
        } catch (error) {
            console.error(`Error disconnecting ${integrationId}:`, error);
            return {
                success: false,
                error: error.message || `Error disconnecting from ${integrationId}`
            };
        }
    }
    
    /**
     * Get integration details
     */
    static async getDetails(integrationId) {
        try {
            const response = await api.get(`user/integrations/${integrationId}`);
            
            if (response.success) {
                return {
                    success: true,
                    data: response.data
                };
            }
            
            throw new Error(response.message || `Failed to get details for ${integrationId}`);
        } catch (error) {
            console.error(`Error getting details for ${integrationId}:`, error);
            return {
                success: false,
                error: error.message || `Error fetching details for ${integrationId}`
            };
        }
    }
    
    /**
     * Check if the user has a specific integration connected
     */
    static async hasIntegration(provider) {
        try {
            const userIntegrations = await this.getUserIntegrations();
            return userIntegrations.some(integration => integration.provider === provider);
        } catch (error) {
            console.error(`Error checking for ${provider} integration:`, error);
            return false;
        }
    }
}