<!-- src/panels/user/plugins/workflows/pages/view/view.vue -->
<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '@utils/api';
import { common } from '@utils/common';
import { popup } from '@utils/popup';

// Layout & Global Components
import MainLayout from '@layouts/main/view.vue';
import HeadingComponent from '@global/heading/view.vue';
import Button from '@form/button/view.vue';
import TabsComponent from '@global/tabs/view.vue';
import ConfirmComponent from '@floated/confirm/view.vue';

// Workflow Components
import WorkflowCanvas from '@user_workflows/components/canvas/view.vue';
import NodeSidebar from '@user_workflows/components/sidebar/view.vue';
import WorkflowSettingsPopup from '@user_workflows/components/settings-popup/view.vue';
import NodeConfigPopup from '@user_workflows/components/node-config-popup/view.vue';

// Icons
import { 
    PhFloppyDisk, 
    PhPlay, 
    PhGearSix, 
    PhArrowLeft,
    PhPause,
    PhTrash,
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
    trigger_type: null,
    trigger_config: {},
    nodes: [],
    connections: []
});

const isLoading = ref(true);
const isSaving = ref(false);
const hasUnsavedChanges = ref(false);
const selectedNode = ref(null);
const selectedConnection = ref(null);
const isDragging = ref(false);
const canvasRef = ref(null);

// Track initial state for change detection
let initialWorkflowState = '';

// Computed
const isActive = computed(() => workflow.value.status === 'active');
const canSave = computed(() => hasUnsavedChanges.value && !isSaving.value);
const statusClass = computed(() => ({
    'status-active': workflow.value.status === 'active',
    'status-inactive': workflow.value.status === 'inactive',
    'status-draft': workflow.value.status === 'draft'
}));

// Load workflow data
async function loadWorkflow() {
    try {
        isLoading.value = true;
        const response = await api.get(`user/workflows/${workflowId}`);
        
        if (response && response.success) {
            workflow.value = {
                ...response.data,
                nodes: response.data.nodes || [],
                connections: response.data.connections || []
            };
            
            // Store initial state
            initialWorkflowState = JSON.stringify(workflow.value);
        } else {
            common.notification('Failed to load workflow', false);
            router.push('/workflows');
        }
    } catch (error) {
        console.error('Error loading workflow:', error);
        common.notification('An error occurred while loading the workflow', false);
        router.push('/workflows');
    } finally {
        isLoading.value = false;
    }
}

// Save workflow
async function saveWorkflow() {
    try {
        isSaving.value = true;
        
        const response = await api.put(`user/workflows/${workflowId}`, {
            name: workflow.value.name,
            description: workflow.value.description,
            trigger_type: workflow.value.trigger_type,
            trigger_config: workflow.value.trigger_config,
            status: workflow.value.status
        });
        
        if (response && response.success) {
            common.notification('Workflow saved successfully', true);
            hasUnsavedChanges.value = false;
            initialWorkflowState = JSON.stringify(workflow.value);
        } else {
            common.notification('Failed to save workflow', false);
        }
    } catch (error) {
        console.error('Error saving workflow:', error);
        common.notification('An error occurred while saving', false);
    } finally {
        isSaving.value = false;
    }
}

