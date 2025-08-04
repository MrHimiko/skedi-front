<!-- src/panels/user/plugins/workflows/components/canvas/view.vue -->
<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import WorkflowNode from '../node/view.vue';
import WorkflowConnection from '../connection/view.vue';
import Button from '@form/button/view.vue';
import { PhPlus, PhMagnifyingGlassPlus, PhMagnifyingGlassMinus } from "@phosphor-icons/vue";

const props = defineProps({
    workflow: {
        type: Object,
        required: true
    },
    selectedNode: {
        type: Object,
        default: null
    }
});

const emit = defineEmits([
    'node-select',
    'node-configure', 
    'node-delete',
    'add-trigger',
    'add-action',
    'connection-delete'
]);

// Canvas state
const canvasEl = ref(null);
const transform = ref({ x: 0, y: 0, scale: 1 });
const isPanning = ref(false);
const panStart = ref({ x: 0, y: 0 });

// Computed
const canvasStyle = computed(() => ({
    transform: `translate(${transform.value.x}px, ${transform.value.y}px) scale(${transform.value.scale})`,
    transformOrigin: '0 0',
    transition: isPanning.value ? 'none' : 'transform 0.2s ease'
}));

const hasTrigger = computed(() => {
    return props.workflow.nodes.some(n => n.node_type === 'trigger');
});

// Pan and zoom functions
function zoomIn() {
    transform.value.scale = Math.min(transform.value.scale + 0.1, 2);
}

function zoomOut() {
    transform.value.scale = Math.max(transform.value.scale - 0.1, 0.5);
}

function resetView() {
    transform.value = { x: 0, y: 0, scale: 1 };
}

function handleWheel(e) {
    if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        transform.value.scale = Math.max(0.5, Math.min(2, transform.value.scale + delta));
    }
}

function handleMouseDown(e) {
    if (e.button === 0 && !e.target.closest('.workflow-node')) {
        isPanning.value = true;
        panStart.value = { x: e.clientX - transform.value.x, y: e.clientY - transform.value.y };
    }
}

function handleMouseMove(e) {
    if (isPanning.value) {
        transform.value.x = e.clientX - panStart.value.x;
        transform.value.y = e.clientY - panStart.value.y;
    }
}

function handleMouseUp() {
    isPanning.value = false;
}

// Get last node in chain
function getLastNode() {
    if (props.workflow.nodes.length === 0) return null;
    
    // Find node that has no outgoing connections
    const nodeIds = props.workflow.nodes.map(n => n.id);
    const targetNodeIds = props.workflow.connections.map(c => c.to_node_id);
    const sourceNodeIds = props.workflow.connections.map(c => c.from_node_id);
    
    // Find nodes that are sources but not targets (end nodes)
    const endNodes = props.workflow.nodes.filter(n => 
        sourceNodeIds.includes(n.id) && !targetNodeIds.includes(n.id)
    );
    
    if (endNodes.length > 0) {
        return endNodes[0];
    }
    
    // If no end nodes, find nodes that are not sources at all
    const unconnectedNodes = props.workflow.nodes.filter(n => 
        !sourceNodeIds.includes(n.id)
    );
    
    return unconnectedNodes.length > 0 ? unconnectedNodes[0] : props.workflow.nodes[props.workflow.nodes.length - 1];
}

// Calculate connection path
function getConnectionPath(connection) {
    const fromNode = props.workflow.nodes.find(n => n.id === connection.from_node_id);
    const toNode = props.workflow.nodes.find(n => n.id === connection.to_node_id);
    
    if (!fromNode || !toNode) return '';
    
    const from = {
        x: fromNode.position_x + 250, // node width
        y: fromNode.position_y + 40   // node height / 2
    };
    
    const to = {
        x: toNode.position_x,
        y: toNode.position_y + 40
    };
    
    const controlOffset = Math.abs(to.x - from.x) * 0.5;
    
    return `M ${from.x} ${from.y} C ${from.x + controlOffset} ${from.y}, ${to.x - controlOffset} ${to.y}, ${to.x} ${to.y}`;
}

