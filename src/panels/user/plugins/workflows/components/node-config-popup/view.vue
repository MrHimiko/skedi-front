<!-- src/panels/user/plugins/workflows/components/node-config-popup/view.vue -->
<script setup>
import { ref, computed, watch } from 'vue';
import BuilderPopupComponent from '@/components/builder/popup/view.vue';

const props = defineProps({
    node: {
        type: Object,
        required: true
    },
    nodeType: {
        type: String,
        required: true
    },
    callback: {
        type: Function,
        required: true
    }
});

// Node configuration data
const nodeConfig = ref({
    ...props.node.config
});

// Get configuration fields based on node action type
const configFields = computed(() => {
    switch (props.node.action_type) {
        case 'send_email':
            return [
                {
                    label: 'To Email',
                    type: 'Input',
                    name: 'to_email',
                    width: 12,
                    properties: {
                        placeholder: 'recipient@example.com or {{booking.email}}',
                        type: 'email'
                    }
                },
                {
                    label: 'Subject',
                    type: 'Input',
                    name: 'subject',
                    width: 12,
                    properties: {
                        placeholder: 'Email subject'
                    }
                },
                {
                    label: 'Email Template',
                    type: 'Select',
                    name: 'template',
                    width: 12,
                    properties: {
                        options: [
                            { label: 'Booking Confirmation', value: 'booking_confirmation' },
                            { label: 'Booking Reminder', value: 'booking_reminder' },
                            { label: 'Booking Cancellation', value: 'booking_cancellation' },
                            { label: 'Custom HTML', value: 'custom' }
                        ]
                    }
                },
                {
                    label: 'Email Body',
                    type: 'Textarea',
                    name: 'body',
                    width: 12,
                    condition: (values) => values.template === 'custom',
                    properties: {
                        placeholder: 'Email body (HTML supported)',
                        rows: 6
                    }
                }
            ];
            
        case 'send_sms':
            return [
                {
                    label: 'To Phone',
                    type: 'Input',
                    name: 'to_phone',
                    width: 12,
                    properties: {
                        placeholder: '+1234567890 or {{booking.phone}}',
                        type: 'tel'
                    }
                },
                {
                    label: 'Message',
                    type: 'Textarea',
                    name: 'message',
                    width: 12,
                    properties: {
                        placeholder: 'SMS message content',
                        rows: 3,
                        maxlength: 160
                    }
                }
            ];
            
        case 'webhook':
            return [
                {
                    label: 'URL',
                    type: 'Input',
                    name: 'url',
                    width: 12,
                    properties: {
                        placeholder: 'https://api.example.com/webhook',
                        type: 'url'
                    }
                },
                {
                    label: 'Method',
                    type: 'Select',
                    name: 'method',
                    width: 6,
                    properties: {
                        options: [
                            { label: 'POST', value: 'POST' },
                            { label: 'GET', value: 'GET' },
                            { label: 'PUT', value: 'PUT' },
                            { label: 'PATCH', value: 'PATCH' },
                            { label: 'DELETE', value: 'DELETE' }
                        ]
                    }
                },
                {
                    label: 'Headers',
                    type: 'Textarea',
                    name: 'headers',
                    width: 12,
                    properties: {
                        placeholder: 'JSON format: {"Authorization": "Bearer token"}',
                        rows: 3
                    }
                },
                {
                    label: 'Body',
                    type: 'Textarea',
                    name: 'body',
                    width: 12,
                    condition: (values) => ['POST', 'PUT', 'PATCH'].includes(values.method),
                    properties: {
                        placeholder: 'Request body (JSON)',
                        rows: 4
                    }
                }
            ];
            
        case 'update_booking':
            return [
                {
                    label: 'Update Status',
                    type: 'Select',
                    name: 'status',
                    width: 6,
                    properties: {
                        options: [
                            { label: 'Confirmed', value: 'confirmed' },
                            { label: 'Pending', value: 'pending' },
                            { label: 'Cancelled', value: 'cancelled' },
                            { label: 'Completed', value: 'completed' }
                        ]
                    }
                },
                {
                    label: 'Add Note',
                    type: 'Textarea',
                    name: 'note',
                    width: 12,
                    properties: {
                        placeholder: 'Optional note to add to booking',
                        rows: 2
                    }
                }
            ];
            
        case 'delay':
            return [
                {
                    label: 'Delay Type',
                    type: 'Select',
                    name: 'delay_type',
                    width: 6,
                    properties: {
                        options: [
                            { label: 'Minutes', value: 'minutes' },
                            { label: 'Hours', value: 'hours' },
                            { label: 'Days', value: 'days' }
                        ]
                    }
                },
                {
                    label: 'Duration',
                    type: 'Input',
                    name: 'duration',
                    width: 6,
                    properties: {
                        type: 'number',
                        placeholder: 'e.g., 5',
                        min: 1
                    }
                }
            ];
            
        case 'if':
            return [
                {
                    label: 'Variable',
                    type: 'Input',
                    name: 'variable',
                    width: 6,
                    properties: {
                        placeholder: 'e.g., {{booking.status}}'
                    }
                },
                {
                    label: 'Operator',
                    type: 'Select',
                    name: 'operator',
                    width: 6,
                    properties: {
                        options: [
                            { label: 'Equals', value: 'equals' },
                            { label: 'Not Equals', value: 'not_equals' },
                            { label: 'Contains', value: 'contains' },
                            { label: 'Greater Than', value: 'greater_than' },
                            { label: 'Less Than', value: 'less_than' },
                            { label: 'Is Empty', value: 'is_empty' },
                            { label: 'Is Not Empty', value: 'is_not_empty' }
                        ]
                    }
                },
                {
                    label: 'Value',
                    type: 'Input',
                    name: 'value',
                    width: 12,
                    condition: (values) => !['is_empty', 'is_not_empty'].includes(values.operator),
                    properties: {
                        placeholder: 'Value to compare'
                    }
                }
            ];
            
        case 'custom_code':
            return [
                {
                    label: 'JavaScript Code',
                    type: 'Textarea',
                    name: 'code',
                    width: 12,
                    properties: {
                        placeholder: '// Available variables: context, trigger\n// Example: context.newField = "value";',
                        rows: 10,
                        monospace: true
                    }
                }
            ];
            
        default:
            return [
                {
                    label: 'Configuration',
                    type: 'Textarea',
                    name: 'config',
                    width: 12,
                    properties: {
                        placeholder: 'JSON configuration',
                        rows: 6
                    }
                }
            ];
    }
});

// Dynamic title based on node type
const popupTitle = computed(() => {
    return `Configure ${props.node.name || props.node.action_type}`;
});

// Create tabs structure
const tabs = computed(() => {
    return [
        {
            title: 'Configuration',
            components: configFields.value
        }
    ];
});

// Handle form submission
function handleSubmit(data) {
    // Clean up the data - remove any undefined or empty values
    const cleanedConfig = {};
    Object.keys(data).forEach(key => {
        if (data[key] !== undefined && data[key] !== '') {
            cleanedConfig[key] = data[key];
        }
    });
    
    props.callback(cleanedConfig);
}
</script>

<template>
    <BuilderPopupComponent
        :tabs="tabs"
        :values="() => nodeConfig"
        :callback="handleSubmit"
        :title="popupTitle"
    />
</template>