<!-- src/panels/user/plugins/workflows/components/popups/step-config.vue -->
<script setup>
import { ref, computed, onMounted } from 'vue';
import PopupView from '@layouts/popup/view.vue';
import Button from '@form/button/view.vue';
import Input from '@form/input/view.vue';
import Textarea from '@form/textarea/view.vue';
import Select from '@form/select/view.vue';

// Icons
import { PhFloppyDisk, PhX } from "@phosphor-icons/vue";

const props = defineProps({
    step: {
        type: Object,
        required: true
    },
    actionConfig: {
        type: Object,
        required: true
    },
    onSave: {
        type: Function,
        required: true
    }
});

// Local config state
const localConfig = ref({});
const isSaving = ref(false);

// Available variables for reference
const availableVariables = [
    { code: '{{booking.customer_email}}', description: 'Customer\'s email address' },
    { code: '{{booking.customer_name}}', description: 'Customer\'s name' },
    { code: '{{booking.status}}', description: 'Booking status' },
    { code: '{{event.name}}', description: 'Event name' },
    { code: '{{event.location}}', description: 'Event location' },
    { code: '{{organization.name}}', description: 'Organization name' }
];

// Initialize config
onMounted(() => {
    // Clone the step's current config
    localConfig.value = JSON.parse(JSON.stringify(props.step.config || {}));
    
    // Set defaults from schema if not present
    if (props.actionConfig.config_schema) {
        Object.entries(props.actionConfig.config_schema).forEach(([key, schema]) => {
            if (localConfig.value[key] === undefined && schema.default !== undefined) {
                localConfig.value[key] = schema.default;
            }
        });
    }
});

// Get field component based on type
function getFieldComponent(type) {
    switch (type) {
        case 'string':
        case 'email':
        case 'url':
            return Input;
        case 'textarea':
        case 'json':
            return Textarea;
        case 'select':
            return Select;
        case 'number':
        case 'integer':
            return Input;
        default:
            return Input;
    }
}

// Get field props based on schema
function getFieldProps(key, schema) {
    const fieldProps = {
        modelValue: localConfig.value[key],
        'onUpdate:modelValue': (value) => {
            localConfig.value[key] = value;
        },
        placeholder: schema.placeholder || '',
        required: schema.required || false
    };
    
    // Type-specific props
    switch (schema.type) {
        case 'number':
        case 'integer':
            fieldProps.type = 'number';
            if (schema.min !== undefined) fieldProps.min = schema.min;
            if (schema.max !== undefined) fieldProps.max = schema.max;
            break;
        case 'email':
            fieldProps.type = 'email';
            break;
        case 'url':
            fieldProps.type = 'url';
            break;
        case 'textarea':
        case 'json':
            fieldProps.rows = schema.rows || 5;
            break;
        case 'select':
            fieldProps.options = schema.options || [];
            break;
    }
    
    return fieldProps;
}

// Validate config
function validateConfig() {
    if (!props.actionConfig.config_schema) return true;
    
    for (const [key, schema] of Object.entries(props.actionConfig.config_schema)) {
        const value = localConfig.value[key];
        
        // Check required fields
        if (schema.required && (!value || value === '')) {
            return false;
        }
        
        // Type-specific validation
        if (value !== undefined && value !== '') {
            switch (schema.type) {
                case 'integer':
                    if (!Number.isInteger(Number(value))) return false;
                    break;
                case 'number':
                    if (isNaN(Number(value))) return false;
                    break;
                case 'json':
                    try {
                        JSON.parse(value);
                    } catch {
                        return false;
                    }
                    break;
                case 'email':
                    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return false;
                    break;
                case 'url':
                    try {
                        new URL(value);
                    } catch {
                        if (!value.startsWith('{{') || !value.endsWith('}}')) {
                            return false;
                        }
                    }
                    break;
            }
        }
    }
    
    return true;
}

// Save configuration
async function save() {
    if (!validateConfig()) {
        alert('Please fill in all required fields correctly');
        return;
    }
    
    isSaving.value = true;
    
    try {
        // Clean up config - remove empty values
        const cleanConfig = {};
        Object.entries(localConfig.value).forEach(([key, value]) => {
            if (value !== undefined && value !== '') {
                cleanConfig[key] = value;
            }
        });
        
        await props.onSave(cleanConfig);
    } finally {
        isSaving.value = false;
    }
}

// Cancel
function cancel() {
    const popup = document.querySelector('.i-popup-close');
    if (popup) popup.click();
}

