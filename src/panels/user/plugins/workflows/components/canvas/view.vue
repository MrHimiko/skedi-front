<!-- src/panels/user/plugins/workflows/components/canvas/view.vue -->
<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import WorkflowNode from '../node/view.vue';
import WorkflowConnection from '../connection/view.vue';

const props = defineProps({
    workflow: {
        type: Object,
        required: true
    },
    selectedNode: {
        type: Object,
        default: null
    },
    selectedConnection: {
        type: Object,
        default: null
    },
    isDragging: {
        type: Boolean,
        default: false
    }
});

const emit = defineEmits([
    'node-click',
    'connection-click',
    'canvas-click',
    'node-drop',
    'node-move',
    'node-delete',
    'node-config',
    'connect',
    'connection-delete'
]);

// Canvas state
const canvasEl = ref(null);
const containerEl = ref(null);
const transform = ref({ x: 0, y: 0, scale: 1 });
const isPanning = ref(false);
const panStart = ref({ x: 0, y: 0 });
const isConnecting = ref(false);
const connectingFrom = ref(null);
const tempConnection = ref(null);
const mousePos = ref({ x: 0, y: 0 });

// Node positions cache for performance
const nodePositions = computed(() => {
    const positions = {};
    props.workflow.nodes.forEach(node => {
        positions[node.id] = {
            x: node.position_x || 0,
            y: node.position_y || 0,
            width: 200,
            height: 80
        };
    });
    return positions;
});

// Connection paths
const connectionPaths = computed(() => {
    return props.workflow.connections.map(conn => {
        const fromNode = nodePositions.value[conn.from_node_id];
        const toNode = nodePositions.value[conn.to_node_id];
        
        if (!fromNode || !toNode) return null;
        
        return {
            ...conn,
            path: calculatePath(
                fromNode.x + fromNode.width,
                fromNode.y + fromNode.height / 2,
                toNode.x,
                toNode.y + toNode.height / 2
            )
        };
    }).filter(Boolean);
});

// Canvas transform style
const canvasStyle = computed(() => ({
    transform: `translate(${transform.value.x}px, ${transform.value.y}px) scale(${transform.value.scale})`,
    transformOrigin: '0 0'
}));

// Calculate bezier path between nodes
function calculatePath(x1, y1, x2, y2) {
    const distance = Math.abs(x2 - x1);
    const controlPointOffset = Math.min(distance * 0.5, 100);
    
    return `M ${x1} ${y1} C ${x1 + controlPointOffset} ${y1}, ${x2 - controlPointOffset} ${y2}, ${x2} ${y2}`;
}

// Pan and zoom handlers
function handleWheel(e) {
    if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        const newScale = Math.min(Math.max(transform.value.scale * delta, 0.3), 2);
        
        // Zoom towards mouse position
        const rect = canvasEl.value.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        transform.value = {
            x: x - (x - transform.value.x) * (newScale / transform.value.scale),
            y: y - (y - transform.value.y) * (newScale / transform.value.scale),
            scale: newScale
        };
    } else {
        // Pan with mouse wheel
        transform.value.x -= e.deltaX;
        transform.value.y -= e.deltaY;
    }
}

function handleMouseDown(e) {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
        // Middle mouse or Alt+Left click for panning
        isPanning.value = true;
        panStart.value = {
            x: e.clientX - transform.value.x,
            y: e.clientY - transform.value.y
        };
        e.preventDefault();
    }
}

function handleMouseMove(e) {
    const rect = canvasEl.value.getBoundingClientRect();
    mousePos.value = {
        x: (e.clientX - rect.left - transform.value.x) / transform.value.scale,
        y: (e.clientY - rect.top - transform.value.y) / transform.value.scale
    };
    
    if (isPanning.value) {
        transform.value.x = e.clientX - panStart.value.x;
        transform.value.y = e.clientY - panStart.value.y;
    }
    
    if (isConnecting.value && connectingFrom.value) {
        const fromNode = nodePositions.value[connectingFrom.value];
        if (fromNode) {
            tempConnection.value = {
                path: calculatePath(
                    fromNode.x + fromNode.width,
                    fromNode.y + fromNode.height / 2,
                    mousePos.value.x,
                    mousePos.value.y
                )
            };
        }
    }
}

