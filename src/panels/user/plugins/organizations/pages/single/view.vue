<!-- src/panels/user/plugins/organizations/pages/single/view.vue -->
<script setup>
import { ref, computed, onMounted, markRaw } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '@utils/api';
import { common } from '@utils/common';
import { UserStore } from '@stores/user';

import MainLayout from '@layouts/main/view.vue';
import HeadingComponent from '@global/heading/view.vue';
import TabsComponent from '@global/tabs/view.vue';
import ButtonComponent from '@form/button/view.vue';

// Import tab components with markRaw to avoid reactivity issues
import OrganizationSettingsRaw from '@user_organizations/components/settings/view.vue';
import OrganizationTeamsRaw from '@user_organizations/components/teams/view.vue';
import OrganizationMembersRaw from '@user_organizations/components/members/view.vue';
import OrganizationPlansRaw from '@user_organizations/components/plans/view.vue';
import OrganizationEventsRaw from '@user_organizations/components/events/view.vue';
import OrganizationBookingsRaw from '@user_organizations/components/bookings/view.vue';
import OrganizationLeadsContactsRaw from '@user_organizations/components/leads-contacts/view.vue';

// Mark components as raw to avoid Vue reactivity on component definitions
const OrganizationSettings = markRaw(OrganizationSettingsRaw);
const OrganizationTeams = markRaw(OrganizationTeamsRaw);
const OrganizationMembers = markRaw(OrganizationMembersRaw);
const OrganizationPlans = markRaw(OrganizationPlansRaw);
const OrganizationEvents = markRaw(OrganizationEventsRaw);
const OrganizationBookings = markRaw(OrganizationBookingsRaw);
const OrganizationLeadsContacts = markRaw(OrganizationLeadsContactsRaw);

const route = useRoute();
const router = useRouter();
const userStore = UserStore();

// State
const organization = ref(null);
const isLoading = ref(true);
const activeTab = ref('settings');

// Get organization ID from route
const organizationId = computed(() => parseInt(route.params.id));

// Check if current user is admin
const isAdmin = computed(() => {
    if (!organization.value) return false;
    
    const userOrgs = userStore.getOrganizations();
    const orgId = organizationId.value;
    
    const userOrg = userOrgs.find(org => {
        const id = org.entity?.id || org.id;
        return id === orgId;
    });
    
    console.log('Is admin check:', { userOrg, role: userOrg?.role });
    
    return userOrg && userOrg.role === 'admin';
});

// Tab configuration
const tabs = [
    {
        key: 'settings',
        label: 'Settings',
        component: OrganizationSettings
    },
    {
        key: 'teams',
        label: 'Teams',
        component: OrganizationTeams
    },
    {
        key: 'members',
        label: 'Members',
        component: OrganizationMembers
    },
    {
        key: 'plans',
        label: 'Plan & Seats',
        component: OrganizationPlans
    },
    {
        key: 'events',
        label: 'Events',
        component: OrganizationEvents
    },
    {
        key: 'bookings',
        label: 'Bookings',
        component: OrganizationBookings
    },
    {
        key: 'leads',
        label: 'Contacts & Leads',
        component: OrganizationLeadsContacts
    }
];

// Get current tab component
const currentTabComponent = computed(() => {
    const tab = tabs.find(t => t.key === activeTab.value);
    return tab ? tab.component : null;
});

// Load organization data
async function loadOrganization() {
    try {
        isLoading.value = true;
        
        const response = await api.get(`organizations/${organizationId.value}`);
        
        console.log('Organization API response:', response);
        
        if (response.success && response.data) {
            // Handle both direct data and nested entity structure
            const orgData = response.data.entity || response.data;
            console.log('Organization data:', orgData);
            organization.value = orgData;
        } else {
            common.notification('Organization not found', false);
            router.push('/teams');
        }
    } catch (error) {
        console.error('Failed to load organization:', error);
        common.notification('Failed to load organization', false);
        router.push('/teams');
    } finally {
        isLoading.value = false;
    }
}

// Reload data (called by child components)
function reloadData() {
    loadOrganization();
}

// Handle tab change
function handleTabChange(event, tab, index) {
    activeTab.value = tabs[index].key;
}

// Page title
const pageTitle = computed(() => {
    if (!organization.value) return 'Organization';
    return organization.value.name || organization.value.entity?.name || 'Organization';
});

// Page description
const pageDescription = computed(() => {
    if (!organization.value) return '';
    return `Manage organization settings, teams, and members`;
});

// Organization URL
const organizationUrl = computed(() => {
    if (!organization.value) return '';
    const slug = organization.value.slug || organization.value.entity?.slug;
    return slug ? `https://skedi.com/${slug}` : '';
});

onMounted(() => {
    loadOrganization();
});
</script>

<template>
    <MainLayout>
        <template #content>
            <div class="organization-single-page">
                <div class="container-lg">
                    <!-- Loading state -->
                    <div v-if="isLoading" class="loading-container">
                        <p>Loading organization...</p>
                    </div>
                    
                    <!-- Main content -->
                    <template v-else-if="organization">
                        <!-- Page Header -->
                        <HeadingComponent 
                            :title="pageTitle"
                            :description="pageDescription"
                        >
                            <template #actions>
                                <div class="org-url">
                                    <label>Organization URL:</label>
                                    <a :href="organizationUrl" target="_blank" class="url-link">
                                        {{ organizationUrl }}
                                    </a>
                                </div>
                            </template>
                        </HeadingComponent>
                        
                        <!-- Tabs -->
                        <div class="organization-tabs">
                            <TabsComponent
                                :tabs="tabs.map(tab => ({
                                    title: tab.label
                                }))"
                                :active="tabs.find(t => t.key === activeTab)?.label"
                                :onClick="handleTabChange"
                            />
                        </div>
                        
                        <!-- Tab Content -->
                        <div class="tab-content" v-if="organization">
                            <component
                                v-if="currentTabComponent"
                                :is="currentTabComponent"
                                :organization="organization"
                                :organizationId="organizationId"
                                :isAdmin="isAdmin"
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
.organization-single-page {
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

.org-url {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.org-url label {
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

.organization-tabs {
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
    .org-url {
        margin-top: 16px;
    }
    
    .tab-content {
        padding: 16px;
    }
}
</style>