// Toggle workflow status
async function toggleStatus() {
    const newStatus = isActive.value ? 'inactive' : 'active';
    
    try {
        const response = await api.patch(`user/workflows/${workflowId}`, {
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

// Node management
async function addNode(nodeData) {
    try {
        const response = await api.post(`workflows/${workflowId}/nodes`, nodeData);
        
        if (response && response.success) {
            workflow.value.nodes.push(response.data);
            trackChanges();
            return response.data;
        }
    } catch (error) {
        common.notification('Failed to add node', false);
    }
}

async function updateNode(nodeId, updates) {
    try {
        const response = await api.patch(`workflows/nodes/${nodeId}`, updates);
        
        if (response && response.success) {
            const index = workflow.value.nodes.findIndex(n => n.id === nodeId);
            if (index !== -1) {
                workflow.value.nodes[index] = { ...workflow.value.nodes[index], ...updates };
            }
            trackChanges();
        }
    } catch (error) {
        common.notification('Failed to update node', false);
    }
}

async function deleteNode(nodeId) {
    popup.open(
        'delete-node-confirm',
        null,
        ConfirmComponent,
        {
            as: 'red',
            description: 'Are you sure you want to delete this node? This will also remove all connections to this node.',
            endpoint: `workflows/nodes/${nodeId}`,
            type: 'delete',
            callback: (response, success) => {
                if (success) {
                    // Remove node
                    workflow.value.nodes = workflow.value.nodes.filter(n => n.id !== nodeId);
                    
                    // Remove related connections
                    workflow.value.connections = workflow.value.connections.filter(
                        c => c.from_node_id !== nodeId && c.to_node_id !== nodeId
                    );
                    
                    selectedNode.value = null;
                    trackChanges();
                    common.notification('Node deleted successfully', true);
                }
            }
        }
    );
}

// Connection management
async function addConnection(connectionData) {
    try {
        const response = await api.post(`workflows/${workflowId}/connections`, connectionData);
        
        if (response && response.success) {
            workflow.value.connections.push(response.data);
            trackChanges();
        }
    } catch (error) {
        common.notification('Failed to add connection', false);
    }
}

async function deleteConnection(connectionId) {
    try {
        const response = await api.delete(`workflows/connections/${connectionId}`);
        
        if (response && response.success) {
            workflow.value.connections = workflow.value.connections.filter(c => c.id !== connectionId);
            trackChanges();
        }
    } catch (error) {
        common.notification('Failed to delete connection', false);
    }
}

// Track changes
function trackChanges() {
    const currentState = JSON.stringify(workflow.value);
    hasUnsavedChanges.value = currentState !== initialWorkflowState;
}

// Open settings popup
function openSettings() {
    popup.open(
        'workflow-settings',
        null,
        WorkflowSettingsPopup,
        {
            workflow: workflow.value,
            callback: (updatedData) => {
                workflow.value = { ...workflow.value, ...updatedData };
                trackChanges();
                saveWorkflow();
            }
        }
    );
}

// Open node configuration
function openNodeConfig(node) {
    popup.open(
        'node-config',
        null,
        NodeConfigPopup,
        {
            node: node,
            nodeType: node.node_type,
            callback: (updatedConfig) => {
                updateNode(node.id, { config: updatedConfig });
            }
        }
    );
}

// Test workflow
async function testWorkflow() {
    try {
        const response = await api.post(`workflows/${workflowId}/test`);
        
        if (response && response.success) {
            common.notification('Test workflow executed successfully', true);
        }
    } catch (error) {
        common.notification('Failed to test workflow', false);
    }
}

// Watch for changes
watch(() => workflow.value, () => {
    trackChanges();
}, { deep: true });

// Lifecycle
onMounted(() => {
    loadWorkflow();
    
    // Prevent accidental navigation with unsaved changes
    window.addEventListener('beforeunload', handleBeforeUnload);
});

onUnmounted(() => {
    window.removeEventListener('beforeunload', handleBeforeUnload);
});

function handleBeforeUnload(e) {
    if (hasUnsavedChanges.value) {
        e.preventDefault();
        e.returnValue = '';
    }
}

// Canvas event handlers
function handleNodeClick(node) {
    selectedNode.value = node;
    selectedConnection.value = null;
}

function handleConnectionClick(connection) {
    selectedConnection.value = connection;
    selectedNode.value = null;
}

function handleCanvasClick() {
    selectedNode.value = null;
    selectedConnection.value = null;
}

function handleNodeDrop(nodeType, position) {
    addNode({
        node_type: nodeType.type,
        action_type: nodeType.action,
        name: nodeType.name,
        config: {},
        position_x: position.x,
        position_y: position.y
    });
}

function handleNodeMove(nodeId, position) {
    updateNode(nodeId, {
        position_x: position.x,
        position_y: position.y
    });
}

function handleConnect(fromNodeId, toNodeId, conditionType = null) {
    addConnection({
        from_node_id: fromNodeId,
        to_node_id: toNodeId,
        condition_type: conditionType
    });
}

// Navigation
function goBack() {
    if (hasUnsavedChanges.value) {
        popup.open(
            'unsaved-changes',
            null,
            ConfirmComponent,
            {
                description: 'You have unsaved changes. Are you sure you want to leave?',
                callback: (confirmed) => {
                    if (confirmed) {
                        router.push('/workflows');
                    }
                }
            }
        );
    } else {
        router.push('/workflows');
    }
}
</script>

<template>
    <MainLayout>
        <template #content>
            <div class="workflow-page">
                <!-- Header -->
                <HeadingComponent>
                    <template #title>
                        <div class="header-content">
                            <Button
                                :iconLeft="{ component: PhArrowLeft }"
                                as="tertiary"
                                @click="goBack"
                            />
                            <div class="title-section">
                                <input 
                                    v-model="workflow.name" 
                                    class="workflow-title-input"
                                    placeholder="Workflow name..."
                                    @change="trackChanges"
                                />
                                <span :class="['status-badge', statusClass]">
                                    {{ workflow.status }}
                                </span>
                            </div>
                        </div>
                    </template>
                    <template #right>
                        <div class="header-actions">
                            <Button
                                v-if="workflow.status !== 'draft'"
                                :iconLeft="{ component: PhTestTube }"
                                as="secondary"
                                label="Test"
                                @click="testWorkflow"
                            />
                            <Button
                                :iconLeft="{ component: isActive ? PhPause : PhPlay }"
                                :as="isActive ? 'secondary' : 'primary'"
                                :label="isActive ? 'Deactivate' : 'Activate'"
                                @click="toggleStatus"
                            />
                            <Button
                                :iconLeft="{ component: PhGearSix }"
                                as="secondary"
                                @click="openSettings"
                            />
                            <Button
                                :iconLeft="{ component: PhFloppyDisk }"
                                label="Save"
                                :disabled="!canSave"
                                :loading="isSaving"
                                @click="saveWorkflow"
                            />
                        </div>
                    </template>
                </HeadingComponent>

                <!-- Main Content -->
                <div class="workflow-builder">
                    <NodeSidebar 
                        @drag-start="isDragging = true"
                        @drag-end="isDragging = false"
                    />
                    
                    <div class="canvas-container">
                        <WorkflowCanvas
                            ref="canvasRef"
                            :workflow="workflow"
                            :selected-node="selectedNode"
                            :selected-connection="selectedConnection"
                            :is-dragging="isDragging"
                            @node-click="handleNodeClick"
                            @connection-click="handleConnectionClick"
                            @canvas-click="handleCanvasClick"
                            @node-drop="handleNodeDrop"
                            @node-move="handleNodeMove"
                            @node-delete="deleteNode"
                            @node-config="openNodeConfig"
                            @connect="handleConnect"
                            @connection-delete="deleteConnection"
                        />
                    </div>
                </div>
            </div>
        </template>
    </MainLayout>
</template>

<style scoped>
.workflow-page {
    height: 100%;
    display: flex;
    flex-direction: column;
}

.header-content {
    display: flex;
    align-items: center;
    gap: 16px;
}

.title-section {
    display: flex;
    align-items: center;
    gap: 12px;
}

.workflow-title-input {
    border: none;
    background: transparent;
    font-size: 20px;
    font-weight: 600;
    color: var(--text-primary);
    padding: 4px 8px;
    border-radius: var(--radius-sm);
    transition: background-color 0.2s;
}

.workflow-title-input:hover {
    background-color: var(--background-1);
}

.workflow-title-input:focus {
    background-color: var(--background-2);
    outline: 2px solid var(--primary);
}

.status-badge {
    padding: 4px 12px;
    border-radius: var(--radius-full);
    font-size: 12px;
    font-weight: 500;
    text-transform: uppercase;
}

.status-active {
    background-color: var(--success-light);
    color: var(--success);
}

.status-inactive {
    background-color: var(--warning-light);
    color: var(--warning);
}

.status-draft {
    background-color: var(--background-2);
    color: var(--text-secondary);
}

.header-actions {
    display: flex;
    gap: 8px;
}

.workflow-builder {
    flex: 1;
    display: flex;
    gap: 16px;
    padding: 16px;
    overflow: hidden;
}

.canvas-container {
    flex: 1;
    position: relative;
    background-color: var(--background-0);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    overflow: hidden;
}
</style>