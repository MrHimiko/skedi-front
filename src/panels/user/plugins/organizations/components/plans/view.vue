<!-- src/panels/user/plugins/organizations/components/teams/view.vue -->
<script setup>
import { ref, computed, onMounted } from 'vue';
import { api } from '@utils/api';
import { common } from '@utils/common';
import { popup } from '@utils/popup';
import { UserStore } from '@stores/user';
import { BillingStore } from '@stores/billing';

import TeamList from '@user_teams/components/teamList/view.vue';
import TeamCreateForm from '@user_teams/components/form/teamCreate.vue';
import MemberModal from '@user_shared/components/memberModal/view.vue';
import ButtonComponent from '@form/button/view.vue';
import BillingUpgradeModal from '@user_billing/components/upgrade-modal.vue';

import { PhPlus, PhUserPlus } from "@phosphor-icons/vue";

const props = defineProps({
    organization: {
        type: Object,
        required: true
    },
    organizationId: {
        type: Number,
        required: true
    },
    isAdmin: {
        type: Boolean,
        default: false
    }
});

const emit = defineEmits(['refresh']);

const userStore = UserStore();
const billingStore = BillingStore();
const teams = ref([]);
const isLoading = ref(true);

// Get current user ID
const currentUserId = computed(() => userStore.getId());

// Get organization users
const orgUsers = computed(() => props.organization.users || []);

// Load teams
async function loadTeams() {
    try {
        isLoading.value = true;
        
        const response = await api.get(`organizations/${props.organizationId}/teams`);
        
        if (response.success && response.data) {
            teams.value = response.data;
        }
    } catch (error) {
        console.error('Failed to load teams:', error);
        common.notification('Failed to load teams', false);
    } finally {
        isLoading.value = false;
    }
}

// Create new team
function createTeam() {
    const canCreateTeam = billingStore.canAddTeam(props.organizationId);
    
    if (!canCreateTeam) {
        popup.open(
            'billing-upgrade',
            null,
            BillingUpgradeModal,
            {
                organizationId: props.organizationId,
                message: 'Upgrade your plan to create more teams',
                recommendedPlan: 'professional'
            },
            {
                position: 'center'
            }
        );
        return;
    }
    
    popup.open(
        'create-team',
        null,
        TeamCreateForm,
        {
            endpoint: `organizations/${props.organizationId}/teams`,
            type: 'POST',
            callback: (event, data, response, success) => {
                if (success) {
                    popup.close();
                    loadTeams();
                    emit('refresh');
                }
            },
            class: 'h-auto',
            title: `Create new team in ${props.organization.name}`,
        },
        {
            position: 'center'
        }
    );
}

// Invite member
function inviteMember() {
    const canAddMember = billingStore.canAddMember(props.organizationId);
    
    if (!canAddMember) {
        popup.open(
            'billing-upgrade',
            null,
            BillingUpgradeModal,
            {
                organizationId: props.organizationId,
                message: 'Upgrade your plan to invite more members',
                recommendedPlan: 'business'
            },
            {
                position: 'center'
            }
        );
        return;
    }
    
    popup.open(
        'invite-member',
        null,
        MemberModal,
        {
            organizationId: props.organizationId,
            organizationSlug: props.organization.slug,
            callback: () => {
                loadTeams();
                emit('refresh');
            }
        },
        {
            position: 'center'
        }
    );
}

// Handle team reload
function handleTeamReload() {
    loadTeams();
    emit('refresh');
}

onMounted(() => {
    loadTeams();
});
</script>

<template>
    <div class="org-teams-tab">
        <div class="teams-header">
            <div class="header-info">
                <h3>Teams & Members</h3>
                <p>Organize your members into teams with specific permissions and access</p>
            </div>
            <div v-if="isAdmin" class="header-actions">
                <ButtonComponent
                    @click="inviteMember"
                    as="tertiary"
                    :iconLeft="{ component: PhUserPlus, weight: 'bold' }"
                    label="Invite Member"
                />
                <ButtonComponent
                    @click="createTeam"
                    as="primary"
                    :iconLeft="{ component: PhPlus, weight: 'bold' }"
                    label="Create Team"
                />
            </div>
        </div>
        
        <div v-if="isLoading" class="loading-state">
            <p>Loading teams...</p>
        </div>
        
        <div v-else-if="teams.length === 0" class="empty-state">
            <p>No teams created yet</p>
            <ButtonComponent
                v-if="isAdmin"
                @click="createTeam"
                as="primary"
                :iconLeft="{ component: PhPlus, weight: 'bold' }"
                label="Create First Team"
            />
        </div>
        
        <div v-else class="teams-list">
            <TeamList
                v-for="team in teams"
                :key="team.id"
                :team="team"
                :orgSlug="organization.slug"
                :orgUsers="orgUsers"
                :orgId="organizationId"
                :currentUserId="currentUserId"
                :reloadData="handleTeamReload"
            />
        </div>
    </div>
</template>

<style scoped>
.org-teams-tab {
    display: flex;
    flex-direction: column;
    gap: 24px;
}

.teams-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 20px;
}

.header-info h3 {
    margin: 0 0 8px 0;
    font-size: 20px;
    font-weight: 600;
}

.header-info p {
    margin: 0;
    color: var(--text-secondary);
    font-size: 14px;
}

.header-actions {
    display: flex;
    gap: 12px;
}

.loading-state,
.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 20px;
    text-align: center;
}

.empty-state p {
    margin: 0 0 20px 0;
    color: var(--text-secondary);
    font-size: 16px;
}

.teams-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

@media (max-width: 768px) {
    .teams-header {
        flex-direction: column;
    }
    
    .header-actions {
        width: 100%;
        flex-direction: column;
    }
}
</style>