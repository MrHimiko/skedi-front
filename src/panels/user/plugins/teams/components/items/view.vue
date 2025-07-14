<script setup>
import '@user_shared/utils/styles/organization-dropdowns.css';
import { mergeOrganizationsAndTeams } from '@user_shared/utils/js/organization-structure.js';

import './style.css';
import { ref, onMounted, toRaw, provide } from 'vue';
import { PhGearSix, PhPlus, PhUsers, PhDotsThree, PhTrash } from "@phosphor-icons/vue";
import ButtonComponent from '@form/button/view.vue';
import ConfirmComponent from '@floated/confirm/view.vue';
import MenusComponent from '@global/menus/view.vue';

import TeamList from '@user_teams/components/teamList/view.vue';
import { UserStore } from '@stores/user';

import TeamCreateForm from '@user_teams/components/form/teamCreate.vue';
import OrganizationEditForm from '@user_teams/components/form/organizationEdit.vue';
import { popup } from '@utils/popup';
import { api } from '@utils/api';
import { common } from '@utils/common';

// Create a unique symbol for the reload function
const RELOAD_KEY = Symbol('reloadTeams');

const userStore = UserStore();
const currentUserId = userStore.getId();
const organizations = ref([]);
const eventsItems = ref(0);

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

// Provide the reload function to all descendant components
provide(RELOAD_KEY, reloadData);

onMounted(() => {
    const rawTeams = toRaw(userStore.getTeams());
    const rawOrgs = toRaw(userStore.getOrganizations());
    
    organizations.value = mergeOrganizationsAndTeams();
    
    if (organizations.value.length === 0) {
        if ((rawTeams && rawTeams.length) || (rawOrgs && rawOrgs.length)) {
            if (rawOrgs && rawOrgs.length) {
                organizations.value = rawOrgs.map(org => {
                    const entity = org.entity || {};
                    return {
                        ...entity,
                        id: entity.id,
                        name: entity.name || 'Unknown',
                        slug: entity.slug || 'unknown',
                        teams: [],
                        role: org.role // Make sure to include the role
                    };
                });
            }
        }
    }
});

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
                                {{ org.name }}
                                <span v-if="isOrgAdmin(org)" class="admin">Admin</span>
                            </p>
                            <div>
                                <p>
                                    <router-link 
                                        v-if="isOrgAdmin(org)"
                                        :to="`/organization/${org.id}`"
                                        class="org-name-link"
                                    >
                                        {{ org.name }}
                                    </router-link>
                                    <span v-else>{{ org.name }}</span>
                                    <span v-if="isOrgAdmin(org)" class="admin">Admin</span>
                                </p>
                                <a :href="getOrgUrl(org)" class="org-url">
                                    {{ getOrgUrl(org) }}
                                </a>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="right" v-if="isOrgAdmin(org)">
                    <div class="actions">
                        <!-- Settings button - only for admins -->
                        <button-component
                            v-popup="{
                                component: OrganizationEditForm,
                                overlay: { position: 'center' },
                                properties: {
                                    values: () => org,
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
                        <button-component
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
                        <button-component
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
                
                <!-- For non-admins, just show member badge -->
                <div class="right" v-else>
                    <span class="member-badge">Member</span>
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
    </div>
</template>

<style scoped>
.teams-c-items {
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.teams-c-item {
    background: var(--background-0);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 20px;
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


</style>