<script setup>
import { ref, computed, onMounted, provide } from 'vue';
import { mergeOrganizationsAndTeams } from '@user_shared/utils/js/organization-structure.js';
import { UserStore } from '@stores/user';
import { api } from '@utils/api';
import { popup } from '@utils/popup';

import TeamList from '@user_teams/components/teamList/view.vue';
import ButtonComponent from '@form/button/view.vue';
import TeamCreateForm from '@user_teams/components/form/teamCreate.vue';

import { PhPlus } from "@phosphor-icons/vue";

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

// State
const teams = ref([]);
const isLoading = ref(true);
const userStore = UserStore();
const currentUserId = userStore.getId();

// Create a unique symbol for the reload function
const RELOAD_KEY = Symbol('reloadTeams');

// Load teams for the organization
async function loadTeams() {
    try {
        isLoading.value = true;
        
        // Get fresh data from API
        const response = await api.get('account/user');
        if (response.success && response.data) {
            userStore.setData(response.data);
            
            // Get merged organizations and teams
            const organizations = mergeOrganizationsAndTeams();
            
            // Find current organization's teams
            const currentOrg = organizations.find(org => org.id === props.organizationId);
            
            if (currentOrg && currentOrg.teams) {
                // Get only top-level teams (sub-teams are nested inside)
                teams.value = currentOrg.teams.filter(team => !team.parent_team_id);
            } else {
                teams.value = [];
            }
        }
    } catch (error) {
        console.error('Failed to load teams:', error);
    } finally {
        isLoading.value = false;
    }
}

// Reload data function that also emits refresh
async function reloadData() {
    await loadTeams();
    emit('refresh');
}

// Provide the reload function to all descendant components
provide(RELOAD_KEY, reloadData);

// Get organization users
const orgUsers = computed(() => {
    const orgs = userStore.getOrganizations();
    const currentOrg = orgs.find(org => (org.entity?.id || org.id) === props.organizationId);
    return currentOrg?.users || [];
});

// Create new team
function createTeam() {
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
                    reloadData();
                }
            },
            class: 'h-auto',
            title: 'Create new team'
        },
        {
            position: 'center'
        }
    );
}

onMounted(() => {
    loadTeams();
});
</script>

<template>
    <div class="org-teams">
        <!-- Header with create button -->
        <div class="teams-header">
            <h3>Teams</h3>
            <div>
            <ButtonComponent
                v-if="isAdmin"
                :iconLeft="{ component: PhPlus, weight: 'bold' }"
                label="Create Team"
                @click="createTeam"
            /></div>
        </div>
        
        <!-- Teams List -->
        <div v-if="isLoading" class="loading-state">
            Loading teams...
        </div>
        
        <div v-else-if="teams.length === 0" class="empty-state">
            <p>No teams created yet</p>
            <ButtonComponent
                v-if="isAdmin"
                :iconLeft="{ component: PhPlus, weight: 'bold' }"
                label="Create First Team"
                @click="createTeam"
            />
        </div>
        
        <TeamList
            v-else
            :teams="teams"
            :orgSlug="organization.slug"
            :orgId="organizationId"
            :orgUsers="orgUsers"
            :currentUserId="currentUserId"
            :reloadData="reloadData"
        />
    </div>
</template>

<style scoped>
.org-teams {
    min-height: 400px;
}

.teams-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
}

.teams-header h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
}

.loading-state,
.empty-state {
    text-align: center;
    padding: 60px 20px;
    color: var(--text-secondary);
}

.empty-state p {
    margin-bottom: 16px;
    font-size: 16px;
}
</style>