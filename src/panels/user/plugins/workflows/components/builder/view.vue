// src/panels/user/plugins/workflows/components/builder/view.vue
<script setup>
import { ref, onMounted, watch, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '@utils/api';
import { popup } from '@utils/popup';

// Components
import ButtonComponent from '@form/button/view.vue';
import InputComponent from '@form/input/view.vue';
import SelectComponent from '@form/select/view.vue';
import MenusComponent from '@global/menus/view.vue';

// Workflow components
import WorkflowNode from './workflow-node.vue';
import ActionConfigModal from '../modals/action-config.vue';
import ConditionConfigModal from '../modals/condition-config.vue';

// Icons
import { 
    PhPlus,
    PhPlay,
    PhPause,
    PhFloppyDisk,
    PhArrowLeft,
    PhDotsThree,
    PhTrash,
    PhGitBranch
} from "@phosphor-icons/vue";

const props = defineProps({
    workflowId: {
        type: [Number, String],
        required: true
    }
});

const router = useRouter();

// State
const workflow = ref(null);
const nodes = ref([]);
const connections = ref([]);
const availableActions = ref([]);
const availableTriggers = ref([]);
const loading = ref(true);
const saving = ref(false);
const isDragging = ref(false);
const draggedNode = ref(null);
const selectedNode = ref(null);
const canvas = ref(null);

// Canvas state
const canvasOffset = ref({ x: 0, y: 0 });
const zoom = ref(1);

// Computed
const isActive = computed(() => workflow.value?.status === 'active');

// Methods
async function loadWorkflow() {
    try {
        loading.value = true;
        
        const response = await api.get(`user/workflows/${props.workflowId}`);
        
        if (response.success) {
            workflow.value = response.data;
            nodes.value = response.data.nodes || [];
            connections.value = response.data.connections || [];
        }
    } catch (error) {
        console.error('Failed to load workflow:', error);
    } finally {
        loading.value = false;
    }
}

async function loadAvailableActions() {
    try {
        const [actionsResponse, triggersResponse] = await Promise.all([
            api.get('user/workflows/available-actions'),
            api.get('user/workflows/available-triggers')
        ]);
        
        if (actionsResponse.success) {
            availableActions.value = actionsResponse.data;
        }
        
        if (triggersResponse.success) {
            availableTriggers.value = triggersResponse.data;
        }
    } catch (error) {
        console.error('Failed to load available actions:', error);
    }
}

async function saveWorkflow() {
    try {
        saving.value = true;
        
        const response = await api.patch(`user/workflows/${props.workflowId}`, {
            name: workflow.value.name,
            description: workflow.value.description,
            status: workflow.value.status
        });
        
        if (response.success) {
            // Show success message
        }
    } catch (error) {
        console.error('Failed to save workflow:', error);
    } finally {
        saving.value = false;
    }
}

async function toggleWorkflowStatus() {
    try {
        const newStatus = workflow.value.status === 'active' ? 'inactive' : 'active';
        const response = await api.patch(`user/workflows/${props.workflowId}`, {
            status: newStatus
        });
        
        if (response.success) {
            workflow.value.status = newStatus;
        }
    } catch (error) {
        console.error('Failed to toggle workflow status:', error);
    }
}

function addAction(actionType) {
    popup({
        component: ActionConfigModal,
        overlay: { position: 'center' },
        properties: {
            action: availableActions.value.find(a => a.id === actionType),
            onSave: async (config) => {
                try {
                    const response = await api.post(`user/workflows/${props.workflowId}/nodes`, {
                        node_type: 'action',
                        action_type: actionType,
                        config: config,
                        position_x: 400,
                        position_y: nodes.value.length * 150 + 100
                    });
                    
                    if (response.success) {
                        nodes.value.push(response.data);
                        
                        // Auto-connect to previous node if exists
                        if (nodes.value.length > 1) {
                            const previousNode = nodes.value[nodes.value.length - 2];
                            await createConnection(previousNode.id, response.data.id);
                        }
                    }
                } catch (error) {
                    console.error('Failed to add action:', error);
                }
            }
        }
    });
}

function addCondition() {
    popup({
        component: ConditionConfigModal,
        overlay: { position: 'center' },
        properties: {
            variables: getAvailableVariables(),
            onSave: async (config) => {
                try {
                    const response = await api.post(`user/workflows/${props.workflowId}/nodes`, {
                        node_type: 'condition',
                        config: config,
                        position_x: 400,
                        position_y: nodes.value.length * 150 + 100
                    });
                    
                    if (response.success) {
                        nodes.value.push(response.data);
                    }
                } catch (error) {
                    console.error('Failed to add condition:', error);
                }
            }
        }
    });
}

async function createConnection(fromNodeId, toNodeId, conditionType = null) {
    try {
        const response = await api.post(`user/workflows/${props.workflowId}/connections`, {
            from_node_id: fromNodeId,
            to_node_id: toNodeId,
            condition_type: conditionType
        });
        
        if (response.success) {
            connections.value.push(response.data);
        }
    } catch (error) {
        console.error('Failed to create connection:', error);
    }
}

async function deleteNode(nodeId) {
    try {
        const response = await api.delete(`user/workflows/nodes/${nodeId}`);
        
        if (response.success) {
            nodes.value = nodes.value.filter(n => n.id !== nodeId);
            connections.value = connections.value.filter(c => 
                c.from_node_id !== nodeId && c.to_node_id !== nodeId
            );
        }
    } catch (error) {
        console.error('Failed to delete node:', error);
    }
}

function getNodeMenus(node) {
    return [
        {
            label: 'Configure',
            iconComponent: PhDotsThree,
            onClick: () => configureNode(node)
        },
        {
            label: 'Delete',
            iconComponent: PhTrash,
            onClick: () => deleteNode(node.id)
        }
    ];
}

function configureNode(node) {
    if (node.node_type === 'action') {
        const action = availableActions.value.find(a => a.id === node.action_type);
        popup({
            component: ActionConfigModal,
            overlay: { position: 'center' },
            properties: {
                action: action,
                config: node.config,
                onSave: async (config) => {
                    try {
                        const response = await api.patch(`user/workflows/nodes/${node.id}`, {
                            config: config
                        });
                        
                        if (response.success) {
                            node.config = config;
                        }
                    } catch (error) {
                        console.error('Failed to update node:', error);
                    }
                }
            }
        });
    } else if (node.node_type === 'condition') {
        popup({
            component: ConditionConfigModal,
            overlay: { position: 'center' },
            properties: {
                variables: getAvailableVariables(),
                config: node.config,
                onSave: async (config) => {
                    try {
                        const response = await api.patch(`user/workflows/nodes/${node.id}`, {
                            config: config
                        });
                        
                        if (response.success) {
                            node.config = config;
                        }
                    } catch (error) {
                        console.error('Failed to update node:', error);
                    }
                }
            }
        });
    }
}

function getAvailableVariables() {
    const trigger = availableTriggers.value.find(t => t.id === workflow.value.trigger_type);
    return trigger?.variables || {};
}

function getActionMenus() {
    const categorized = {};
    
    availableActions.value.forEach(action => {
        if (!categorized[action.category]) {
            categorized[action.category] = [];
        }
        categorized[action.category].push({
            label: action.name,
            description: action.description,
            onClick: () => addAction(action.id)
        });
    });
    
    const menus = [];
    Object.keys(categorized).forEach(category => {
        if (menus.length > 0) {
            menus.push({ type: 'separator' });
        }
        menus.push({ label: category.charAt(0).toUpperCase() + category.slice(1), type: 'header' });
        menus.push(...categorized[category]);
    });
    
    return menus;
}

// SVG path for connections
function getConnectionPath(fromNode, toNode) {
    const from = {
        x: fromNode.position_x + 200,
        y: fromNode.position_y + 40
    };
    const to = {
        x: toNode.position_x,
        y: toNode.position_y + 40
    };
    
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dr = Math.sqrt(dx * dx + dy * dy);
    
    return `M ${from.x} ${from.y} C ${from.x + 100} ${from.y}, ${to.x - 100} ${to.y}, ${to.x} ${to.y}`;
}

// Lifecycle
onMounted(() => {
    loadWorkflow();
    loadAvailableActions();
});
</script>

<template>
    <div class="workflow-builder">
        <div class="builder-header">
            <div class="header-left">
                <ButtonComponent
                    as="tertiary"
                    :iconLeft="{ component: PhArrowLeft }"
                    label="Back to Workflows"
                    @click="router.push('/workflows')"
                />
                
                <div class="workflow-title" v-if="workflow">
                    <InputComponent
                        v-model="workflow.name"
                        placeholder="Workflow Name"
                        @change="saveWorkflow"
                    />
                </div>
            </div>
            
            <div class="header-right">
                <ButtonComponent
                    :as="isActive ? 'secondary' : 'brand'"
                    :iconLeft="{ component: isActive ? PhPause : PhPlay }"
                    :label="isActive ? 'Pause' : 'Activate'"
                    @click="toggleWorkflowStatus"
                />
                
                <ButtonComponent
                    as="stroke"
                    :iconLeft="{ component: PhFloppyDisk }"
                    label="Save"
                    :loading="saving"
                    @click="saveWorkflow"
                />
            </div>
        </div>
        
        <div class="builder-content" v-if="workflow">
            <div class="builder-sidebar">
                <div class="sidebar-section">
                    <h3>Trigger</h3>
                    <div class="trigger-info">
                        <PhFlowArrow :size="20" />
                        <div>
                            <p class="trigger-name">{{ workflow.trigger_type }}</p>
                            <p class="trigger-desc">{{ availableTriggers.find(t => t.id === workflow.trigger_type)?.description }}</p>
                        </div>
                    </div>
                </div>
                
                <div class="sidebar-section">
                    <h3>Actions</h3>
                    <ButtonComponent
                        as="secondary"
                        :iconLeft="{ component: PhPlus }"
                        label="Add Action"
                        v-dropdown="{
                            component: MenusComponent,
                            properties: {
                                menus: getActionMenus()
                            }
                        }"
                    />
                    
                    <ButtonComponent
                        as="secondary"
                        :iconLeft="{ component: PhGitBranch }"
                        label="Add Condition"
                        @click="addCondition"
                        style="margin-top: 8px;"
                    />
                </div>
            </div>
            
            <div class="builder-canvas" ref="canvas">
                <svg class="connections-svg">
                    <g v-for="connection in connections" :key="connection.id">
                        <path
                            :d="getConnectionPath(
                                nodes.find(n => n.id === connection.from_node_id),
                                nodes.find(n => n.id === connection.to_node_id)
                            )"
                            stroke="#CBD5E1"
                            stroke-width="2"
                            fill="none"
                        />
                    </g>
                </svg>
                
                <div class="nodes-container">
                    <WorkflowNode
                        v-for="node in nodes"
                        :key="node.id"
                        :node="node"
                        :selected="selectedNode?.id === node.id"
                        @click="selectedNode = node"
                        @configure="configureNode"
                        @delete="deleteNode"
                    />
                </div>
                
                <div v-if="!nodes.length" class="empty-canvas">
                    <p>Add your first action to get started</p>
                </div>
            </div>
        </div>
        
        <div v-else class="loading-state">
            <div class="loading-spinner"></div>
            <p>Loading workflow...</p>
        </div>
    </div>
