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
                        teams: []
                    };
                });
            }
        }
    }
});

// Delete organization
function deleteOrganization(org) {
    // Create a temporary form element with the deleted field
    const formHtml = `<input type="hidden" name="deleted" value="true" />`;
    
    popup.open(
        'delete-org-confirm',
        null,
        ConfirmComponent,
        {
            as: 'red',
            description: `Are you sure you want to delete "${org.name}"? This will permanently delete all teams and events within this organization.`,
            endpoint: `organizations/${org.id}`,
            type: 'PUT',
            callback: (event, data, response, success) => {
                if (success) {
                    common.notification('Organization deleted successfully', true);
                    reloadData();
                } else {
                    common.notification(response?.message || 'Failed to delete organization', false);
                }
            }
        },
        {
            position: 'center'
        }
    );
    
    // Inject the hidden field into the form after popup opens
    setTimeout(() => {
        const form = document.querySelector('.l-popup form');
        if (form) {
            form.insertAdjacentHTML('afterbegin', formHtml);
        }
    }, 100);
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
                        <p>
                            {{ org.name }}
                            <span>{{ org.teams ? org.teams.length : 0 }}</span>
                        </p>
                    </div>
                </div>

                <div class="right">
                    <div class="actions">
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
                            v-tooltip="{ content: 'Settings' }" 
                            as="tertiary icon"
                            :iconLeft="{ component: PhGearSix, weight: 'bold' }" 
                        />

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
                        
                        <!-- Three dots menu -->
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
</style>