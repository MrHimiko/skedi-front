
<script setup>
import ButtonComponent from '@form/button/view.vue';
import { PhLink, PhUsers, PhCode, PhPlus, PhDotsThree, PhTrash, PhUserPlus, PhCaretRight } from "@phosphor-icons/vue";
import TeamList from '@user_teams/components/teamList/view.vue';
import TeamCreateForm from '@user_teams/components/form/teamCreate.vue';
import TeamEditForm from '@user_teams/components/form/teamEdit.vue';
import TeamDetailsPopup from '@user_teams/components/teamDetails/view.vue';
import ConfirmComponent from '@floated/confirm/view.vue';
import MenusComponent from '@global/menus/view.vue';
import { api } from '@utils/api';
import { popup } from '@utils/popup';
import { common } from '@utils/common';
import { UserStore } from '@stores/user';
import { ref, inject, computed, onMounted, onUnmounted } from 'vue';

import { hasAdminAccess, getUserCount, hasSubteams } from '@user_shared/utils/js/organization-structure.js';
import MemberModal from '@user_shared/components/memberModal/view.vue';
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
    },
    isRootLevel: {
        type: Boolean,
        default: true
    }
});

// Check if user is organization admin
const isOrgAdmin = computed(() => {
    const orgs = userStore.getOrganizations();
    const currentOrg = orgs.find(org => 
        (org.entity?.id || org.id) === props.orgId
    );
    return currentOrg && currentOrg.role === 'admin';
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

// Get subteam count text
function getSubteamCountText(team) {
    if (!hasSubteams(team)) return '';
    const count = team.teams.length;
    return `${count} sub-team${count > 1 ? 's' : ''}`;
}

// Open team details in popup
function openTeamDetails(team) {
    popup.open(
        `team-details-${team.id}`,
        null,
        TeamDetailsPopup,
        {
            team: team,
            teamId: team.id,
            orgSlug: props.orgSlug,
            orgUsers: props.orgUsers,
            orgId: props.orgId,
            currentUserId: props.currentUserId,
            reloadData: triggerReload
        },
        {
            position: 'center',
            class: 'team-details-modal'
        }
    );
}

// Delete team
function deleteTeam(team) {
    
    let warningMessage = `Are you sure you want to delete "${team.name}"?`;
    
    if (hasSubteams(team)) {
        warningMessage += ` This will also delete all ${team.teams.length} sub-team(s) and all associated events.`;
    } else if (team.events && team.events.length > 0) {
        warningMessage += ` This will also delete ${team.events.length} event(s) associated with this team.`;
    }
    
    popup.open(
        'delete-team-confirm',
        null,
        ConfirmComponent,
        {
            as: 'red',
            description: warningMessage,
            callback: async () => {
                try {
                    const result = await api.delete(`organizations/${props.orgId}/teams/${team.id}`);
                    
                    if (result && result.success) {
                        common.notification('Team deleted successfully', true);
                        popup.close();
                        triggerReload();
                    } else {
                        common.notification(result?.message || 'Failed to delete team', false);
                    }
                } catch (error) {
                    console.error('Error deleting team:', error);
                    common.notification('Failed to delete team', false);
                }
            }
        },
        {
            position: 'center'
        }
    );
}

// Add member
function addMember(team) {
    popup.open(
        'team-members',
        null,
        MemberModal,
        {
            type: 'team',
            entityId: team.id,
            entityName: team.name,
            organizationId: props.orgId,
            callback: triggerReload
        },
        {
            position: 'center'
        }
    );
}

// Check if user can perform admin actions on a team
function canPerformAdminActions(team) {
    // User can perform admin actions if they are:
    // 1. Organization admin (can do anything)
    // 2. Team admin (hasAdminAccess returns true)
    return isOrgAdmin.value || hasAdminAccess(team);
}
</script>

<template>
    <div class="teams-container" :class="{ 'root-level': isRootLevel }" :key="refreshKey">
        <!-- Grid layout for root teams -->
        <div v-if="isRootLevel" class="teams-grid">
            <div v-for="team in teams" :key="team.id" class="team-card">
                <div class="team-card-content">
                    <div>
                        <div class="team-header">
                            <h3 @click="openTeamDetails(team)" class="team-name">{{ team.name }}</h3>
                            <div v-if="canPerformAdminActions(team)" class="team-actions">
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
                                    as="c-button tertiary icon"
                                    :iconLeft="{ component: PhDotsThree, weight: 'bold' }"
                                />
                            </div>
                        </div>
                        
                        <a :href="getTeamUrl(team)" class="team-url">
                            {{ getTeamUrl(team) }}
                        </a>
                        
                        <div class="team-info">
                            <div class="info-item">
                                <PhUsers size="16" />
                                <span>{{ getUserCount(team) }} members</span>
                            </div>
                        </div>
                        
                        <div v-if="hasSubteams(team)" 
                            class="subteam-indicator"
                            @click="openTeamDetails(team)">
                            <PhCaretRight size="16" />
                            <span>{{ getSubteamCountText(team) }}</span>
                        </div>
                    </div>
                    
                    <div v-if="canPerformAdminActions(team)" class="team-footer">
                        <ButtonComponent
                            v-popup="{
                                component: TeamCreateForm,
                                overlay: { position: 'center' },
                                properties: {
                                    endpoint: `organizations/${orgId}/teams?parent_team_id=${team.id}`,
                                    type: 'POST',
                                    callback: async (event, data, response, success) => {
                                    if (success) {
                                        popup.close();
                                        
                                        // Always call reloadData if available
                                        if (props.reloadData) {
                                            await props.reloadData();
                                        } else {
                                            triggerReload();
                                        }
                                    }
                                },
                                    class: 'h-auto',
                                    title: `Create new subteam of ${team.name}`,
                                }
                            }"
                            v-tooltip="{ content: 'Create subteam' }"
                            as="tertiary small full-width"
                            :iconLeft="{ component: PhPlus, weight: 'bold' }"
                            label="Add subteam"
                        />
                    </div>
                </div>
            </div>
        </div>
        
        <!-- List layout for nested teams (in popup) -->
        <ul v-else class="teams-list">
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

                        <div class="right" v-if="canPerformAdminActions(team)">
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
                        :isRootLevel="false"
                    />
                </div>
            </li>
        </ul>
    </div>
</template>

<style scoped>
/* Grid layout styles */
.teams-container.root-level {
    width: 100%;
}

.teams-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
    margin-top: 20px;
}

