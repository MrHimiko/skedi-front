<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

// Stores
import { UserStore } from '@stores/user';
import { common } from '@utils/common';
import { api } from '@utils/api';

// Layout
import MainLayout from '@layouts/main/view.vue';

// Components
import HeadingComponent from '@global/heading/view.vue';
import TabsComponent from '@global/tabs/view.vue';
import ButtonComponent from '@form/button/view.vue';

// Tab Components
import EventOverviewTab from '@user_events/components/tabs/overview.vue';
import EventSettingsTab from '@user_events/components/tabs/settings.vue';
import EventFormWorkflowTab from '@user_events/components/tabs/formWorkflow.vue';
import EventTeamTab from '@user_events/components/tabs/team.vue';
import EventBookingsTab from '@user_events/components/tabs/bookings.vue';

// Icons
import { PhArrowLeft, PhGearSix } from '@phosphor-icons/vue';

// Composables
const route = useRoute();
const router = useRouter();
const userStore = UserStore();

// State
const event = ref(null);
const organization = ref(null);
const team = ref(null);
const isLoading = ref(true);
const hasAccess = ref(false);
const activeTab = ref('overview');

// Get event ID from route
const eventId = computed(() => route.params.eventId);

// Tab configuration
const tabs = computed(() => [
    { 
        key: 'overview',
        label: 'Overview',
        component: EventOverviewTab
    },
    { 
        key: 'settings',
        label: 'Settings',
        component: EventSettingsTab
    },
    { 
        key: 'form-workflow',
        label: 'Form & Workflow',
        component: EventFormWorkflowTab
    },
    { 
        key: 'bookings',
        label: 'Bookings',
        component: EventBookingsTab
    }
]);

// Current tab component
const currentTabComponent = computed(() => {
    const tab = tabs.value.find(t => t.key === activeTab.value);
    return tab ? tab.component : null;
});

// Check if user has admin access to this event
const checkAccess = computed(() => {
    if (!event.value || !userStore.isLogged()) return false;

    const userId = userStore.getId();
    const userOrgs = userStore.getOrganizations();
    const userTeams = userStore.getTeams();

    // Check if user is event creator/admin
    if (event.value.created_by === userId) return true;

    // Check if user is organization admin
    const userOrg = userOrgs.find(org => 
        (org.entity?.id || org.id) === event.value.organization_id
    );
    if (userOrg && userOrg.role === 'admin') return true;

    // Check if user is team admin (if event belongs to team)
    if (event.value.team_id) {
        const userTeam = userTeams.find(team => 
            team.id === event.value.team_id
        );
        if (userTeam && userTeam.effective_role === 'admin') return true;
    }

    // Check if user is assigned to event as host
    if (event.value.assignees && event.value.assignees.some(assignee => 
        assignee.user.id === userId && assignee.role === 'admin'
    )) return true;

    return false;
});

// Load event data
async function loadEvent() {
    try {
        isLoading.value = true;
        
        // Get user's first organization ID for initial API call (exactly like in your working examples)
        const userOrgs = userStore.getOrganizations();
        let initialOrgId = null;
        
        if (Array.isArray(userOrgs) && userOrgs.length > 0 && userOrgs[0].entity) {
            initialOrgId = userOrgs[0].entity.id;
        }
        
        if (!initialOrgId) {
            common.notification('No organization found', false);
            router.push('/events');
            return;
        }
        
        // Use the correct API pattern from your existing code - events requires organization_id as query param
        const response = await api.get(`events/${eventId.value}?organization_id=${initialOrgId}`);
        
        if (response.success && response.data) {
            event.value = response.data;
            
            // Load organization data
            if (event.value.organization_id) {
                await loadOrganization(event.value.organization_id);
            }
            
            // Load team data if event belongs to team
            if (event.value.team_id) {
                await loadTeam(event.value.team_id, event.value.organization_id);
            }
            
            // Check access after data is loaded
            hasAccess.value = checkAccess.value;
            
            if (!hasAccess.value) {
                common.notification('You do not have admin access to this event', false);
                router.push('/events');
                return;
            }
            
        } else {
            common.notification('Event not found', false);
            router.push('/events');
        }
    } catch (error) {
        console.error('Failed to load event:', error);
        common.notification('Failed to load event', false);
        router.push('/events');
    } finally {
        isLoading.value = false;
    }
}

