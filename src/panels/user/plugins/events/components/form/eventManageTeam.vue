<script setup>
import { ref, onMounted, computed } from 'vue';
import { api } from '@utils/api';
import { common } from '@utils/common';
import PopupView from '@layouts/popup/view.vue';
import SelectComponent from '@form/select/view.vue';
import ButtonComponent from '@form/button/view.vue';
import { PhUsers } from "@phosphor-icons/vue";
import { UserStore } from '@stores/user';
import { mergeOrganizationsAndTeams } from '@user_shared/utils/js/organization-structure.js';

const props = defineProps({
    eventId: {
        type: [String, Number],
        required: true
    },
    organizationId: {
        type: [String, Number],
        required: true
    },
    values: {
        type: Function
    },
    callback: {
        type: Function
    }
});

// State management
const userStore = UserStore();
const isLoading = ref(false);
const isSubmitting = ref(false);
const selectedTeamId = ref('');
const teams = ref([]);
const errorMessage = ref('');

// Get current event data
const eventData = computed(() => props.values?.() || {});

// Function to flatten teams hierarchy
function flattenTeams(teams, level = 0, parentName = '') {
    let flattened = [];
    
    teams.forEach(team => {
        // Add the current team with indentation
        flattened.push({
            id: team.id,
            name: team.name,
            displayName: '　'.repeat(level) + (level > 0 ? '└ ' : '') + team.name,
            level: level,
            parentName: parentName
        });
        
        // Recursively add sub-teams
        if (team.teams && team.teams.length > 0) {
            flattened = flattened.concat(
                flattenTeams(team.teams, level + 1, team.name)
            );
        }
    });
    
    return flattened;
}

// Compute team options for select
const teamOptions = computed(() => {
    return teams.value.map(team => ({
        label: team.displayName,
        value: team.id.toString()
    }));
});

// Check if organization has teams
const hasTeams = computed(() => teams.value.length > 0);

// Load teams from user store
onMounted(() => {
    try {
        // Get merged organizations and teams data
        const organizations = mergeOrganizationsAndTeams();
        
        // Find the current organization
        const currentOrg = organizations.find(org => org.id === parseInt(props.organizationId));
        
        if (currentOrg && currentOrg.teams) {
            // Get all teams (top-level only, sub-teams are nested inside)
            const topLevelTeams = currentOrg.teams.filter(team => !team.parent_team_id);
            
            // Flatten the teams hierarchy for display
            teams.value = flattenTeams(topLevelTeams);
            
            // Set current team if event has one
            // Check both teamId and team_id fields
            const currentTeamId = eventData.value.teamId || eventData.value.team_id;
            if (currentTeamId) {
                selectedTeamId.value = currentTeamId.toString();
            }
            
            console.log('Event data:', eventData.value);
            console.log('Current team ID:', currentTeamId);
            console.log('Loaded teams:', teams.value);
        } else {
            console.log('No teams found for organization:', props.organizationId);
        }
    } catch (error) {
        console.error('Error loading teams:', error);
        errorMessage.value = 'Error loading teams';
    }
});

// Handle team selection change
const handleTeamChange = (value) => {
    selectedTeamId.value = value;
};

// Handle form submission
const handleSubmit = async () => {
    try {
        isSubmitting.value = true;
        
        // Prepare update data
        const updateData = {
            team_id: selectedTeamId.value ? parseInt(selectedTeamId.value) : null
        };
        
        console.log('Updating event team with data:', updateData);
        
        // Call API to update the event
        const response = await api.put(`events/${props.eventId}?organization_id=${props.organizationId}`, updateData);
        
        if (response && response.success) {
            common.notification('Team updated successfully!', true);
            
            // Call the callback if provided
            if (props.callback) {
                props.callback(null, updateData, response, true);
            }
            
            // Close popup
            document.querySelector('.i-popup-close')?.click();
        } else {
            common.notification('Failed to update team: ' + (response?.message || 'Unknown error'), false);
        }
    } catch (error) {
        console.error('API error:', error);
        common.notification('Error updating team: ' + (error.message || 'Unknown error'), false);
    } finally {
        isSubmitting.value = false;
    }
};

// Navigate to teams page
const goToTeams = () => {
    window.location.href = '/teams';
};
</script>

<template>
    <PopupView title="Manage Team" customClass="h-auto manage-team-popup">
        <template #content>
            <div class="form-section">
                <!-- Loading state -->
                <div v-if="isLoading" class="loading-state">
                    <p>Loading teams...</p>
                </div>
                
                <!-- Error state -->
                <div v-else-if="errorMessage" class="error-state">
                    <p class="error-message">{{ errorMessage }}</p>
                </div>
                
                <!-- Teams available -->
                <div v-else-if="hasTeams" class="team-select-section">
                    <SelectComponent
                        label="Select Team"
                        :options="teamOptions"
                        :value="selectedTeamId"
                        placeholder="Select a team for this event"
                        @change="handleTeamChange"
                    />
                    
                    <p class="helper-text">
                        Events can be assigned to teams to organize them better
                    </p>
                    
                    <div class="form-actions">
                        <ButtonComponent
                            as="primary"
                            label="Update Team"
                            :disabled="isSubmitting"
                            @click="handleSubmit"
                        />
                    </div>
                </div>
                
                <!-- No teams state -->
                <div v-else class="no-teams-state">
                    <div class="empty-state-content">
                        <PhUsers size="48" weight="thin" />
                        <p>You have no teams under this organization</p>
                        <ButtonComponent
                            as="secondary"
                            label="Manage teams"
                            @click="goToTeams"
                        />
                    </div>
                </div>
            </div>
        </template>
    </PopupView>
</template>

<style scoped>
.manage-team-popup {
    max-width: 500px;
}

.form-section {
    padding: 20px 0;
}

.loading-state, .error-state {
    text-align: center;
    padding: 40px 20px;
}

.error-message {
    color: var(--red-default);
}

.team-select-section {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.helper-text {
    font-size: 13px;
    color: var(--text-secondary);
    margin: 0;
}

.form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    margin-top: 20px;
}

.no-teams-state {
    padding: 40px 20px;
}

.empty-state-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    text-align: center;
}

.empty-state-content svg {
    color: var(--text-tertiary);
}

.empty-state-content p {
    color: var(--text-secondary);
    font-size: 14px;
    margin: 0;
}
</style>