// src/panels/user/plugins/events/composables/useEvents.js

import { ref, computed } from 'vue';
import { EventsStore } from '@stores/events';
import { UserStore } from '@stores/user';
import { BillingStore } from '@stores/billing';
import { api } from '@utils/api';
import { mergeOrganizationsAndTeams } from '@user_shared/utils/js/organization-structure.js';

/**
 * Composable for managing events data and operations
 * Centralizes event logic that was previously scattered across components
 */
export function useEvents() {
    const eventsStore = EventsStore();
    const userStore = UserStore();
    const billingStore = BillingStore();

    // Local state
    const isLoading = ref(false);
    const error = ref(null);

    // Computed: Get merged organizations with teams structure
    const organizations = computed(() => {
        return mergeOrganizationsAndTeams();
    });

    // Computed: All events from store
    const allEvents = computed(() => {
        return eventsStore.getAllEvents;
    });

    /**
     * Load all events efficiently using the batch endpoint
     * This replaces the N+1 API calls pattern
     */
    async function loadAllEvents(forceRefresh = false) {
        isLoading.value = true;
        error.value = null;

        try {
            // First refresh user data to get latest orgs/teams structure
            const userResponse = await api.get('account/user');
            if (userResponse.success && userResponse.data) {
                userStore.setData(userResponse.data);
            }

            // Load all events using the efficient batch endpoint
            await eventsStore.loadAllEvents(forceRefresh);

            // Load billing data for all organizations
            const orgs = mergeOrganizationsAndTeams();
            await billingStore.loadAllOrganizationSubscriptions(orgs);

            return eventsStore.getAllEvents;
        } catch (err) {
            error.value = err.message || 'Failed to load events';
            console.error('Failed to load events:', err);
            throw err;
        } finally {
            isLoading.value = false;
        }
    }

    /**
     * Get events for a specific organization with team colors
     */
    function getEventsForOrganization(org) {
        const events = [];

        // Get organization-level events (no team)
        const orgEvents = eventsStore.getEventsByOrganization(org.id);
        orgEvents.forEach(event => {
            if (!event.team_id && !event.deleted) {
                events.push({
                    ...event,
                    teamColor: 'black',
                    teamName: org.name,
                    teamId: null,
                    isOrgEvent: true,
                    organization_id: org.id
                });
            }
        });

        // Get events from all teams (including nested subteams)
        if (org.teams && Array.isArray(org.teams)) {
            org.teams.forEach(team => {
                const teamEvents = collectTeamEvents(team, org);
                events.push(...teamEvents);
            });
        }

        return events;
    }

    /**
     * Recursively collect events from a team and its subteams
     */
    function collectTeamEvents(team, org) {
        const events = [];

        // Get events assigned to this team from store
        const teamEvents = eventsStore.getEventsByTeam(team.id);
        teamEvents.forEach(event => {
            if (!event.deleted) {
                events.push({
                    ...event,
                    teamColor: team.color || '#6c5ce7',
                    teamName: team.name,
                    teamId: team.id,
                    isOrgEvent: false,
                    organization_id: org.id
                });
            }
        });

        // Also check org events that belong to this team (in case indexing is by org)
        const orgEvents = eventsStore.getEventsByOrganization(org.id);
        orgEvents.forEach(event => {
            if (event.team_id === team.id && !event.deleted) {
                // Check if not already added
                if (!events.find(e => e.id === event.id)) {
                    events.push({
                        ...event,
                        teamColor: team.color || '#6c5ce7',
                        teamName: team.name,
                        teamId: team.id,
                        isOrgEvent: false,
                        organization_id: org.id
                    });
                }
            }
        });

        // Recursively get events from subteams
        if (team.teams && Array.isArray(team.teams)) {
            team.teams.forEach(subteam => {
                const subteamEvents = collectTeamEvents(subteam, org);
                events.push(...subteamEvents);
            });
        }

        return events;
    }

    /**
     * Filter events by selected teams
     */
    function filterEventsByTeams(events, selectedTeamIds, org) {
        if (!selectedTeamIds || selectedTeamIds.length === 0) {
            return events;
        }

        return events.filter(event => {
            // Organization-level events always show when org is selected
            if (!event.teamId) {
                return true;
            }

            // Check if event's team or any parent team is selected
            return isTeamOrParentSelected(event.teamId, selectedTeamIds, org);
        });
    }

    /**
     * Check if a team or any of its parent teams is in the selected list
     */
    function isTeamOrParentSelected(teamId, selectedTeamIds, org) {
        const team = findTeamById(org, teamId);
        if (!team) return false;

        let currentTeam = team;
        while (currentTeam) {
            if (selectedTeamIds.includes(currentTeam.id)) {
                return true;
            }
            if (currentTeam.parent_team_id) {
                currentTeam = findTeamById(org, currentTeam.parent_team_id);
            } else {
                currentTeam = null;
            }
        }

        return false;
    }

    /**
     * Find a team by ID within an organization's team hierarchy
     */
    function findTeamById(org, teamId) {
        if (!org.teams || !Array.isArray(org.teams)) {
            return null;
        }

        function searchInTeams(teams) {
            for (const team of teams) {
                if (team.id === teamId) {
                    return team;
                }
                if (team.teams && Array.isArray(team.teams)) {
                    const found = searchInTeams(team.teams);
                    if (found) return found;
                }
            }
            return null;
        }

        return searchInTeams(org.teams);
    }

    /**
     * Get top-level teams for an organization
     */
    function getTopLevelTeams(org) {
        if (!org.teams || !Array.isArray(org.teams)) return [];
        return org.teams.filter(team => !team.parent_team_id);
    }

    /**
     * Get all team IDs including nested subteams
     */
    function getAllTeamIds(team) {
        const teamIds = [team.id];
        if (team.teams && Array.isArray(team.teams)) {
            team.teams.forEach(subteam => {
                const subteamIds = getAllTeamIds(subteam);
                teamIds.push(...subteamIds);
            });
        }
        return teamIds;
    }

    /**
     * Refresh a single event
     */
    async function refreshEvent(eventId, organizationId) {
        try {
            return await eventsStore.loadEvent(eventId, organizationId, true);
        } catch (err) {
            console.error(`Failed to refresh event ${eventId}:`, err);
            throw err;
        }
    }

    /**
     * Remove event from store (after deletion)
     */
    function removeEvent(eventId) {
        eventsStore.removeEvent(eventId);
    }

    /**
     * Invalidate cache to force reload on next access
     */
    function invalidateCache() {
        eventsStore.invalidateCache();
    }

    return {
        // State
        isLoading,
        error,
        organizations,
        allEvents,

        // Methods
        loadAllEvents,
        getEventsForOrganization,
        filterEventsByTeams,
        findTeamById,
        getTopLevelTeams,
        getAllTeamIds,
        refreshEvent,
        removeEvent,
        invalidateCache,

        // Store access
        eventsStore
    };
}