/* Responsive grid */
@media (max-width: 1200px) {
    .teams-grid {
        grid-template-columns: repeat(2, 1fr);
    }
}

@media (max-width: 768px) {
    .teams-grid {
        grid-template-columns: 1fr;
    }
}

/* Team card styles */
.team-card {
    background: var(--background-0);
    border: 1px solid var(--border);
    border-radius: 10px;
    transition: all 0.3s ease;
}

.team-card-content {
    padding: 20px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    height: 100%;
}

.team-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 8px;
}

.team-name {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: color 0.2s;
}

.team-name:hover {
    color: var(--brand-primary);
}

.team-actions {
    opacity: 0;
    transition: opacity 0.2s;
}

.team-card:hover .team-actions {
    opacity: 1;
}

.team-url {
    color: var(--text-secondary);
    font-size: 13px;
    text-decoration: none;
    display: block;
    margin-bottom: 12px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.team-url:hover {
    text-decoration: underline;
}

.team-info {
    margin-bottom: 12px;
}

.info-item {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--text-secondary);
    font-size: 13px;
}

.subteam-indicator {
    display: flex;
    align-items: center;
    gap: 4px;
    color: var(--text-primary);
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    padding: 6px 0;
    transition: color 0.2s;
}

.subteam-indicator:hover {
    color: var(--brand-primary);
}

.team-footer {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid var(--border);
}

/* Existing styles for list view */
.teams-list {
    list-style-type: none;
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

.info {
    margin: 10px 0;
}

.info .item {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    color: var(--text-secondary);
    font-size: 14px;
}

.info .icon {
    display: flex;
    align-items: center;
}

.list-of-users {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 10px;
}

.user-item {
    padding: 4px 12px;
    background: var(--background-1);
    border: 1px solid var(--border);
    border-radius: 6px;
    font-size: 13px;
}

.user-item.role-admin {
    background: rgba(59, 130, 246, 0.1);
    border-color: rgba(59, 130, 246, 0.3);
    color: rgb(59, 130, 246);
}

.user-role {
    font-size: 12px;
    color: var(--text-secondary);
}

.bottom {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 15px;
}

.bottom .left .links {
    display: flex;
    gap: 8px;
}

.bottom .right .actions {
    display: flex;
    gap: 8px;
}

.subteam-wrapper {
    margin-top: 15px;
    margin-left: 20px;
    padding-left: 20px;
    border-left: 2px solid var(--border);
}
</style>

<!-- Global styles for the popup -->
<style>
.team-details-modal .l-popup {
    max-width: 800px;
    width: 90vw;
}
</style>