// Load organization data
async function loadOrganization(organizationId) {
    try {
        const response = await api.get(`organizations/${organizationId}`);
        if (response.success && response.data) {
            organization.value = response.data;
        }
    } catch (error) {
        console.error('Failed to load organization:', error);
    }
}

// Load team data
async function loadTeam(teamId, organizationId) {
    try {
        const response = await api.get(`organizations/${organizationId}/teams/${teamId}`);
        if (response.success && response.data) {
            team.value = response.data;
        }
    } catch (error) {
        console.error('Failed to load team:', error);
    }
}

// Reload data (called by child components)
function reloadData() {
    loadEvent();
}

// Handle tab change
function handleTabChange(event, tab, index) {
    activeTab.value = tabs.value[index].key;
}

// Go back to events list
function goBack() {
    router.push('/events');
}

// Get event URL
const eventUrl = computed(() => {
    if (!event.value || !organization.value) return '';
    return `https://skedi.com/${organization.value.slug}/${event.value.slug}`;
});

// Page title
const pageTitle = computed(() => {
    return event.value ? event.value.name : 'Event';
});

// Page description
const pageDescription = computed(() => {
    if (!event.value) return '';
    
    let description = 'Manage event settings, team, and bookings';
    
    if (team.value) {
        description += ` • Team: ${team.value.name}`;
    }
    
    if (organization.value) {
        description += ` • Organization: ${organization.value.name}`;
    }
    
    return description;
});

onMounted(() => {
    loadEvent();
});
</script>

<template>
    <MainLayout>
        <template #content>
            <div class="event-single-page">
                <div class="container-lg">
                    <!-- Loading state -->
                    <div v-if="isLoading" class="loading-container">
                        <p>Loading event...</p>
                    </div>
                    
                    <!-- Access denied -->
                    <div v-else-if="!hasAccess" class="access-denied">
                        <p>Only admins can view and edit this page</p>
                    </div>
                    
                    <!-- Main content -->
                    <template v-else-if="event">
                        <!-- Header with back button -->
                        <div class="header-section">
                            <ButtonComponent
                                @click="goBack"
                                as="transparent"
                                class="back-button"
                            >
                                <PhArrowLeft :size="16" weight="bold" />
                                Back to Events
                            </ButtonComponent>
                        </div>

                        <!-- Page Header -->
                        <HeadingComponent 
                            :title="pageTitle"
                            :description="pageDescription"
                        >
                            <template #actions>
                                <div class="event-url">
                                    <label>Event URL:</label>
                                    <a :href="eventUrl" target="_blank" class="url-link">
                                        {{ eventUrl }}
                                    </a>
                                </div>
                            </template>
                        </HeadingComponent>
                        
                        <!-- Tabs -->
                        <div class="event-tabs">
                            <TabsComponent
                                :tabs="tabs.map(tab => ({
                                    title: tab.label
                                }))"
                                :active="tabs.find(t => t.key === activeTab)?.label"
                                :onClick="handleTabChange"
                            />
                        </div>
                        
                        <!-- Tab Content -->
                        <div class="tab-content" v-if="event">
                            <component
                                v-if="currentTabComponent"
                                :is="currentTabComponent"
                                :event="event"
                                :organization="organization"
                                :team="team"
                                :eventId="eventId"
                                :organizationId="event.organization_id"
                                :teamId="event.team_id"
                                @refresh="reloadData"
                            />
                        </div>
                    </template>
                </div>
            </div>
        </template>
    </MainLayout>
</template>

<style scoped>
.event-single-page {
    padding-bottom: 40px;
}

.loading-container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 400px;
    font-size: 16px;
    color: var(--text-secondary);
}

.access-denied {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 400px;
    font-size: 16px;
    color: var(--text-secondary);
}

.header-section {
    margin-bottom: 20px;
}

.back-button {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--text-secondary);
    font-size: 14px;
}

.back-button:hover {
    color: var(--text-primary);
}

.event-url {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.event-url label {
    font-size: 12px;
    color: var(--text-secondary);
    font-weight: 500;
}

.url-link {
    color: var(--primary);
    text-decoration: none;
    font-size: 14px;
    font-weight: 500;
}

.url-link:hover {
    text-decoration: underline;
}

.event-tabs {
    margin-top: 32px;
    margin-bottom: 32px;
}

.tab-content {
    background: var(--background-0);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 24px;
}

@media (max-width: 768px) {
    .event-url {
        margin-top: 16px;
    }
    
    .tab-content {
        padding: 16px;
    }
}
</style>