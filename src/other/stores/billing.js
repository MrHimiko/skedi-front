// src/other/stores/billing.js

import { defineStore } from 'pinia';
import { api } from '@utils/api';

export const BillingStore = defineStore('BillingStore', {
    state: () => ({
        // Store subscriptions by organization ID
        subscriptions: {},
        loading: {},
        lastFetch: {},
        // ADD THIS: Track in-flight requests
        pendingRequests: {}
    }),

    getters: {
        // Get subscription for a specific organization
        getSubscription: (state) => (organizationId) => {
            return state.subscriptions[organizationId] || null;
        },
        
        // Get plan level for a specific organization
        getPlanLevel: (state) => (organizationId) => {
            const sub = state.subscriptions[organizationId];
            return sub?.planLevel || 1; // Default to free plan (1) if no subscription
        },
        
        // Check if organization is on free plan
        isFreePlan: (state) => (organizationId) => {
            return state.getPlanLevel(organizationId) === 1;
        },
        
        // Check if organization is on professional plan or higher
        isProfessional: (state) => (organizationId) => {
            return state.getPlanLevel(organizationId) >= 2;
        },
        
        // Check if organization is on business plan or higher
        isBusiness: (state) => (organizationId) => {
            return state.getPlanLevel(organizationId) >= 3;
        },
        
        // Check if organization is on enterprise plan
        isEnterprise: (state) => (organizationId) => {
            return state.getPlanLevel(organizationId) >= 4;
        },
        
        // Check if organization can add members
        canAddMembers: (state) => (organizationId) => {
            const sub = state.subscriptions[organizationId];
            return sub?.canAddMembers || false;
        }
    },

    actions: {
        async loadSubscription(organizationId, forceRefresh = false) {
            // Check if we need to fetch (cache for 5 minutes)
            const now = Date.now();
            const lastFetch = this.lastFetch[organizationId] || 0;
            const cacheExpired = now - lastFetch > 5 * 60 * 1000; // 5 minutes
            
            if (!forceRefresh && !cacheExpired && this.subscriptions[organizationId]) {
                return this.subscriptions[organizationId];
            }
            
            // ADDED: If there's already a pending request for this org, return that promise
            if (this.pendingRequests[organizationId]) {
                return this.pendingRequests[organizationId];
            }
            
            console.log('BillingStore: Loading subscription for org:', organizationId);
            
            // ADDED: Create and store the promise
            this.pendingRequests[organizationId] = this._fetchSubscription(organizationId);
            
            try {
                return await this.pendingRequests[organizationId];
            } finally {
                // ADDED: Clear the pending request when done
                delete this.pendingRequests[organizationId];
            }
        },
        
        // ADDED: Extracted fetch logic to separate method
        async _fetchSubscription(organizationId) {
            try {
                this.loading[organizationId] = true;
                const response = await api.get(`billing/organizations/${organizationId}/subscription`);
                
                console.log('BillingStore: API Response for org', organizationId, ':', response);
                
                if (response.success) {
                    this.subscriptions[organizationId] = {
                        subscription: response.data.subscription,
                        planLevel: response.data.plan_level,
                        canAddMembers: response.data.can_add_members
                    };
                    this.lastFetch[organizationId] = Date.now();
                    
                    console.log('BillingStore: Updated state for org', organizationId, ':', this.subscriptions[organizationId]);
                } else {
                    // Set default values on error
                    this.subscriptions[organizationId] = {
                        subscription: null,
                        planLevel: 1,
                        canAddMembers: false
                    };
                }
                
                return this.subscriptions[organizationId];
            } catch (error) {
                console.error('BillingStore: Failed to load subscription for org', organizationId, ':', error);
                // Set default values on error
                this.subscriptions[organizationId] = {
                    subscription: null,
                    planLevel: 1,
                    canAddMembers: false
                };
                return this.subscriptions[organizationId];
            } finally {
                this.loading[organizationId] = false;
            }
        },

        // Load subscriptions for all organizations
        async loadAllOrganizationSubscriptions(organizations) {
            const promises = organizations.map(org => {
                const orgId = org.entity?.id || org.id;
                return this.loadSubscription(orgId);
            });
            
            await Promise.all(promises);
        },

        // Check if organization requires a specific plan level
        requiresPlan(organizationId, requiredLevel) {
            const planLevel = this.getPlanLevel(organizationId);
            return planLevel >= requiredLevel;
        },
        
        // Clear cache for an organization
        clearCache(organizationId) {
            delete this.subscriptions[organizationId];
            delete this.lastFetch[organizationId];
        },
        
        // Clear all cache
        clearAllCache() {
            this.subscriptions = {};
            this.lastFetch = {};
            this.loading = {};
            this.pendingRequests = {};
        }
    }
});