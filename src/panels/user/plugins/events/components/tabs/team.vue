<script setup>
import { ref, computed, onMounted } from 'vue';
import { api } from '@utils/api';
import { common } from '@utils/common';
import { UserStore } from '@stores/user';

// Components
import ButtonComponent from '@form/button/view.vue';

// Icons
import { 
    PhUsersThree, PhBuildings, PhArrowRight, PhCheck, PhX 
} from '@phosphor-icons/vue';

const props = defineProps({
    event: {
        type: Object,
        required: true
    },
    organization: {
        type: Object,
        default: null
    },
    team: {
        type: Object,
        default: null
    },
    eventId: {
        type: [String, Number],
        required: true
    },
    organizationId: {
        type: [String, Number],
        required: true
    }
});

const emit = defineEmits(['refresh']);

// State
const userStore = UserStore();
const availableTeams = ref([]);
const availableOrganizations = ref([]);
const isLoading = ref(false);
const showMoveToTeam = ref(false);
const showMoveToOrg = ref(false);
const selectedTeamId = ref(null);
const selectedOrgId = ref(null);

// Get user organizations with admin access
const adminOrganizations = computed(() => {
    const userOrgs = userStore.getOrganizations();
    return userOrgs.filter(org => org.role === 'admin');
});

// Get teams for current organization where user is admin
const adminTeams = computed(() => {
    const userTeams = userStore.getTeams();
    return userTeams.filter(team => 
        team.organization_id === props.organizationId && 
        team.effective_role === 'admin'
    );
});

// Load available teams for current organization
async function loadAvailableTeams() {
    try {
        const response = await api.get(`organizations/${props.organizationId}/teams`);
        
        if (response.success && response.data) {
            // Filter teams where user has admin access
            availableTeams.value = response.data.filter(team => 
                adminTeams.value.some(adminTeam => adminTeam.id === team.id)
            );
        }
    } catch (error) {
        console.error('Failed to load teams:', error);
        availableTeams.value = [];
    }
}

// Move event to team
async function moveToTeam() {
    if (!selectedTeamId.value) {
        common.notification('Please select a team', false);
        return;
    }
    
    try {
        isLoading.value = true;
        
        const response = await api.put(
            `events/${props.eventId}/move-to-team?organization_id=${props.organizationId}`,
            { team_id: selectedTeamId.value }
        );
        
        if (response.success) {
            common.notification('Event moved to team successfully', true);
            showMoveToTeam.value = false;
            selectedTeamId.value = null;
            emit('refresh');
        } else {
            common.notification('Failed to move event to team', false);
        }
    } catch (error) {
        console.error('Error moving event to team:', error);
        common.notification('Failed to move event to team', false);
    } finally {
        isLoading.value = false;
    }
}

// Remove from team (move to organization level)
async function removeFromTeam() {
    try {
        isLoading.value = true;
        
        const response = await api.put(
            `events/${props.eventId}/remove-from-team?organization_id=${props.organizationId}`
        );
        
        if (response.success) {
            common.notification('Event moved to organization level', true);
            emit('refresh');
        } else {
            common.notification('Failed to remove event from team', false);
        }
    } catch (error) {
        console.error('Error removing event from team:', error);
        common.notification('Failed to remove event from team', false);
    } finally {
        isLoading.value = false;
    }
}

// Move event to different organization
async function moveToOrganization() {
    if (!selectedOrgId.value) {
        common.notification('Please select an organization', false);
        return;
    }
    
    try {
        isLoading.value = true;
        
        const response = await api.put(
            `events/${props.eventId}/move-to-organization`,
            { 
                organization_id: selectedOrgId.value,
                current_organization_id: props.organizationId
            }
        );
        
        if (response.success) {
            common.notification('Event moved to organization successfully', true);
            showMoveToOrg.value = false;
            selectedOrgId.value = null;
            emit('refresh');
        } else {
            common.notification('Failed to move event to organization', false);
        }
    } catch (error) {
        console.error('Error moving event to organization:', error);
        common.notification('Failed to move event to organization', false);
    } finally {
        isLoading.value = false;
    }
}

// Cancel move operations
function cancelMove() {
    showMoveToTeam.value = false;
    showMoveToOrg.value = false;
    selectedTeamId.value = null;
    selectedOrgId.value = null;
}

