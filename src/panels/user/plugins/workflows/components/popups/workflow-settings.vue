<!-- src/panels/user/plugins/workflows/components/popups/workflow-settings.vue -->
<script setup>
import { ref, computed, onMounted } from 'vue';
import PopupView from '@layouts/popup/view.vue';
import Button from '@form/button/view.vue';
import Input from '@form/input/view.vue';
import Textarea from '@form/textarea/view.vue';
import Select from '@form/select/view.vue';
import { WorkflowService } from '@user_workflows/services/workflow';

// Icons
import { PhFloppyDisk, PhX } from "@phosphor-icons/vue";

const props = defineProps({
    workflow: {
        type: Object,
        required: true
    },
    callback: {
        type: Function,
        required: true
    }
});

// State
const localData = ref({
    name: '',
    description: '',
    trigger_type: '',
    trigger_config: {}
});

const availableTriggers = ref([]);
const isSaving = ref(false);

// Initialize data
onMounted(async () => {
    // Copy workflow data
    localData.value = {
        name: props.workflow.name || '',
        description: props.workflow.description || '',
        trigger_type: props.workflow.trigger_type || '',
        trigger_config: props.workflow.trigger_config || {}
    };
    
    // Load available triggers
    try {
        const triggers = await WorkflowService.getAvailableTriggers();
        availableTriggers.value = triggers.map(trigger => ({
            label: trigger.name,
            value: trigger.id
        }));
    } catch (error) {
        console.error('Failed to load triggers:', error);
    }
});

// Computed
const selectedTrigger = computed(() => {
    return availableTriggers.value.find(t => t.value === localData.value.trigger_type);
});

const isValid = computed(() => {
    return localData.value.name.trim() && localData.value.trigger_type;
});

// Methods
async function save() {
    if (!isValid.value) {
        alert('Please fill in the workflow name and select a trigger');
        return;
    }
    
    isSaving.value = true;
    
    try {
        await props.callback({
            name: localData.value.name.trim(),
            description: localData.value.description.trim(),
            trigger_type: localData.value.trigger_type,
            trigger_config: localData.value.trigger_config
        });
    } finally {
        isSaving.value = false;
    }
}

function cancel() {
    const popup = document.querySelector('.i-popup-close');
    if (popup) popup.click();
}
</script>

<template>
    <PopupView title="Workflow Settings" class="workflow-settings-popup">
        <template #content>
            <div class="settings-content">
                <!-- Basic Information -->
                <div class="settings-section">
                    <h4>Basic Information</h4>
                    
                    <div class="form-field">
                        <label class="field-label">
                            Workflow Name
                            <span class="required">*</span>
                        </label>
                        <Input
                            v-model="localData.name"
                            placeholder="Enter workflow name"
                        />
                    </div>
                    
                    <div class="form-field">
                        <label class="field-label">Description</label>
                        <Textarea
                            v-model="localData.description"
                            placeholder="Describe what this workflow does..."
                            rows="3"
                        />
                    </div>
                </div>
                
                <!-- Trigger Configuration -->
                <div class="settings-section">
                    <h4>Trigger</h4>
                    <p class="section-description">
                        Choose when this workflow should run
                    </p>
                    
                    <div class="form-field">
                        <label class="field-label">
                            Trigger Type
                            <span class="required">*</span>
                        </label>
                        <Select
                            v-model="localData.trigger_type"
                            :options="availableTriggers"
                            placeholder="Select when this workflow should run"
                        />
                    </div>
                    
                    <!-- Trigger Info -->
                    <div v-if="selectedTrigger" class="trigger-info">
                        <div class="info-card">
                            <h5>{{ selectedTrigger.label }}</h5>
                            <p v-if="selectedTrigger.description">{{ selectedTrigger.description }}</p>
                            
                            <!-- Available Variables -->
                            <details class="variables-details">
                                <summary>Available Variables</summary>
                                <div class="variables-grid">
                                    <div class="variable-item">
                                        <code>{{booking.customer_email}}</code>
                                        <span>Customer's email</span>
                                    </div>
                                    <div class="variable-item">
                                        <code>{{booking.customer_name}}</code>
                                        <span>Customer's name</span>
                                    </div>
                                    <div class="variable-item">
                                        <code>{{event.name}}</code>
                                        <span>Event name</span>
                                    </div>
                                    <div class="variable-item">
                                        <code>{{organization.name}}</code>
                                        <span>Organization name</span>
                                    </div>
                                </div>
                            </details>
                        </div>
                    </div>
                </div>
                
                <!-- Workflow Status Info -->
                <div class="settings-section">
                    <h4>Status</h4>
                    <div class="status-info">
                        <div class="status-item">
                            <span class="status-label">Current Status:</span>
                            <span :class="['status-badge', props.workflow.status]">
                                {{ props.workflow.status }}
                            </span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">Steps:</span>
                            <span class="status-value">
                                {{ props.workflow.flow_data?.steps?.length || 0 }} configured
                            </span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">Last Updated:</span>
                            <span class="status-value">
                                {{ new Date(props.workflow.updated_at).toLocaleDateString() }}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </template>
        
        <template #footer>
            <div class="settings-actions">
                <Button
                    as="tertiary"
                    :iconLeft="{ component: PhX }"
                    label="Cancel"
                    @click="cancel"
                />
                <Button
                    :iconLeft="{ component: PhFloppyDisk }"
                    label="Save Settings"
                    :loading="isSaving"
                    :disabled="!isValid"
                    @click="save"
                />
            </div>
        </template>
    </PopupView>
