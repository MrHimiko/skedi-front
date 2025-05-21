<script setup>
import { ref, watch } from 'vue';
import { getComparisonOperators } from '@user_forms/utils/form-schema';
import Button from '@form/button/view.vue';
import Select from '@form/select/view.vue';
import Input from '@form/input/view.vue';
import { PhPlus, PhTrash } from "@phosphor-icons/vue";

const props = defineProps({
    conditions: {
        type: Array,
        default: () => []
    },
    logic: {
        type: String,
        default: 'all'
    },
    availableFields: {
        type: Array,
        required: true
    }
});

const emit = defineEmits(['update']);

// Local copy of conditions
const localConditions = ref([...props.conditions]);
const localLogic = ref(props.logic);

// Watch for changes in props
watch(() => props.conditions, (newConditions) => {
    localConditions.value = [...newConditions];
}, { deep: true });

watch(() => props.logic, (newLogic) => {
    localLogic.value = newLogic;
});

// Add a new condition
const addCondition = () => {
    if (props.availableFields.length === 0) return;
    
    const newCondition = {
        field: props.availableFields[0].id,
        operator: 'equals',
        value: ''
    };
    
    localConditions.value = [...localConditions.value, newCondition];
    emitUpdate();
};

// Remove a condition
const removeCondition = (index) => {
    localConditions.value = localConditions.value.filter((_, i) => i !== index);
    emitUpdate();
};

// Update a condition
const updateCondition = (index, key, value) => {
    localConditions.value = localConditions.value.map((condition, i) => {
        if (i === index) {
            return {
                ...condition,
                [key]: value
            };
        }
        return condition;
    });
    
    emitUpdate();
};

// Update logic type (all/any)
const updateLogic = (value) => {
    localLogic.value = value;
    emitUpdate();
};

// Emit the update event
const emitUpdate = () => {
    emit('update', localConditions.value, localLogic.value);
};

// Get field type by id
const getFieldType = (fieldId) => {
    const field = props.availableFields.find(field => field.id === fieldId);
    return field ? field.type : 'input';
};

// Get condition operators based on field type
const getOperators = (fieldId) => {
    const fieldType = getFieldType(fieldId);
    return getComparisonOperators(fieldType).map(op => ({
        label: op.label,
        value: op.value
    }));
};
</script>

<template>
    <div class="condition-builder">
        <div class="logic-header">
            <h4>Conditional Logic</h4>
            <p class="text-xs text-secondary">
                Show this field only when:
            </p>
        </div>
        
        <div v-if="availableFields.length === 0" class="no-fields">
            <p>No fields available for conditions. Add more fields to the form.</p>
        </div>
        
        <div v-else>
            <div class="logic-type">
                <Select
                    label="Logic Type"
                    :value="localLogic"
                    :options="[
                        { label: 'All conditions are met', value: 'all' },
                        { label: 'Any condition is met', value: 'any' }
                    ]"
                    @change="updateLogic"
                />
            </div>
            
            <div class="conditions-list">
                <div 
                    v-for="(condition, index) in localConditions" 
                    :key="index"
                    class="condition-row"
                >
                    <Select
                        :value="condition.field"
                        :options="availableFields.map(field => ({ 
                            label: field.label, 
                            value: field.id 
                        }))"
                        @change="(value) => updateCondition(index, 'field', value)"
                    />
                    
                    <Select
                        :value="condition.operator"
                        :options="getOperators(condition.field)"
                        @change="(value) => updateCondition(index, 'operator', value)"
                    />
                    
                    <Input
                        :value="condition.value"
                        placeholder="Value"
                        @onInput="(e, value) => updateCondition(index, 'value', value)"
                    />
                    
                    <Button 
                        as="tertiary icon" 
                        :iconLeft="{ component: PhTrash, weight: 'bold' }" 
                        @click="() => removeCondition(index)"
                    />
                </div>
            </div>
            
            <div class="actions">
                <Button 
                    as="tertiary" 
                    :iconLeft="{ component: PhPlus, weight: 'bold' }" 
                    label="Add Condition" 
                    @click="addCondition"
                />
            </div>
        </div>
    </div>
</template>

<style scoped>
.condition-builder {
    width: 100%;
}

.logic-header {
    margin-bottom: 16px;
}

.logic-header h4 {
    font-weight: 600;
    margin-bottom: 4px;
}

.no-fields {
    background-color: var(--background-1);
    padding: 16px;
    border-radius: var(--radius-md);
    color: var(--text-secondary);
    text-align: center;
}

.logic-type {
    margin-bottom: 16px;
}

.conditions-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 16px;
}

.condition-row {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr auto;
    gap: 8px;
    align-items: center;
}

.actions {
    margin-top: 8px;
}
</style>