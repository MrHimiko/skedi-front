<!-- src/panels/user/plugins/teams/components/items/view.vue -->
<script setup>
import { ref, computed, onMounted, markRaw } from 'vue';
import { mergeOrganizationsAndTeams } from '@user_shared/utils/js/organization-structure.js';
import { UserStore } from '@stores/user';
import { api } from '@utils/api';
import { popup } from '@utils/popup';
import { common } from '@utils/common';

// Component imports
import ButtonComponent from '@form/button/view.vue';
import MenusComponent from '@global/menus/view.vue';
import TeamList from '@user_teams/components/teamList/view.vue';
import TeamCreateForm from '@user_teams/components/form/teamCreate.vue';
import OrganizationEditForm from '@user_teams/components/form/organizationEdit.vue';
import OrganizationCreateForm from '@user_teams/components/form/organizationCreate.vue';
import ConfirmComponent from '@floated/confirm/view.vue';
import MemberModal from '@user_shared/components/memberModal/view.vue';

// Icon imports
import { 
    PhGearSix, 
    PhPlus, 
    PhCode, 
    PhLink, 
    PhUsers, 
    PhDotsThree,
    PhTrash,
    PhUserPlus
} from "@phosphor-icons/vue";

// Styles
import '@user_shared/utils/styles/organization-dropdowns.css';

const userStore = UserStore();

// State
const organizations = ref([]);
const eventsItems = ref(0);
const currentUserId = userStore.getId();

// Load data
async function reloadData() {
    try {
        const response = await api.get('account/user');
        if (response.success && response.data) {
            userStore.setData(response.data);
            
            const mergedOrgs = mergeOrganizationsAndTeams();
            
            // Process organizations to ensure proper structure
            organizations.value = mergedOrgs.map(org => {
                // Handle both possible structures
                const entity = org.entity || org;
                
                return {
                    id: entity.id,
                    name: entity.name || 'Unknown',
                    slug: entity.slug || 'unknown',
                    teams: entity.teams || [],
                    users: entity.users || [],
                    role: org.role // Make sure to include the role
                };
            });
            
            eventsItems.value++;
        }
    } catch (error) {
        console.error('Failed to reload data:', error);
    }
}

// Check if user is admin of the organization
function isOrgAdmin(org) {
    // Get the user's organization data from the store
    const userOrgs = userStore.getOrganizations();
    const userOrg = userOrgs.find(o => (o.entity?.id || o.id) === org.id);
    
    // Check if user has admin role for this organization
    return userOrg && userOrg.role === 'admin';
}

// Get organization URL
function getOrgUrl(org) {
    if (!org || !org.slug) return '#';
    return `https://skedi.com/${org.slug}`;
}

// Add member to organization
function addOrganizationMember(org) {
    popup.open(
        'org-members',
        null,
        MemberModal,
        {
            type: 'organization',
            entityId: org.id,
            entityName: org.name,
            organizationId: org.id,
            callback: reloadData
        },
        {
            position: 'center'
        }
    );
}

// Delete organization
function deleteOrganization(org) {
    popup.open(
        'delete-org-confirm',
        null,
        ConfirmComponent,
        {
            as: 'red',
            description: `Are you sure you want to delete "${org.name}"? This will permanently delete all teams and events within this organization.`,
            callback: async () => {
                try {
                    const result = await api.delete(`organizations/${org.id}`);
                    
                    if (result && result.success) {
                        common.notification('Organization deleted successfully', true);
                        popup.close();
                        reloadData();
                    } else {
                        common.notification(result?.message || 'Failed to delete organization', false);
                    }
                } catch (error) {
                    console.error('Error deleting organization:', error);
                    common.notification('Failed to delete organization', false);
                }
            }
        },
        {
            position: 'center'
        }
    );
}

function createTeam(orgId) {
    // This is handled by the popup directive
}

onMounted(() => {
    reloadData();
});
</script>