function handleMouseUp() {
    isPanning.value = false;
    if (isConnecting.value) {
        isConnecting.value = false;
        connectingFrom.value = null;
        tempConnection.value = null;
    }
}

function handleCanvasClick(e) {
    if (e.target === canvasEl.value || e.target === containerEl.value) {
        emit('canvas-click');
    }
}

// Drag and drop handlers
function handleDragOver(e) {
    if (props.isDragging) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    }
}

function handleDrop(e) {
    e.preventDefault();
    
    const nodeTypeData = e.dataTransfer.getData('nodeType');
    if (nodeTypeData) {
        const nodeType = JSON.parse(nodeTypeData);
        const rect = canvasEl.value.getBoundingClientRect();
        
        const position = {
            x: (e.clientX - rect.left - transform.value.x) / transform.value.scale,
            y: (e.clientY - rect.top - transform.value.y) / transform.value.scale
        };
        
        emit('node-drop', nodeType, position);
    }
}

// Node event handlers
function handleNodeMove(nodeId, deltaX, deltaY) {
    const newPosition = {
        x: nodePositions.value[nodeId].x + deltaX,
        y: nodePositions.value[nodeId].y + deltaY
    };
    emit('node-move', nodeId, newPosition);
}

function handleNodeConnectStart(nodeId) {
    isConnecting.value = true;
    connectingFrom.value = nodeId;
}

function handleNodeConnectEnd(nodeId) {
    if (isConnecting.value && connectingFrom.value && connectingFrom.value !== nodeId) {
        // Check if this creates a cycle
        if (!wouldCreateCycle(connectingFrom.value, nodeId)) {
            emit('connect', connectingFrom.value, nodeId);
        }
    }
    isConnecting.value = false;
    connectingFrom.value = null;
    tempConnection.value = null;
}

// Check for cycles in the workflow
function wouldCreateCycle(fromId, toId) {
    const visited = new Set();
    const stack = [toId];
    
    while (stack.length > 0) {
        const current = stack.pop();
        if (current === fromId) return true;
        
        if (!visited.has(current)) {
            visited.add(current);
            const outgoing = props.workflow.connections
                .filter(c => c.from_node_id === current)
                .map(c => c.to_node_id);
            stack.push(...outgoing);
        }
    }
    
    return false;
}

// Center view on workflow
function centerView() {
    if (props.workflow.nodes.length === 0) return;
    
    const bounds = {
        minX: Infinity,
        minY: Infinity,
        maxX: -Infinity,
        maxY: -Infinity
    };
    
    props.workflow.nodes.forEach(node => {
        const pos = nodePositions.value[node.id];
        bounds.minX = Math.min(bounds.minX, pos.x);
        bounds.minY = Math.min(bounds.minY, pos.y);
        bounds.maxX = Math.max(bounds.maxX, pos.x + pos.width);
        bounds.maxY = Math.max(bounds.maxY, pos.y + pos.height);
    });
    
    const rect = canvasEl.value.getBoundingClientRect();
    const contentWidth = bounds.maxX - bounds.minX;
    const contentHeight = bounds.maxY - bounds.minY;
    
    const scaleX = (rect.width - 100) / contentWidth;
    const scaleY = (rect.height - 100) / contentHeight;
    const scale = Math.min(Math.max(Math.min(scaleX, scaleY), 0.3), 1);
    
    transform.value = {
        scale,
        x: (rect.width - contentWidth * scale) / 2 - bounds.minX * scale,
        y: (rect.height - contentHeight * scale) / 2 - bounds.minY * scale
    };
}

// Keyboard shortcuts
function handleKeyDown(e) {
    if (e.key === 'Delete' && props.selectedNode) {
        emit('node-delete', props.selectedNode.id);
    }
    if (e.key === 'Delete' && props.selectedConnection) {
        emit('connection-delete', props.selectedConnection.id);
    }
    if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault();
        centerView();
    }
}

