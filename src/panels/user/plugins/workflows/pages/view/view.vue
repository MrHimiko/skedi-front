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

// Workflow Components
import WorkflowCanvas from '@user_workflows/components/canvas/view.vue';
import TriggerSelectPopup from '@user_workflows/components/popups/trigger-select.vue';
import ActionSelectPopup from '@user_workflows/components/popups/action-select.vue';
import NodeConfigPopup from '@user_workflows/components/popups/node-config.vue';

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

// Track initial state for change detection
let initialWorkflowState = '';

// Available triggers and actions
const availableTriggers = ref([]);
const availableActions = ref([]);

// Computed
const isActive = computed(() => workflow.value.status === 'active');
const canSave = computed(() => hasUnsavedChanges.value && !isSaving.value);

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
        common.notification('Failed to load workflow', false);
        router.push('/workflows');
    } finally {
        isLoading.value = false;
    }
}

// Load available triggers and actions
async function loadAvailableComponents() {
    try {
        const [triggersRes, actionsRes] = await Promise.all([
            api.get('user/workflows/available-triggers'),
            api.get('user/workflows/available-actions')
        ]);
        
        if (triggersRes.success) {
            availableTriggers.value = triggersRes.data;
        }
        
        if (actionsRes.success) {
            availableActions.value = actionsRes.data;
        }
    } catch (error) {
        console.error('Failed to load workflow components:', error);
    }
}

// Save workflow
async function saveWorkflow() {
    try {
        isSaving.value = true;
        
        const response = await api.patch(`user/workflows/${workflowId}`, {
            name: workflow.value.name,
            description: workflow.value.description,
            trigger_type: workflow.value.trigger_type,
            trigger_config: workflow.value.trigger_config,
            status: workflow.value.status
        });
        
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

// Add trigger node
function addTrigger() {
    popup.open(
        'trigger-select',
        null,
        TriggerSelectPopup,
        {
            triggers: availableTriggers.value,
            onSelect: async (trigger) => {
                const nodeData = {
                    node_type: 'trigger',
                    action_type: trigger.id,
                    name: trigger.name,
                    config: {},
                    position_x: 400,
                    position_y: 100
                };
                
                await addNode(nodeData);
                popup.close();
            }
        }
    );
}

// Add action after a node
function addActionAfterNode(previousNode) {
    const nodeActions = availableActions.value;
    
    popup.open(
        'action-select',
        null,
        ActionSelectPopup,
        {
            actions: nodeActions,
            showPaths: previousNode?.node_type === 'condition',
            onSelect: async (action, path) => {
                const nodeData = {
                    node_type: action.node_type || 'action', // Use the node_type from action definition
                    action_type: action.id,
                    name: action.name,
                    config: {},
                    position_x: previousNode ? previousNode.position_x : 400,
                    position_y: previousNode ? previousNode.position_y + 150 : 100
                };
                
                const newNode = await addNode(nodeData);
                
                if (newNode && previousNode) {
                    await addConnection({
                        from_node_id: previousNode.id,
                        to_node_id: newNode.id,
                        condition_type: path || null
                    });
                }
                
                popup.close();
            }
        }
    );
}
// Node management
async function addNode(nodeData) {
    try {
        const response = await api.post(`user/workflows/${workflowId}/nodes`, nodeData);
        
        if (response && response.success) {
            workflow.value.nodes.push(response.data);
            trackChanges();
            return response.data;
        }
    } catch (error) {
        common.notification('Failed to add node', false);
        return null;
    }
}

async function updateNode(nodeId, updates) {
    try {
        const response = await api.patch(`user/workflows/nodes/${nodeId}`, updates);
        
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
    if (confirm('Are you sure you want to delete this node?')) {
        try {
            const response = await api.delete(`user/workflows/nodes/${nodeId}`);
            
            if (response && response.success) {
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
        } catch (error) {
            common.notification('Failed to delete node', false);
        }
    }
}

// Connection management
async function addConnection(connectionData) {
    try {
        const response = await api.post(`user/workflows/${workflowId}/connections`, connectionData);
        
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
        const response = await api.delete(`user/workflows/connections/${connectionId}`);
        
        if (response && response.success) {
            workflow.value.connections = workflow.value.connections.filter(c => c.id !== connectionId);
            trackChanges();
        }
    } catch (error) {
        common.notification('Failed to delete connection', false);
    }
}

// Configure node
function configureNode(node) {
    const componentConfig = node.node_type === 'trigger' 
        ? availableTriggers.value.find(t => t.id === node.action_type)
        : availableActions.value.find(a => a.id === node.action_type);
    
    popup.open(
        'node-config',
        null,
        NodeConfigPopup,
        {
            node: node,
            config: componentConfig,
            onSave: async (updatedConfig) => {
                await updateNode(node.id, { config: updatedConfig });
                popup.close();
            }
        }
    );
}

// Track changes
function trackChanges() {
    const currentState = JSON.stringify(workflow.value);
    hasUnsavedChanges.value = currentState !== initialWorkflowState;
}

// Test workflow
async function testWorkflow() {
    try {
        const response = await api.post(`user/workflows/${workflowId}/test`);
        
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
    loadAvailableComponents();
    
    // Keyboard shortcuts
    const handleKeyPress = (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            if (canSave.value) {
                saveWorkflow();
            }
        }
    };
    
    document.addEventListener('keydown', handleKeyPress);
    
    onUnmounted(() => {
        document.removeEventListener('keydown', handleKeyPress);
    });
});
</script>

<template>
    <MainLayout>
        <template #heading>
            <HeadingComponent 
                :icon="'account_tree'"
                :title="workflow.name || 'Workflow'"
                :subtitle="workflow.description || 'Automate your processes'"
            >
                <template #actions>
                    <Button
                        as="tertiary"
                        :iconLeft="{ component: PhArrowLeft }"
                        label="Back"
                        @click="router.push('/workflows')"
                    />
                    <Button
                        v-if="!isLoading"
                        as="tertiary"
                        :iconLeft="{ component: PhTestTube }"
                        label="Test"
                        @click="testWorkflow"
                    />
                    <Button
                        v-if="!isLoading"
                        :as="isActive ? 'warning' : 'success'"
                        :iconLeft="{ component: isActive ? PhPause : PhPlay }"
                        :label="isActive ? 'Deactivate' : 'Activate'"
                        @click="toggleStatus"
                    />
                    <Button
                        v-if="!isLoading"
                        :iconLeft="{ component: PhFloppyDisk }"
                        label="Save"
                        :loading="isSaving"
                        :disabled="!canSave"
                        @click="saveWorkflow"
                    />
                </template>
            </HeadingComponent>
        </template>

        <template #content>
            <div class="workflow-editor">
                <div v-if="isLoading" class="loading-container">
                    <div class="loading-spinner"></div>
                    <p>Loading workflow...</p>
                </div>
                
                <WorkflowCanvas
                    v-else
                    :workflow="workflow"
                    :selectedNode="selectedNode"
                    @node-select="(node) => selectedNode = node"
                    @node-configure="configureNode"
                    @node-delete="deleteNode"
                    @add-trigger="addTrigger"
                    @add-action="addActionAfterNode"
                    @connection-delete="deleteConnection"
                />
            </div>
        </template>
    </MainLayout>
</template>

<style scoped>
.workflow-editor {
    height: calc(100vh - 120px);
    background: var(--background-0);
    position: relative;
    overflow: hidden;
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
</style>