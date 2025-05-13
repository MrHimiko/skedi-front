// src/panels/user/plugins/integrations/services/integrations.js

import { api } from '@utils/api';

/**
 * IntegrationsService - Service for handling 3rd party integrations
 */
export class IntegrationsService {
    /**
     * Get all available integration providers
     */
    static async getProviders() {
        try {
            const response = await api.get('user/integrations/providers');
            
            if (response && response.success) {
                return response.data;
            }
            
            throw new Error(response?.message || 'Failed to get integration providers');
        } catch (error) {
            console.error('Error fetching integration providers:', error);
            throw error;
        }
    }
    
    /**
     * Get all user integrations
     */
    static async getUserIntegrations(provider = null) {
        try {
            const url = provider ? 
                `user/integrations?provider=${provider}` : 
                'user/integrations';
                
            const response = await api.get(url);
            
            if (response && response.success) {
                return response.data;
            }
            
            throw new Error(response?.message || 'Failed to get user integrations');
        } catch (error) {
            console.error('Error fetching user integrations:', error);
            throw error;
        }
    }
    
    /**
     * Get events from all integrations
     */
    static async getEvents({
        startDate = 'today',
        endDate = '+30 days',
        status = 'all',
        sync = 'auto',
        source = null,
        timeRange = null
    }) {
        try {
            const queryParams = new URLSearchParams();
            queryParams.append('start_date', startDate);
            queryParams.append('end_date', endDate);
            queryParams.append('status', status);
            queryParams.append('sync', sync);
            
            if (source) {
                queryParams.append('source', source);
            }
            
            if (timeRange) {
                queryParams.append('time_range', timeRange);
            }
            
            const response = await api.get(`user/integrations/events?${queryParams.toString()}`);
            
            if (response && response.success) {
                return response.data;
            }
            
            throw new Error(response?.message || 'Failed to get integration events');
        } catch (error) {
            console.error('Error fetching integration events:', error);
            throw error;
        }
    }
    
    /**
     * Get Google Calendar auth URL
     */
    static async getGoogleAuthUrl() {
        try {
            const response = await api.get('user/integrations/google/auth');
            
            if (response && response.success) {
                return response.data.auth_url;
            }
            
            throw new Error(response?.message || 'Failed to get Google auth URL');
        } catch (error) {
            console.error('Error getting Google auth URL:', error);
            throw error;
        }
    }
    
    /**
     * Force sync a specific integration
     */
    static async syncIntegration(integrationId, startDate = 'today', endDate = '+30 days') {
        try {
            const response = await api.post(`user/integrations/${integrationId}/sync`, {
                start_date: startDate,
                end_date: endDate
            });
            
            if (response && response.success) {
                return response.data;
            }
            
            throw new Error(response?.message || 'Failed to sync integration');
        } catch (error) {
            console.error('Error syncing integration:', error);
            throw error;
        }
    }
}