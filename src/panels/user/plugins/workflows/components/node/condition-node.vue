<!-- src/panels/user/plugins/workflows/components/node/condition-node.vue -->
<script setup>
import { computed } from 'vue';
import Button from '@form/button/view.vue';
import { 
    PhGitBranch,
    PhPlus,
    PhTrash,
    PhGearSix
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
    connections: {
        type: Array,
        default: () => []
    },
    nodeNumber: {
        type: Number,
        default: 1
    }
});

const emit = defineEmits(['select', 'configure', 'delete', 'add-path', 'delete-path']);

// Get outgoing connections from this node
const outgoingConnections = computed(() => {
    return props.connections.filter(c => c.from_node_id === props.node.id);
});

// Get condition paths configured for this node
const conditionPaths = computed(() => {
    const config = props.node.config || {};
    let paths = config.paths || [];
    
    // If no paths configured, create default A and B paths (like Zapier)
    if (paths.length === 0) {
        paths = [
            { 
                id: 'path_a', 
                label: 'Path A', 
                type: 'condition',
                conditions: []
            },
            { 
                id: 'path_b', 
                label: 'Path B', 
                type: 'condition',
                conditions: []
            }
        ];
    }
    
    return paths;
});

// Check if a path has a connection
const hasConnectionForPath = (pathId) => {
    return outgoingConnections.value.some(c => c.condition_type === pathId);
};

// Node styling
const nodeClass = computed(() => ({
    'condition-node': true,
    'selected': props.selected
}));

const nodeStyle = computed(() => ({
    left: `${props.node.position_x}px`,
    top: `${props.node.position_y}px`
}));
</script>

<template>
    <div 
        :class="nodeClass"
        :style="nodeStyle"
        @click="$emit('select', node)"
    >
        <!-- Node number -->
        <div class="node-number">{{ nodeNumber }}</div>
        
        <!-- Node header -->
        <div class="node-header">
            <div class="node-icon">
                <PhGitBranch :size="20" weight="bold" />
            </div>
            <div class="node-title">
                <span class="node-type">CONDITION</span>
                <span class="node-name">{{ node.name || 'Path Conditions' }}</span>
            </div>
        </div>
        
        <!-- Condition paths -->
        <div class="condition-paths">
            <div 
                v-for="(path, index) in conditionPaths" 
                :key="path.id"
                class="condition-path"
                :class="{ 
                    'has-connection': hasConnectionForPath(path.id)
                }"
            >
                <div class="path-content">
                    <span class="path-label">{{ path.label }}</span>
                    <div class="path-conditions">
                        <div v-if="path.conditions && path.conditions.length === 0" class="no-conditions">
                            Not configured
                        </div>
                        <div v-else class="conditions-summary">
                            {{ (path.conditions || []).length }} condition{{ (path.conditions || []).length !== 1 ? 's' : '' }}
                        </div>
                    </div>
                </div>
                
                <div class="path-connector">
                    <div class="connector-dot" :data-path-id="path.id"></div>
                </div>
            </div>
        </div>
        
        <!-- Configure button -->
        <div class="node-footer">
            <Button
                as="tertiary small"
                :iconLeft="{ component: PhGearSix }"
                label="Configure"
                @click.stop="$emit('configure', node)"
            />
        </div>
        
        <!-- Add action button -->
        <div class="add-node-button">
            <Button
                as="tertiary icon"
                :iconLeft="{ component: PhPlus }"
                @click.stop="$emit('add-action', node)"
                v-tooltip="{ content: 'Add action' }"
            />
        </div>
    </div>
</template>

<style scoped>
.condition-node {
    position: absolute;
    background: var(--background-1);
    border: 2px solid var(--border);
    border-radius: var(--radius-md);
    min-width: 280px;
    cursor: pointer;
    transition: all 0.2s ease;
}

.condition-node:hover {
    border-color: var(--border-strong);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.condition-node.selected {
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(var(--primary-rgb), 0.2);
}

.node-number {
    position: absolute;
    top: -12px;
    left: 20px;
    background: var(--background-1);
    border: 2px solid var(--border);
    border-radius: 50%;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 600;
    color: var(--text-secondary);
}

.node-header {
    display: flex;
    align-items: center;
    padding: 16px;
    border-bottom: 1px solid var(--border);
    gap: 12px;
}

.node-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    background: rgba(var(--primary-rgb), 0.1);
    border-radius: var(--radius-sm);
    color: var(--primary);
}

.node-title {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.node-type {
    font-size: 11px;
    text-transform: uppercase;
    color: var(--text-secondary);
    font-weight: 600;
}

.node-name {
    font-size: 14px;
    font-weight: 500;
    color: var(--text-primary);
}

.condition-paths {
    padding: 12px;
}

.condition-path {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: var(--background-2);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    margin-bottom: 8px;
    padding: 12px;
    transition: all 0.2s;
}

.condition-path:last-child {
    margin-bottom: 0;
}

.condition-path.has-connection {
    border-color: var(--success);
    background: rgba(var(--success-rgb), 0.05);
}

.path-content {
    flex: 1;
}

.path-label {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-primary);
    display: block;
    margin-bottom: 4px;
}

.path-conditions {
    font-size: 12px;
    color: var(--text-secondary);
}

.no-conditions {
    font-style: italic;
    opacity: 0.7;
}

.conditions-summary {
    color: var(--text-primary);
}

.path-connector {
    display: flex;
    align-items: center;
    margin-left: 8px;
}

.connector-dot {
    width: 12px;
    height: 12px;
    background: var(--primary);
    border: 2px solid var(--background-1);
    border-radius: 50%;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.node-footer {
    padding: 12px 16px;
    border-top: 1px solid var(--border);
    display: flex;
    justify-content: center;
}

.add-node-button {
    position: absolute;
    bottom: -20px;
    left: 50%;
    transform: translateX(-50%);
    background: var(--background-1);
    border-radius: 50%;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.add-node-button button {
    border-radius: 50%;
}
</style>