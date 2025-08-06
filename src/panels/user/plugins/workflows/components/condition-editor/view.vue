<!-- src/panels/user/plugins/workflows/components/condition-editor/view.vue -->
<script setup>
import { ref, computed, watch } from 'vue';

// Components
import Select from '@form/select/view.vue';
import Input from '@form/input/view.vue';
import Button from '@form/button/view.vue';

// Icons
import { PhPlus, PhTrash } from "@phosphor-icons/vue";

const props = defineProps({
    step: {
        type: Object,
        required: true
    }
});

const emit = defineEmits(['update']);

// Available field options (these could come from triggers/previous steps)
const availableFields = ref([
    { label: 'Booking Email', value: '{{booking.customer_email}}' },
    { label: 'Booking Name', value: '{{booking.customer_name}}' },
    { label: 'Booking Status', value: '{{booking.status}}' },
    { label: 'Booking Total', value: '{{booking.total}}' },
    { label: 'Event Name', value: '{{event.name}}' },
    { label: 'Event Location', value: '{{event.location}}' },
    { label: 'Organization Name', value: '{{organization.name}}' }
]);

// Available operators
const operators = ref([
    { label: 'Equals', value: 'equals' },
    { label: 'Not Equals', value: 'not_equals' },
    { label: 'Contains', value: 'contains' },
    { label: 'Does Not Contain', value: 'not_contains' },
    { label: 'Greater Than', value: 'greater_than' },
    { label: 'Less Than', value: 'less_than' },
    { label: 'Is Empty', value: 'is_empty' },
    { label: 'Is Not Empty', value: 'is_not_empty' }
]);

// Local condition state
const conditionConfig = ref({
    field: props.step.config?.field || '',
    operator: props.step.config?.operator || 'equals',
    value: props.step.config?.value || '',
    logic: props.step.config?.logic || 'AND', // For multiple conditions
    conditions: props.step.config?.conditions || []
});

// Computed
const needsValue = computed(() => {
    return !['is_empty', 'is_not_empty'].includes(conditionConfig.value.operator);
});

const hasMultipleConditions = computed(() => {
    return conditionConfig.value.conditions.length > 0;
});

// Watch for changes and emit updates
watch(conditionConfig, (newConfig) => {
    emit('update', { ...newConfig });
}, { deep: true });

// Methods
function addCondition() {
    conditionConfig.value.conditions.push({
        field: '',
        operator: 'equals',
        value: ''
    });
}

function removeCondition(index) {
    conditionConfig.value.conditions.splice(index, 1);
}

function updateMainCondition() {
    // Main condition is updated through v-model automatically
}

function updateSubCondition(index, field, value) {
    conditionConfig.value.conditions[index][field] = value;
}

// Initialize if empty
if (!props.step.config?.field && !props.step.config?.conditions?.length) {
    // Set default values
    conditionConfig.value = {
        field: '{{booking.customer_email}}',
        operator: 'contains',
        value: 'gmail.com',
        logic: 'AND',
        conditions: []
    };
}
</script>