// Lifecycle
onMounted(() => {
    const canvas = canvasEl.value;
    if (canvas) {
        canvas.addEventListener('wheel', handleWheel, { passive: false });
    }
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
});

onUnmounted(() => {
    const canvas = canvasEl.value;
    if (canvas) {
        canvas.removeEventListener('wheel', handleWheel);
    }
    
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
});
</script>

<template>
    <div class="workflow-canvas-container">
        <!-- Zoom controls -->
        <div class="canvas-controls">
            <Button
                as="tertiary icon"
                :iconLeft="{ component: PhMagnifyingGlassPlus }"
                @click="zoomIn"
                v-tooltip="{ content: 'Zoom in' }"
            />
            <Button
                as="tertiary icon"
                :iconLeft="{ component: PhMagnifyingGlassMinus }"
                @click="zoomOut"
                v-tooltip="{ content: 'Zoom out' }"
            />
            <Button
                as="tertiary"
                label="Reset"
                @click="resetView"
                v-tooltip="{ content: 'Reset view' }"
            />
        </div>
        
        <!-- Canvas -->
        <div 
            ref="canvasEl"
            class="workflow-canvas"
            @mousedown="handleMouseDown"
        >
            <div class="canvas-content" :style="canvasStyle">
                <!-- Grid background -->
                <div class="canvas-grid"></div>
                
                <!-- Connections -->
                <svg class="connections-layer">
                    <g v-for="connection in workflow.connections" :key="connection.id">
                        <path
                            :d="getConnectionPath(connection)"
                            class="connection-path"
                            :class="{ 
                                'condition-true': connection.condition_type === 'true',
                                'condition-false': connection.condition_type === 'false'
                            }"
                        />
                    </g>
                </svg>
                
                <!-- Nodes -->
                <WorkflowNode
                    v-for="node in workflow.nodes"
                    :key="node.id"
                    :node="node"
                    :selected="selectedNode?.id === node.id"
                    :connections="workflow.connections"
                    @select="$emit('node-select', node)"
                    @configure="$emit('node-configure', node)"
                    @delete="$emit('node-delete', node.id)"
                    @add-action="$emit('add-action', node)"
                />
                
                <!-- Empty state / Add trigger -->
                <div v-if="!hasTrigger" class="empty-state">
                    <Button
                        :iconLeft="{ component: PhPlus }"
                        label="Add trigger"
                        @click="$emit('add-trigger')"
                    />
                    <p class="empty-text">Select the event that starts your workflow</p>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.workflow-canvas-container {
    position: relative;
    width: 100%;
    height: 100%;
}

.canvas-controls {
    position: absolute;
    top: 20px;
    right: 20px;
    z-index: 10;
    display: flex;
    gap: 8px;
    background: var(--background-1);
    padding: 8px;
    border-radius: var(--radius-md);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.workflow-canvas {
    width: 100%;
    height: 100%;
    overflow: hidden;
    cursor: grab;
    background: var(--background-0);
}

.workflow-canvas:active {
    cursor: grabbing;
}

.canvas-content {
    position: relative;
    width: 100%;
    height: 100%;
}

.canvas-grid {
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background-image: 
        linear-gradient(var(--border) 1px, transparent 1px),
        linear-gradient(90deg, var(--border) 1px, transparent 1px);
    background-size: 50px 50px;
    opacity: 0.5;
}

.connections-layer {
    position: absolute;
    top: 0;
    left: 0;
    width: 5000px;
    height: 5000px;
    pointer-events: none;
}

.connection-path {
    stroke: var(--border-strong);
    stroke-width: 2;
    fill: none;
}

.connection-path.condition-true {
    stroke: var(--success);
}

.connection-path.condition-false {
    stroke: var(--error);
}

.empty-state {
    position: absolute;
    top: 100px;
    left: 50%;
    transform: translateX(-50%);
    text-align: center;
}

.empty-text {
    margin-top: 12px;
    color: var(--text-secondary);
    font-size: 14px;
}
</style>