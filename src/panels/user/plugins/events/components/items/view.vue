<script setup>
    import '@user_shared/utils/styles/organization-dropdowns.css';
    import '@user_shared/utils/styles/event-card.css';
    import './style.css';
    import { mergeOrganizationsAndTeams } from '@user_shared/utils/js/organization-structure.js';
    import { popup } from '@utils/popup';
    import { api } from '@utils/api';
    import { markRaw, ref, onMounted, toRaw } from 'vue';
    import { useRouter } from 'vue-router';
    import { BillingStore } from '@stores/billing';
    import BillingUpgradeModal from '@user_billing/components/upgrade-modal.vue';
    import { common } from '@utils/common';
    const router = useRouter();

    // Component imports
    import MenusComponent from '@global/menus/view.vue';
    import ButtonComponent from '@form/button/view.vue';
    import EventEditSchedule from '@user_events/components/form/eventEditSchedule.vue';
    import EventEditDuration from '@user_events/components/form/eventEditDuration.vue';
    import EventEditAssignees from '@user_events/components/form/eventEditAssignees.vue';
    import EventFormSettings from '@user_events/components/form/eventFormSettings.vue';
    import EventCreateForm from '@user_events/components/form/eventCreate.vue';
    import OrganizationEditForm from '@user_teams/components/form/organizationEdit.vue';
    import OrganizationCreateForm from '@user_teams/components/form/organizationCreate.vue';
    import EventEditLocation from '@user_events/components/form/eventEditLocation.vue';
    import ConfirmComponent from '@floated/confirm/view.vue';
    import EventManageTeam from '@user_events/components/form/eventManageTeam.vue';

    // Icon imports
    import { 
        PhGearSix, PhPlus, PhCode, PhLink, PhUsers, PhDotsThree,
        PhArrowSquareOut, PhClock, PhCalendar, PhMapPin, PhCopy, 
        PhFlowArrow, PhTable, PhTrash, PhCaretDown, PhCaretUp,
        PhVideoCameraSlash, PhGlobe, PhBuildings,
        PhHourglass, PhBell  
    } from "@phosphor-icons/vue";
    
    import { UserStore } from '@stores/user';

    // State management
    const userStore = UserStore();
    const billingStore = BillingStore();
    const organizations = ref([]);
    const eventsItems = ref(0);
    const selectedTeams = ref({});
    const expandedOrgs = ref({});

    function getPlanBadge(orgId) {
        if (!billingStore.subscriptions[orgId]) {
            billingStore.loadSubscription(orgId);
            return 'Loading...';
        }
        
        const planLevel = billingStore.getPlanLevel(orgId);
        const plans = ['Free', 'Professional', 'Business', 'Enterprise'];
        return plans[planLevel - 1] || 'Free';
    }

    function getPlanBadgeColor(orgId) {
        const planLevel = billingStore.getPlanLevel(orgId);
        const colors = ['#6b7280', '#3b82f6', '#8b5cf6', '#10b981'];
        return colors[planLevel - 1] || '#6b7280';
    }   

    function handlePlanClick(org) {
        popup.open(
            'billing-upgrade',
            null,
            BillingUpgradeModal,
            {
                organizationId: org.id,
                message: 'Upgrade your plan to unlock more features',
                recommendedPlan: 'professional'
            },
            {
                position: 'center'
            }
        );
    }

    // Reload all data including full event details with assignees and location
    async function reloadData() {
        try {
            const response = await api.get('account/user');
            
            if (response.success && response.data) {
                userStore.setData(response.data);
                organizations.value = mergeOrganizationsAndTeams();
                
                // Fetch full event details for each event
                for (const org of organizations.value) {
                    if (org.events && Array.isArray(org.events)) {
                        for (let i = 0; i < org.events.length; i++) {
                            const event = org.events[i];
                            try {
                                const eventDetail = await api.get(`events/${event.id}?organization_id=${org.id}`);
                                if (eventDetail.success && eventDetail.data) {
                                    org.events[i] = { ...event, ...eventDetail.data };
                                }
                            } catch (err) {
                                console.error(`Failed to fetch event ${event.id}:`, err);
                            }
                        }
                    }
                    
                    // Fetch details for team events
                    if (org.teams && Array.isArray(org.teams)) {
                        for (const team of org.teams) {
                            if (team.events && Array.isArray(team.events)) {
                                for (let i = 0; i < team.events.length; i++) {
                                    const event = team.events[i];
                                    try {
                                        const eventDetail = await api.get(`events/${event.id}?organization_id=${org.id}`);
                                        if (eventDetail.success && eventDetail.data) {
                                            team.events[i] = { ...event, ...eventDetail.data };
                                        }
                                    } catch (err) {
                                        console.error(`Failed to fetch team event ${event.id}:`, err);
                                    }
                                }
                            }
                        }
                    }
                }
                
                organizations.value.forEach(org => {
                    expandedOrgs.value[org.id] = true;
                });
                
                await billingStore.loadAllOrganizationSubscriptions(organizations.value);
                eventsItems.value++;
            }
        } catch (error) {
            console.error("Failed to reload data:", error);
        }
    }

    function getTopLevelTeams(org) {
        if (!org.teams || !Array.isArray(org.teams)) return [];
        return org.teams.filter(team => !team.parent_team_id);
    }

    function getAllEvents(org) {
        const events = [];
        
        if (org.events && Array.isArray(org.events)) {
            const orgEvents = org.events
                .filter(event => !event.deleted)
                .map(event => ({
                    ...event,
                    teamColor: 'black', 
                    teamName: org.name,
                    teamId: null,
                    isOrgEvent: true,
                    organization_id: org.id
                }));
            events.push(...orgEvents);
        }
        
        if (org.teams && Array.isArray(org.teams)) {
            org.teams.forEach(team => {
                if (team.events && Array.isArray(team.events)) {
                    const teamEvents = team.events
                        .filter(event => !event.deleted)
                        .map(event => ({
                            ...event,
                            teamColor: team.color || '#6c5ce7', 
                            teamName: team.name,
                            teamId: team.id,
                            isOrgEvent: false,
                            organization_id: org.id
                        }));
                    events.push(...teamEvents);
                }
            });
        }
        
        return events;
    }

    function getFilteredEvents(org) {
        const allEvents = getAllEvents(org);
        const orgSelectedTeams = selectedTeams.value[org.id];
        
        if (!orgSelectedTeams || orgSelectedTeams.length === 0) {
            return allEvents;
        }
        
        return allEvents.filter(event => {
            if (orgSelectedTeams.includes('all')) {
                return true;
            }
            
            if (event.isOrgEvent && orgSelectedTeams.includes('org')) {
                return true;
            }
            
            return event.teamId && orgSelectedTeams.includes(event.teamId);
        });
    }

    function toggleTeamFilter(orgId, teamId) {
        if (!selectedTeams.value[orgId]) {
            selectedTeams.value[orgId] = [];
        }
        
        const index = selectedTeams.value[orgId].indexOf(teamId);
        if (index > -1) {
            selectedTeams.value[orgId].splice(index, 1);
        } else {
            selectedTeams.value[orgId].push(teamId);
        }
    }

    function isTeamSelected(orgId, teamId) {
        return selectedTeams.value[orgId]?.includes(teamId) || false;
    }

    function toggleOrgExpansion(orgId) {
        expandedOrgs.value[orgId] = !expandedOrgs.value[orgId];
    }

    function isOrgExpanded(orgId) {
        return expandedOrgs.value[orgId] !== false;
    }

    function getVisibleTeams(teams) {
        return teams.slice(0, 6);
    }

    function getOverflowTeams(teams) {
        return teams.slice(6);
    }

    const eventActionMenus = markRaw([
        { label: 'Preview', icon: null, iconComponent: PhArrowSquareOut, weight: 'regular' },
        { label: 'View all settings', icon: null, iconComponent: PhGearSix, weight: 'regular' },
        { label: 'Edit duration', icon: null, iconComponent: PhClock, weight: 'regular' },
        { label: 'Edit availability', icon: null, iconComponent: PhCalendar, weight: 'regular' },
        { label: 'Edit location', icon: null, iconComponent: PhMapPin, weight: 'regular' },
        { label: 'Edit hosts', icon: null, iconComponent: PhUsers, weight: 'regular' },
        { label: 'Manage team', icon: null, iconComponent: PhUsers, weight: 'regular' },
        { label: 'Form Settings', icon: null, iconComponent: PhTable, weight: 'regular' },
        { label: 'Remove', icon: null, iconComponent: PhTrash, weight: 'regular' }
    ]);

    function getHostsTooltip(event) {
        const hostCount = event.assignees?.length || 0;
        if (hostCount === 0) {
            return 'No hosts assigned - This event will not work without hosts!';
        }
        return `${hostCount} host${hostCount !== 1 ? 's' : ''} assigned`;
    }

    function getLocationTooltip(event) {
        if (!event.location || !Array.isArray(event.location) || event.location.length === 0) {
            return 'No location set';
        }
        
        const location = event.location[0];
        
        if (!location || !location.type) {
            return 'No location set';
        }
        
        const locationType = location.type;
        const locationMap = {
            'google_meet': 'Location: Google Meet',
            'web_conferencing': 'Location: Web conferencing link',
            'in_person': location.address ? 
                `Location: In person\nAddress: ${location.address}` : 
                'Location: In person meeting',
            'custom': location.custom ? 
                `Location: ${location.custom}` : 
                'Location: Custom location'
        };
        
        return locationMap[locationType] || 'Location set';
    }

    function getBufferTooltip(event) {
        const bufferTime = event.buffer_time || event.bufferTime || 0;
        if (bufferTime === 0) {
            return 'No buffer time set';
        }
        return `Buffer time: ${bufferTime} minutes`;
    }

    function getAdvanceNoticeTooltip(event) {
        const advanceNotice = event.advance_notice_minutes || event.advanceNotice || 0;
        if (advanceNotice === 0) {
            return 'No advance notice set';
        }
        
        if (advanceNotice < 60) {
            return `Advance notice: ${advanceNotice} minutes`;
        }
        
        const hours = Math.floor(advanceNotice / 60);
        const minutes = advanceNotice % 60;
        return minutes > 0 ? 
            `Advance notice: ${hours}h ${minutes}m` : 
            `Advance notice: ${hours} hour${hours !== 1 ? 's' : ''}`;
    }

    function getAvailabilityTooltip(event) {
        if (!event.schedule || Object.keys(event.schedule).length === 0) {
            return 'No availability set';
        }
        
        const schedule = event.schedule;
        const enabledDays = Object.keys(schedule).filter(day => 
            schedule[day] && schedule[day].enabled
        );
        
        if (enabledDays.length === 0) {
            return 'No available days';
        }
        
        return `Available ${enabledDays.length} day${enabledDays.length !== 1 ? 's' : ''} per week`;
    }

    function getDurationTooltip(event) {
        const durationCount = event.duration?.length || 1;
        if (durationCount === 1) {
            const duration = event.duration?.[0]?.duration || 30;
            return `Duration: ${duration} minutes`;
        }
        return `${durationCount} duration options available`;
    }

    // Check if location is Google Meet to show custom image
    function isGoogleMeetLocation(location) {
        if (!location || !Array.isArray(location) || location.length === 0) {
            return false;
        }
        return location[0]?.type === 'google_meet';
    }

    function getLocationIcon(location) {
        if (!location || !Array.isArray(location) || location.length === 0) {
            return PhMapPin;
        }
        
        const loc = location[0];
        const locationType = loc?.type;
        
        const iconMap = {
            'web_conferencing': PhGlobe,
            'in_person': PhBuildings,
            'custom': PhMapPin,
            'google_meet': PhGlobe // Fallback icon if image doesn't load
        };
        
        return iconMap[locationType] || PhMapPin;
    }

    function openEditAvailability(event) {
        popup.open(
            'edit-event-schedule',
            null,
            EventEditSchedule,
            {
                eventId: event.id,
                organizationId: event.organization_id,
                callback: (event, data, response, success) => {
                    if (success) {
                        reloadData();
                    }
                },
            },
            {
                position: 'center'
            }
        );
    }

    function openManageTeam(event) {
        popup.open(
            'manage-event-team',
            null,
            EventManageTeam,
            {
                eventId: event.id,
                organizationId: event.organization_id,
                values: () => event, 
                callback: (e, data, response, success) => {
                    if (success) {
                        reloadData();
                    }
                }
            },
            {
                position: 'center'
            }
        );
    }

    function openEditHosts(event) {
        popup.open(
            'edit-event-assignees',
            null,
            EventEditAssignees,
            {
                endpoint: `events/${event.id}/assignees?organization_id=${event.organization_id}`,
                type: 'PUT',
                eventId: event.id,
                organizationId: event.organization_id,
                callback: (event, data, response, success) => {
                    if (success) {
                        reloadData();
                    }
                },
                class: 'h-auto event-assignees',
                title: `Edit Hosts for ${event.name}`,
            },
            {
                position: 'center'
            }
        );
    }

    function openEditLocation(event) {
        popup.open(
            'edit-event-location',
            null,
            EventEditLocation,
            {
                eventId: event.id,
                organizationId: event.organization_id,
                callback: (event, data, response, success) => {
                    if (success) {
                        reloadData();
                    }
                }
            },
            {
                position: 'center'
            }
        );
    }

    function openEditDuration(event) {
        popup.open(
            'edit-event-duration',
            null,
            EventEditDuration,
            {
                endpoint: `events/${event.id}?organization_id=${event.organization_id}`,
                type: 'PUT',
                callback: (event, data, response, success) => {
                    if (success) {
                        reloadData();
                        popup.close();
                    }
                },
                values: () => {
                    return {
                        duration: event.duration
                    }
                },
                class: 'h-auto',
                title: `Edit Duration for ${event.name}`,
            },
            {
                position: 'center'
            }
        );
    }

    

    const handleMenuAction = (clickEvent, menu, eventData) => {
        if (!eventData) {
            console.error('No event data provided to handleMenuAction');
            return;
        }

        const selectedEventId = eventData.id;
        const orgId = eventData.organization_id;
        
 
        const org = organizations.value.find(o => o.id === orgId);

        switch(menu.label) {
            case 'Preview':
                console.log("AAA", eventData);
                window.open(`https://skedi.com/${org.slug}/schedule/${eventData.slug}`, '_blank');
                break;
            case 'Edit duration':
                popup.open(
                    'edit-event-duration',
                    null,
                    EventEditDuration,
                    {
                        endpoint: `events/${selectedEventId}?organization_id=${orgId}`,
                        type: 'PUT',
                        callback: (event, data, response, success) => {
                            if (success) {
                                reloadData();
                                popup.close();
                            }
                        },
                        values: () => {
                            return {
                                duration: eventData.duration
                            }
                        },
                        class: 'h-auto',
                        title: `Edit Duration for ${eventData.name}`,
                    },
                    {
                        position: 'center'
                    }
                );
                break;
            
            case 'View all settings':
                router.push(`/events/${selectedEventId}`);
                break;

            case 'Manage team':
                popup.open(
                    'manage-event-team',
                    null,
                    EventManageTeam,
                    {
                        eventId: selectedEventId,
                        organizationId: orgId,
                        values: () => eventData,
                        callback: (event, data, response, success) => {
                            if (success) {
                                reloadData();
                            }
                        }
                    },
                    {
                        position: 'center'
                    }
                );
                break;

            case 'Edit availability':
                popup.open(
                    'edit-event-schedule',               
                    null,                        
                    EventEditSchedule,           
                    {                           
                        eventId: selectedEventId,
                        organizationId: orgId,
                        callback: (event, data, response, success) => {
                            if (success) {
                                reloadData();
                            }
                        },
                        
                    },
                    {                          
                        position: 'center'
                    }
                );
                break;

            case 'Form Settings':
                popup.open(
                    'event-form-settings',
                    null,
                    EventFormSettings,
                    {
                        eventId: selectedEventId,
                        organizationId: orgId,
                        callback: (event, data, response, success) => {
                            if (success) {
                                reloadData();
                            }
                        }
                    },
                    {
                        position: 'center'
                    }
                );
                break;

            case 'Edit hosts':
                popup.open(
                    'edit-event-assignees',
                    null,
                    EventEditAssignees,
                    {
                        endpoint: `events/${selectedEventId}/assignees?organization_id=${orgId}`,
                        type: 'PUT',
                        eventId: selectedEventId,
                        organizationId: orgId,
                        callback: (event, data, response, success) => {
                            if (success) {
                                reloadData();
                            }
                        },
                        class: 'h-auto event-assignees',
                        title: `Edit Hosts for ${eventData.name}`,
                    },
                    {
                        position: 'center'
                    }
                );
                break;

            case 'Edit location':
                popup.open(
                    'edit-event-location',
                    null,
                    EventEditLocation,
                    {
                        eventId: selectedEventId,
                        organizationId: orgId,
                        callback: (event, data, response, success) => {
                            if (success) {
                                reloadData();
                            }
                        }
                    },
                    {
                        position: 'center'
                    }
                );
                break;
            case 'Duplicate':
                console.log('Duplicate event', selectedEventId);
                break;
            case 'Add workflow':
                console.log('Add workflow to event', selectedEventId);
                break;
            case 'Add routing form':
                console.log('Add routing form to event', selectedEventId);
                break;
            case 'Remove':
                popup.open(
                    'remove-event-confirm',
                    null,
                    ConfirmComponent,
                    {
                        as: 'red',
                        description: `Are you sure you want to remove "${eventData.name}"?`,
                        endpoint: `events/${selectedEventId}?organization_id=${orgId}`,
                        type: 'DELETE',
                        callback: (event, data, response, success) => {
                            if (success) {
                                reloadData();
                                popup.close();
                            }
                        }
                    },
                    {
                        position: 'center'
                    }
                );
                break;
            default:
                break;
        }
    };

    async function copyEventUrl(event, org) {
        const url = `https://skedi.com/${org.slug}/schedule/${event.slug}`;
        try {
            await navigator.clipboard.writeText(url);
            common.notification('URL copied to clipboard', true);
        } catch (error) {
            console.error('Failed to copy URL:', error);
            common.notification('Failed to copy URL', false);
        }
    }

    onMounted(async () => {
        await reloadData();

        

        organizations.value = mergeOrganizationsAndTeams();
        
        organizations.value.forEach(org => {
            expandedOrgs.value[org.id] = true;
        });
        
        if (organizations.value.length === 0) {
            const rawTeams = toRaw(userStore.getTeams());
            const rawOrgs = toRaw(userStore.getOrganizations());
            
            if ((rawTeams && rawTeams.length) || (rawOrgs && rawOrgs.length)) {
                if (rawOrgs && rawOrgs.length) {
                    organizations.value = rawOrgs.map(org => {
                        const entity = org.entity || {};
                        return {
                            ...entity,
                            id: entity.id,
                            name: entity.name || 'Unknown',
                            slug: entity.slug || 'unknown',
                            teams: []
                        };
                    });
                }
            }
        }
    });
