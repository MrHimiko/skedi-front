// src/other/stores/billing.js

import { defineStore } from 'pinia';
import { api } from '@utils/api';

export const BillingStore = defineStore('BillingStore', {
    state: () => ({
        subscription: null,
        planLevel: 1,
        canAddMembers: false,
        loading: false
    }),

    getters: {
        isFreePlan: (state) => state.planLevel === 1,
        isProfessional: (state) => state.planLevel >= 2,
        isBusiness: (state) => state.planLevel >= 3,
        isEnterprise: (state) => state.planLevel >= 4,
    },

    actions: {
        async loadSubscription(organizationId) {
            try {
                this.loading = true;
                const response = await api.get(`billing/organizations/${organizationId}/subscription`);
                
                if (response.success) {
                    this.subscription = response.data.subscription;
                    this.planLevel = response.data.plan_level;
                    this.canAddMembers = response.data.can_add_members;
                }
            } catch (error) {
                console.error('Failed to load subscription:', error);
            } finally {
                this.loading = false;
            }
        },

        requiresPlan(requiredLevel) {
            return this.planLevel >= requiredLevel;
        }
    }
});