onMounted(() => {
    loadAvailableTeams();
});
</script>

<template>
    <div class="team-management">
        <!-- Current Location -->
        <div class="section">
            <h3>Current Location</h3>
            <div class="current-location">
                <div class="location-item">
                    <div class="location-icon">
                        <PhBuildings :size="24" />
                    </div>
                    <div class="location-details">
                        <span class="location-label">Organization</span>
                        <span class="location-value">{{ organization?.name || 'Loading...' }}</span>
                    </div>
                </div>
                
                <div v-if="team" class="location-item">
                    <div class="location-icon">
                        <PhUsersThree :size="24" />
                    </div>
                    <div class="location-details">
                        <span class="location-label">Team</span>
                        <span class="location-value">{{ team.name }}</span>
                    </div>
                </div>
                
                <div v-else class="location-item no-team">
                    <div class="location-icon">
                        <PhUsersThree :size="24" />
                    </div>
                    <div class="location-details">
                        <span class="location-label">Team</span>
                        <span class="location-value">Not assigned to any team</span>
                        <span class="location-note">This event is at the organization level</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Team Management Actions -->
        <div class="section">
            <h3>Team Management</h3>
            
            <!-- Move to Team -->
            <div class="action-card">
                <div class="action-info">
                    <h4>{{ team ? 'Move to Different Team' : 'Move to Team' }}</h4>
                    <p>{{ team ? 'Transfer this event to a different team within the organization' : 'Assign this event to a team within the organization' }}</p>
                </div>
                
                <div v-if="!showMoveToTeam" class="action-buttons">
                    <ButtonComponent 
                        @click="showMoveToTeam = true"
                        as="transparent"
                        :disabled="availableTeams.length === 0"
                    >
                        {{ team ? 'Change Team' : 'Move to Team' }}
                    </ButtonComponent>
                </div>
                
                <div v-else class="move-form">
                    <div class="form-group">
                        <label>Select Team:</label>
                        <select v-model="selectedTeamId" class="team-select">
                            <option value="">Choose a team...</option>
                            <option 
                                v-for="availableTeam in availableTeams"
                                :key="availableTeam.id"
                                :value="availableTeam.id"
                                :disabled="availableTeam.id === team?.id"
                            >
                                {{ availableTeam.name }}
                                {{ availableTeam.id === team?.id ? ' (current)' : '' }}
                            </option>
                        </select>
                    </div>
                    
                    <div class="form-actions">
                        <ButtonComponent 
                            @click="moveToTeam"
                            as="primary"
                            size="sm"
                            :disabled="!selectedTeamId || isLoading"
                        >
                            <PhCheck :size="16" />
                            {{ isLoading ? 'Moving...' : 'Move' }}
                        </ButtonComponent>
                        <ButtonComponent 
                            @click="cancelMove"
                            as="transparent"
                            size="sm"
                            :disabled="isLoading"
                        >
                            <PhX :size="16" />
                            Cancel
                        </ButtonComponent>
                    </div>
                </div>
            </div>
            
            <!-- Remove from Team -->
            <div v-if="team" class="action-card">
                <div class="action-info">
                    <h4>Remove from Team</h4>
                    <p>Move this event back to the organization level (not assigned to any team)</p>
                </div>
                
                <div class="action-buttons">
                    <ButtonComponent 
                        @click="removeFromTeam"
                        as="transparent"
                        :disabled="isLoading"
                    >
                        Remove from Team
                    </ButtonComponent>
                </div>
            </div>
        </div>

        <!-- Organization Management -->
        <div v-if="adminOrganizations.length > 1" class="section">
            <h3>Organization Management</h3>
            
            <div class="action-card">
                <div class="action-info">
                    <h4>Move to Different Organization</h4>
                    <p>Transfer this event to a different organization where you have admin access</p>
                </div>
                
                <div v-if="!showMoveToOrg" class="action-buttons">
                    <ButtonComponent 
                        @click="showMoveToOrg = true"
                        as="transparent"
                    >
                        Move to Organization
                    </ButtonComponent>
                </div>
                
                <div v-else class="move-form">
                    <div class="form-group">
                        <label>Select Organization:</label>
                        <select v-model="selectedOrgId" class="org-select">
                            <option value="">Choose an organization...</option>
                            <option 
                                v-for="org in adminOrganizations"
                                :key="org.entity?.id || org.id"
                                :value="org.entity?.id || org.id"
                                :disabled="(org.entity?.id || org.id) === organizationId"
                            >
                                {{ org.entity?.name || org.name }}
                                {{ (org.entity?.id || org.id) === organizationId ? ' (current)' : '' }}
                            </option>
                        </select>
                    </div>
                    
                    <div class="form-actions">
                        <ButtonComponent 
                            @click="moveToOrganization"
                            as="primary"
                            size="sm"
                            :disabled="!selectedOrgId || isLoading"
                        >
                            <PhCheck :size="16" />
                            {{ isLoading ? 'Moving...' : 'Move' }}
                        </ButtonComponent>
                        <ButtonComponent 
                            @click="cancelMove"
                            as="transparent"
                            size="sm"
                            :disabled="isLoading"
                        >
                            <PhX :size="16" />
                            Cancel
                        </ButtonComponent>
                    </div>
                </div>
            </div>
        </div>

        <!-- Help Text -->
        <div class="section">
            <div class="help-card">
                <h4>About Event Organization</h4>
                <ul>
                    <li><strong>Organization Level:</strong> Events at the organization level can be managed by any organization admin</li>
                    <li><strong>Team Level:</strong> Events assigned to teams can be managed by team admins and organization admins</li>
                    <li><strong>Moving Events:</strong> You can only move events to teams/organizations where you have admin access</li>
                    <li><strong>Permissions:</strong> Event permissions are inherited from the team or organization level</li>
                </ul>
            </div>
        </div>
    </div>
