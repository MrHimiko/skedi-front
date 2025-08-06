<!-- src/panels/user/plugins/workflows/components/form/workflowCreate.vue -->
<script setup>
import { ref, computed } from 'vue';
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

// Get user organizations
const userOrganizations = computed(() => {
    const orgs = userStore.getOrganizations() || [];
    return orgs.map(org => ({
        label: org.entity?.name || 'Unknown Organization',
        value: org.entity?.id
    }));
});

// Available triggers
const availableTriggers = [
    { label: 'Booking Created', value: 'booking.created' },
    { label: 'Booking Updated', value: 'booking.updated' },
    { label: 'Booking Cancelled', value: 'booking.cancelled' },
    { label: 'Booking Reminder', value: 'booking.reminder' },
    { label: 'Form Submitted', value: 'form.submitted' },
    { label: 'Scheduled Time', value: 'time.scheduled' }
];

// Form configuration
const tabs = [
    {
        title: 'General',
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
                    options: availableTriggers,
                    required: true
                }
            }
        ]
    }
];

// Default values
const defaultValues = () => ({
    organization_id: userOrganizations.value.length > 0 ? userOrganizations.value[0].value : null,
    name: '',
    description: '',
    trigger_type: 'booking.created',
    trigger_config: {},
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
</script>

<template>
    <BuilderPopup
        title="Create Workflow"
        :tabs="tabs"
        :values="defaultValues"
        :callback="handleSubmit"
    />
</template>