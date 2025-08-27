import { api } from '@utils/api';
import { UserStore } from '@stores/user';

/**
 * FormsService - Service for managing forms
 */
export class FormsService {
    static formsCache = {
        data: [],
        timestamp: 0
    };
    
    static CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes
    
    /**
     * Get current organization ID from user store
     */
    static getCurrentOrganizationId() {
        const userStore = UserStore();
        const organizations = userStore.getOrganizations();
        
        // Get first organization's ID (you might want to add organization selection logic later)
        if (Array.isArray(organizations) && organizations.length > 0 && organizations[0].entity) {
            return organizations[0].entity.id;
        }
        
        return null;
    }
    
    /**
     * Get all organizations from user store
     */
    static getAllOrganizations() {
        const userStore = UserStore();
        return userStore.getOrganizations() || [];
    }
    
    /**
     * Get all forms (global - not tied to organization)
     */
    static async getForms(useCache = true, organizationId = null) {
        const now = Date.now();
        
        // Check cache
        if (
            useCache && 
            this.formsCache.data.length > 0 &&
            now - this.formsCache.timestamp < this.CACHE_EXPIRY
        ) {
            return this.formsCache.data;
        }
        
        try {
            // Use global forms endpoint
            const response = await api.get('forms');
            
            if (response && response.success) {
                this.formsCache = {
                    data: response.data,
                    timestamp: now
                };
                return response.data;
            }
            
            throw new Error(response?.message || 'Failed to fetch forms');
        } catch (error) {
            console.error('Error fetching forms:', error);
            
            // Fallback to organization-based endpoint for backward compatibility
            if (organizationId || this.getCurrentOrganizationId()) {
                const orgId = organizationId || this.getCurrentOrganizationId();
                try {
                    const response = await api.get(`organizations/${orgId}/forms`);
                    
                    if (response && response.success) {
                        this.formsCache = {
                            data: response.data,
                            timestamp: now
                        };
                        return response.data;
                    }
                } catch (fallbackError) {
                    console.error('Fallback error:', fallbackError);
                }
            }
            
            throw error;
        }
    }
    
    /**
     * Get a single form by ID
     */
    static async getForm(formId, organizationId = null) {
        try {
            // Use global forms endpoint
            const response = await api.get(`forms/${formId}`);
            
            if (response && response.success) {
                return response.data;
            }
            
            throw new Error(response?.message || 'Failed to fetch form');
        } catch (error) {
            console.error('Error fetching form:', error);
            
            // Fallback to organization-based endpoint for backward compatibility
            if (organizationId || this.getCurrentOrganizationId()) {
                const orgId = organizationId || this.getCurrentOrganizationId();
                try {
                    const response = await api.get(`organizations/${orgId}/forms/${formId}`);
                    
                    if (response && response.success) {
                        return response.data;
                    }
                } catch (fallbackError) {
                    console.error('Fallback error:', fallbackError);
                }
            }
            
            throw error;
        }
    }
    
    /**
     * Create a new form
     */
    static async createForm(formData, organizationId = null) {
        try {
            console.log('Creating form with data:', formData);
            
            // Use global forms endpoint
            const response = await api.post('forms', formData);
            
            if (response && response.success) {
                // Clear cache to force refresh
                this.formsCache = {
                    data: [],
                    timestamp: 0
                };
                return response.data;
            }
            
            throw new Error(response?.message || 'Failed to create form');
        } catch (error) {
            console.error('Error creating form:', error);
            
            // Fallback to organization-based endpoint for backward compatibility
            if (organizationId || this.getCurrentOrganizationId()) {
                const orgId = organizationId || this.getCurrentOrganizationId();
                try {
                    const response = await api.post(`organizations/${orgId}/forms`, formData);
                    
                    if (response && response.success) {
                        // Clear cache to force refresh
                        this.formsCache = {
                            data: [],
                            timestamp: 0
                        };
                        return response.data;
                    }
                } catch (fallbackError) {
                    console.error('Fallback error:', fallbackError);
                }
            }
            
            throw error;
        }
    }
    

    /**
     * Update an existing form
     */
    static async updateForm(formId, formData, organizationId = null) {
        try {
            console.log('Updating form with data:', formData);
            
            // Use global forms endpoint only - no fallback
            const response = await api.put(`forms/${formId}`, formData);
            
            if (response && response.success) {
                // Clear cache to force refresh
                this.formsCache = {
                    data: [],
                    timestamp: 0
                };
                return response.data;
            }
            
            throw new Error(response?.message || 'Failed to update form');
        } catch (error) {
            console.error('Error updating form:', error);
            throw error;
        }
    }
    
    /**
     * Delete a form
     */
    static async deleteForm(formId, organizationId = null) {
        try {
            // Use global forms endpoint
            const response = await api.delete(`forms/${formId}`);
            
            if (response && response.success) {
                // Clear cache to force refresh
                this.formsCache = {
                    data: [],
                    timestamp: 0
                };
                return response.data;
            }
            
            throw new Error(response?.message || 'Failed to delete form');
        } catch (error) {
            console.error('Error deleting form:', error);
            
            // Fallback to organization-based endpoint for backward compatibility
            if (organizationId || this.getCurrentOrganizationId()) {
                const orgId = organizationId || this.getCurrentOrganizationId();
                try {
                    const response = await api.delete(`organizations/${orgId}/forms/${formId}`);
                    
                    if (response && response.success) {
                        // Clear cache to force refresh
                        this.formsCache = {
                            data: [],
                            timestamp: 0
                        };
                        return response.data;
                    }
                } catch (fallbackError) {
                    console.error('Fallback error:', fallbackError);
                }
            }
            
            throw error;
        }
    }
    
    /**
     * Clear forms cache
     */
    static clearCache() {
        this.formsCache = {
            data: [],
            timestamp: 0
        };
    }
}