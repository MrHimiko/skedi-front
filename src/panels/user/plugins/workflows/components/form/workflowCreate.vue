<!-- src/panels/user/plugins/workflows/components/form/workflowCreate.vue -->
<script setup>
import { ref, computed, onMounted } from 'vue';
import { UserStore } from '@stores/user';
import { WorkflowService } from '@user_workflows/services/workflow';
import { common } from '@utils/common';
import { popup } from '@utils/popup';

import PopupView from '@layouts/popup/view.vue';
import Button from '@form/button/view.vue';
import InputComponent from '@form/input/view.vue';
import SelectComponent from '@form/select/view.vue';

const props = defineProps({
    callback: {
        type: Function,
        required: true
    },
    preselectedOrganizationId: {
        type: [String, Number],
        default: null
    }
});

const userStore = UserStore();

// State
const workflowName = ref('');
const organizationId = ref('');
const triggerType = ref('');
const showOrgSelection = ref(true);
const isSubmitting = ref(false);
const availableTriggers = ref([]);
const isLoadingTriggers = ref(true);

// Trigger options for SelectComponent
const triggerOptions = computed(() => {
    if (!availableTriggers.value || availableTriggers.value.length === 0) {
        return [];
    }
    
    return availableTriggers.value.map(trigger => ({
        label: trigger.name,
        value: trigger.id
    }));
});

// Set preselected organization if provided
onMounted(async () => {
    if (props.preselectedOrganizationId) {
        organizationId.value = props.preselectedOrganizationId.toString();
        showOrgSelection.value = false;
    }
    
    // Load triggers
    await loadTriggers();
});

// Load available triggers
async function loadTriggers() {
    try {
        isLoadingTriggers.value = true;
        const triggers = await WorkflowService.getAvailableTriggers();
        availableTriggers.value = triggers;
    } catch (error) {
        console.error('Failed to load triggers:', error);
        common.notification('Failed to load workflow triggers', false);
    } finally {
        isLoadingTriggers.value = false;
    }
}

// Format organizations for select dropdown
const orgOptions = computed(() => {
    try {
        const orgsData = userStore.getOrganizations();
        if (!orgsData) return [];
        
        const orgArray = Array.isArray(orgsData.target) ? orgsData.target :
                        Array.isArray(orgsData) ? orgsData :
                        orgsData.value ? orgsData.value : [];
        
        return orgArray.map(org => ({
            label: org.entity?.name || org.name || 'Unknown Organization',
            value: (org.entity?.id || org.id)?.toString()
        }));
    } catch (error) {
        console.error('Error formatting organizations:', error);
        return [];
    }
});

// Handle input changes
const updateWorkflowName = (event, value) => {
    workflowName.value = value;
};

const updateOrganization = (value) => {
    organizationId.value = value;
};

const updateTrigger = (value) => {
    triggerType.value = value;
};

// Handle form submission
async function handleCreate() {
    // Validation with helpful error messages
    if (!workflowName.value || !workflowName.value.trim()) {
        common.notification('Please enter a workflow name', false);
        return;
    }
    
    if (!organizationId.value) {
        common.notification('Please select an organization', false);
        return;
    }
    
    if (!triggerType.value) {
        common.notification('Please select a trigger', false);
        return;
    }
    
    isSubmitting.value = true;
    
    try {
        const workflowData = {
            name: workflowName.value.trim(),
            description: '',
            organization_id: parseInt(organizationId.value),
            trigger_type: triggerType.value,
            trigger_config: {},
            flow_data: { steps: [] },
            status: 'draft'
        };
        
        const response = await WorkflowService.createWorkflow(workflowData);
        
        if (response && response.success) {
            common.notification('Workflow created successfully', true);
            
            // Call callback with response and success flag
            if (props.callback) {
                props.callback(response, true);
            }
            
            // Close the popup
            popup.close();
        } else {
            common.notification('Failed to create workflow: ' + (response?.message || 'Unknown error'), false);
        }
    } catch (error) {
        console.error('Error creating workflow:', error);
        common.notification('Error creating workflow: ' + (error.message || 'Unknown error'), false);
    } finally {
        isSubmitting.value = false;
    }
}

// Handle cancel
function handleCancel() {
    popup.close();
}
</script>

<template>
    <PopupView title="Create Workflow" customClass="h-auto workflow-create">
        <template #content>
            <div class="create-workflow-form">
                <!-- Organization Selection (if not preselected) -->
                <div class="form-group" v-if="showOrgSelection">
                    <SelectComponent
                        label="Organization"
                        placeholder="Select organization"
                        :options="orgOptions"
                        :value="organizationId"
                        :required="true"
                        @change="updateOrganization"
                    />
                </div>

                <!-- Workflow Name -->
                <div class="form-group">
                    <InputComponent
                        label="Workflow Name"
                        placeholder="Enter workflow name"
                        :value="workflowName"
                        :required="true"
                        @onInput="updateWorkflowName"
                    />
                </div>

                <!-- Trigger Selection -->
                <div class="form-group">
                    <SelectComponent
                        label="Trigger"
                        :placeholder="isLoadingTriggers ? 'Loading triggers...' : 'Select when this workflow should run'"
                        :options="triggerOptions"
                        :value="triggerType"
                        v-model="triggerType"
                        :required="true"
                        :disabled="isLoadingTriggers"
                        :key="triggerOptions.length"
                        @change="updateTrigger"
                    />
                    <p class="help-text">Choose what event will trigger this workflow to run</p>
                </div>

                <!-- Buttons -->
                <div class="form-navigation">
                    <Button
                        label="Cancel"
                        as="secondary"
                        @click="handleCancel"
                        :disabled="isSubmitting"
                    />
                    
                    <Button
                        :label="isSubmitting ? 'Creating...' : 'Create Workflow'"
                        @click="handleCreate"
                        :disabled="isSubmitting"
                    />
                </div>
            </div>
        </template>
    </PopupView>
</template>

<style scoped>
.create-workflow-form {
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.form-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.help-text {
    font-size: 13px;
    color: var(--text-tertiary);
    margin-top: 4px;
}

.form-navigation {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    margin-top: 20px;
    padding-top: 20px;
    border-top: 1px solid var(--border-primary);
}
</style>