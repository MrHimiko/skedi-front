<!-- src/panels/user/plugins/workflows/components/popups/condition-config.vue -->
<script setup>
import { ref } from 'vue';
import PopupView from '@layouts/popup/view.vue';
import Button from '@form/button/view.vue';
import Input from '@form/input/view.vue';
import Select from '@form/select/view.vue';
import { 
    PhPlus,
    PhTrash,
    PhFloppyDisk,
    PhX
} from "@phosphor-icons/vue";

const props = defineProps({
    node: {
        type: Object,
        required: true
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

// Initialize paths
const paths = ref([
    {
        id: 'path_a',
        label: 'Path A',
        conditions: [{
            field: '',
            operator: 'equals',
            value: ''
        }]
    },
    {
        id: 'path_b', 
        label: 'Path B',
        conditions: [{
            field: '',
            operator: 'equals',
            value: ''
        }]
    }
]);

// Load existing config if available
if (props.node.config?.paths?.length > 0) {
    paths.value = [...props.node.config.paths];
}

const availableFields = [
    { label: 'Booking ID', value: 'booking.id' },
    { label: 'Customer Name', value: 'booking.customer_name' },
    { label: 'Customer Email', value: 'booking.customer_email' },
    { label: 'Event Name', value: 'event.name' },
    { label: 'Event Location', value: 'event.location' }
];

const operators = [
    { label: 'Equals', value: 'equals' },
    { label: 'Not Equals', value: 'not_equals' },
    { label: 'Contains', value: 'contains' },
    { label: 'Greater Than', value: 'greater_than' },
    { label: 'Less Than', value: 'less_than' },
    { label: 'Is Empty', value: 'is_empty' },
    { label: 'Is Not Empty', value: 'is_not_empty' }
];

function addPath() {
    const newPath = {
        id: `path_${String.fromCharCode(65 + paths.value.length)}`.toLowerCase(),
        label: `Path ${String.fromCharCode(65 + paths.value.length)}`,
        conditions: [{
            field: '',
            operator: 'equals',
            value: ''
        }]
    };
    paths.value.push(newPath);
}

function removePath(index) {
    if (paths.value.length > 2) {
        paths.value.splice(index, 1);
    }
}

function addCondition(pathIndex) {
    paths.value[pathIndex].conditions.push({
        field: '',
        operator: 'equals',
        value: ''
    });
}

function removeCondition(pathIndex, conditionIndex) {
    const path = paths.value[pathIndex];
    if (path.conditions.length > 1) {
        path.conditions.splice(conditionIndex, 1);
    }
}

function needsValue(operator) {
    return !['is_empty', 'is_not_empty'].includes(operator);
}

function save() {
    const config = {
        paths: paths.value
    };
    props.onSave(config);
}

function cancel() {
    // Close popup
    const closeBtn = document.querySelector('.i-popup-close');
    if (closeBtn) closeBtn.click();
}
</script>

<template>
    <PopupView title="Configure Path Conditions">
        <template #content>
            <div class="condition-config">
                <!-- Info section -->
                <div class="info-section">
                    <p>Create multiple conditional paths for your workflow. Each path will execute based on its conditions.</p>
                </div>
                
                <div class="paths-container">
                    <div 
                        v-for="(path, pathIndex) in paths"
                        :key="path.id"
                        class="path-section"
                    >
                        <div class="path-header">
                            <div class="path-title">
                                <Input
                                    v-model="path.label"
                                    placeholder="Path name"
                                    class="path-name-input"
                                />
                            </div>
                            <Button
                                v-if="paths.length > 2"
                                as="tertiary icon"
                                :iconLeft="{ component: PhTrash }"
                                @click="removePath(pathIndex)"
                            />
                        </div>

                        <div class="conditions-list">
                            <div
                                v-for="(condition, conditionIndex) in path.conditions"
                                :key="conditionIndex"
                                class="condition-row"
                            >
                                <div class="condition-inputs">
                                    <Select
                                        v-model="condition.field"
                                        :options="availableFields"
                                        placeholder="Select field"
                                    />
                                    
                                    <Select
                                        v-model="condition.operator"
                                        :options="operators"
                                        placeholder="Operator"
                                    />
                                    
                                    <Input
                                        v-if="needsValue(condition.operator)"
                                        v-model="condition.value"
                                        placeholder="Value"
                                    />
                                    
                                    <Button
                                        v-if="path.conditions.length > 1"
                                        as="tertiary icon"
                                        :iconLeft="{ component: PhTrash }"
                                        @click="removeCondition(pathIndex, conditionIndex)"
                                    />
                                </div>
                            </div>
                            
                            <Button
                                as="tertiary"
                                :iconLeft="{ component: PhPlus }"
                                label="Add Condition"
                                @click="addCondition(pathIndex)"
                            />
                        </div>
                    </div>
                </div>
                
                <Button
                    as="tertiary"
                    :iconLeft="{ component: PhPlus }"
                    label="Add Path"
                    @click="addPath"
                    class="add-path-btn"
                />
                
                <!-- Actions -->
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
                        @click="save"
                    />
                </div>
            </div>
        </template>
    </PopupView>
</template>

<style scoped>
.condition-config {
    padding: 20px;
    min-width: 600px;
}

.info-section {
    background: var(--background-2);
    padding: 16px;
    border-radius: var(--radius-md);
    margin-bottom: 24px;
}

.info-section p {
    margin: 0;
    color: var(--text-secondary);
    font-size: 14px;
}

.paths-container {
    display: flex;
    flex-direction: column;
    gap: 24px;
    margin-bottom: 24px;
}

.path-section {
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: 16px;
    background: var(--background-1);
}

.path-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
}

.path-name-input {
    max-width: 200px;
}

.conditions-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.condition-row {
    padding: 12px;
    background: var(--background-0);
    border-radius: var(--radius-sm);
}

.condition-inputs {
    display: grid;
    grid-template-columns: 1fr 150px 1fr auto;
    gap: 12px;
    align-items: center;
}

.add-path-btn {
    width: 100%;
    margin-bottom: 24px;
}

.config-actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
    padding-top: 16px;
    border-top: 1px solid var(--border);
}
</style>