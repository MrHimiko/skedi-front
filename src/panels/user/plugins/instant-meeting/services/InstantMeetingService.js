// Full path: src/panels/user/plugins/instant-meeting/services/InstantMeetingService.js

import { api } from '@utils/api';
import { UserStore } from '@stores/user';

export const InstantMeetingService = {
    /**
     * Get the current organization ID
     */
    getOrganizationId() {
        const userStore = UserStore();
        const organizations = userStore.getOrganizations();
        if (organizations && organizations.length > 0) {
            return organizations[0].entity?.id || organizations[0].id;
        }
        return null;
    },

    /**
     * Create an instant meeting
     */
    async create(data) {
        const organizationId = this.getOrganizationId();
        if (!organizationId) {
            throw new Error('No organization found');
        }

        const response = await api.post(
            `organizations/${organizationId}/instant-meetings`,
            data
        );

        if (!response.success) {
            throw new Error(response.message || 'Failed to create instant meeting');
        }

        return response.data;
    },

    /**
     * Check current user's availability
     */
    async checkAvailability(duration = 30) {
        const organizationId = this.getOrganizationId();
        if (!organizationId) {
            throw new Error('No organization found');
        }

        const response = await api.get(
            `organizations/${organizationId}/instant-meetings/availability?duration=${duration}`
        );

        if (!response.success) {
            throw new Error(response.message || 'Failed to check availability');
        }

        return response.data;
    },

    /**
     * Lookup a user by email
     */
    async lookupUser(email) {
        const organizationId = this.getOrganizationId();
        if (!organizationId) {
            throw new Error('No organization found');
        }

        const response = await api.get(
            `organizations/${organizationId}/instant-meetings/lookup-user?email=${encodeURIComponent(email)}`
        );

        if (!response.success) {
            throw new Error(response.message || 'Failed to lookup user');
        }

        return response.data;
    },

    /**
     * Check participant availability (for team members)
     */
    async checkParticipantAvailability(email, duration = 30) {
        const organizationId = this.getOrganizationId();
        if (!organizationId) {
            throw new Error('No organization found');
        }

        const response = await api.post(
            `organizations/${organizationId}/instant-meetings/check-participant-availability`,
            { email, duration }
        );

        if (!response.success) {
            throw new Error(response.message || 'Failed to check participant availability');
        }

        return response.data;
    },

    /**
     * Cancel conflicting bookings
     */
    async cancelConflicts(bookingIds) {
        const organizationId = this.getOrganizationId();
        if (!organizationId) {
            throw new Error('No organization found');
        }

        const response = await api.post(
            `organizations/${organizationId}/instant-meetings/cancel-conflicts`,
            { booking_ids: bookingIds }
        );

        if (!response.success) {
            throw new Error(response.message || 'Failed to cancel conflicts');
        }

        return response.data;
    },

    /**
     * Get incoming instant meeting invites
     */
    async getIncoming() {
        const response = await api.get('instant-meetings/incoming');

        if (!response.success) {
            throw new Error(response.message || 'Failed to get incoming meetings');
        }

        return response.data;
    },

    /**
     * Get team members for the current organization
     */
    async getTeamMembers() {
        const organizationId = this.getOrganizationId();
        if (!organizationId) {
            throw new Error('No organization found');
        }

        const response = await api.get(`organizations/${organizationId}/members`);

        if (!response.success) {
            throw new Error(response.message || 'Failed to get team members');
        }

        return response.data;
    }
};

export default InstantMeetingService;