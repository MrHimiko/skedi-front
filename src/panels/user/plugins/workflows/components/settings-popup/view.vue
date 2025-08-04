<!-- src/panels/user/plugins/workflows/components/settings-popup/view.vue -->
<script setup>
import { ref, watch } from 'vue';
import BuilderPopupComponent from '@/components/builder/popup/view.vue';

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

// Create reactive copy of workflow data
const workflowData = ref({
    name: props.workflow.name || '',
    description: props.workflow.description || '',
    trigger_type: props.workflow.trigger_type || '',
    trigger_config: props.workflow.trigger_config || {}
});

// Dynamic trigger config based on trigger type
const triggerConfigFields = ref([]);

// Available triggers
const availableTriggers = [
    { label: 'Booking Created', value: 'booking.created' },
    { label: 'Booking Confirmed', value: 'booking.confirmed' },
    { label: 'Booking Cancelled', value: 'booking.cancelled' },
    { label: 'Booking Reminder', value: 'booking.reminder' },
    { label: 'Event Created', value: 'event.created' },
    { label: 'Event Updated', value: 'event.updated' },
    { label: 'Event Deleted', value: 'event.deleted' },
    { label: 'Webhook', value: 'webhook' },
    { label: 'Schedule', value: 'schedule' }
];

// Update config fields when trigger type changes
watch(() => workflowData.value.trigger_type, (newType) => {
    switch (newType) {
        case 'webhook':
            triggerConfigFields.value = [
                {
                    label: 'Webhook Secret',
                    type: 'Input',
                    name: 'webhook_secret',
                    width: 12,
                    properties: {
                        placeholder: 'Enter webhook secret key',
                        type: 'password'
                    }
                }
            ];
            break;
            
        case 'schedule':
            triggerConfigFields.value = [
                {
                    label: 'Schedule Type',
                    type: 'Select',
                    name: 'schedule_type',
                    width: 6,
                    properties: {
                        options: [
                            { label: 'Interval', value: 'interval' },
                            { label: 'Cron', value: 'cron' },
                            { label: 'Daily', value: 'daily' },
                            { label: 'Weekly', value: 'weekly' },
                            { label: 'Monthly', value: 'monthly' }
                        ]
                    }
                },
                {
                    label: 'Interval (minutes)',
                    type: 'Input',
                    name: 'interval_minutes',
                    width: 6,
                    condition: (values) => values.trigger_config?.schedule_type === 'interval',
                    properties: {
                        type: 'number',
                        placeholder: 'e.g., 60'
                    }
                },
                {
                    label: 'Cron Expression',
                    type: 'Input',
                    name: 'cron_expression',
                    width: 12,
                    condition: (values) => values.trigger_config?.schedule_type === 'cron',
                    properties: {
                        placeholder: '* * * * *'
                    }
                },
                {
                    label: 'Time',
                    type: 'Input',
                    name: 'time',
                    width: 6,
                    condition: (values) => ['daily', 'weekly', 'monthly'].includes(values.trigger_config?.schedule_type),
                    properties: {
                        type: 'time'
                    }
                },
                {
                    label: 'Day of Week',
                    type: 'Select',
                    name: 'day_of_week',
                    width: 6,
                    condition: (values) => values.trigger_config?.schedule_type === 'weekly',
                    properties: {
                        options: [
                            { label: 'Monday', value: '1' },
                            { label: 'Tuesday', value: '2' },
                            { label: 'Wednesday', value: '3' },
                            { label: 'Thursday', value: '4' },
                            { label: 'Friday', value: '5' },
                            { label: 'Saturday', value: '6' },
                            { label: 'Sunday', value: '0' }
                        ]
                    }
                },
                {
                    label: 'Day of Month',
                    type: 'Input',
                    name: 'day_of_month',
                    width: 6,
                    condition: (values) => values.trigger_config?.schedule_type === 'monthly',
                    properties: {
                        type: 'number',
                        placeholder: '1-31',
                        min: 1,
                        max: 31
                    }
                }
            ];
            break;
            
        case 'booking.reminder':
            triggerConfigFields.value = [
                {
                    label: 'Reminder Time',
                    type: 'Select',
                    name: 'reminder_time',
                    width: 6,
                    properties: {
                        options: [
                            { label: '15 minutes before', value: '15' },
                            { label: '30 minutes before', value: '30' },
                            { label: '1 hour before', value: '60' },
                            { label: '2 hours before', value: '120' },
                            { label: '1 day before', value: '1440' },
                            { label: '2 days before', value: '2880' }
                        ]
                    }
                }
            ];
            break;
            
        default:
            triggerConfigFields.value = [];
    }
});

// Initialize fields if trigger type is already set
if (workflowData.value.trigger_type) {
    watch(() => workflowData.value.trigger_type, () => {}, { immediate: true });
}

const tabs = [
    {
        title: 'General',
        components: [
            {
                label: 'Workflow Name',
                type: 'Input',
                width: 12,
                name: 'name',
                properties: {
                    placeholder: 'Enter workflow name',
                    required: true
                }
            },
            {
                label: 'Description',
                type: 'Textarea',
                width: 12,
                name: 'description',
                properties: {
                    placeholder: 'Describe what this workflow does...',
                    rows: 3
                }
            }
        ]
    },
    {
        title: 'Trigger',
        components: [
            {
                label: 'Trigger Type',
                type: 'Select',
                width: 12,
                name: 'trigger_type',
                properties: {
                    placeholder: 'Select a trigger',
                    options: availableTriggers,
                    required: true
                }
            },
            ...triggerConfigFields
        ]
    }
];

// Handle form submission
function handleSubmit(data) {
    // Merge the form data back into workflow format
    const updatedWorkflow = {
        name: data.name,
        description: data.description,
        trigger_type: data.trigger_type,
        trigger_config: {}
    };
    
    // Extract trigger config fields
    Object.keys(data).forEach(key => {
        if (key.startsWith('trigger_config.') || 
            ['webhook_secret', 'schedule_type', 'interval_minutes', 'cron_expression', 
             'time', 'day_of_week', 'day_of_month', 'reminder_time'].includes(key)) {
            updatedWorkflow.trigger_config[key] = data[key];
        }
    });
    
    props.callback(updatedWorkflow);
}
</script>

<template>
    <BuilderPopupComponent
        :tabs="tabs"
        :values="() => workflowData"
        :callback="handleSubmit"
        title="Workflow Settings"
    />
</template>