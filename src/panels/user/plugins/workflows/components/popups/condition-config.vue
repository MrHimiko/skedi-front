<!-- src/panels/user/plugins/workflows/components/popups/condition-config.vue -->
<script setup>
import { ref, computed, watch } from 'vue';
import PopupLayout from '@layouts/popup/view.vue';
import Button from '@form/button/view.vue';
import Input from '@form/input/view.vue';
import Select from '@form/select/view.vue';
import TabsComponent from '@global/tabs/view.vue';
import { 
    PhPlus,
    PhTrash,
    PhGitBranch,
    PhFloppyDisk,
    PhX
} from "@phosphor-icons/vue";

const props = defineProps({
    variables: {
        type: Object,
        default: () => ({})
    },
    config: {
        type: Object,
        default: () => ({})
    },
    onSave: {
        type: Function,
        required: true
    }
});

// State
const paths = ref([]);
const activePathId = ref('if_1');

// Initialize paths from config
if (props.config?.paths?.length > 0) {
    paths.value = JSON.parse(JSON.stringify(props.config.paths));
} else {
    // Default paths
    paths.value = [
        { 
            id: 'if_1', 
            label: 'IF', 
            type: 'if', 
            conditions: [{
                field: '',
                operator: 'equals',
                value: '',
                logic: 'and'
            }]
        },
        { 
            id: 'else', 
            label: 'ELSE', 
            type: 'else', 
            conditions: [] 
        }
    ];
}

// Computed
const activePath = computed(() => {
    return paths.value.find(p => p.id === activePathId.value);
});

const availableFields = computed(() => {
    const fields = [];
    
    // Add trigger variables
    Object.entries(props.variables).forEach(([key, config]) => {
        fields.push({
            label: config.label || key,
            value: `trigger.${key}`,
            type: config.type || 'string'
        });
    });
    
    // Add action outputs from previous nodes
    // This would need to be passed in from the parent
    
    return fields;
});

const operators = [
    { label: 'Equals', value: 'equals' },
    { label: 'Not Equals', value: 'not_equals' },
    { label: 'Contains', value: 'contains' },
    { label: 'Does Not Contain', value: 'not_contains' },
    { label: 'Greater Than', value: 'greater_than' },
    { label: 'Less Than', value: 'less_than' },
    { label: 'Greater or Equal', value: 'greater_equal' },
    { label: 'Less or Equal', value: 'less_equal' },
    { label: 'Is Empty', value: 'is_empty' },
    { label: 'Is Not Empty', value: 'is_not_empty' },
    { label: 'Starts With', value: 'starts_with' },
    { label: 'Ends With', value: 'ends_with' }
];

const logicOperators = [
    { label: 'AND', value: 'and' },
    { label: 'OR', value: 'or' }
];

// Generate tabs for path switching
const pathTabs = computed(() => {
    return paths.value.map(path => ({
        title: path.label,
        value: path.id
    }));
});

// Methods
function addPath() {
    const ifPaths = paths.value.filter(p => p.type === 'if');
    const newPathNumber = ifPaths.length + 1;
    const newPath = {
        id: `if_${newPathNumber}`,
        label: `IF ${newPathNumber}`,
        type: 'if',
        conditions: [{
            field: '',
            operator: 'equals',
            value: '',
            logic: 'and'
        }]
    };
    
    // Insert before ELSE
    const elseIndex = paths.value.findIndex(p => p.type === 'else');
    paths.value.splice(elseIndex, 0, newPath);
    activePathId.value = newPath.id;
}

function deletePath(pathId) {
    const index = paths.value.findIndex(p => p.id === pathId);
    if (index > -1 && paths.value[index].type !== 'else') {
        paths.value.splice(index, 1);
        
        // Renumber remaining IF paths
        let ifCounter = 1;
        paths.value.forEach(path => {
            if (path.type === 'if') {
                path.id = `if_${ifCounter}`;
                path.label = ifCounter === 1 ? 'IF' : `IF ${ifCounter}`;
                ifCounter++;
            }
        });
        
        // Switch to first path if active was deleted
        if (activePathId.value === pathId) {
            activePathId.value = paths.value[0].id;
        }
    }
}

function addCondition(path) {
    if (!path.conditions) {
        path.conditions = [];
    }
    
    path.conditions.push({
        field: '',
        operator: 'equals',
        value: '',
        logic: 'and'
    });
}

function removeCondition(path, index) {
    path.conditions.splice(index, 1);
    
    // Ensure at least one condition for IF paths
    if (path.type === 'if' && path.conditions.length === 0) {
        addCondition(path);
    }
}

function updateCondition(path, index, key, value) {
    if (path.conditions[index]) {
        path.conditions[index][key] = value;
    }
}

function needsValueInput(operator) {
    return !['is_empty', 'is_not_empty'].includes(operator);
}

function save() {
    // Validate that all IF paths have at least one complete condition
    for (const path of paths.value) {
        if (path.type === 'if') {
            const hasValidCondition = path.conditions.some(c => 
                c.field && c.operator && (needsValueInput(c.operator) ? c.value : true)
            );
            
            if (!hasValidCondition) {
                // Show error
                return;
            }
        }
    }
    
    props.onSave({ paths: paths.value });
}
</script>

