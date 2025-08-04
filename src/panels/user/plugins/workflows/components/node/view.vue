<!-- src/panels/user/plugins/workflows/components/node/view.vue -->
<script setup>
import { ref, computed } from 'vue';
import { 
    PhBell,
    PhEnvelope, 
    PhWebhook,
    PhTimer,
    PhCalendar,
    PhUser,
    PhChatText,
    PhDatabase,
    PhGlobe,
    PhCodeBlock,
    PhQuestion,
    PhGitBranch,
    PhRepeat,
    PhStop,
    PhClock,
    PhWarning,
    PhCheck,
    PhGearSix,
    PhTrash,
    PhCircle,
    PhCircleFill,
    PhPlay
} from "@phosphor-icons/vue";

const props = defineProps({
    node: {
        type: Object,
        required: true
    },
    selected: {
        type: Boolean,
        default: false
    },
    position: {
        type: Object,
        required: true
    }
});

const emit = defineEmits([
    'click',
    'move',
    'delete',
    'config',
    'connect-start',
    'connect-end'
]);

// Node configuration
const nodeConfig = computed(() => {
    const configs = {
        // Triggers
        'booking.created': { icon: PhCalendar, color: '#10B981' },
        'booking.confirmed': { icon: PhCheck, color: '#10B981' },
        'booking.cancelled': { icon: PhWarning, color: '#EF4444' },
        'webhook': { icon: PhWebhook, color: '#8B5CF6' },
        'schedule': { icon: PhTimer, color: '#F59E0B' },
        
        // Actions
        'send_email': { icon: PhEnvelope, color: '#3B82F6' },
        'send_sms': { icon: PhChatText, color: '#3B82F6' },
        'update_booking': { icon: PhCalendar, color: '#10B981' },
        'create_task': { icon: PhCheck, color: '#6366F1' },
        'update_database': { icon: PhDatabase, color: '#EC4899' },
        'custom_code': { icon: PhCodeBlock, color: '#F97316' },
        'delay': { icon: PhClock, color: '#64748B' },
        'loop': { icon: PhRepeat, color: '#0EA5E9' },
        'stop': { icon: PhStop, color: '#EF4444' },
        
        // Conditions
        'if': { icon: PhGitBranch, color: '#A855F7' },
        'switch': { icon: PhQuestion, color: '#A855F7' }
    };
    
    return configs[props.node.action_type] || { icon: PhCircle, color: '#6B7280' };
});

// Node state
const isDragging = ref(false);
const dragStart = ref({ x: 0, y: 0 });
const isHoveringOutput = ref(false);
const isHoveringInput = ref(false);

// Node style
const nodeStyle = computed(() => ({
    transform: `translate(${props.position.x}px, ${props.position.y}px)`,
    '--node-color': nodeConfig.value.color
}));

// Node classes
const nodeClasses = computed(() => ({
    'workflow-node': true,
    'selected': props.selected,
    'trigger': props.node.node_type === 'trigger',
    'action': props.node.node_type === 'action',
    'condition': props.node.node_type === 'condition',
    'dragging': isDragging.value
}));

// Check if node is a trigger
const isTrigger = computed(() => {
    return props.node.node_type === 'trigger' || props.node.action_type?.includes('.');
});

