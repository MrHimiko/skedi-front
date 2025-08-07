<!-- src/panels/user/plugins/workflows/components/step-list/view.vue -->
<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { WorkflowService } from '@user_workflows/services/workflow';
import { popup } from '@utils/popup';

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
const isLoading = ref(true);
const debugInfo = ref('');

// Computed
const flowData = computed(() => props.workflow.flow_data || { steps: [] });
const hasTrigger = computed(() => !!props.workflow.trigger_type);
const steps = computed(() => flowData.value.steps || []);

// Load available components
onMounted(async () => {
    try {
        isLoading.value = true;
        debugInfo.value = 'Starting to load components...';
        
        console.log('Loading workflow components...');
        
        // Load triggers
        debugInfo.value = 'Loading triggers...';
        const triggers = await WorkflowService.getAvailableTriggers();
        console.log('Raw triggers response:', triggers);
        availableTriggers.value = Array.isArray(triggers) ? triggers : [];
        
        // Load actions  
        debugInfo.value = 'Loading actions...';
        const actions = await WorkflowService.getAvailableActions();
        console.log('Raw actions response:', actions);
        console.log('Actions type:', typeof actions);
        console.log('Is actions array:', Array.isArray(actions));
        
        if (Array.isArray(actions)) {
            availableActions.value = actions;
            debugInfo.value = `Loaded ${actions.length} actions successfully`;
        } else {
            availableActions.value = [];
            debugInfo.value = `Actions response is not an array: ${typeof actions}`;
        }
        
        console.log('Final availableActions:', availableActions.value);
        console.log('Final availableTriggers:', availableTriggers.value);
        
        if (!actions || (Array.isArray(actions) && actions.length === 0)) {
            console.warn('No actions loaded from API');
            debugInfo.value = 'Warning: No actions loaded from API';
        }
        
    } catch (error) {
        console.error('Failed to load workflow components:', error);
        debugInfo.value = `Error loading components: ${error.message}`;
        availableTriggers.value = [];
        availableActions.value = [];
    } finally {
        isLoading.value = false;
    }
});

// Watch for changes in availableActions
watch(availableActions, (newActions, oldActions) => {
    console.log('Available actions changed from', oldActions, 'to', newActions);
}, { deep: true });

// Show add step popup
function showAddStepPopup() {
    popup.open(
        'add-step',
        null,
        AddStepMenu,
        {
            availableActions: availableActions.value,
            onSelect: addStep
        }
    );
}

// Add step
function addStep(stepType, stepConfig) {
    console.log('Adding step:', stepType, stepConfig);
    
    const newStep = WorkflowService.createStep(stepType, stepConfig.name, stepConfig.config || {});
    const newFlowData = {
        ...flowData.value,
        steps: [...steps.value, newStep]
    };
    
    emit('update', newFlowData);
    popup.close();
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
            <!-- Debug Info -->
            <div v-if="debugInfo" class="debug-panel">
                <details>
                    <summary>Debug Info</summary>
                    <div class="debug-content">
                        <p><strong>Status:</strong> {{ debugInfo }}</p>
                        <p><strong>Available Actions:</strong> {{ availableActions.length }}</p>
                        <p><strong>Available Triggers:</strong> {{ availableTriggers.length }}</p>
                        <p><strong>Is Loading:</strong> {{ isLoading }}</p>
                        <div v-if="availableActions.length > 0">
                            <p><strong>Actions:</strong></p>
                            <ul>
                                <li v-for="action in availableActions" :key="action.id">
                                    {{ action.name }} ({{ action.id }})
                                </li>
                            </ul>
                        </div>
                    </div>
                </details>
            </div>

            <!-- Loading state -->
            <div v-if="isLoading" class="loading-state">
                <div class="loading-spinner"></div>
                <p>Loading workflow components...</p>
            </div>
            
            <template v-else>
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
                    <!-- Debug info -->
                    <div v-if="availableActions.length === 0" class="debug-warning">
                        ⚠️ No actions available ({{ availableActions.length }})
                    </div>
                    
                    <div class="add-step-button" @click="showAddStepPopup">
                        <PhPlus :size="20" />
                        <span>Add Step ({{ availableActions.length }} actions)</span>
                    </div>
                </div>
            </template>
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

.debug-panel {
    background: var(--background-2);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    margin-bottom: 16px;
    padding: 12px;
}

.debug-panel summary {
    cursor: pointer;
    font-weight: 600;
    color: var(--text-primary);
}

.debug-content {
    margin-top: 8px;
    font-size: 12px;
    color: var(--text-secondary);
}

.debug-content ul {
    margin: 4px 0 0 16px;
}

.loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 200px;
}

.loading-spinner {
    width: 32px;
    height: 32px;
    border: 3px solid var(--border);
    border-top-color: var(--primary);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 16px;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

.debug-warning {
    background: var(--orange-fill);
    color: var(--orange-default);
    padding: 8px 12px;
    border-radius: var(--radius-sm);
    font-size: 12px;
    margin-bottom: 12px;
    text-align: center;
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