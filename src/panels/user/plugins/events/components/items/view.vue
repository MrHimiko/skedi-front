<script setup>
    
    // Styles and utility imports
    
    import '@user_shared/utils/styles/organization-dropdowns.css';
    import '@user_shared/utils/styles/event-card.css';
    import './style.css';
    import { mergeOrganizationsAndTeams } from '@user_shared/utils/js/organization-structure.js';
    import { popup } from '@utils/popup';
    import { api } from '@utils/api';
    import { markRaw, ref, onMounted, toRaw } from 'vue';

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
        PhVideoCameraSlash, PhGlobe, PhBuildings
    } from "@phosphor-icons/vue";

    
    import { UserStore } from '@stores/user';

    // State management
    const userStore = UserStore();
    const organizations = ref([]);
    const eventsItems = ref(0);
    
    // New state for filters and accordion
    const selectedTeams = ref({});
    const expandedOrgs = ref({});

    // Reload data from API
    async function reloadData() {
        try {
            const response = await api.get('account/user');
            if (response.success && response.data) {
                userStore.setData(response.data);
                organizations.value = mergeOrganizationsAndTeams();
                eventsItems.value++;
            }
        } catch (error) {
            console.error("Failed to reload user data:", error);
        }
    }

    // Get top-level teams from organization
    function getTopLevelTeams(org) {
        if (!org.teams || !Array.isArray(org.teams)) return [];
        return org.teams.filter(team => !team.parent_team_id);
    }

    // Get all events from an organization and its teams
    function getAllEvents(org) {
        const events = [];
        
        // Add organization-level events (excluding deleted ones)
        if (org.events && Array.isArray(org.events)) {
            const orgEvents = org.events
                .filter(event => !event.deleted) // Filter out deleted events
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
        
        // Add team-level events (excluding deleted ones)
        if (org.teams && Array.isArray(org.teams)) {
            org.teams.forEach(team => {
                if (team.events && Array.isArray(team.events)) {
                    const teamEvents = team.events
                        .filter(event => !event.deleted) // Filter out deleted events
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

    // NEW: Filter events based on selected teams
    function getFilteredEvents(org) {
        const allEvents = getAllEvents(org);
        const orgSelectedTeams = selectedTeams.value[org.id];
        
        // If no teams selected, show all events
        if (!orgSelectedTeams || orgSelectedTeams.length === 0) {
            return allEvents;
        }
        
        // Filter events based on selected teams
        return allEvents.filter(event => {
            // Always show all events if "All" is selected
            if (orgSelectedTeams.includes('all')) {
                return true;
            }
            
            // Show org-level events if org is selected
            if (event.isOrgEvent && orgSelectedTeams.includes('org')) {
                return true;
            }
            
            // Show team events if team is selected
            return event.teamId && orgSelectedTeams.includes(event.teamId);
        });
    }

    // NEW: Toggle team selection
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

    // NEW: Check if team is selected
    function isTeamSelected(orgId, teamId) {
        return selectedTeams.value[orgId]?.includes(teamId) || false;
    }

    // NEW: Toggle organization expansion
    function toggleOrgExpansion(orgId) {
        expandedOrgs.value[orgId] = !expandedOrgs.value[orgId];
    }

    // NEW: Check if organization is expanded
    function isOrgExpanded(orgId) {
        return expandedOrgs.value[orgId] !== false;
    }

    // NEW: Get visible teams (first 3)
    function getVisibleTeams(teams) {
        return teams.slice(0, 3);
    }

    // NEW: Get overflow teams (after first 3)
    function getOverflowTeams(teams) {
        return teams.slice(3);
    }

    // Menu items for event actions
    const eventActionMenus = markRaw([
        { label: 'Preview', icon: null, iconComponent: PhArrowSquareOut, weight: 'regular' },
        { label: 'Edit duration', icon: null, iconComponent: PhClock, weight: 'regular' },
        { label: 'Edit availability', icon: null, iconComponent: PhCalendar, weight: 'regular' },
        { label: 'Edit location', icon: null, iconComponent: PhMapPin, weight: 'regular' },
        { label: 'Edit hosts', icon: null, iconComponent: PhUsers, weight: 'regular' },
        { label: 'Manage team', icon: null, iconComponent: PhUsers, weight: 'regular' },  // NEW
        { label: 'Form Settings', icon: null, iconComponent: PhTable, weight: 'regular' },
        { label: 'Add workflow', icon: null, iconComponent: PhFlowArrow, weight: 'regular' },
        { label: 'Add routing form', icon: null, iconComponent: PhTable, weight: 'regular' },
        { label: 'Duplicate', icon: null, iconComponent: PhCopy, weight: 'regular' },
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
        if (!event.location) {
            return 'No location set';
        }
        
        const locationType = event.location.type || event.location;
        const locationMap = {
            'google_meet': 'Location: Google Meet',
            'web_conferencing': 'Location: Web conferencing link',
            'in_person': event.location.address ? 
                `Location: In person\nAddress: ${event.location.address}` : 
                'Location: In person meeting',
            'custom': event.location.custom ? 
                `Location: ${event.location.custom}` : 
                'Location: Custom location'
        };
        
        return locationMap[locationType] || 'Location set';
    }

    function getDurationTooltip(event) {
        const durationCount = event.duration?.length || 1;
        if (durationCount === 1) {
            const duration = event.duration?.[0]?.duration || 30;
            return `Duration: ${duration} minutes`;
        }
        return `${durationCount} duration options available`;
    }

    function getLocationIcon(location) {
        if (!location) return PhMapPin;
        
        const locationType = location.type || location;
        const iconMap = {
            'google_meet': PhVideoCameraSlash, // You can replace with custom Google Meet SVG
            'web_conferencing': PhGlobe,
            'in_person': PhBuildings,
            'custom': PhMapPin
        };
        
        return iconMap[locationType] || PhMapPin;
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


    // Handle menu action clicks
    const handleMenuAction = (clickEvent, menu, eventData) => {
        if (!eventData) {
            console.error('No event data provided to handleMenuAction');
            return;
        }

        const selectedEventId = eventData.id;
        const orgId = eventData.organization_id;


        switch(menu.label) {
            case 'Preview':
                window.open(`https://skedi.com/your-org/${selectedEventId}`, '_blank');
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
                                console.log('Event duration updated', response);
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
                                console.log('Event removed (soft delete)', response);
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

    // Initialize data on component mount
    onMounted(() => {
        organizations.value = mergeOrganizationsAndTeams();
        
        // Initialize all orgs as expanded
        organizations.value.forEach(org => {
            expandedOrgs.value[org.id] = true;
        });
        
        // Fallback for empty organizations
        if (organizations.value.length === 0) {
            const rawTeams = toRaw(userStore.getTeams());
            const rawOrgs = toRaw(userStore.getOrganizations());
            
            if ((rawTeams && rawTeams.length) || (rawOrgs && rawOrgs.length)) {
                console.log("No organizations processed but store has data.");
                
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
        <!-- Organization cards -->
        <div v-for="org in organizations" :key="org.id" class="teams-c-item">
            <!-- Organization header -->
            <div class="head">
                <div class="left">
                    <div class="org-name">
                        <!-- NEW: Toggle button -->
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
                            <span>{{ getFilteredEvents(org).length }}</span>
                        </p>
                    </div>

                    <!-- NEW: Team filters instead of just showing teams -->
                    <div class="team-filters" v-if="getTopLevelTeams(org).length > 0">

                        
                        <!-- Organization level filter -->
                        <button 
                            class="team-filter-item"
                            :class="{ active: isTeamSelected(org.id, 'org') }"
                            @click="toggleTeamFilter(org.id, 'org')"
                        >
                            {{ org.name }}
                        </button>
                        
                        <!-- Visible teams -->
                        <button 
                            v-for="team in getVisibleTeams(getTopLevelTeams(org))" 
                            :key="team.id"
                            class="team-filter-item"
                            :class="{ active: isTeamSelected(org.id, team.id) }"
                            @click="toggleTeamFilter(org.id, team.id)"
                        >
                            {{ team.name }}
                        </button>
                        
                        <!-- Overflow teams dropdown -->
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
                        {{ 'https://skedi.com/' + org.slug }} test
                    </a> 
                    <div class="separator"></div>
                    <div class="actions">
                        <button-component  v-tooltip="{ content: 'Copy URL' }" as="tertiary icon" 
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
                                        console.log('org edited', response);
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
                                                console.log('Event created', response);
                                            }
                                        },
                                    },
                                    
                                }"
                            />
                    </div>
                </div>
            </div>

            <!-- Events grid - NEW: with v-show for smooth toggle -->
            <div class="events-grid" v-if="getFilteredEvents(org).length > 0" v-show="isOrgExpanded(org.id)">
                <div class="events-container">
                    <!-- Event cards -->
                    <div v-for="event in getFilteredEvents(org)" :key="event.id" class="event-card">
                        <div class="top">
                            <!-- UPDATED: Add tooltip to color marker -->
                            <div 
                                class="event-color-marker" 
                                :style="{ backgroundColor: event.teamColor }"
                                v-tooltip="{ content: event.teamName }"
                            ></div>
                            <p class="event-name">{{ event.name || 'Unnamed Event' }}</p>
                            <a target="_BLANK" :href="'https://app.skedi.com/front/' + org.slug + '/' + event.slug" class="blue-link">
                                {{ 'https://skedi.com/' + org.slug + "/" + event.slug }}
                            </a>

                            <div class="info">
                                <!-- Hosts Info -->
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
                                
                                <!-- Location Info -->
                                <div 
                                    class="info-item clickable"
                                    @click="openEditLocation(event)"
                                    v-tooltip="{
                                        content: getLocationTooltip(event),
                                        placement: 'top'
                                    }"
                                >
                                    <div class="icon">
                                        <component :is="getLocationIcon(event.location)" :weight="'bold'" />
                                    </div>
                                </div>
                                
                                <!-- Duration Info -->
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
                                    />
                                    <ButtonComponent 
                                        v-tooltip="{ content: 'Embed on a website' }"
                                        as="secondary icon"
                                        :iconLeft="{ component: PhCode, weight: 'bold' }"
                                    />

                                    <!-- Event actions dropdown -->
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
            
            <!-- NEW: Empty state when no events -->
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
                                        console.log('Event created', response);
                                    }
                                },
                            },
                        }"
                    />
                </div>
            </div>
        </div>
        
        <!-- NEW: Create organization button at bottom -->
        <div class="create-org-section">
            <ButtonComponent 
                v-popup="{
                    component: OrganizationCreateForm,
                    overlay: { position: 'center' },
                    properties: {
                        endpoint: 'organizations',
                        type: 'POST',
                        callback: (event, data, response, success) => {
                            console.log('org created', response);
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
    }

    /* NEW: Toggle button styling */
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

    /* NEW: Team filter styling */
    .team-filters {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-left: 10px;
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

    /* Keep original team list hidden but in DOM for backward compatibility */
    .teams-list {
        display: none;
    }

    .team-item {
        background-color: #f0f0f0;
        padding: 0 5px;
        height: 26px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 8px;
        font-size: 14px;
        background: white;
        border: 1px solid var(--border);
    }

    /* Event grid layout */
    .events-grid {
        margin-top: 20px;
        transition: all 0.3s ease;
    }

    .events-container {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 15px;
    }

    /* Event card styling */
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

    /* NEW: Create organization section */
    .create-org-section {
        margin-top: 30px;
        text-align: center;
    }


    /* NEW: Empty state styling */
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
    
</style>