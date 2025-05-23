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
     * Get all forms for current organization
     */
    static async getForms(useCache = true, organizationId = null) {
        const now = Date.now();
        const orgId = organizationId || this.getCurrentOrganizationId();
        
        if (!orgId) {
            throw new Error('No organization selected');
        }
        
        // Check cache
        if (
            useCache && 
            this.formsCache.data.length > 0 &&
            now - this.formsCache.timestamp < this.CACHE_EXPIRY
        ) {
            return this.formsCache.data;
        }
        
        try {
            const response = await api.get(`organizations/${orgId}/forms`);
            
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
            throw error;
        }
    }
    
    /**
     * Get forms for all organizations
     */
    static async getFormsForAllOrganizations() {
        const organizations = this.getAllOrganizations();
        const formsData = [];
        
        for (const org of organizations) {
            if (org.entity && org.entity.id) {
                try {
                    const forms = await this.getForms(false, org.entity.id);
                    
                    // Add organization info to each form
                    const formsWithOrg = forms.map(form => ({
                        ...form,
                        organization: {
                            id: org.entity.id,
                            name: org.entity.name,
                            slug: org.entity.slug
                        }
                    }));
                    
                    formsData.push(...formsWithOrg);
                } catch (error) {
                    console.warn(`Failed to load forms for organization ${org.entity.name}:`, error);
                }
            }
        }
        
        return formsData;
    }
    
    /**
     * Get a single form by ID
     */
    static async getForm(formId, organizationId = null) {
        const orgId = organizationId || this.getCurrentOrganizationId();
        
        if (!orgId) {
            throw new Error('No organization selected');
        }
        
        try {
            const response = await api.get(`organizations/${orgId}/forms/${formId}`);
            
            if (response && response.success) {
                return response.data;
            }
            
            throw new Error(response?.message || 'Failed to fetch form');
        } catch (error) {
            console.error('Error fetching form:', error);
            throw error;
        }
    }
    
    /**
     * Create a new form
     */
    static async createForm(formData, organizationId = null) {
        const orgId = organizationId || this.getCurrentOrganizationId();
        
        if (!orgId) {
            throw new Error('No organization selected');
        }
        
        try {
            console.log('Creating form with data:', formData);
            const response = await api.post(`organizations/${orgId}/forms`, formData);
            
            if (response && response.success) {
                // Clear cache
                this.clearCache();
                console.log('Form created successfully:', response.data);
                return response.data;
            }
            
            throw new Error(response?.message || 'Failed to create form');
        } catch (error) {
            console.error('Error creating form:', error);
            throw error;
        }
    }
    
    /**
     * Update an existing form
     */
    static async updateForm(formId, formData, organizationId = null) {
        const orgId = organizationId || this.getCurrentOrganizationId();
        
        if (!orgId) {
            throw new Error('No organization selected');
        }
        
        try {
            console.log('Updating form with data:', formData);
            const response = await api.put(`organizations/${orgId}/forms/${formId}`, formData);
            
            console.log('Backend response:', response);
            
            if (response && response.success) {
                // Clear cache
                this.clearCache();
                
                // Check if fields/settings were actually saved
                if (response.data && (!response.data.fields || response.data.fields.length === 0) && formData.fields && formData.fields.length > 0) {
                    console.warn('Warning: Fields were sent but not returned by backend');
                    console.warn('Sent fields:', formData.fields);
                    console.warn('Returned fields:', response.data.fields);
                }
                
                if (response.data && (!response.data.settings || Object.keys(response.data.settings).length === 0) && formData.settings && Object.keys(formData.settings).length > 0) {
                    console.warn('Warning: Settings were sent but not returned by backend');
                    console.warn('Sent settings:', formData.settings);
                    console.warn('Returned settings:', response.data.settings);
                }
                
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
        const orgId = organizationId || this.getCurrentOrganizationId();
        
        if (!orgId) {
            throw new Error('No organization selected');
        }
        
        try {
            const response = await api.delete(`organizations/${orgId}/forms/${formId}`);
            
            if (response && response.success) {
                // Clear cache
                this.clearCache();
                return true;
            }
            
            throw new Error(response?.message || 'Failed to delete form');
        } catch (error) {
            console.error('Error deleting form:', error);
            throw error;
        }
    }
    
    /**
     * Duplicate a form
     */
    static async duplicateForm(formId, organizationId = null) {
        const orgId = organizationId || this.getCurrentOrganizationId();
        
        try {
            // Get the original form
            const originalForm = await this.getForm(formId, orgId);
            
            // Create new form data
            const duplicateData = {
                name: `${originalForm.name} (Copy)`,
                description: originalForm.description,
                fields: originalForm.fields || [],
                settings: originalForm.settings || {},
                is_active: originalForm.is_active,
                allow_multiple_submissions: originalForm.allow_multiple_submissions,
                requires_authentication: originalForm.requires_authentication
            };
            
            return await this.createForm(duplicateData, orgId);
        } catch (error) {
            console.error('Error duplicating form:', error);
            throw error;
        }
    }
    
    /**
     * Clear service cache
     */
    static clearCache() {
        this.formsCache.timestamp = 0;
    }
}