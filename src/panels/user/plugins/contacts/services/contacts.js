import { api } from '@utils/api';
import { storage } from '@utils/storage';
import { UserStore } from '@stores/user';

const CACHE_KEY = 'contacts_data';
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

export const ContactsService = {
    /**
     * Get contacts for a specific organization
     */
    async getContacts(organizationId, options = {}) {
        const {
            page = 1,
            limit = 50,
            search = '',
            useCache = true,
            host_only = false
        } = options;

        if (!organizationId) {
            throw new Error('Organization ID is required');
        }

        // Check cache if enabled and not host_only (host_only should always be fresh)
        if (useCache && !host_only) {
            const cached = storage.get(CACHE_KEY);
            if (cached && cached.organizationId === organizationId && 
                (Date.now() - cached.timestamp) < CACHE_DURATION) {
                return cached.data;
            }
        }

        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString()
            });

            if (search) {
                params.append('search', search);
            }
            
            // Add host_only parameter to tell backend which method to use
            if (host_only) {
                params.append('host_only', 'true');
            }

            const response = await api.get(`user/organizations/${organizationId}/contacts?${params}`);

            if (response && response.success && response.data) {
                // Only cache non-host-specific responses
                if (!host_only) {
                    storage.set(CACHE_KEY, {
                        data: response.data,
                        timestamp: Date.now(),
                        organizationId
                    });
                }

                return response.data;
            }

            return { data: [], count: 0 };
        } catch (error) {
            console.error('Failed to fetch contacts:', error);
            throw error;
        }
    },

    /**
     * Get a single contact
     */
    async getContact(organizationId, contactId) {
        if (!organizationId) {
            throw new Error('Organization ID is required');
        }

        try {
            const response = await api.get(`user/organizations/${organizationId}/contacts/${contactId}`);
            
            if (response && response.success && response.data) {
                return response.data;
            }

            return null;
        } catch (error) {
            console.error('Failed to fetch contact:', error);
            throw error;
        }
    },

    /**
     * Update a contact
     */
    async updateContact(organizationId, contactId, data) {
        if (!organizationId) {
            throw new Error('Organization ID is required');
        }

        try {
            const response = await api.put(`user/organizations/${organizationId}/contacts/${contactId}`, data);
            
            if (response && response.success) {
                // Clear cache
                storage.remove(CACHE_KEY);
                return response.data;
            }

            throw new Error(response?.message || 'Failed to update contact');
        } catch (error) {
            console.error('Failed to update contact:', error);
            throw error;
        }
    },

    /**
     * Delete a contact
     */
    async deleteContact(organizationId, contactId) {
        if (!organizationId) {
            throw new Error('Organization ID is required');
        }

        try {
            const response = await api.delete(`user/organizations/${organizationId}/contacts/${contactId}`);
            
            if (response && response.success) {
                // Clear cache
                storage.remove(CACHE_KEY);
                return true;
            }

            throw new Error(response?.message || 'Failed to delete contact');
        } catch (error) {
            console.error('Failed to delete contact:', error);
            throw error;
        }
    },

    /**
     * Get contacts where current user is the host
     */
    async getMyContacts(options = {}) {
        const {
            page = 1,
            limit = 50,
            search = '',
            useCache = false
        } = options;

        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString()
            });

            if (search) {
                params.append('search', search);
            }

            const response = await api.get(`user/contacts/my-contacts?${params}`);

            if (response && response.success && response.data) {
                return response.data;
            }

            return { data: [], count: 0 };
        } catch (error) {
            console.error('Failed to fetch my contacts:', error);
            throw error;
        }
    },

    /**
     * Toggle favorite for host contact
     */
    async toggleHostFavorite(contactId) {
        try {
            const response = await api.put(`user/contacts/${contactId}/host-favorite`);
            
            if (response && response.success) {
                return response.data;
            }

            throw new Error(response?.message || 'Failed to update favorite status');
        } catch (error) {
            console.error('Failed to toggle host favorite:', error);
            throw error;
        }
    },

    /**
     * Clear contacts cache
     */
    clearCache() {
        storage.remove(CACHE_KEY);
    }
};