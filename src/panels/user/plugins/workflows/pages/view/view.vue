<!-- src/panels/user/plugins/workflows/pages/view/view.vue -->
<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { WorkflowService } from '@user_workflows/services/workflow';
import { common } from '@utils/common';
import { popup } from '@utils/popup';

// Layout & Components
import MainLayout from '@layouts/main/view.vue';
import HeadingComponent from '@global/heading/view.vue';
import Button from '@form/button/view.vue';
import Input from '@form/input/view.vue';
import Textarea from '@form/textarea/view.vue';

// Workflow Components
import StepList from '@user_workflows/components/step-list/view.vue';
import WorkflowSettings from '@user_workflows/components/popups/workflow-settings.vue';

// Icons
import { 
    PhFloppyDisk, 
    PhPlay, 
    PhGearSix, 
    PhArrowLeft,
    PhPause,
    PhTestTube
} from "@phosphor-icons/vue";

const route = useRoute();
const router = useRouter();
const workflowId = route.params.id;

// State
const workflow = ref({
    id: null,
    name: 'Untitled Workflow',
    description: '',
    status: 'draft',
    trigger_type: '',
    trigger_config: {},
    flow_data: { steps: [] }
});

const isLoading = ref(true);
const isSaving = ref(false);
const hasUnsavedChanges = ref(false);
const isEditingBasicInfo = ref(false);

// Track initial state
let initialWorkflowState = '';

// Computed
const isActive = computed(() => workflow.value.status === 'active');
const canSave = computed(() => hasUnsavedChanges.value && !isSaving.value);
const stepCount = computed(() => workflow.value.flow_data?.steps?.length || 0);

// Load workflow data
async function loadWorkflow() {
    try {
        isLoading.value = true;
        const data = await WorkflowService.getWorkflow(workflowId);
        
        if (data) {
            workflow.value = {
                ...data,
                flow_data: data.flow_data || { steps: [] }
            };
            
            // Store initial state for change detection
            initialWorkflowState = JSON.stringify(workflow.value);
        } else {
            common.notification('Workflow not found', false);
            router.push('/workflows');
        }
    } catch (error) {
        common.notification('Failed to load workflow', false);
        router.push('/workflows');
    } finally {
        isLoading.value = false;
    }
}

// Save workflow
async function saveWorkflow() {
    try {
        isSaving.value = true;
        
        // Save basic workflow info
        const response = await WorkflowService.updateWorkflow(workflowId, {
            name: workflow.value.name,
            description: workflow.value.description,
            status: workflow.value.status
        });
        
        // Save flow data separately
        await WorkflowService.updateFlowData(workflowId, workflow.value.flow_data);
        
        if (response && response.success) {
            initialWorkflowState = JSON.stringify(workflow.value);
            hasUnsavedChanges.value = false;
            common.notification('Workflow saved successfully', true);
        }
    } catch (error) {
        common.notification('Failed to save workflow', false);
    } finally {
        isSaving.value = false;
    }
}

// Toggle workflow status
async function toggleStatus() {
    const newStatus = workflow.value.status === 'active' ? 'inactive' : 'active';
    
    try {
        const response = await WorkflowService.updateWorkflow(workflowId, {
            status: newStatus
        });
        
        if (response && response.success) {
            workflow.value.status = newStatus;
            common.notification(`Workflow ${newStatus === 'active' ? 'activated' : 'deactivated'}`, true);
            trackChanges();
        }
    } catch (error) {
        common.notification('Failed to update workflow status', false);
    }
}

// Test workflow
async function testWorkflow() {
    try {
        const response = await WorkflowService.testWorkflow(workflowId);
        
        if (response && response.success) {
            common.notification('Test completed successfully', true);
        }
    } catch (error) {
        common.notification('Failed to test workflow', false);
    }
}

// Open workflow settings
function openWorkflowSettings() {
    popup.open(
        'workflow-settings',
        null,
        WorkflowSettings,
        {
            workflow: workflow.value,
            callback: (updatedData) => {
                Object.assign(workflow.value, updatedData);
                trackChanges();
                popup.close();
            }
        }
    );
}

// Handle flow data changes
function onFlowDataUpdate(newFlowData) {
    workflow.value.flow_data = newFlowData;
    trackChanges();
}

// Track changes for save state
function trackChanges() {
    const currentState = JSON.stringify(workflow.value);
    hasUnsavedChanges.value = currentState !== initialWorkflowState;
}

// Toggle basic info editing
function toggleBasicInfoEdit() {
    isEditingBasicInfo.value = !isEditingBasicInfo.value;
}

// Save basic info
function saveBasicInfo() {
    isEditingBasicInfo.value = false;
    trackChanges();
}

// Watch for changes in workflow data
watch(() => workflow.value, () => {
    trackChanges();
}, { deep: true });

// Keyboard shortcuts
function handleKeyPress(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (canSave.value) {
            saveWorkflow();
        }
    }
}

// Lifecycle
onMounted(() => {
    loadWorkflow();
    document.addEventListener('keydown', handleKeyPress);
});

onUnmounted(() => {
    document.removeEventListener('keydown', handleKeyPress);
});
</script>

