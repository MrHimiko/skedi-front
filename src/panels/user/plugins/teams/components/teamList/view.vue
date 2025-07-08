<script setup>
import ButtonComponent from '@form/button/view.vue';
import { PhLink, PhUsers, PhCode, PhPlus, PhDotsThree, PhTrash, PhUserPlus } from "@phosphor-icons/vue";
import TeamList from '@user_teams/components/teamList/view.vue';
import TeamCreateForm from '@user_teams/components/form/teamCreate.vue';
import TeamEditForm from '@user_teams/components/form/teamEdit.vue';
import ConfirmComponent from '@floated/confirm/view.vue';
import MenusComponent from '@global/menus/view.vue';
import { api } from '@utils/api';
import { popup } from '@utils/popup';
import { common } from '@utils/common';
import { UserStore } from '@stores/user';
import { ref, inject, onMounted, onUnmounted } from 'vue';

import { hasAdminAccess, getUserCount, hasSubteams } from '@user_shared/utils/js/organization-structure.js';

// Create a unique symbol for the reload function
const RELOAD_KEY = Symbol('reloadTeams');

const userStore = UserStore();
const refreshKey = ref(0);

const props = defineProps({
    teams: {
        type: Array,
        required: true
    },
    orgId: {
        type: Number,
        required: true
    },
    orgSlug: {
        type: String,
        required: true
    },
    orgUsers: {
        type: Array,
        default: () => []
    },
    currentUserId: {
        type: Number,
        required: true
    },
    reloadData: {
        type: Function,
        default: null
    }
});

// Try to inject the reload function from a parent component
const injectedReload = inject(RELOAD_KEY, null);

// Create a function to call the appropriate reload method
function triggerReload() {
    // Increment the refresh key to force this component to re-render
    refreshKey.value++;
    
    // First try to use the prop-based reload function
    if (props.reloadData) {
        props.reloadData();
    } 
    // If no prop-based reload, try to use the injected one
    else if (injectedReload) {
        injectedReload();
    }
}

function getTeamUrl(team) {
    if (!team || !team.slug) return '#';
    return `https://skedi.com/${props.orgSlug}/${team.slug}`;
}

// Delete team
function deleteTeam(team) {
    let warningMessage = `Are you sure you want to delete "${team.name}"?`;
    
    if (hasSubteams(team)) {
        warningMessage += ` This will also delete all ${team.teams.length} sub-team(s) and all associated events.`;
    } else if (team.events && team.events.length > 0) {
        warningMessage += ` This will also delete ${team.events.length} event(s) associated with this team.`;
    }
    
    // Create a temporary form element with the deleted field
    const formHtml = `<input type="hidden" name="deleted" value="true" />`;
    
    popup.open(
        'delete-team-confirm',
        null,
        ConfirmComponent,
        {
            as: 'red',
            description: warningMessage,
            endpoint: `organizations/${props.orgId}/teams/${team.id}`,
            type: 'PUT',
            callback: (event, data, response, success) => {
                if (success) {
                    common.notification('Team deleted successfully', true);
                    triggerReload();
                } else {
                    common.notification(response?.message || 'Failed to delete team', false);
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

// Add member
function addMember(team) {
    common.notification('Member invitation coming soon', true);
}
</script>

<template>
    <ul class="teams-list" :key="refreshKey">
        <li v-for="team in teams" :key="team.id" class="team-item">
            <div class="team">
                <div class="top">
                    <h2>{{ team.name }}</h2>
                    <a :href="getTeamUrl(team)" class="team-url">
                        {{ getTeamUrl(team) }}
                    </a>

                    <div class="info">
                        <div class="item">
                            <div class="icon">
                                <PhUsers weight="bold" />
                            </div>
                            <span>{{ getUserCount(team) }}</span>
                        </div>
                    </div>

                    <!-- Display list of users if available -->
                    <div class="list-of-users" v-if="team.users && team.users.length">
                        <div class="user-item" 
                             v-for="user in team.users" 
                             :key="user.id"
                             :class="user.effective_role ? `role-${user.effective_role}` : ''">
                            {{ user.name }} 
                            <span class="user-role" v-if="user.effective_role">
                                ({{ user.effective_role }})
                            </span>
                        </div>
                    </div>
                </div>

                <div class="bottom">
                    <div class="left">
                        <div class="links">
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
                        </div>
                    </div>

                    <div class="right" v-if="hasAdminAccess(team)">
                        <div class="actions">
                            <ButtonComponent
                                v-popup="{
                                    component: TeamCreateForm,
                                    overlay: { position: 'center' },
                                    properties: {
                                        endpoint: `organizations/${orgId}/teams?parent_team_id=${team.id}`,
                                        type: 'POST',
                                        callback: (event, data, response, success) => {
                                            popup.close();
                                            triggerReload();
                                        },
                                        class: 'h-auto',
                                        title: `Create new subteam of ${team.name}`,
                                    }
                                }"
                                v-tooltip="{ content: 'Create subteam' }"
                                as="secondary icon"
                                :iconLeft="{ component: PhPlus, weight: 'bold' }"
                            />
                            
                            <!-- Three dots menu -->
                            <ButtonComponent
                                v-dropdown="{
                                    component: MenusComponent,
                                    properties: {
                                        menus: [
                                            {
                                                label: 'Add Member',
                                                iconComponent: PhUserPlus,
                                                weight: 'bold',
                                                onClick: () => addMember(team)
                                            },
                                            {
                                                label: 'Delete Team',
                                                iconComponent: PhTrash,
                                                weight: 'bold',
                                                onClick: () => deleteTeam(team)
                                            }
                                        ]
                                    }
                                }"
                                as="secondary icon"
                                :iconLeft="{ component: PhDotsThree, weight: 'bold' }"
                            />
                        </div>
                    </div>
                </div>
            </div>

            <!-- Recursive rendering of subteams -->
            <div v-if="hasSubteams(team)" class="subteam-wrapper">
                <TeamList
                    :teams="team.teams"
                    :orgSlug="orgSlug"
                    :orgUsers="orgUsers"
                    :orgId="orgId"
                    :currentUserId="currentUserId"
                    :reloadData="triggerReload"
                />
            </div>
        </li>
    </ul>
</template>

<style scoped>
.teams-list {
    list-style-type: none;
    padding-left: 1em;
    margin-top: 0.5em;
    margin-bottom: 0.5em;
}

.team-item {
    margin-bottom: 15px;
}

.team {
    padding: 20px;
    background-color: var(--background-0);
    border: 1px solid var(--border);
    border-radius: 10px;
}

.team h2 {
    font-size: 16px;
    font-weight: 600;
    margin: 0 0 5px 0;
}

.team-url {
    color: var(--text-secondary);
    font-size: 14px;
    text-decoration: none;
}

.team-url:hover {
    text-decoration: underline;
}

.user-role {
    font-size: 12px;
    color: var(--text-secondary);
}
</style>