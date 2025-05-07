// src/panels/user/plugins/integrations/services/IntegrationsService.js
import { api } from '@utils/api';

export class IntegrationsService {
    /**
     * Get available integration providers
     */
    static async getProviders() {
        try {
            const response = await api.get('user/integrations/providers');
            return response.success ? response.data : [];
        } catch (error) {
            console.error('Error fetching integration providers:', error);
            return [];
        }
    }
    
    /**
     * Get user's integrations
     */
    static async getUserIntegrations() {
        try {
            const response = await api.get('user/integrations');
            return response.success ? response.data : [];
        } catch (error) {
            console.error('Error fetching user integrations:', error);
            return [];
        }
    }
    
    /**
     * Get Google Auth URL
     */
    static async getGoogleAuthUrl() {
        try {
            const response = await api.get('user/integrations/google/auth');
            return response.success ? response.data.auth_url : null;
        } catch (error) {
            console.error('Error getting Google auth URL:', error);
            return null;
        }
    }
}