<template>
    <div class="teams-c-items" :key="eventsItems">
        <div v-for="org in organizations" :key="org.id" class="teams-c-item">
            <div class="head">
                <div class="left">
                    <div class="org-name">
                        <div class="logo">
                            <span>{{ org.name ? org.name.charAt(0).toUpperCase() : 'O' }}</span>
                        </div>
                        <div>
                            <p>
                                <a :href="getOrgUrl(org)" target="_blank" class="org-name-link">
                                    {{ org.name }}
                                </a>
                                <span v-if="isOrgAdmin(org)" class="admin">ADMIN</span>
                            </p>
                            <a :href="getOrgUrl(org)" target="_blank" class="org-url">
                                {{ getOrgUrl(org) }}
                            </a>
                        </div>
                    </div>
                </div>

                <div class="right" v-if="isOrgAdmin(org)">
                    <div class="member-badge" v-if="org.users && org.users.length > 0">
                        <PhUsers weight="bold" :size="16" />
                        {{ org.users.length }} member{{ org.users.length !== 1 ? 's' : '' }}
                    </div>

                    <div class="actions">
                        <!-- Add Member button - only for admins -->
                        <ButtonComponent
                            @click="addOrganizationMember(org)"
                            v-tooltip="{ content: 'Add member to organization' }" 
                            as="tertiary icon"
                            :iconLeft="{ component: PhUserPlus, weight: 'bold' }" 
                        />

                        <!-- Organization settings button - only for admins -->
                        <ButtonComponent
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
                                    class: 'h-auto'
                                }
                            }"
                            v-tooltip="{ content: 'Organization settings' }" 
                            as="tertiary icon"
                            :iconLeft="{ component: PhGearSix, weight: 'bold' }" 
                        />
                        
                        <!-- Create team button - only for admins -->
                        <ButtonComponent
                            v-popup="{
                                component: TeamCreateForm,
                                overlay: { position: 'center' },
                                properties: {
                                    endpoint: `organizations/${org.id}/teams`,
                                    type: 'POST',
                                    callback: (event, data, response, success) => {
                                        popup.close();
                                        reloadData();
                                    },
                                    class: 'h-auto',
                                    title: `Create new team in ${org.name}`,
                                }
                            }"
                            v-tooltip="{ content: 'Create new team' }" 
                            as="tertiary icon"
                            :iconLeft="{ component: PhPlus, weight: 'bold' }" 
                            @click="createTeam(org.id)" 
                        />
                        
                        <!-- Three dots menu - only for admins -->
                        <ButtonComponent
                            v-dropdown="{
                                component: MenusComponent,
                                properties: {
                                    menus: [
                                        {
                                            label: 'Delete Organization',
                                            iconComponent: PhTrash,
                                            weight: 'bold',
                                            onClick: () => deleteOrganization(org)
                                        }
                                    ]
                                }
                            }"
                            v-tooltip="{ content: 'More options' }"
                            as="tertiary icon"
                            :iconLeft="{ component: PhDotsThree, weight: 'bold' }"
                        />
                    </div>
                </div>
            </div>

            <!-- Display organization users -->
            <div class="org-users" v-if="org.users && org.users.length > 0">
                <div style="display: flex; align-items: center; gap:10px; font-weight: 500;">
                    <PhUsers weight="bold" />
                    <span>{{ org.users.length }} Members</span>
                </div>

                <ul>
                    <li v-for="user in org.users" :key="user.id">
                        {{ user.name }} ({{ user.effective_role || user.role || 'member' }})
                    </li>
                </ul>
            </div>

            <!-- Pass org users and current user ID down to all teams using the teams array -->
            <TeamList
                v-if="org.teams && org.teams.length"
                :teams="org.teams"
                :orgSlug="org.slug"
                :orgId="org.id"
                :orgUsers="org.users || []"
                :currentUserId="currentUserId"
                :reloadData="reloadData"
            />
        </div>

        <!-- Create Organization Button -->
        <div class="create-org-section" style="margin-top: 20px;">
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
.teams-c-items {
    display: flex;
    flex-direction: column;
}

.teams-c-item {
    background: var(--background-0);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 20px;
    margin-bottom: 20px;
}

.head {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.org-name {
    display: flex;
    align-items: center;
    gap: 12px;
}

.org-name .logo {
    width: 40px;
    height: 40px;
    background: var(--brand-gradient);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: 600;
    font-size: 18px;
}

.org-name .logo span {
    width: 26px;
    height: 26px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    font-weight: 700;
    background-color: var(--brand-yellow);
    color: #776D2B;
    line-height: 1;
    border-radius: 8px;
}

.org-name p {
    margin: 0 0 4px 0;
    font-size: 18px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 8px;
}

.org-name p span.admin {
    font-size: 12px;
    background: rgba(59, 130, 246, 0.1);
    color: rgb(59, 130, 246);
    padding: 2px 8px;
    border-radius: 4px;
    font-weight: 500;
    text-transform: uppercase;
}

.org-url {
    color: var(--brand-blue);
    font-size: 14px;
    text-decoration: none;
    font-weight: 500;
}

.org-url:hover {
    text-decoration: underline;
}

.right {
    display: flex;
    align-items: center;
    gap: 20px;
}

.actions {
    display: flex;
    gap: 8px;
}

.member-badge {
    font-size: 14px;
    color: var(--text-secondary);
    padding: 4px 12px;
    background: var(--background-1);
    border: 1px solid var(--border);
    border-radius: 6px;
    display: flex;
    align-items: center;
    gap: 6px;
}

.org-users {
    margin-top: 20px;
    padding: 15px;
    background-color: var(--background-0);
    border-radius: var(--radius-md);
}

.org-users ul {
    list-style: none;
    padding: 0;
    margin-top: 10px;
}

.org-users li {
    padding: 5px 0;
    color: var(--text-secondary);
}

.org-name-link {
    color: var(--text-primary);
    text-decoration: none;
    font-weight: 600;
    transition: color 0.2s;
}

.org-name-link:hover {
    color: var(--brand-primary);
}

.create-org-section {
    text-align: center;
    padding: 20px;
}
</style>