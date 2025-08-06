<!-- src/panels/user/plugins/workflows/components/popups/node-config.vue -->
<script setup>
import { ref, computed, onMounted } from 'vue';
import PopupView from '@layouts/popup/view.vue';
import Button from '@form/button/view.vue';
import Input from '@form/input/view.vue';
import Textarea from '@form/textarea/view.vue';
import Select from '@form/select/view.vue';
import Toggle from '@form/toggle/view.vue';
import { PhFloppyDisk, PhX } from "@phosphor-icons/vue";

const props = defineProps({
    node: {
        type: Object,
        required: true
    },
    config: {
        type: Object,
        required: true
    },
    onSave: {
        type: Function,
        required: true
    }
});

// Local state
const localConfig = ref({});
const isSaving = ref(false);

// Initialize config
onMounted(() => {
    // Clone the node's current config
    localConfig.value = JSON.parse(JSON.stringify(props.node.config || {}));
    
    // Set defaults from schema if not present
    if (props.config.config_schema) {
        Object.entries(props.config.config_schema).forEach(([key, schema]) => {
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
        case 'boolean':
            return Toggle;
        case 'integer':
        case 'number':
            return Input;
        default:
            return Input;
    }
}

// Get field props based on schema
function getFieldProps(key, schema) {
    const props = {
        modelValue: localConfig.value[key],
        'onUpdate:modelValue': (value) => {
            localConfig.value[key] = value;
        },
        placeholder: schema.placeholder || '',
        required: schema.required || false
    };
    
    // Type-specific props
    switch (schema.type) {
        case 'integer':
        case 'number':
            props.type = 'number';
            if (schema.min !== undefined) props.min = schema.min;
            if (schema.max !== undefined) props.max = schema.max;
            break;
        case 'email':
            props.type = 'email';
            break;
        case 'url':
            props.type = 'url';
            break;
        case 'textarea':
        case 'json':
            props.rows = schema.rows || 5;
            if (schema.type === 'json') {
                props.placeholder = props.placeholder || '{"key": "value"}';
            }
            break;
        case 'select':
            props.options = schema.options || [];
            break;
    }
    
    return props;
}

// Validate config
function validateConfig() {
    if (!props.config.config_schema) return true;
    
    for (const [key, schema] of Object.entries(props.config.config_schema)) {
        const value = localConfig.value[key];
        
        // Check required fields
        if (schema.required && !value) {
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
                        return false;
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
        common.notification('Please fill in all required fields correctly', false);
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

// Get title
const title = computed(() => {
    return `Configure ${props.node.name || props.config.name}`;
});

// Check if has configuration options
const hasConfig = computed(() => {
    return props.config.config_schema && Object.keys(props.config.config_schema).length > 0;
});
</script>

<template>
    <PopupView :title="title">
        <template #content>
            <div class="node-config">
                <!-- Node info -->
                <div class="node-info-section">
                    <div class="node-type">{{ props.node.node_type }}</div>
                </div>
                
                <!-- Configuration form -->
                <div v-if="hasConfig" class="config-form">
                    <div
                        v-for="(schema, key) in props.config.config_schema"
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
                    <p>This {{ props.node.node_type }} doesn't require any configuration.</p>
                </div>
                
                <!-- Variables info (for triggers) -->
                <div v-if="props.node.node_type === 'trigger' && props.config.variables" class="variables-section">
                    <h3>Available variables</h3>
                    <p class="variables-description">
                        These variables will be available to use in your workflow:
                    </p>
                    <div class="variables-list">
                        <div
                            v-for="variable in props.config.variables"
                            :key="variable"
                            class="variable-item"
                        >
                            <code v-text="'{{' + variable + '}}'"></code>
                        </div>
                    </div>
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
.node-config {
    padding: 20px;
}

.node-info-section {
    margin-bottom: 24px;
    padding-bottom: 24px;
    border-bottom: 1px solid var(--border);
}

.node-type {
    display: inline-block;
    padding: 4px 12px;
    background: var(--background-2);
    border-radius: var(--radius-sm);
    font-size: 11px;
    text-transform: uppercase;
    font-weight: 500;
    color: var(--text-secondary);
    margin-bottom: 12px;
}

.node-description {
    font-size: 14px;
    color: var(--text-secondary);
    margin: 0;
}

.config-form {
    display: flex;
    flex-direction: column;
    gap: 20px;
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
}

.no-config {
    text-align: center;
    padding: 40px 0;
}

.no-config p {
    color: var(--text-secondary);
    margin: 0;
}

.variables-section {
    margin-top: 32px;
    padding-top: 24px;
    border-top: 1px solid var(--border);
}

.variables-section h3 {
    font-size: 16px;
    font-weight: 600;
    margin: 0 0 8px 0;
    color: var(--text-primary);
}

.variables-description {
    font-size: 14px;
    color: var(--text-secondary);
    margin: 0 0 16px 0;
}

.variables-list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}

.variable-item {
    display: inline-block;
    padding: 6px 12px;
    background: var(--background-2);
    border-radius: var(--radius-sm);
}

.variable-item code {
    font-family: monospace;
    font-size: 12px;
    color: var(--primary);
}

.config-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    padding: 16px 20px;
    border-top: 1px solid var(--border);
}
</style>