<template>
    <div class="condition-editor">
        <div class="editor-header">
            <h4>Configure Condition</h4>
            <p>Define when this condition should be true or false</p>
        </div>
        
        <!-- Main Condition -->
        <div class="condition-group main-condition">
            <div class="condition-row">
                <div class="condition-field">
                    <label>Field</label>
                    <Select
                        v-model="conditionConfig.field"
                        :options="availableFields"
                        placeholder="Select field to check"
                    />
                </div>
                
                <div class="condition-operator">
                    <label>Operator</label>
                    <Select
                        v-model="conditionConfig.operator"
                        :options="operators"
                        placeholder="Select operator"
                    />
                </div>
                
                <div v-if="needsValue" class="condition-value">
                    <label>Value</label>
                    <Input
                        v-model="conditionConfig.value"
                        placeholder="Enter value to compare"
                    />
                </div>
            </div>
        </div>
        
        <!-- Multiple Conditions -->
        <div v-if="hasMultipleConditions || conditionConfig.conditions.length > 0" class="multiple-conditions">
            <!-- Logic Type -->
            <div class="logic-selector">
                <label>Logic</label>
                <Select
                    v-model="conditionConfig.logic"
                    :options="[
                        { label: 'AND (all must be true)', value: 'AND' },
                        { label: 'OR (any can be true)', value: 'OR' }
                    ]"
                />
            </div>
            
            <!-- Additional Conditions -->
            <div v-for="(condition, index) in conditionConfig.conditions" :key="index" class="condition-group">
                <div class="condition-row">
                    <div class="logic-indicator">
                        {{ conditionConfig.logic }}
                    </div>
                    
                    <div class="condition-field">
                        <Select
                            :value="condition.field"
                            @update:value="updateSubCondition(index, 'field', $event)"
                            :options="availableFields"
                            placeholder="Select field"
                        />
                    </div>
                    
                    <div class="condition-operator">
                        <Select
                            :value="condition.operator"
                            @update:value="updateSubCondition(index, 'operator', $event)"
                            :options="operators"
                            placeholder="Operator"
                        />
                    </div>
                    
                    <div v-if="!['is_empty', 'is_not_empty'].includes(condition.operator)" class="condition-value">
                        <Input
                            :value="condition.value"
                            @update:value="updateSubCondition(index, 'value', $event)"
                            placeholder="Value"
                        />
                    </div>
                    
                    <div class="condition-actions">
                        <Button
                            as="tertiary icon"
                            :iconLeft="{ component: PhTrash }"
                            @click="removeCondition(index)"
                        />
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Add Condition Button -->
        <div class="add-condition">
            <Button
                as="tertiary"
                :iconLeft="{ component: PhPlus }"
                label="Add Condition"
                @click="addCondition"
            />
        </div>
        
        <!-- Preview -->
        <div class="condition-preview">
            <div class="preview-header">
                <h5>Preview</h5>
            </div>
            <div class="preview-content">
                <div class="preview-text">
                    <span class="preview-main">
                        If {{ conditionConfig.field || 'field' }} 
                        {{ conditionConfig.operator || 'equals' }}
                        <span v-if="needsValue">"{{ conditionConfig.value || 'value' }}"</span>
                    </span>
                    
                    <div v-for="(condition, index) in conditionConfig.conditions" :key="index" class="preview-sub">
                        {{ conditionConfig.logic }} {{ condition.field || 'field' }} 
                        {{ condition.operator || 'equals' }}
                        <span v-if="!['is_empty', 'is_not_empty'].includes(condition.operator)">
                            "{{ condition.value || 'value' }}"
                        </span>
                    </div>
                </div>
                
                <div class="preview-paths">
                    <div class="path-preview true-path">
                        <span class="path-label">✓ TRUE:</span>
                        <span class="path-description">Continue to next step</span>
                    </div>
                    <div class="path-preview false-path">
                        <span class="path-label">✗ FALSE:</span>
                        <span class="path-description">Skip to after condition</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.condition-editor {
    padding: 20px;
    background: var(--background-1);
    border-radius: var(--radius-md);
}

.editor-header {
    margin-bottom: 24px;
}

.editor-header h4 {
    margin: 0 0 4px 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
}

.editor-header p {
    margin: 0;
    font-size: 13px;
    color: var(--text-secondary);
}

.condition-group {
    background: var(--background-0);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: 16px;
    margin-bottom: 12px;
}

.main-condition {
    border-color: var(--primary);
    border-width: 2px;
}

.condition-row {
    display: grid;
    grid-template-columns: 1fr 140px 1fr auto;
    gap: 12px;
    align-items: end;
}

.condition-field,
.condition-operator, 
.condition-value {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.condition-field label,
.condition-operator label,
.condition-value label {
    font-size: 12px;
    font-weight: 500;
    color: var(--text-secondary);
}

.logic-selector {
    margin-bottom: 16px;
}

.logic-selector label {
    display: block;
    font-size: 12px;
    font-weight: 500;
    color: var(--text-secondary);
    margin-bottom: 6px;
}

.logic-indicator {
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--background-2);
    border-radius: var(--radius-sm);
    padding: 8px;
    font-size: 11px;
    font-weight: 600;
    color: var(--text-secondary);
    text-transform: uppercase;
}

.condition-actions {
    display: flex;
    align-items: center;
}

.add-condition {
    margin: 16px 0;
}

.condition-preview {
    margin-top: 24px;
    background: var(--background-0);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: 16px;
}

.preview-header h5 {
    margin: 0 0 12px 0;
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
}

.preview-content {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.preview-text {
    font-size: 14px;
    font-family: monospace;
    background: var(--background-2);
    padding: 12px;
    border-radius: var(--radius-sm);
    line-height: 1.5;
}

.preview-main {
    color: var(--text-primary);
    font-weight: 600;
    display: block;
    margin-bottom: 4px;
}

.preview-sub {
    color: var(--text-secondary);
    display: block;
    margin-left: 16px;
}

.preview-paths {
    display: flex;
    gap: 16px;
}

.path-preview {
    flex: 1;
    padding: 12px;
    border-radius: var(--radius-sm);
    font-size: 13px;
}

.true-path {
    background: rgba(var(--success-rgb), 0.1);
    border: 1px solid rgba(var(--success-rgb), 0.2);
}

.false-path {
    background: rgba(var(--error-rgb), 0.1);
    border: 1px solid rgba(var(--error-rgb), 0.2);
}

.path-label {
    font-weight: 600;
    display: block;
    margin-bottom: 4px;
}

.true-path .path-label {
    color: var(--success);
}

.false-path .path-label {
    color: var(--error);
}

.path-description {
    color: var(--text-secondary);
    font-size: 12px;
}
</style>