</script>

<template>
    <div class="teams-c-items" :key="eventsItems">
        <div v-for="org in organizations" :key="org.id" class="teams-c-item">
            <div class="head">
                <div class="left">
                    <div class="org-name">
                        <button 
                            @click="toggleOrgExpansion(org.id)"
                            class="org-toggle"
                            :aria-expanded="isOrgExpanded(org.id)"
                        >
                            <component 
                                :is="isOrgExpanded(org.id) ? PhCaretDown : PhCaretUp" 
                                size="16" 
                                weight="bold"
                            />
                        </button>
                        
                        <div class="logo">
                            <span>{{ org.name ? org.name.charAt(0).toUpperCase() : 'O' }}</span>
                        </div>
                        <p>
                            {{ org.name }}
                            <span 
                                class="plan-badge" 
                                :style="{ backgroundColor: getPlanBadgeColor(org.id) + '20', color: getPlanBadgeColor(org.id) }"
                                @click="handlePlanClick(org)"
                                style="cursor: pointer; margin-left: 8px; padding: 2px 8px; border-radius: 12px; font-size: 12px;"
                            >
                                {{ getPlanBadge(org.id) }}
                            </span>
                            <span>{{ getFilteredEvents(org).length }}</span>
                        </p>
                    </div>

                    <div class="team-filters" v-if="getTopLevelTeams(org).length > 0">
                        <button 
                            class="team-filter-item"
                            :class="{ active: isTeamSelected(org.id, 'org') }"
                            @click="toggleTeamFilter(org.id, 'org')"
                        >
                            {{ org.name }}
                        </button>
                        
                        <button 
                            v-for="team in getVisibleTeams(getTopLevelTeams(org))" 
                            :key="team.id"
                            class="team-filter-item"
                            :class="{ active: isTeamSelected(org.id, team.id) }"
                            @click="toggleTeamFilter(org.id, team.id)"
                        >
                            {{ team.name }}
                        </button>
                        
                        <ButtonComponent 
                            v-if="getOverflowTeams(getTopLevelTeams(org)).length > 0"
                            v-dropdown="{
                                component: MenusComponent,
                                properties: {
                                    menus: getOverflowTeams(getTopLevelTeams(org)).map(team => ({
                                        label: team.name,
                                        icon: isTeamSelected(org.id, team.id) ? '✓' : null
                                    })),
                                    onClick: ($event, menu) => {
                                        const team = getOverflowTeams(getTopLevelTeams(org)).find(t => t.name === menu.label);
                                        if (team) toggleTeamFilter(org.id, team.id);
                                    }
                                }
                            }"
                            as="tertiary icon size36"
                            :iconLeft="{ component: PhCaretDown, weight: 'bold' }"
                        />
                    </div>
                </div>

                <div class="right">
                    <a target="_BLANK" :href="'https://skedi.com/' + org.slug" class="blue-link">
                        {{ 'https://skedi.com/' + org.slug }}
                    </a> 
                    <div class="separator"></div>
                    <div class="actions">
                        <button-component v-tooltip="{ content: 'Copy URL' }" as="tertiary icon" 
                            :iconLeft="{ component: PhLink, weight: 'bold' }" />
                        <button-component v-tooltip="{ content: 'Embed on a website' }" as="tertiary icon"
                            :iconLeft="{ component: PhCode, weight: 'bold' }" />
                        <button-component 
                            v-popup="{
                                component: OrganizationEditForm,
                                overlay: { position: 'center' },
                                properties: {
                                    endpoint: `organizations/${org.id}`,
                                    type: 'PUT',
                                    callback: (event, data, response, success) => {
                                        popup.close();
                                        reloadData();
                                    },
                                    class: 'h-auto',
                                    title: `Edit ${org.name}`,
                                    values: () => {return {name: org.name, slug: org.slug} }
                                }
                            }"
                            v-tooltip="{ content: 'Settings' }" as="tertiary icon"
                            :iconLeft="{ component: PhGearSix, weight: 'bold' }" />

                        <button-component 
                            as="tertiary icon" 
                            :iconLeft="{ component: PhPlus, weight: 'bold' }" 
                            v-tooltip="{ content: 'New event type' }" 
                            v-popup="{
                                component: EventCreateForm,
                                overlay: { position: 'center' },
                                properties: {
                                    title: 'New event type',
                                    preselectedOrganizationId: org.id,
                                    callback: (event, data, response, success) => {
                                        if (success) {
                                            reloadData();
                                        }
                                    },
                                },
                                
                            }"
                        />
                    </div>
                </div>
            </div>

            <div class="events-grid" v-if="getFilteredEvents(org).length > 0" v-show="isOrgExpanded(org.id)">
                <div class="events-container">
                    <div v-for="event in getFilteredEvents(org)" :key="event.id" class="event-card">
                        <div class="top">
                            <div 
                                class="event-color-marker clickable" 
                                :style="{ backgroundColor: event.teamColor }"
                                @click="openManageTeam(event)"
                                v-tooltip="{ content: 'Click to manage team' }"
                            ></div>
                            <p class="event-name">{{ event.name || 'Unnamed Event' }}</p>
                            <a target="_BLANK" :href="'https://skedi.com/' + org.slug + '/schedule/' + event.slug" class="blue-link">
                                {{ 'https://skedi.com/' + org.slug + "/schedule/" + event.slug }}
                            </a>

                            <div class="info">

                                <!-- Availability -->
                                <div 
                                    class="info-item clickable"
                                    @click="openEditAvailability(event)"
                                    v-tooltip="{
                                        content: getAvailabilityTooltip(event),
                                        placement: 'top'
                                    }"
                                >
                                    <div class="icon">
                                        <PhCalendar :weight="'bold'" />
                                    </div>
                                    <span class="value">{{ Object.keys(event.schedule || {}).filter(day => event.schedule[day]?.enabled).length || 0 }}</span>
                                </div>


                                


                                <!-- Hosts -->
                                <div 
                                    class="info-item clickable" 
                                    :class="{ 'no-hosts': !event.assignees || event.assignees.length === 0 }"
                                    @click="openEditHosts(event)"
                                    v-tooltip="{
                                        content: getHostsTooltip(event),
                                        placement: 'top'
                                    }"
                                >
                                    <div class="icon" :class="{ 'icon-danger': !event.assignees || event.assignees.length === 0 }">
                                        <PhUsers :weight="'bold'" />
                                    </div>
                                    <span class="value" :class="{ 'text-danger': !event.assignees || event.assignees.length === 0 }">
                                        {{ event.assignees?.length || 0 }}
                                    </span>
                                </div>
                                
                               
                                
                                <!-- Duration -->
                                <div 
                                    class="info-item clickable"
                                    @click="openEditDuration(event)"
                                    v-tooltip="{
                                        content: getDurationTooltip(event),
                                        placement: 'top'
                                    }"
                                >
                                    <div class="icon">
                                        <PhClock :weight="'bold'" />
                                    </div>
                                    <span class="value">{{ event.duration?.length || 1 }}</span>
                                </div>


                                 <!-- Location -->
                                <div 
                                    class="clickable"
                                    @click="openEditLocation(event)"
                                    v-tooltip="{
                                        content: getLocationTooltip(event),
                                        placement: 'top'
                                    }"
                                >
                                    <div class="">
                                        <img 
                                            v-if="isGoogleMeetLocation(event.location)" 
                                            src="https://global.divhunt.com/6dea696e910d70e2925a5c3e453a69ff_644.svg" 
                                            style="width: 14px; height: 14px;" 
                                        />
                                        <component 
                                            v-else 
                                            :is="getLocationIcon(event.location)" 
                                            :weight="'bold'" 
                                        />
                                    </div>
                                </div>

                                
                                
                                <div class="buffer-and-pretime">

                                    <div 
                                        class="clickable"
                                        @click="openEditAvailability(event)"
                                        v-tooltip="{
                                            content: getBufferTooltip(event),
                                            placement: 'top'
                                        }"
                                    >
                                        <div class="">
                                            <PhHourglass :weight="'bold'" />
                                        </div>
                                        <span class="value">{{ event.buffer_time || event.bufferTime || 0 }}</span>
                                    </div>

                                    <!-- Advance Notice -->
                                    <div 
                                        class="clickable"
                                        @click="openEditAvailability(event)"
                                        v-tooltip="{
                                            content: getAdvanceNoticeTooltip(event),
                                            placement: 'top'
                                        }"
                                    >
                                        <div class="">
                                            <PhBell :weight="'bold'" />
                                        </div>
                                        <span class="value">{{ event.advance_notice_minutes || event.advanceNotice || 0 }}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="bottom">
                            <div class="left">
                                <p> Skedi recording </p>
                            </div>
                            <div class="right">
                                <div class="actions">
                                    <ButtonComponent
                                        v-tooltip="{ content: 'Copy URL' }"
                                        as="secondary icon"
                                        :iconLeft="{ component: PhLink, weight: 'bold' }"
                                        @click="copyEventUrl(event, org)"
                                    />
                                    <ButtonComponent 
                                        v-tooltip="{ content: 'Embed on a website' }"
                                        as="secondary icon"
                                        :iconLeft="{ component: PhCode, weight: 'bold' }"
                                    />

                                    <ButtonComponent 
                                        v-dropdown="{ 
                                            component: MenusComponent, 
                                            properties: { 
                                                menus: eventActionMenus,
                                                onClick: ($event, menu) => handleMenuAction($event, menu, event)
                                            }
                                        }" 
                                        as="secondary icon" 
                                        :iconLeft="{ component: PhDotsThree, weight: 'bold' }" 
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="events-empty-state" v-else v-show="isOrgExpanded(org.id)">
                <div class="empty-state-box">
                    <p>Nothing here yet</p>
                    <button-component 
                        as="secondary"
                        :iconLeft="{ component: PhPlus, weight: 'bold' }" 
                        label="Create event type"
                        v-popup="{
                            component: EventCreateForm,
                            overlay: { position: 'center' },
                            properties: {
                                title: 'New event type',
                                preselectedOrganizationId: org.id,
                                callback: (event, data, response, success) => {
                                    if (success) {
                                        reloadData();
                                    }
                                },
                            },
                        }"
                    />
                </div>
            </div>
        </div>
        
        <div class="create-org-section">
            <ButtonComponent 
                v-popup="{
                    component: OrganizationCreateForm,
                    overlay: { position: 'center' },
                    properties: {
                        endpoint: 'organizations',
                        type: 'POST',
                        callback: (event, data, response, success) => {
                            popup.close();
                            reloadData();
                        },
                        class: 'h-auto',
                        title: 'Create new organization',
                    }
                }"
                as="primary"
                :iconLeft="{ component: PhPlus, weight: 'bold' }"
                label="Create Organization"
            />
        </div>
    </div>
