<!-- src/panels/user/plugins/workflows/components/node/condition-node.vue -->
<script setup>
import { computed } from 'vue';
import Button from '@form/button/view.vue';
import { 
    PhGitBranch,
    PhPlus,
    PhArrowRight,
    PhTrash
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
    }
});

const emit = defineEmits(['select', 'configure', 'delete', 'add-path']);

// Get outgoing connections from this node
const outgoingConnections = computed(() => {
    return props.connections.filter(c => c.from_node_id === props.node.id);
});

// Get condition paths configured for this node
const conditionPaths = computed(() => {
    const paths = props.node.config?.paths || [];
    
    // Always ensure we have at least IF and ELSE
    const defaultPaths = [
        { id: 'if_1', label: 'IF', type: 'if', conditions: [] },
        { id: 'else', label: 'ELSE', type: 'else', conditions: [] }
    ];
    
    // Merge with existing paths
    const existingPathIds = paths.map(p => p.id);
    defaultPaths.forEach(defaultPath => {
        if (!existingPathIds.includes(defaultPath.id)) {
            paths.push(defaultPath);
        }
    });
    
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
        <!-- Node header -->
        <div class="node-header">
            <div class="node-icon">
                <PhGitBranch :size="20" weight="bold" />
            </div>
            <div class="node-title">
                <span class="node-type">CONDITION</span>
                <span class="node-name">{{ node.name || 'Path Conditions' }}</span>
            </div>
            <div class="node-actions">
                <Button
                    as="tertiary icon small"
                    :iconLeft="{ component: PhPlus }"
                    @click.stop="$emit('add-path', node)"
                    v-tooltip="{ content: 'Add condition path' }"
                />
            </div>
        </div>
        
        <!-- Condition paths -->
        <div class="condition-paths">
            <div 
                v-for="(path, index) in conditionPaths" 
                :key="path.id"
                class="condition-path"
                :class="{ 
                    'has-connection': hasConnectionForPath(path.id),
                    'is-else': path.type === 'else'
                }"
            >
                <div class="path-header">
                    <span class="path-label">{{ path.label }}</span>
                    <Button
                        v-if="path.type !== 'else' && conditionPaths.filter(p => p.type === 'if').length > 1"
                        as="tertiary icon small"
                        :iconLeft="{ component: PhTrash }"
                        @click.stop="$emit('delete-path', node, path.id)"
                    />
                </div>
                
                <div class="path-conditions" v-if="path.type !== 'else'">
                    <div v-if="path.conditions.length === 0" class="no-conditions">
                        Click to configure
                    </div>
                    <div v-else class="conditions-summary">
                        {{ path.conditions.length }} condition{{ path.conditions.length > 1 ? 's' : '' }}
                    </div>
                </div>
                
                <div class="path-connector">
                    <div class="connector-dot" :data-path-id="path.id"></div>
                    <PhArrowRight :size="16" />
                </div>
            </div>
        </div>
        
        <!-- Configure button -->
        <div class="node-footer">
            <Button
                as="tertiary small"
                label="Configure Paths"
                @click.stop="$emit('configure', node)"
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

.node-header {
    display: flex;
    align-items: center;
    padding: 12px;
    border-bottom: 1px solid var(--border);
    gap: 8px;
}

.node-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
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
    font-size: 10px;
    text-transform: uppercase;
    color: var(--text-secondary);
    font-weight: 600;
}

.node-name {
    font-size: 14px;
    font-weight: 500;
    color: var(--text-primary);
}

.node-actions {
    opacity: 0;
    transition: opacity 0.2s;
}

.condition-node:hover .node-actions {
    opacity: 1;
}

.condition-paths {
    padding: 8px;
}

.condition-path {
    background: var(--background-2);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    margin-bottom: 8px;
    padding: 8px;
    transition: all 0.2s;
}

.condition-path:last-child {
    margin-bottom: 0;
}

.condition-path.has-connection {
    border-color: var(--success);
    background: rgba(var(--success-rgb), 0.05);
}

.condition-path.is-else {
    border-color: var(--warning);
    background: rgba(var(--warning-rgb), 0.05);
}

.path-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
}

.path-label {
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    color: var(--text-primary);
}

.path-conditions {
    font-size: 12px;
    color: var(--text-secondary);
    margin-bottom: 8px;
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
    justify-content: flex-end;
    gap: 4px;
    color: var(--text-secondary);
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
    padding: 8px;
    border-top: 1px solid var(--border);
    display: flex;
    justify-content: center;
}
</style>