</template>

<style scoped>
.workflow-settings-popup {
    min-width: 600px;
}

.settings-content {
    padding: 20px;
}

.settings-section {
    margin-bottom: 32px;
    padding-bottom: 24px;
    border-bottom: 1px solid var(--border);
}

.settings-section:last-child {
    border-bottom: none;
    margin-bottom: 0;
}

.settings-section h4 {
    margin: 0 0 8px 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
}

.section-description {
    margin: 0 0 16px 0;
    font-size: 13px;
    color: var(--text-secondary);
}

.form-field {
    margin-bottom: 20px;
}

.field-label {
    display: block;
    font-size: 14px;
    font-weight: 500;
    color: var(--text-primary);
    margin-bottom: 8px;
}

.required {
    color: var(--error);
}

.trigger-info {
    margin-top: 16px;
}

.info-card {
    background: var(--background-1);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: 16px;
}

.info-card h5 {
    margin: 0 0 8px 0;
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
}

.info-card p {
    margin: 0 0 16px 0;
    font-size: 13px;
    color: var(--text-secondary);
}

.variables-details {
    cursor: pointer;
}

.variables-details summary {
    font-size: 13px;
    font-weight: 500;
    color: var(--text-primary);
    margin-bottom: 8px;
}

.variables-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 8px;
    margin-top: 8px;
}

.variable-item {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 8px 12px;
    background: var(--background-2);
    border-radius: var(--radius-sm);
    font-size: 12px;
}

.variable-item code {
    font-family: monospace;
    color: var(--primary);
    font-weight: 500;
}

.variable-item span {
    color: var(--text-secondary);
}

.status-info {
    background: var(--background-1);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: 16px;
}

.status-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
}

.status-item:last-child {
    margin-bottom: 0;
}

.status-label {
    font-size: 13px;
    color: var(--text-secondary);
    font-weight: 500;
}

.status-value {
    font-size: 13px;
    color: var(--text-primary);
}

.status-badge {
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
}

.status-badge.active {
    background: var(--green-fill);
    color: var(--green-default);
}

.status-badge.inactive {
    background: var(--orange-fill);
    color: var(--orange-default);
}

.status-badge.draft {
    background: var(--background-2);
    color: var(--text-secondary);
}

.settings-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    padding: 16px 20px;
    border-top: 1px solid var(--border);
}
</style>