<template>
    <PopupLayout
        width="700px"
        heading="Configure Path Conditions"
        :icon="PhGitBranch"
    >
        <div class="condition-modal">
            <!-- Path tabs -->
            <div class="path-tabs">
                <TabsComponent
                    :tabs="pathTabs"
                    v-model:active="activePathId"
                />
                
                <Button
                    as="tertiary small"
                    :iconLeft="{ component: PhPlus }"
                    label="Add IF Path"
                    @click="addPath"
                />
            </div>
            
            <!-- Active path configuration -->
            <div class="path-config" v-if="activePath">
                <div class="path-header">
                    <h3>{{ activePath.label }} Conditions</h3>
                    <Button
                        v-if="activePath.type === 'if' && paths.filter(p => p.type === 'if').length > 1"
                        as="tertiary small"
                        :iconLeft="{ component: PhTrash }"
                        label="Delete Path"
                        @click="deletePath(activePath.id)"
                    />
                </div>
                
                <!-- Conditions list -->
                <div v-if="activePath.type === 'if'" class="conditions-list">
                    <div v-if="activePath.conditions.length === 0" class="no-conditions">
                        <p>No conditions defined. Click below to add one.</p>
                    </div>
                    
                    <div 
                        v-for="(condition, index) in activePath.conditions" 
                        :key="index"
                        class="condition-row"
                    >
                        <!-- Logic operator (AND/OR) -->
                        <div v-if="index > 0" class="logic-operator">
                            <Select
                                :options="logicOperators"
                                :value="condition.logic"
                                @update:value="(val) => updateCondition(activePath, index, 'logic', val)"
                                size="small"
                            />
                        </div>
                        
                        <!-- Condition inputs -->
                        <div class="condition-inputs">
                            <!-- Field selection -->
                            <Select
                                placeholder="Select field"
                                :options="availableFields"
                                :value="condition.field"
                                @update:value="(val) => updateCondition(activePath, index, 'field', val)"
                            />
                            
                            <!-- Operator selection -->
                            <Select
                                placeholder="Operator"
                                :options="operators"
                                :value="condition.operator"
                                @update:value="(val) => updateCondition(activePath, index, 'operator', val)"
                            />
                            
                            <!-- Value input -->
                            <Input
                                v-if="needsValueInput(condition.operator)"
                                placeholder="Value"
                                :value="condition.value"
                                @update:value="(val) => updateCondition(activePath, index, 'value', val)"
                            />
                            
                            <!-- Remove button -->
                            <Button
                                as="tertiary icon"
                                :iconLeft="{ component: PhTrash }"
                                @click="removeCondition(activePath, index)"
                                v-tooltip="{ content: 'Remove condition' }"
                            />
                        </div>
                    </div>
                    
                    <!-- Add condition button -->
                    <Button
                        as="tertiary"
                        :iconLeft="{ component: PhPlus }"
                        label="Add Condition"
                        @click="addCondition(activePath)"
                    />
                </div>
                
                <!-- ELSE path info -->
                <div v-else-if="activePath.type === 'else'" class="else-info">
                    <p>This path will execute when none of the IF conditions are met.</p>
                    <p class="hint">The ELSE path is always the fallback option and doesn't require conditions.</p>
                </div>
            </div>
        </div>
        
        <!-- Footer actions -->
        <template #footer>
            <Button
                as="tertiary"
                label="Cancel"
                @click="$emit('close')"
            />
            <Button
                as="brand"
                :iconLeft="{ component: PhFloppyDisk }"
                label="Save Configuration"
                @click="save"
            />
        </template>
    </PopupLayout>
</template>

<style scoped>
.condition-modal {
    padding: 20px;
}

.path-tabs {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 24px;
    padding-bottom: 16px;
    border-bottom: 1px solid var(--border);
}

.path-config {
    min-height: 300px;
}

.path-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;
}

.path-header h3 {
    margin: 0;
    font-size: 16px;
    color: var(--text-primary);
}

.conditions-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.no-conditions {
    padding: 40px;
    text-align: center;
    background: var(--background-2);
    border-radius: var(--radius-md);
    color: var(--text-secondary);
}

.condition-row {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.logic-operator {
    width: 80px;
    margin: 0 auto;
}

.condition-inputs {
    display: grid;
    grid-template-columns: 1fr 150px 1fr auto;
    gap: 12px;
    align-items: center;
}

.condition-inputs :deep(.c-select),
.condition-inputs :deep(.c-input) {
    margin-bottom: 0;
}

.else-info {
    padding: 24px;
    background: var(--background-2);
    border-radius: var(--radius-md);
    text-align: center;
}

.else-info p {
    margin: 0 0 8px 0;
    color: var(--text-primary);
}

.else-info .hint {
    font-size: 14px;
    color: var(--text-secondary);
    margin: 0;
}
</style>