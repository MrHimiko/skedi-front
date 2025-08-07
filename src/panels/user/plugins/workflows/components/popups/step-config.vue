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
    
    console.log('Initialized config:', localConfig.value);
    console.log('Step:', props.step);
    console.log('Action config:', props.actionConfig);
});

// Update field value
function updateField(key, value) {
    console.log(`Updating field ${key}:`, value);
    localConfig.value[key] = value;
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
    console.log('=== SAVE BUTTON CLICKED ===');
    console.log('Current config:', localConfig.value);
    
    if (!validateConfig()) {
        console.log('Validation failed');
        alert('Please fill in all required fields correctly');
        return;
    }
    
    isSaving.value = true;
    console.log('Setting isSaving to true');
    
    try {
        // Clean up config - remove empty values
        const cleanConfig = {};
        Object.entries(localConfig.value).forEach(([key, value]) => {
            if (value !== undefined && value !== '') {
                cleanConfig[key] = value;
            }
        });
        
        console.log('Saving clean config:', cleanConfig);
        console.log('Calling onSave with config...');
        console.log('onSave function:', props.onSave);
        
        // Call the save callback
        await props.onSave(cleanConfig);
        
        console.log('onSave completed, closing popup...');
        
        // Close the popup
        const popup = document.querySelector('.i-popup-close');
        if (popup) {
            console.log('Found popup close button, clicking...');
            popup.click();
        } else {
            console.log('Popup close button not found');
        }
        
    } catch (error) {
        console.error('Error saving configuration:', error);
        alert('Failed to save configuration. Please try again.');
    } finally {
        console.log('Setting isSaving to false');
        isSaving.value = false;
    }
}

// Cancel
function cancel() {
    console.log('Cancel button clicked');
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

// Test save function (for debugging)
function testSave() {
    console.log('TEST SAVE FUNCTION CALLED');
    save();
}
</script>

<template>
    <PopupView :title="title" class="step-config-popup">
        <template #content>
            <div class="step-config-content">
                <!-- Debug info -->
                <div class="debug-section" style="background: var(--background-2); padding: 12px; margin-bottom: 16px; border-radius: var(--radius-sm);">
                    <details open>
                        <summary style="cursor: pointer; font-weight: 600;">Debug Info</summary>
                        <div style="margin-top: 8px; font-size: 12px;">
                            <p><strong>Step ID:</strong> {{ step.id }}</p>
                            <p><strong>Step Type:</strong> {{ step.type }}</p>
                            <p><strong>Current Config:</strong> {{ JSON.stringify(localConfig) }}</p>
                            <p><strong>Has Config Schema:</strong> {{ hasConfig }}</p>
                            <p><strong>Config Fields:</strong> {{ configFields.length }}</p>
                            <p><strong>Is Valid:</strong> {{ validateConfig() }}</p>
                            <p><strong>Is Saving:</strong> {{ isSaving }}</p>
                            <button @click="testSave" style="margin-top: 8px; padding: 4px 8px; background: red; color: white; border: none; border-radius: 4px;">TEST SAVE</button>
                        </div>
                    </details>
                </div>

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
                        
                        <!-- Input Field -->
                        <Input
                            v-if="schema.type === 'string' || schema.type === 'email' || schema.type === 'url'"
                            :value="localConfig[key] || ''"
                            :placeholder="schema.placeholder || ''"
                            :required="schema.required || false"
                            :type="schema.type === 'email' ? 'email' : (schema.type === 'url' ? 'url' : 'text')"
                            @onInput="(event, value) => updateField(key, value)"
                        />
                        
                        <!-- Textarea Field -->
                        <Textarea
                            v-else-if="schema.type === 'textarea' || schema.type === 'json'"
                            :value="localConfig[key] || ''"
                            :placeholder="schema.placeholder || ''"
                            :required="schema.required || false"
                            :rows="schema.rows || 5"
                            @onInput="(value) => updateField(key, value)"
                        />
                        
                        <!-- Select Field -->
                        <Select
                            v-else-if="schema.type === 'select'"
                            :value="localConfig[key] || schema.default || ''"
                            :options="schema.options || []"
                            :placeholder="schema.placeholder || 'Select...'"
                            :required="schema.required || false"
                            @update:value="(value) => updateField(key, value)"
                        />
                        
                        <!-- Number Field -->
                        <Input
                            v-else-if="schema.type === 'number' || schema.type === 'integer'"
                            :value="localConfig[key] || ''"
                            :placeholder="schema.placeholder || ''"
                            :required="schema.required || false"
                            type="number"
                            :min="schema.min"
                            :max="schema.max"
                            @onInput="(event, value) => updateField(key, value)"
                        />
                        
                        <!-- Default Input -->
                        <Input
                            v-else
                            :value="localConfig[key] || ''"
                            :placeholder="schema.placeholder || ''"
                            :required="schema.required || false"
                            @onInput="(event, value) => updateField(key, value)"
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
            
            <!-- Actions at bottom of content -->
            <div class="config-actions">
                <div class="c-button tertiary" @click="cancel">
                    Cancel
                </div>
                <div class="c-button brand" @click="save" :class="{ loading: isSaving }">
                    <span v-if="!isSaving">Save Configuration</span>
                    <span v-else>Saving...</span>
                </div>
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
    margin-bottom: 24px;
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
    padding: 20px;
    border-top: 1px solid var(--border);
    background: var(--background-1);
    margin: 0 -20px -20px -20px;
}
</style>