</template>

<style scoped>
.workflow-builder {
    display: flex;
    flex-direction: column;
    height: 100vh;
    background: #F9FAFB;
}

.builder-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 24px;
    background: white;
    border-bottom: 1px solid #E5E7EB;
}

.header-left {
    display: flex;
    align-items: center;
    gap: 24px;
}

.workflow-title {
    min-width: 300px;
}

.header-right {
    display: flex;
    gap: 12px;
}

.builder-content {
    display: flex;
    flex: 1;
    overflow: hidden;
}

.builder-sidebar {
    width: 280px;
    background: white;
    border-right: 1px solid #E5E7EB;
    padding: 24px;
    overflow-y: auto;
}

.sidebar-section {
    margin-bottom: 32px;
}

.sidebar-section h3 {
    font-size: 14px;
    font-weight: 600;
    color: #6B7280;
    text-transform: uppercase;
    margin-bottom: 16px;
}

.trigger-info {
    display: flex;
    gap: 12px;
    padding: 16px;
    background: #F9FAFB;
    border-radius: 8px;
}

.trigger-name {
    font-weight: 500;
    margin-bottom: 4px;
}

.trigger-desc {
    font-size: 14px;
    color: #6B7280;
}

.builder-canvas {
    flex: 1;
    position: relative;
    overflow: auto;
}

.connections-svg {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
}

.nodes-container {
    position: relative;
    min-height: 100%;
    padding: 40px;
}

.empty-canvas {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: #9CA3AF;
}

.loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
}

.loading-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid #F3F4F6;
    border-top-color: #3B82F6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 16px;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}
</style>