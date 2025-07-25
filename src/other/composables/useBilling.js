// src/other/composables/useBilling.js

import { computed } from 'vue';
import { BillingStore } from '@stores/billing';
import { popup } from '@utils/popup';

export function useBilling() {
    const billingStore = BillingStore();

    const checkPlan = (requiredLevel, featureName = 'This feature') => {
        if (!billingStore.requiresPlan(requiredLevel)) {
            popup.notification(
                `${featureName} requires a higher plan. Please upgrade.`, 
                false
            );
            return false;
        }
        return true;
    };

    const checkSeats = () => {
        if (!billingStore.canAddMembers) {
            if (billingStore.isFreePlan) {
                popup.notification('Free plan only allows 1 member. Please upgrade.', false);
            } else {
                popup.notification('No seats available. Please purchase additional seats.', false);
            }
            return false;
        }
        return true;
    };

    return {
        checkPlan,
        checkSeats,
        planLevel: computed(() => billingStore.planLevel),
        canAddMembers: computed(() => billingStore.canAddMembers),
        
        // Quick checks
        canCreateTeams: computed(() => billingStore.isProfessional),
        canUseAutomations: computed(() => billingStore.isProfessional),
        canUseAdvancedAnalytics: computed(() => billingStore.isBusiness),
    };
}