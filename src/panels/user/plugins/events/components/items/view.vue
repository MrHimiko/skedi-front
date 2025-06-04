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
    import EventEditLocation from '@user_events/components/form/eventEditLocation.vue';
    import ConfirmComponent from '@floated/confirm/view.vue';

    // Icon imports
    import { 
        PhGearSix, PhPlus, PhCode, PhLink, PhUsers, PhDotsThree,
        PhArrowSquareOut, PhClock, PhCalendar, PhMapPin, PhCopy, 
        PhFlowArrow, PhTable, PhTrash 
    } from "@phosphor-icons/vue";

    
    import { UserStore } from '@stores/user';

    // State management
    const userStore = UserStore();
    const organizations = ref([]);
    const eventsItems = ref(0);

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
                            isOrgEvent: false,
                            organization_id: org.id
                        }));
                    events.push(...teamEvents);
                }
            });
        }
        
        return events;
    }

    // Menu items for event actions
    const eventActionMenus = markRaw([
        { label: 'Preview', icon: null, iconComponent: PhArrowSquareOut, weight: 'regular' },
        { label: 'Edit duration', icon: null, iconComponent: PhClock, weight: 'regular' },
        { label: 'Edit availability', icon: null, iconComponent: PhCalendar, weight: 'regular' },
        { label: 'Edit location', icon: null, iconComponent: PhMapPin, weight: 'regular' },
        { label: 'Edit hosts', icon: null, iconComponent: PhUsers, weight: 'regular' },
        { label: 'Form Settings', icon: null, iconComponent: PhTable, weight: 'regular' },
        { label: 'Add workflow', icon: null, iconComponent: PhFlowArrow, weight: 'regular' },
        { label: 'Add routing form', icon: null, iconComponent: PhTable, weight: 'regular' },
        { label: 'Duplicate', icon: null, iconComponent: PhCopy, weight: 'regular' },
        { label: 'Remove', icon: null, iconComponent: PhTrash, weight: 'regular' }
    ]);

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
                        <div class="logo">
                            <span>{{ org.name ? org.name.charAt(0).toUpperCase() : 'O' }}</span>
                        </div>
                        <p>
                            {{ org.name }}
                            <span>{{ getAllEvents(org).length }}</span>
                        </p>
                    </div>

                    <!-- Top-level teams list -->
                    <div class="org-teams" v-if="getTopLevelTeams(org).length > 0">
                        <div class="teams-list">
                            <div v-for="team in getTopLevelTeams(org)" :key="team.id" class="team-item">
                                {{ team.name }}
                            </div>
                        </div>
                    </div>
                </div>

                <div class="right">
                    <a target="_BLANK" :href="'https://skedi.com/' + org.slug" class="blue-link">
                        {{ 'https://skedi.com/' + org.slug }}
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

            <!-- Events grid -->
            <div class="events-grid" v-if="getAllEvents(org).length > 0">
                <div class="events-container">
                    <!-- Event cards -->
                    <div v-for="event in getAllEvents(org)" :key="event.id" class="event-card">
                        <div class="top">
                            <div class="event-color-marker" :style="{ backgroundColor: event.teamColor }"></div>
                            <p class="event-name">{{ event.name || 'Unnamed Event' }}</p>
                            <a target="_BLANK" :href="'https://app.skedi.com/front/' + org.slug + '/' + event.slug" class="blue-link">
                                {{ 'https://skedi.com/' + org.slug + "/" + event.slug }}
                            </a>

                            <div class="info">
                                <div class="item">
                                    <div class="icon">
                                        <PhUsers weight="bold" />
                                    </div>
                                    <span> 3 </span>
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
        </div>
    </div>
</template>

<style scoped>
    .teams-c-item .head .left {
        flex: 1;
    }

    .teams-list {
        display: flex;
        flex-wrap: wrap;
        gap: 3px;
        flex-direction: row;
        border-left: none;
        margin: 0;
        margin-top: 0;
        padding: 0;
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
        width: 4px;
        height: 16px;
        border-radius: 2px;
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
</style>