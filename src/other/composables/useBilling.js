// src/other/composables/useBilling.js

import { computed } from 'vue';
import { BillingStore } from '@stores/billing';
import { popup } from '@utils/popup';

export function useBilling(organizationId = null) {
    const billingStore = BillingStore();

    const checkPlan = (requiredLevel, featureName = 'This feature', orgId = null) => {
        const checkOrgId = orgId || organizationId;
        if (!checkOrgId) {
            console.error('Organization ID is required for billing checks');
            return false;
        }
        
        if (!billingStore.requiresPlan(checkOrgId, requiredLevel)) {
            popup.notification(
                `${featureName} requires a higher plan. Please upgrade.`, 
                false
            );
            return false;
        }
        return true;
    };

    const checkSeats = (orgId = null) => {
        const checkOrgId = orgId || organizationId;
        if (!checkOrgId) {
            console.error('Organization ID is required for billing checks');
            return false;
        }
        
        if (!billingStore.canAddMembers(checkOrgId)) {
            if (billingStore.isFreePlan(checkOrgId)) {
                popup.notification('Free plan only allows 1 member. Please upgrade.', false);
            } else {
                popup.notification('No seats available. Please purchase additional seats.', false);
            }
            return false;
        }
        return true;
    };

    // If organizationId is provided, return computed properties for that org
    if (organizationId) {
        return {
            checkPlan,
            checkSeats,
            planLevel: computed(() => billingStore.getPlanLevel(organizationId)),
            canAddMembers: computed(() => billingStore.canAddMembers(organizationId)),
            
            // Quick checks for this organization
            canCreateTeams: computed(() => billingStore.isProfessional(organizationId)),
            canUseAutomations: computed(() => billingStore.isProfessional(organizationId)),
            canUseAdvancedAnalytics: computed(() => billingStore.isBusiness(organizationId)),
        };
    }
    
    // If no organizationId, return functions that require orgId parameter
    return {
        checkPlan,
        checkSeats,
        
        // Functions that require organization ID
        getPlanLevel: (orgId) => billingStore.getPlanLevel(orgId),
        canAddMembers: (orgId) => billingStore.canAddMembers(orgId),
        canCreateTeams: (orgId) => billingStore.isProfessional(orgId),
        canUseAutomations: (orgId) => billingStore.isProfessional(orgId),
        canUseAdvancedAnalytics: (orgId) => billingStore.isBusiness(orgId),
    };
}