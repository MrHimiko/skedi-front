<template>
    <div class="routing-config">
        <!-- Enable Routing -->
        <div class="routing-header">
            <ToggleComponent
                :value="routingEnabled"
                label="Enable AI Routing"
                @update:value="saveRouting"
            />
            
        </div>

        <!-- Main Content (only shown when enabled) -->
        <div v-if="routingEnabled" class="routing-content">
            
            <!-- AI Instructions -->
            <div class="instructions-section">
                <label class="field-label">
                    Routing Instructions
                    <span class="required">*</span>
                </label>
                <textarea
                    v-model="routingInstructions"
                    @blur="saveRouting"
                    placeholder="Describe how to route bookings to your team members. Be specific about rules and preferences.

Examples:
- Send all enterprise clients (companies with 500+ employees) to John
- Route European timezone customers to Klaus
- Healthcare and medical companies should always go to Sarah
- If someone mentions 'urgent' or 'ASAP', assign to senior team members
- Technical API questions go to Tom
- New startups and small businesses go to junior team for onboarding"
                    class="instructions-textarea"
                    rows="10"
                />
            </div>

            <!-- Current Team Members -->
            <div class="assignees-section">
                <label class="field-label">
                    Team Members ({{ assignees.length }})
                </label>
                <div v-if="assignees.length > 0" class="assignees-grid">
                    <div 
                        v-for="assignee in assignees" 
                        :key="assignee.id"
                        class="assignee-card"
                    >
                        <div class="assignee-avatar">
                            {{ getInitials(assignee.user.name) }}
                        </div>
                        <div class="assignee-details">
                            <div class="assignee-name">{{ assignee.user.name }}</div>
                            <div class="assignee-email">{{ assignee.user.email }}</div>
                            <div class="assignee-role">{{ formatRole(assignee.role) }}</div>
                        </div>
                    </div>
                </div>
                <div v-else class="no-assignees">
                    No team members assigned yet. 
                    <router-link :to="`/events/${eventId}/hosts`">Add team members</router-link>
                </div>
            </div>

            <!-- Save Status -->
            <div v-if="saveStatus" class="save-status">
                <PhCheckCircle v-if="saveStatus === 'success'" :size="16" />
                <PhSpinner v-else-if="saveStatus === 'saving'" :size="16" class="spinning" />
                {{ saveStatus === 'success' ? 'Saved' : 'Saving...' }}
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { api } from '@utils/api';
import { common } from '@utils/common';
import ToggleComponent from '@form/toggle/view.vue';
import { PhCheckCircle, PhSpinner } from '@phosphor-icons/vue';

const props = defineProps({
    eventId: {
        type: Number,
        required: true
    },
    organizationId: {
        type: Number,
        required: true
    }
});

// Data
const routingEnabled = ref(false);
const routingInstructions = ref('');
const assignees = ref([]);
const saveStatus = ref(null);
let saveTimeout = null;

// Load event data and assignees
onMounted(async () => {
    // Load event routing config
    try {
        const eventResponse = await api.get(`events/${props.eventId}?organization_id=${props.organizationId}`);
        if (eventResponse.success && eventResponse.data) {
            routingEnabled.value = eventResponse.data.routing_enabled || false;
            routingInstructions.value = eventResponse.data.routing_instructions || '';
        }
    } catch (error) {
        console.error('Failed to load event:', error);
    }

    // Load assignees
    try {
        const assigneesResponse = await api.get(`events/${props.eventId}/assignees?organization_id=${props.organizationId}`);
        if (assigneesResponse.success && assigneesResponse.data) {
            assignees.value = assigneesResponse.data;
        }
    } catch (error) {
        console.error('Failed to load assignees:', error);
    }
});

// Save routing configuration
async function saveRouting(value) {
    // Update local value if toggle changed
    if (typeof value === 'boolean') {
        routingEnabled.value = value;
    }

    // Clear previous timeout
    if (saveTimeout) {
        clearTimeout(saveTimeout);
    }

    saveStatus.value = 'saving';

    try {
        const response = await api.put(`events/${props.eventId}`, {
            routingEnabled: routingEnabled.value,  
            routingInstructions: routingInstructions.value, 
            routingFallback: 'round_robin',  
            organization_id: props.organizationId
        });

        if (response.success) {
            saveStatus.value = 'success';
            // Hide status after 2 seconds
            saveTimeout = setTimeout(() => {
                saveStatus.value = null;
            }, 2000);
        } else {
            common.notification('Failed to save routing configuration', false);
            saveStatus.value = null;
        }
    } catch (error) {
        console.error('Error saving routing:', error);
        common.notification('Failed to save routing configuration', false);
        saveStatus.value = null;
    }
}

// Get initials for avatar
function getInitials(name) {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
}

// Format role for display
function formatRole(role) {
    const roles = {
        'creator': 'Creator',
        'admin': 'Admin',
        'host': 'Host',
        'member': 'Member'
    };
    return roles[role] || role;
}
</script>

<style scoped>


.routing-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px;
    background: var(--bg-secondary);
    border-radius: 8px;
    margin-bottom: 24px;
}


.routing-content {
    display: flex;
    flex-direction: column;
    gap: 32px;
}

.field-label {
    display: block;
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 8px;
}

.required {
    color: #ef4444;
}

.instructions-textarea {
    width: 100%;
    padding: 14px;
    border: 1px solid var(--border);
    border-radius: 8px;
    font-size: 14px;
    line-height: 1.6;
    resize: vertical;
    min-height: 200px;
    background: var(--bg-primary);
    color: var(--text-primary);
    transition: border-color 0.2s;
}

.instructions-textarea:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(var(--primary-rgb), 0.1);
}

.instructions-textarea::placeholder {
    color: var(--text-tertiary);
}

.assignees-section {
    background: var(--bg-secondary);
    padding: 20px;
    border-radius: 8px;
}

.assignees-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 12px;
}

.assignee-card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    background: var(--bg-primary);
    border: 1px solid var(--border);
    border-radius: 6px;
}

.assignee-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: var(--primary);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 14px;
    flex-shrink: 0;
}

.assignee-details {
    flex: 1;
    min-width: 0;
}

.assignee-name {
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 2px;
}

.assignee-email {
    font-size: 13px;
    color: var(--text-secondary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.assignee-role {
    font-size: 12px;
    color: var(--text-tertiary);
    margin-top: 4px;
}

.no-assignees {
    padding: 20px;
    text-align: center;
    color: var(--text-secondary);
}

.no-assignees a {
    color: var(--primary);
    text-decoration: none;
    font-weight: 500;
}

.save-status {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    color: var(--text-secondary);
}

.save-status svg {
    color: #10b981;
}

.spinning {
    animation: spin 1s linear infinite;
}

@keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
}
</style>