// Title
const title = computed(() => {
    return `Configure ${props.step.name || props.actionConfig.name}`;
});

// Check if has configuration options
const hasConfig = computed(() => {
    return props.actionConfig.config_schema && Object.keys(props.actionConfig.config_schema).length > 0;
});

// Get config schema entries
const configFields = computed(() => {
    if (!props.actionConfig.config_schema) return [];
    return Object.entries(props.actionConfig.config_schema);
});
</script>

<template>
    <PopupView :title="title" class="step-config-popup">
        <template #content>
            <div class="step-config-content">
                <!-- Step info -->
                <div class="step-info-section">
                    <div class="step-type-badge">{{ props.actionConfig.category || 'action' }}</div>
                    <h3>{{ props.actionConfig.name }}</h3>
                    <p v-if="props.actionConfig.description">{{ props.actionConfig.description }}</p>
                </div>
                
                <!-- Configuration form -->
                <div v-if="hasConfig" class="config-form">
                    <div
                        v-for="[key, schema] in configFields"
                        :key="key"
                        class="form-field"
                    >
                        <label class="field-label">
                            {{ schema.label || key }}
                            <span v-if="schema.required" class="required">*</span>
                        </label>
                        
                        <component
                            :is="getFieldComponent(schema.type)"
                            v-bind="getFieldProps(key, schema)"
                        />
                        
                        <p v-if="schema.help" class="field-help">
                            {{ schema.help }}
                        </p>
                    </div>
                </div>
                
                <!-- No configuration message -->
                <div v-else class="no-config">
                    <p>This action doesn't require any configuration.</p>
                </div>
                
                <!-- Variable info -->
                <div class="variables-info">
                    <details>
                        <summary>Available Variables</summary>
                        <div class="variables-list">
                            <div 
                                v-for="variable in availableVariables" 
                                :key="variable.code"
                                class="variable-item"
                            >
                                <code>{{ variable.code }}</code>
                                <span>{{ variable.description }}</span>
                            </div>
                        </div>
                    </details>
                </div>
            </div>
        </template>
        
        <template #footer>
            <div class="config-actions">
                <Button
                    as="tertiary"
                    :iconLeft="{ component: PhX }"
                    label="Cancel"
                    @click="cancel"
                />
                <Button
                    :iconLeft="{ component: PhFloppyDisk }"
                    label="Save"
                    :loading="isSaving"
                    @click="save"
                />
            </div>
        </template>
    </PopupView>
</template>

<style scoped>
.step-config-popup {
    min-width: 500px;
}

.step-config-content {
    padding: 20px;
}

.step-info-section {
    margin-bottom: 24px;
    padding-bottom: 20px;
    border-bottom: 1px solid var(--border);
}

.step-type-badge {
    display: inline-block;
    padding: 4px 12px;
    background: var(--background-2);
    border-radius: var(--radius-sm);
    font-size: 11px;
    text-transform: uppercase;
    font-weight: 600;
    color: var(--text-secondary);
    margin-bottom: 12px;
}

.step-info-section h3 {
    margin: 0 0 8px 0;
    font-size: 18px;
    font-weight: 600;
    color: var(--text-primary);
}

.step-info-section p {
    margin: 0;
    color: var(--text-secondary);
    font-size: 14px;
}

.config-form {
    display: flex;
    flex-direction: column;
    gap: 20px;
    margin-bottom: 24px;
}

.form-field {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.field-label {
    font-size: 14px;
    font-weight: 500;
    color: var(--text-primary);
}

.required {
    color: var(--error);
}

.field-help {
    font-size: 12px;
    color: var(--text-secondary);
    margin: 0;
    font-style: italic;
}

.no-config {
    text-align: center;
    padding: 40px 0;
    margin-bottom: 24px;
}

.no-config p {
    color: var(--text-secondary);
    margin: 0;
}

.variables-info {
    border-top: 1px solid var(--border);
    padding-top: 20px;
}

.variables-info details {
    cursor: pointer;
}

.variables-info summary {
    font-weight: 500;
    color: var(--text-primary);
    margin-bottom: 12px;
}

.variables-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.variable-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    background: var(--background-2);
    border-radius: var(--radius-sm);
    font-size: 13px;
}

.variable-item code {
    font-family: monospace;
    color: var(--primary);
    font-weight: 500;
}

.variable-item span {
    color: var(--text-secondary);
}

.config-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    padding: 16px 20px;
    border-top: 1px solid var(--border);
}
</style>