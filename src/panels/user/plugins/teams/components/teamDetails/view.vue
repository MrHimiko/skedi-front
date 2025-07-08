// ============================================
// FILE: src/panels/user/plugins/teams/components/teamDetails/view.vue
// NEW FILE - Create this component for team details popup
// ============================================
<script setup>
import PopupLayout from '@layouts/popup/view.vue';
import TeamList from '@user_teams/components/teamList/view.vue';
import { PhUsers } from "@phosphor-icons/vue";
import { hasSubteams, getUserCount } from '@user_shared/utils/js/organization-structure.js';

const props = defineProps({
    team: {
        type: Object,
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

function getTeamUrl(team) {
    if (!team || !team.slug) return '#';
    return `https://skedi.com/${props.orgSlug}/${team.slug}`;
}

function getSubteamCountText(team) {
    if (!hasSubteams(team)) return '';
    const count = team.teams.length;
    return `${count} sub-team${count > 1 ? 's' : ''}`;
}
</script>

<template>
    <PopupLayout :title="team.name" class="team-details-popup">
        <template #content>
            <div class="team-details">
                <div class="team-info-header">
                    <a :href="getTeamUrl(team)" class="team-url" target="_blank">
                        {{ getTeamUrl(team) }}
                    </a>
                    <div class="team-stats">
                        <div class="stat">
                            <PhUsers size="16" />
                            <span>{{ getUserCount(team) }} members</span>
                        </div>
                        <div v-if="hasSubteams(team)" class="stat">
                            <span>{{ getSubteamCountText(team) }}</span>
                        </div>
                    </div>
                </div>
                
                <!-- Display list of users if available -->
                <div class="team-members" v-if="team.users && team.users.length">
                    <h4>Team Members</h4>
                    <div class="members-list">
                        <div class="user-item" 
                             v-for="user in team.users" 
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
                <div v-if="hasSubteams(team)" class="subteams-section">
                    <h4>Sub-teams</h4>
                    <TeamList
                        :teams="team.teams"
                        :orgSlug="orgSlug"
                        :orgUsers="orgUsers"
                        :orgId="orgId"
                        :currentUserId="currentUserId"
                        :reloadData="reloadData"
                        :isRootLevel="false"
                    />
                </div>
            </div>
        </template>
    </PopupLayout>
</template>

<style scoped>
.team-details {
    padding: 20px;
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
    margin: 0 0 12px 0;
    color: var(--text-primary);
}

.members-list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
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
</style>