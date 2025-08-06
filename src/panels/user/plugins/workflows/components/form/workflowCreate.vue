<!-- src/panels/user/plugins/workflows/components/form/workflowCreate.vue -->
<script setup>
import { ref, computed, onMounted } from 'vue';
import { UserStore } from '@stores/user';
import { WorkflowService } from '@user_workflows/services/workflow';
import { common } from '@utils/common';
import { popup } from '@utils/popup';

import BuilderPopup from '@/components/builder/popup/view.vue';

const props = defineProps({
    callback: {
        type: Function,
        required: true
    }
});

const userStore = UserStore();

// Available triggers (we'll load from API)
const availableTriggers = ref([]);

// Get user organizations
const userOrganizations = computed(() => {
    const orgs = userStore.getOrganizations() || [];
    return orgs.map(org => ({
        label: org.entity?.name || 'Unknown Organization',
        value: org.entity?.id
    }));
});

// Form configuration
const tabs = computed(() => [
    {
        title: 'Create Workflow',
        components: [
            {
                label: 'Organization',
                type: 'Select',
                name: 'organization_id',
                width: 12,
                properties: {
                    placeholder: 'Select organization',
                    options: userOrganizations.value,
                    required: true
                }
            },
            {
                label: 'Workflow Name',
                type: 'Input',
                name: 'name',
                width: 12,
                properties: {
                    placeholder: 'Enter workflow name',
                    required: true
                }
            },
            {
                label: 'Description',
                type: 'Textarea',
                name: 'description',
                width: 12,
                properties: {
                    placeholder: 'Describe what this workflow does (optional)',
                    rows: 3
                }
            },
            {
                label: 'Trigger',
                type: 'Select',
                name: 'trigger_type',
                width: 12,
                properties: {
                    placeholder: 'Select when this workflow should run',
                    options: availableTriggers.value,
                    required: true
                }
            }
        ]
    }
]);

// Default values
const defaultValues = () => ({
    organization_id: userOrganizations.value.length > 0 ? userOrganizations.value[0].value : null,
    name: '',
    description: '',
    trigger_type: '',
    trigger_config: {},
    flow_data: WorkflowService.getDefaultWorkflow(),
    status: 'draft'
});

// Handle form submission
async function handleSubmit(formData) {
    try {
        const response = await WorkflowService.createWorkflow(formData);
        
        if (response && response.success) {
            common.notification('Workflow created successfully', true);
            if (props.callback) {
                props.callback(response, true);
            }
            popup.close();
        } else {
            common.notification(response?.message || 'Failed to create workflow', false);
        }
    } catch (error) {
        console.error('Error creating workflow:', error);
        common.notification('An error occurred while creating the workflow', false);
    }
}

// Load available triggers
onMounted(async () => {
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
</script>

<template>
    <BuilderPopup
        title="Create Workflow"
        :tabs="tabs"
        :values="defaultValues"
        :callback="handleSubmit"
    />
</template>