</template>

<style scoped>
    .teams-c-item .head .left {
        flex: 1;
        flex-direction: column;
        align-items: flex-start;
    }

    .org-toggle {
        background: none;
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        padding: 4px;
        border-radius: 4px;
        transition: background-color 0.2s;
    }

    .org-toggle:hover {
        background-color: var(--background-2);
    }

    .team-filters {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-top: 10px;
        flex-wrap: wrap;
    }

    .team-filter-item {
        padding: 4px 12px;
        height: 26px;
        font-size: 13px;
        background: white;
        border: 1px solid var(--border);
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s;
        font-weight: 500;
        line-height:1;
        color: var(--text-secondary);
    }

    .team-filter-item:hover {
        background: var(--background-1);
    }

    .team-filter-item.active {
        color:black;
        border:1px solid black;
    }

    .events-grid {
        margin-top: 20px;
        transition: all 0.3s ease;
    }

    .events-container {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 15px;
    }

    .event-card {
        background-color: white;
        border: 1px solid var(--border);
        border-radius: 10px;
        padding: 15px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        height: 100%;
    }

    .event-card .top {
        margin-bottom: 15px;
    }

    .event-card .event-color-marker {
        width: 40px;
        height: 10px;
        border-radius: 100px;
        margin-bottom: 8px;
    }

    .event-card .event-color-marker.clickable {
        cursor: pointer;
        transition: transform 0.2s ease;
    }

    .event-card .event-color-marker.clickable:hover {
        transform: scale(1.1);
    }

    .event-card .event-name {
        font-weight: 600;
        font-size: 16px;
        margin-bottom: 5px;
    }

    .event-card .blue-link {
        font-size: 12px;
        color: var(--brand-blue);
        display: block;
        margin-bottom: 10px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .event-card .bottom {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-top: 1px solid var(--border);
        padding-top: 10px;
    }

    .event-card .bottom .left p {
        font-size: 12px;
        color: var(--text-secondary);
    }

    .event-card .bottom .actions {
        display: flex;
        gap: 5px;
    }

    .create-org-section {
        margin-top: 30px;
        text-align: center;
    }

    .events-empty-state {
        margin-top: 20px;
        transition: all 0.3s ease;
    }

    .empty-state-box {
        background-color: var(--background-0);
        border: 1px solid var(--border);
        border-radius: 10px;
        padding: 40px;
        text-align: center;
    }

    .empty-state-box p {
        color: var(--text-secondary);
        font-size: 14px;
        margin-bottom: 20px;
    }

    .event-card {
        position:relative;
    }

    .event-card .buffer-and-pretime {
        position:absolute;
        top:10px;
        right:10px;
        display:flex;
        align-items: center;
    }

    .event-card .buffer-and-pretime > div {
        display: flex;
        align-items: center;
        gap: 5px;
        font-weight: 500;
        padding: 3px 5px;
        background: var(--background-1);
        border: 1px solid var(--background-2);
        border-radius: 5px;
        font-size: 12px;
        font-weight: 600;
    }

</style>