<script setup>
import PopupLayout from '@layouts/popup/view.vue';
import TeamList from '@user_teams/components/teamList/view.vue';
import ButtonComponent from '@form/button/view.vue';
import TeamCreateForm from '@user_teams/components/form/teamCreate.vue';
import { PhUsers, PhPlus } from "@phosphor-icons/vue";
import { hasSubteams, getUserCount, hasAdminAccess } from '@user_shared/utils/js/organization-structure.js';
import { mergeOrganizationsAndTeams } from '@user_shared/utils/js/organization-structure.js';
import { api } from '@utils/api';
import { popup } from '@utils/popup';
import { common } from '@utils/common';
import { ref, computed } from 'vue';
import { UserStore } from '@stores/user';
import { BillingStore } from '@stores/billing';

const billingStore = BillingStore();
const userStore = UserStore();

const props = defineProps({
    team: {
        type: Object,
        required: true
    },
    teamId: {
        type: Number,
        required: false
    },
    orgSlug: {
        type: String,
        required: true
    },
    orgUsers: {
        type: Array,
        default: () => []
    },
    orgId: {
        type: Number,
        required: true
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

// Use reactive team data, initialize with passed team
const teamData = ref({ ...props.team });
const loading = ref(false);

// Check if user is organization admin
const isOrgAdmin = computed(() => {
    const orgs = userStore.getOrganizations();
    const currentOrg = orgs.find(org => 
        (org.entity?.id || org.id) === props.orgId
    );
    return currentOrg && currentOrg.role === 'admin';
});

// Check if user can perform admin actions
const canPerformAdminActions = computed(() => {
    if (!teamData.value) return false;
    return isOrgAdmin.value || hasAdminAccess(teamData.value, props.currentUserId);
});

const canCreateSubTeams = computed(() => {
    return billingStore.isProfessional(props.orgId);
});

// Function to refresh team data by fetching from store
async function refreshTeamData() {
    try {
        loading.value = true;
        
        // Reload the user data to get fresh teams
        const response = await api.get('account/user');
        if (response.success && response.data) {
            userStore.setData(response.data);
            
            // Get the merged organizations and teams
            const organizations = mergeOrganizationsAndTeams();
            
            // Find our team in the updated data
            const findTeamInOrgs = (orgs, targetId) => {
                for (const org of orgs) {
                    if (org.teams) {
                        const found = findTeamRecursive(org.teams, targetId);
                        if (found) return found;
                    }
                }
                return null;
            };
            
            const findTeamRecursive = (teams, targetId) => {
                for (const team of teams) {
                    if (team.id === targetId) {
                        return team;
                    }
                    if (team.teams && team.teams.length > 0) {
                        const found = findTeamRecursive(team.teams, targetId);
                        if (found) return found;
                    }
                }
                return null;
            };
            
            const teamId = props.teamId || props.team.id;
            const updatedTeam = findTeamInOrgs(organizations, teamId);
            
            if (updatedTeam) {
                // Update our local team data
                teamData.value = { ...updatedTeam };
            }
            
            // Also trigger parent reload if available
            if (props.reloadData) {
                props.reloadData();
            }
        }
    } catch (error) {
        console.error('Error refreshing team data:', error);
    } finally {
        loading.value = false;
    }
}

// Create subteam function
function createSubteam() {
    const teamId = teamData.value.id;
    
    popup.open(
        'create-subteam',
        null,
        TeamCreateForm,
        {
            endpoint: `organizations/${props.orgId}/teams?parent_team_id=${teamId}`,
            type: 'POST',
            callback: async (event, data, response, success) => {
                if (success) {
                    // Close the create form popup
                    popup.close();
                    
                    common.notification('Subteam created successfully!', true);
                    
                    // Refresh data
                    await refreshTeamData();
                }
            },
            class: 'h-auto',
            title: `Create new subteam of ${teamData.value?.name}`,
        },
        {
            position: 'center'
        }
    );
}

function getTeamUrl(team) {
    if (!team || !team.slug) return '#';
    return `https://skedi.com/${props.orgSlug}/team/${team.slug}`;
}

function getSubteamCountText(team) {
    if (!hasSubteams(team)) return '';
    const count = team.teams.length;
    return `${count} sub-team${count > 1 ? 's' : ''}`;
}
</script>

<template>
    <PopupLayout :title="teamData.name" class="team-details-popup">
        <template #content>
            <div class="team-details">
                <div v-if="loading" class="loading-overlay">
                    Refreshing...
                </div>
                
                <div class="team-info-header">
                    <a :href="getTeamUrl(teamData)" class="team-url" target="_blank">
                        {{ getTeamUrl(teamData) }}
                    </a>
                    <div class="team-stats">
                        <div class="stat">
                            <PhUsers size="16" />
                            <span>{{ getUserCount(teamData) }} members</span>
                        </div>
                        <div v-if="hasSubteams(teamData)" class="stat">
                            <span>{{ getSubteamCountText(teamData) }}</span>
                        </div>
                    </div>
                </div>
                
                <!-- Display list of users if available -->
                <div class="team-members" v-if="teamData.users && teamData.users.length">
                    <h4>Team Members</h4>
                    <div class="members-list">
                        <div class="user-item" 
                             v-for="user in teamData.users" 
                             :key="user.id"
                             :class="user.effective_role ? 'role-' + user.effective_role : ''">
                            {{ user.name }} 
                            <span class="user-role" v-if="user.effective_role">
                                ({{ user.effective_role }})
                            </span>
                        </div>
                    </div>
                </div>
                
                <!-- Sub-teams section -->
                <div v-if="hasSubteams(teamData)" class="subteams-section">
                    <div class="subteams-header">
                        <h4>Sub-teams</h4>
                        <div><ButtonComponent
                            v-if="canPerformAdminActions && canCreateSubTeams"
                            @click="createSubteam"
                            v-tooltip="{ content: 'Create subteam' }"
                            as="tertiary small"
                            :iconLeft="{ component: PhPlus, weight: 'bold' }"
                            label="Create"
                        /></div>
                    </div>
                    <TeamList
                        :teams="teamData.teams"
                        :orgSlug="orgSlug"
                        :orgUsers="orgUsers"
                        :orgId="orgId"
                        :currentUserId="currentUserId"
                        :reloadData="refreshTeamData"
                        :isRootLevel="false"
                        :canCreateSubTeams="canCreateSubTeams"
                        :isOrgAdmin="isOrgAdmin"
                    />
                </div>
                
                <!-- If no subteams but user can create them -->
                <div v-else-if="canPerformAdminActions" class="no-subteams">
                    <p>No sub-teams yet</p>
                    <ButtonComponent
                        v-if="canPerformAdminActions && canCreateSubTeams"
                        @click="createSubteam"
                        as="secondary"
                        :iconLeft="{ component: PhPlus, weight: 'bold' }"
                        label="Create first subteam"
                    />
                </div>
            </div>
        </template>
    </PopupLayout>
</template>

<style scoped>
.team-details {
    padding: 20px;
    position: relative;
}

.loading-overlay {
    position: absolute;
    top: 10px;
    right: 20px;
    background: var(--background-1);
    padding: 4px 12px;
    border-radius: 4px;
    font-size: 12px;
    color: var(--text-secondary);
}

.team-info-header {
    margin-bottom: 24px;
}

.team-url {
    color: var(--text-secondary);
    font-size: 14px;
    text-decoration: none;
    display: block;
    margin-bottom: 12px;
}

.team-url:hover {
    text-decoration: underline;
}

.team-stats {
    display: flex;
    gap: 20px;
}

.stat {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--text-secondary);
    font-size: 14px;
}

.team-members {
    margin-bottom: 24px;
}

h4 {
    font-size: 16px;
    font-weight: 600;
    margin: 0;
    color: var(--text-primary);
}

.members-list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 12px;
}

.user-item {
    padding: 6px 12px;
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

.subteams-section {
    margin-top: 24px;
}

.subteams-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
}

.no-subteams {
    margin-top: 24px;
    padding: 30px;
    text-align: center;
    background: var(--background-1);
    border-radius: 8px;
}

.no-subteams p {
    color: var(--text-secondary);
    margin-bottom: 16px;
}
</style>