// Updated src/panels/user/plugins/potential-leads/services/potential-leads.js without caching

import { api } from '@utils/api';

export const PotentialLeadsService = {
    /**
     * Get potential leads for current user (My Leads)
     */
    async getMyLeads(filters = {}, page = 1, limit = 50) {
        try {
            const params = {
                page,
                limit,
                ...filters
            };

            const response = await api.get('user/potential-leads/my-leads', params);
            
            if (response && response.success) {
                // Transform the data to match what the frontend expects
                const transformedData = {
                    ...response.data,
                    data: response.data.data.map(item => ({
                        id: item.id,
                        email: item.potential_lead?.email || item.email || 'No email',
                        name: item.potential_lead?.name || item.name || '-',
                        timezone: item.potential_lead?.timezone || item.timezone || '-',
                        captured_at: item.potential_lead?.captured_at || item.captured_at || item.created_at,
                        organization_name: item.organization?.name || '-',
                        raw_data: item
                    }))
                };
                
                return transformedData;
            }

            throw new Error(response?.message || 'Failed to fetch potential leads');
        } catch (error) {
            console.error('Failed to fetch my leads:', error);
            throw error;
        }
    },

    /**
     * Get potential leads for an organization
     */
    async getOrganizationLeads(organizationId, filters = {}, page = 1, limit = 50) {
        try {
            const params = {
                page,
                limit,
                ...filters
            };

            const response = await api.get(`user/organizations/${organizationId}/potential-leads`, params);
            
            if (response && response.success) {
                return response.data;
            }

            throw new Error(response?.message || 'Failed to fetch organization leads');
        } catch (error) {
            console.error('Failed to fetch organization leads:', error);
            throw error;
        }
    },

    /**
     * Delete a potential lead from organization
     */
    async deleteLead(organizationId, leadId) {
        try {
            const response = await api.delete(`user/organizations/${organizationId}/potential-leads/${leadId}`);
            
            if (response && response.success) {
                return response.data;
            }

            throw new Error(response?.message || 'Failed to delete lead');
        } catch (error) {
            console.error('Failed to delete lead:', error);
            throw error;
        }
    },

    /**
     * Delete a potential lead from my leads
     */
    async deleteMyLead(leadId) {
        try {
            const response = await api.delete(`user/potential-leads/${leadId}`);
            
            if (response && response.success) {
                return response.data;
            }

            throw new Error(response?.message || 'Failed to delete lead');
        } catch (error) {
            console.error('Failed to delete lead:', error);
            throw error;
        }
    },

    /**
     * Export potential leads from My Leads
     */
    async exportMyLeads(filters = {}) {
        try {
            const filename = `my_potential_leads_${new Date().toISOString().split('T')[0]}.csv`;
            await api.download('user/potential-leads/export', filters, filename);
            return true;
        } catch (error) {
            console.error('Export failed:', error);
            throw error;
        }
    },

    /**
     * Export potential leads from organization
     */
    async exportOrganizationLeads(organizationId, filters = {}) {
        try {
            const filename = `potential_leads_${new Date().toISOString().split('T')[0]}.csv`;
            await api.download(`user/organizations/${organizationId}/potential-leads/export`, filters, filename);
            return true;
        } catch (error) {
            console.error('Export failed:', error);
            throw error;
        }
    }
};