</template>

<style scoped>
.team-management {
    display: flex;
    flex-direction: column;
    gap: 32px;
}

.section {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.section h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: var(--text-primary);
}

/* Current Location */
.current-location {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.location-item {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 16px;
    background: var(--background-1);
    border: 1px solid var(--border);
    border-radius: 8px;
}

.location-item.no-team {
    background: var(--background-warning);
    border-color: var(--border-warning);
}

.location-icon {
    color: var(--text-secondary);
    flex-shrink: 0;
}

.location-details {
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1;
}

.location-label {
    font-size: 12px;
    color: var(--text-secondary);
    font-weight: 500;
}

.location-value {
    font-size: 14px;
    color: var(--text-primary);
    font-weight: 600;
}

.location-note {
    font-size: 12px;
    color: var(--text-tertiary);
    font-style: italic;
}

/* Action Cards */
.action-card {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 20px;
    background: var(--background-1);
    border: 1px solid var(--border);
    border-radius: 8px;
}

.action-info h4 {
    margin: 0 0 8px 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
}

.action-info p {
    margin: 0;
    font-size: 14px;
    color: var(--text-secondary);
    line-height: 1.5;
}

.action-buttons {
    display: flex;
    justify-content: flex-end;
}

/* Move Forms */
.move-form {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding-top: 16px;
    border-top: 1px solid var(--border);
}

.form-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.form-group label {
    font-size: 14px;
    font-weight: 500;
    color: var(--text-primary);
}

.team-select,
.org-select {
    padding: 8px 12px;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: var(--background-0);
    color: var(--text-primary);
    font-size: 14px;
}

.team-select:focus,
.org-select:focus {
    outline: none;
    border-color: var(--primary);
}

.form-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
}

/* Help Card */
.help-card {
    padding: 20px;
    background: var(--background-info);
    border: 1px solid var(--border-info);
    border-radius: 8px;
}

.help-card h4 {
    margin: 0 0 12px 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
}

.help-card ul {
    margin: 0;
    padding-left: 20px;
    color: var(--text-secondary);
    font-size: 14px;
    line-height: 1.6;
}

.help-card li {
    margin-bottom: 8px;
}

.help-card li:last-child {
    margin-bottom: 0;
}

@media (max-width: 768px) {
    .action-card {
        padding: 16px;
    }
    
    .form-actions {
        flex-direction: column;
    }
    
    .action-buttons {
        justify-content: stretch;
    }
}
</style>