// Lifecycle
onMounted(() => {
    window.addEventListener('keydown', handleKeyDown);
    nextTick(() => {
        if (props.workflow.nodes.length > 0) {
            centerView();
        }
    });
});

onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown);
});

// Watch for node changes to recenter if needed
watch(() => props.workflow.nodes.length, (newLength, oldLength) => {
    if (oldLength === 0 && newLength > 0) {
        nextTick(centerView);
    }
});
</script>

<template>
    <div 
        ref="containerEl"
        class="workflow-canvas"
        @click="handleCanvasClick"
        @wheel="handleWheel"
        @mousedown="handleMouseDown"
        @mousemove="handleMouseMove"
        @mouseup="handleMouseUp"
        @mouseleave="handleMouseUp"
        @dragover="handleDragOver"
        @drop="handleDrop"
    >
        <!-- Grid background -->
        <svg class="canvas-grid" width="100%" height="100%">
            <defs>
                <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                    <circle cx="1" cy="1" r="1" fill="#e5e7eb" />
                </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
        
        <!-- Canvas content -->
        <div ref="canvasEl" class="canvas-content" :style="canvasStyle">
            <!-- Connections -->
            <svg class="connections-layer">
                <g>
                    <WorkflowConnection
                        v-for="conn in connectionPaths"
                        :key="conn.id"
                        :connection="conn"
                        :selected="selectedConnection?.id === conn.id"
                        @click="emit('connection-click', conn)"
                        @delete="emit('connection-delete', conn.id)"
                    />
                    
                    <!-- Temporary connection while dragging -->
                    <path
                        v-if="tempConnection"
                        :d="tempConnection.path"
                        class="temp-connection"
                        fill="none"
                        stroke="#3B82F6"
                        stroke-width="2"
                        stroke-dasharray="5,5"
                    />
                </g>
            </svg>
            
            <!-- Nodes -->
            <WorkflowNode
                v-for="node in workflow.nodes"
                :key="node.id"
                :node="node"
                :selected="selectedNode?.id === node.id"
                :position="nodePositions[node.id]"
                @click="emit('node-click', node)"
                @move="handleNodeMove"
                @delete="emit('node-delete', node.id)"
                @config="emit('node-config', node)"
                @connect-start="handleNodeConnectStart"
                @connect-end="handleNodeConnectEnd"
            />
        </div>
        
        <!-- Help text -->
        <div v-if="workflow.nodes.length === 0" class="empty-state">
            <p>Drag nodes from the sidebar to start building your workflow</p>
            <p class="help-text">
                <kbd>Ctrl</kbd> + <kbd>Scroll</kbd> to zoom • 
                <kbd>Alt</kbd> + <kbd>Drag</kbd> to pan
            </p>
        </div>
    </div>
</template>

<style scoped>
.workflow-canvas {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
    cursor: grab;
    user-select: none;
}

.workflow-canvas:active {
    cursor: grabbing;
}

.canvas-grid {
    position: absolute;
    top: 0;
    left: 0;
    pointer-events: none;
}

.canvas-content {
    position: absolute;
    width: 100%;
    height: 100%;
    transition: transform 0.1s ease-out;
}

.connections-layer {
    position: absolute;
    width: 100%;
    height: 100%;
    pointer-events: none;
    overflow: visible;
}

.connections-layer > g {
    pointer-events: all;
}

.temp-connection {
    pointer-events: none;
    animation: dash 0.5s linear infinite;
}

@keyframes dash {
    to {
        stroke-dashoffset: -10;
    }
}

.empty-state {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    text-align: center;
    color: var(--text-secondary);
    pointer-events: none;
}

.empty-state p {
    margin: 8px 0;
}

.help-text {
    font-size: 12px;
    opacity: 0.7;
}

.help-text kbd {
    display: inline-block;
    padding: 2px 6px;
    background: var(--background-2);
    border: 1px solid var(--border);
    border-radius: var(--radius-xs);
    font-family: monospace;
    font-size: 11px;
}
</style>