<template>
    <MainLayout>
        <template #content>
            <div class="workflow-editor">
                <!-- Loading State -->
                <div v-if="isLoading" class="loading-container">
                    <div class="loading-spinner"></div>
                    <p>Loading workflow...</p>
                </div>
                
                <!-- Workflow Editor -->
                <div v-else class="editor-container">
                    <!-- Header -->
                    <div class="editor-header">
                        <div class="header-left">
                            <div>
                                <Button
                                    as="tertiary"
                                    :iconLeft="{ component: PhArrowLeft }"
                                    label="Back to Workflows"
                                    @click="router.push('/workflows')"
                                />
                            </div>
                            
                            <!-- Workflow Title Section -->
                            <div class="workflow-title-section">
                                <div v-if="!isEditingBasicInfo" class="title-display">
                                    <h1 @click="toggleBasicInfoEdit" class="workflow-title">
                                        {{ workflow.name }}
                                    </h1>
                                    <p v-if="workflow.description" @click="toggleBasicInfoEdit" class="workflow-description">
                                        {{ workflow.description }}
                                    </p>
                                    <p v-else @click="toggleBasicInfoEdit" class="no-description">
                                        Click to add description
                                    </p>
                                </div>
                                
                                <div v-else class="title-edit">
                                    <Input
                                        v-model="workflow.name"
                                        placeholder="Workflow name"
                                        @keyup.enter="saveBasicInfo"
                                        @keyup.escape="toggleBasicInfoEdit"
                                    />
                                    <Textarea
                                        v-model="workflow.description"
                                        placeholder="Workflow description (optional)"
                                        rows="2"
                                        @keyup.escape="toggleBasicInfoEdit"
                                    />
                                    <div class="edit-actions">
                                        <Button as="tertiary" label="Cancel" @click="toggleBasicInfoEdit" />
                                        <Button label="Save" @click="saveBasicInfo" />
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="header-right">
                            <div class="workflow-stats">
                                <span class="step-count">{{ stepCount }} steps</span>
                                <span :class="['status-indicator', workflow.status]">{{ workflow.status }}</span>
                            </div>
                            
                            <div class="header-actions">
                                <Button
                                    as="tertiary"
                                    :iconLeft="{ component: PhGearSix }"
                                    label="Settings"
                                    @click="openWorkflowSettings"
                                />
                                <Button
                                    as="tertiary"
                                    :iconLeft="{ component: PhTestTube }"
                                    label="Test"
                                    @click="testWorkflow"
                                />
                                <Button
                                    :as="isActive ? 'warning' : 'success'"
                                    :iconLeft="{ component: isActive ? PhPause : PhPlay }"
                                    :label="isActive ? 'Deactivate' : 'Activate'"
                                    @click="toggleStatus"
                                />
                                <Button
                                    :iconLeft="{ component: PhFloppyDisk }"
                                    label="Save"
                                    :loading="isSaving"
                                    :disabled="!canSave"
                                    @click="saveWorkflow"
                                />
                            </div>
                        </div>
                    </div>
                    
                    <!-- Main Editor Content -->
                    <div class="editor-content">
                        <StepList
                            :workflow="workflow"
                            @update="onFlowDataUpdate"
                        />
                    </div>
                </div>
            </div>
        </template>
    </MainLayout>
</template>

<style scoped>
.workflow-editor {
    height: calc(100vh - 120px);
    background: var(--background-0);
    display: flex;
    flex-direction: column;
}

.loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
}

.loading-spinner {
    width: 40px;
    height: 40px;
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

.editor-container {
    height: 100%;
    display: flex;
    flex-direction: column;
}

.editor-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 24px;
    background: var(--background-1);
    border-bottom: 1px solid var(--border);
}

.header-left {
    display: flex;
    align-items: center;
    gap: 24px;
    flex: 1;
}

.workflow-title-section {
    flex: 1;
    max-width: 600px;
}

.title-display {
    cursor: pointer;
}

.title-display:hover .workflow-title {
    color: var(--primary);
}

.workflow-title {
    font-size: 24px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 4px 0;
    transition: color 0.2s;
}

.workflow-description {
    color: var(--text-secondary);
    margin: 0;
    font-size: 14px;
}

.no-description {
    color: var(--text-tertiary);
    margin: 0;
    font-size: 14px;
    font-style: italic;
}

.title-edit {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.edit-actions {
    display: flex;
    gap: 8px;
}

.header-right {
    display: flex;
    align-items: center;
    gap: 24px;
}

.workflow-stats {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 4px;
}

.step-count {
    font-size: 12px;
    color: var(--text-secondary);
}

.status-indicator {
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
}

.status-indicator.active {
    background: var(--green-fill);
    color: var(--green-default);
}

.status-indicator.inactive {
    background: var(--orange-fill);
    color: var(--orange-default);
}

.status-indicator.draft {
    background: var(--background-2);
    color: var(--text-secondary);
}

.header-actions {
    display: flex;
    gap: 8px;
}

.editor-content {
    flex: 1;
    overflow: hidden;
    background: var(--background-0);
}
</style>