// Drag handlers
function handleMouseDown(e) {
    if (e.button !== 0) return;
    
    const target = e.target;
    if (target.closest('.node-actions') || target.closest('.node-port')) return;
    
    isDragging.value = true;
    dragStart.value = {
        x: e.clientX,
        y: e.clientY
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    e.preventDefault();
}

function handleMouseMove(e) {
    if (!isDragging.value) return;
    
    const deltaX = e.clientX - dragStart.value.x;
    const deltaY = e.clientY - dragStart.value.y;
    
    emit('move', props.node.id, deltaX, deltaY);
    
    dragStart.value = {
        x: e.clientX,
        y: e.clientY
    };
}

function handleMouseUp() {
    isDragging.value = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
}

// Connection handlers
function handleOutputMouseDown(e) {
    e.stopPropagation();
    emit('connect-start', props.node.id);
}

function handleInputMouseUp(e) {
    e.stopPropagation();
    emit('connect-end', props.node.id);
}

// Action handlers
function handleConfig(e) {
    e.stopPropagation();
    emit('config');
}

function handleDelete(e) {
    e.stopPropagation();
    emit('delete');
}
</script>

<template>
    <div
        :class="nodeClasses"
        :style="nodeStyle"
        @click="emit('click')"
        @mousedown="handleMouseDown"
    >
        <!-- Input port (not for triggers) -->
        <div 
            v-if="!isTrigger"
            class="node-port input"
            @mouseenter="isHoveringInput = true"
            @mouseleave="isHoveringInput = false"
            @mouseup="handleInputMouseUp"
        >
            <component 
                :is="isHoveringInput ? PhCircleFill : PhCircle" 
                :size="12"
            />
        </div>
        
        <!-- Node content -->
        <div class="node-header">
            <div class="node-icon">
                <component :is="nodeConfig.icon" :size="20" />
            </div>
            <div class="node-title">{{ props.node.name || props.node.action_type }}</div>
            <div class="node-actions">
                <button 
                    class="action-btn"
                    @click="handleConfig"
                    title="Configure"
                >
                    <PhGearSix :size="16" />
                </button>
                <button 
                    class="action-btn delete"
                    @click="handleDelete"
                    title="Delete"
                >
                    <PhTrash :size="16" />
                </button>
            </div>
        </div>
        
        <!-- Node body (if has config) -->
        <div v-if="props.node.config && Object.keys(props.node.config).length > 0" class="node-body">
            <div class="config-preview">
                <div v-for="(value, key) in props.node.config" :key="key" class="config-item">
                    <span class="config-key">{{ key }}:</span>
                    <span class="config-value">{{ value }}</span>
                </div>
            </div>
        </div>
        
        <!-- Output port -->
        <div 
            class="node-port output"
            @mouseenter="isHoveringOutput = true"
            @mouseleave="isHoveringOutput = false"
            @mousedown="handleOutputMouseDown"
        >
            <component 
                :is="isHoveringOutput ? PhCircleFill : PhCircle" 
                :size="12"
            />
        </div>
        
        <!-- Condition labels for if/else nodes -->
        <div v-if="props.node.node_type === 'condition'" class="condition-labels">
            <div class="condition-label true">True</div>
            <div class="condition-label false">False</div>
        </div>
        
        <!-- Trigger indicator -->
        <div v-if="isTrigger" class="trigger-indicator">
            <PhPlay :size="10" />
        </div>
    </div>
</template>

<style scoped>
.workflow-node {
    position: absolute;
    min-width: 200px;
    background: var(--background-0);
    border: 2px solid var(--border);
    border-radius: var(--radius-md);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    cursor: move;
    transition: all 0.2s;
    user-select: none;
}

.workflow-node:hover {
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.workflow-node.selected {
    border-color: var(--primary);
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

.workflow-node.dragging {
    opacity: 0.8;
    cursor: grabbing;
}

.node-header {
    display: flex;
    align-items: center;
    padding: 12px;
    gap: 8px;
    border-bottom: 1px solid var(--border);
}

.node-icon {
    width: 32px;
    height: 32px;
    border-radius: var(--radius-sm);
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: color-mix(in srgb, var(--node-color) 20%, transparent);
    color: var(--node-color);
    flex-shrink: 0;
}

.node-title {
    flex: 1;
    font-weight: 500;
    font-size: 14px;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.node-actions {
    display: flex;
    gap: 4px;
    opacity: 0;
    transition: opacity 0.2s;
}

.workflow-node:hover .node-actions {
    opacity: 1;
}

.action-btn {
    width: 24px;
    height: 24px;
    border: none;
    background: var(--background-1);
    border-radius: var(--radius-xs);
    color: var(--text-secondary);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
}

.action-btn:hover {
    background: var(--background-2);
    color: var(--text-primary);
}

.action-btn.delete:hover {
    background: var(--danger-light);
    color: var(--danger);
}

.node-body {
    padding: 8px 12px;
    font-size: 12px;
}

.config-preview {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.config-item {
    display: flex;
    gap: 4px;
}

.config-key {
    color: var(--text-secondary);
}

.config-value {
    color: var(--text-primary);
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 120px;
}

.node-port {
    position: absolute;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: crosshair;
    color: var(--border);
    transition: all 0.2s;
}

.node-port:hover {
    color: var(--primary);
}

.node-port.input {
    left: -10px;
    top: 50%;
    transform: translateY(-50%);
}

.node-port.output {
    right: -10px;
    top: 50%;
    transform: translateY(-50%);
}

.condition-labels {
    position: absolute;
    right: -60px;
    top: 50%;
    transform: translateY(-50%);
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.condition-label {
    font-size: 11px;
    font-weight: 500;
    color: var(--text-secondary);
    background: var(--background-0);
    padding: 2px 8px;
    border-radius: var(--radius-xs);
    border: 1px solid var(--border);
}

.condition-label.true {
    color: var(--success);
    border-color: var(--success);
}

.condition-label.false {
    color: var(--danger);
    border-color: var(--danger);
}

.trigger-indicator {
    position: absolute;
    top: -8px;
    left: 50%;
    transform: translateX(-50%);
    background: var(--success);
    color: white;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid var(--background-0);
}
</style>