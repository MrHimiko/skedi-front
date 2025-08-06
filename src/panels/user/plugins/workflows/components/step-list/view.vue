<!-- src/panels/user/plugins/workflows/components/step-list/view.vue -->
<script setup>
import { ref, computed, onMounted } from 'vue';
import { WorkflowService } from '@user_workflows/services/workflow';

// Components
import StepItem from '@user_workflows/components/step-item/view.vue';
import AddStepMenu from '@user_workflows/components/add-step-menu/view.vue';

// Icons
import { PhPlus, PhLightning } from "@phosphor-icons/vue";

const props = defineProps({
    workflow: {
        type: Object,
        required: true
    }
});

const emit = defineEmits(['update']);

// State
const availableTriggers = ref([]);
const availableActions = ref([]);

// Computed
const flowData = computed(() => props.workflow.flow_data || { steps: [] });
const hasTrigger = computed(() => !!props.workflow.trigger_type);
const steps = computed(() => flowData.value.steps || []);

// Load available components
onMounted(async () => {
    try {
        const [triggers, actions] = await Promise.all([
            WorkflowService.getAvailableTriggers(),
            WorkflowService.getAvailableActions()
        ]);
        
        availableTriggers.value = triggers;
        availableActions.value = actions;
    } catch (error) {
        console.error('Failed to load workflow components:', error);
    }
});

// Add step
function addStep(stepType, stepConfig) {
    const newStep = WorkflowService.createStep(stepType, stepConfig.name, stepConfig);
    const newFlowData = {
        ...flowData.value,
        steps: [...steps.value, newStep]
    };
    
    emit('update', newFlowData);
}

// Update step
function updateStep(stepIndex, updatedStep) {
    const newSteps = [...steps.value];
    newSteps[stepIndex] = updatedStep;
    
    const newFlowData = {
        ...flowData.value,
        steps: newSteps
    };
    
    emit('update', newFlowData);
}

// Delete step
function deleteStep(stepIndex) {
    const newSteps = steps.value.filter((_, index) => index !== stepIndex);
    
    const newFlowData = {
        ...flowData.value,
        steps: newSteps
    };
    
    emit('update', newFlowData);
}

// Move step
function moveStep(fromIndex, toIndex) {
    const newSteps = [...steps.value];
    const [movedStep] = newSteps.splice(fromIndex, 1);
    newSteps.splice(toIndex, 0, movedStep);
    
    const newFlowData = {
        ...flowData.value,
        steps: newSteps
    };
    
    emit('update', newFlowData);
}

// Get trigger info
const triggerInfo = computed(() => {
    if (!hasTrigger.value) return null;
    
    const trigger = availableTriggers.value.find(t => t.id === props.workflow.trigger_type);
    return trigger || {
        id: props.workflow.trigger_type,
        name: props.workflow.trigger_type,
        description: 'Unknown trigger'
    };
});
</script>

<template>
    <div class="step-list">
        <div class="step-list-container">
            <!-- Trigger Step -->
            <div v-if="hasTrigger" class="trigger-step">
                <div class="step-card trigger">
                    <div class="step-header">
                        <div class="step-number">1</div>
                        <div class="step-icon trigger">
                            <PhLightning :size="20" weight="bold" />
                        </div>
                        <div class="step-info">
                            <div class="step-type">Trigger</div>
                            <div class="step-name">{{ triggerInfo?.name || 'Unknown Trigger' }}</div>
                            <div v-if="triggerInfo?.description" class="step-description">
                                {{ triggerInfo.description }}
                            </div>
                        </div>
                    </div>
                </div>
                <div class="step-connector"></div>
            </div>
            
            <!-- No Trigger State -->
            <div v-else class="no-trigger-state">
                <div class="no-trigger-card">
                    <PhLightning :size="24" weight="thin" />
                    <h3>No trigger selected</h3>
                    <p>Configure your workflow trigger in settings to get started</p>
                </div>
            </div>
            
            <!-- Workflow Steps -->
            <div v-for="(step, index) in steps" :key="step.id" class="workflow-step">
                <StepItem
                    :step="step"
                    :stepNumber="index + 2"
                    :availableActions="availableActions"
                    @update="(updatedStep) => updateStep(index, updatedStep)"
                    @delete="() => deleteStep(index)"
                    @move-up="index > 0 ? moveStep(index, index - 1) : null"
                    @move-down="index < steps.length - 1 ? moveStep(index, index + 1) : null"
                />
                
                <!-- Connector between steps -->
                <div v-if="index < steps.length - 1" class="step-connector"></div>
            </div>
            
            <!-- Add Step Button -->
            <div class="add-step-section">
                <div class="add-step-button" v-dropdown="{
                    component: AddStepMenu,
                    properties: {
                        availableActions: availableActions,
                        onSelect: addStep
                    }
                }">
                    <PhPlus :size="20" />
                    <span>Add Step</span>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.step-list {
    height: 100%;
    overflow-y: auto;
    padding: 24px;
}

.step-list-container {
    max-width: 800px;
    margin: 0 auto;
}

/* Trigger Step */
.trigger-step {
    margin-bottom: 16px;
}

.step-card {
    background: var(--background-1);
    border: 2px solid var(--border);
    border-radius: var(--radius-md);
    transition: all 0.2s;
}

.step-card.trigger {
    border-color: var(--success);
    background: rgba(var(--success-rgb), 0.05);
}

.step-header {
    display: flex;
    align-items: center;
    padding: 20px;
    gap: 16px;
}

.step-number {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: var(--background-2);
    color: var(--text-secondary);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 14px;
    flex-shrink: 0;
}

.step-card.trigger .step-number {
    background: var(--success);
    color: white;
}

.step-icon {
    width: 48px;
    height: 48px;
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--background-2);
    color: var(--text-secondary);
    flex-shrink: 0;
}

.step-icon.trigger {
    background: rgba(var(--success-rgb), 0.2);
    color: var(--success);
}

.step-info {
    flex: 1;
    min-width: 0;
}

.step-type {
    font-size: 11px;
    text-transform: uppercase;
    font-weight: 600;
    color: var(--text-secondary);
    margin-bottom: 4px;
}

.step-name {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 4px;
}

.step-description {
    font-size: 14px;
    color: var(--text-secondary);
}

/* No Trigger State */
.no-trigger-state {
    margin-bottom: 32px;
}

.no-trigger-card {
    background: var(--background-1);
    border: 2px dashed var(--border);
    border-radius: var(--radius-md);
    padding: 40px;
    text-align: center;
    color: var(--text-secondary);
}

.no-trigger-card svg {
    margin-bottom: 16px;
    opacity: 0.5;
}

.no-trigger-card h3 {
    margin: 0 0 8px 0;
    font-size: 18px;
    color: var(--text-primary);
}

.no-trigger-card p {
    margin: 0;
    font-size: 14px;
}

/* Workflow Step */
.workflow-step {
    margin-bottom: 16px;
}

/* Step Connector */
.step-connector {
    width: 2px;
    height: 32px;
    background: var(--border);
    margin: 0 auto;
}

/* Add Step Section */
.add-step-section {
    padding: 20px 0;
}

.add-step-button {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 16px 24px;
    background: var(--background-1);
    border: 2px dashed var(--border);
    border-radius: var(--radius-md);
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.2s;
    font-weight: 500;
}

.add-step-button:hover {
    background: var(--background-2);
    border-color: var(--primary);
    color: var(--primary);
}
</style>