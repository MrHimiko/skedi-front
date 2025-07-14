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
import OrganizationMembersRaw from '@user_organizations/components/members/view.vue';
import OrganizationTeamsRaw from '@user_organizations/components/teams/view.vue';
import OrganizationEventsRaw from '@user_organizations/components/events/view.vue';

// Mark components as raw to avoid Vue reactivity on component definitions
const OrganizationSettings = markRaw(OrganizationSettingsRaw);
const OrganizationMembers = markRaw(OrganizationMembersRaw);
const OrganizationTeams = markRaw(OrganizationTeamsRaw);
const OrganizationEvents = markRaw(OrganizationEventsRaw);

import { PhGearSix, PhUsers, PhUsersThree, PhCalendarBlank } from "@phosphor-icons/vue";

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
    const userOrg = userOrgs.find(org => 
        (org.entity?.id || org.id) === organizationId.value
    );
    
    return userOrg && userOrg.role === 'admin';
});

// Tab configuration without icons
const tabs = [
    {
        key: 'settings',
        label: 'Settings',
        component: OrganizationSettings
    },
    {
        key: 'members',
        label: 'Members',
        component: OrganizationMembers
    },
    {
        key: 'teams',
        label: 'Teams',
        component: OrganizationTeams
    },
    {
        key: 'events',
        label: 'Events',
        component: OrganizationEvents
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
        const response = await api.get(`organizations/${organizationId.value}`);
        
        if (response.success && response.data) {
            organization.value = response.data;
            
            // Check admin access after data is loaded
            if (!isAdmin.value) {
                common.notification('You do not have admin access to this organization', false);
                router.push('/teams');
            }
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
function handleTabChange(tabKey) {
    activeTab.value = tabKey;
}

onMounted(() => {
    loadOrganization();
});
</script>

<template>
    <MainLayout>
        <template #content>
            <div class="organization-page">
                <div class="container-lg">
                    <!-- Show loading state -->
                    <div v-if="isLoading" class="loading-container">
                        <p>Loading organization...</p>
                    </div>
                    
                    <!-- Show content when loaded -->
                    <template v-else-if="organization">
                        <!-- Header -->
                        <HeadingComponent 
                            :title="organization.name"
                            description="Manage your organization settings, teams, and members"
                        />
                        
                        <!-- Tabs -->
                        <div class="organization-tabs">
                            <TabsComponent
                                :tabs="tabs.map(tab => ({
                                    title: tab.label
                                }))"
                                :active="tabs.find(t => t.key === activeTab)?.label"
                                :onClick="(event, tab, index) => handleTabChange(tabs[index].key)"
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
.organization-page {
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
</style>