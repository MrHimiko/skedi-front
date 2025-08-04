<!-- src/panels/user/plugins/workflows/components/node/view.vue -->
<script setup>
import { computed } from 'vue';
import Button from '@form/button/view.vue';
import MenusComponent from '@global/menus/view.vue';
import { 
    PhLightning,
    PhEnvelope, 
    PhWebhooksLogo,
    PhClock,
    PhCalendar,
    PhGearSix,
    PhTrash,
    PhPlus,
    PhDotsThreeVertical
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

const emit = defineEmits(['select', 'configure', 'delete', 'add-action']);

// Node configuration
const nodeIcons = {
    // Triggers
    'booking.created': PhCalendar,
    'booking.cancelled': PhCalendar,
    'booking.reminder': PhClock,
    'webhook': PhWebhooksLogo,
    
    // Actions
    'email.send': PhEnvelope,
    'webhook.send': PhWebhooksLogo,
    
    // Default
    'default': PhGearSix
};

// Computed
const nodeIcon = computed(() => {
    return nodeIcons[props.node.action_type] || nodeIcons.default;
});

const nodeClass = computed(() => ({
    'workflow-node': true,
    'selected': props.selected,
    'trigger': props.node.node_type === 'trigger',
    'action': props.node.node_type === 'action',
    'condition': props.node.node_type === 'condition'
}));

const nodeStyle = computed(() => ({
    left: `${props.node.position_x}px`,
    top: `${props.node.position_y}px`
}));

const hasOutgoingConnection = computed(() => {
    return props.connections.some(c => c.from_node_id === props.node.id);
});

const nodeNumber = computed(() => {
    // Calculate node number based on position in flow
    return props.node.node_type === 'trigger' ? '1' : '2';
});

// Node menus
const nodeMenus = computed(() => [
    {
        label: 'Configure',
        icon: 'settings',
        onClick: () => emit('configure', props.node)
    },
    {
        label: 'Delete',
        icon: 'delete',
        onClick: () => emit('delete', props.node)
    }
]);
</script>

<template>
    <div 
        :class="nodeClass"
        :style="nodeStyle"
        @click="$emit('select', node)"
    >
        <!-- Node number -->
        <div class="node-number">{{ nodeNumber }}</div>
        
        <!-- Node content -->
        <div class="node-content">
            <div class="node-icon">
                <component :is="nodeIcon" :size="20" weight="bold" />
            </div>
            
            <div class="node-info">
                <div class="node-type">
                    {{ node.node_type === 'trigger' ? 'Trigger' : node.node_type === 'action' ? 'Action' : 'Condition' }}
                </div>
                <div class="node-name">
                    {{ node.name || node.action_type || 'Untitled' }}
                </div>
            </div>
            
            <!-- Node actions menu -->
            <div 
                class="node-actions"
                v-dropdown="{ component: MenusComponent, properties: { menus: nodeMenus } }"
            >
                <Button
                    as="tertiary icon"
                    :iconLeft="{ component: PhDotsThreeVertical }"
                    v-tooltip="{ content: 'Actions' }"
                />
            </div>
        </div>
        
        <!-- Add node button -->
        <div v-if="!hasOutgoingConnection" class="add-node-button">
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
.workflow-node {
    position: absolute;
    background: var(--background-1);
    border: 2px solid var(--border);
    border-radius: var(--radius-md);
    min-width: 250px;
    cursor: pointer;
    transition: all 0.2s ease;
}

.workflow-node:hover {
    border-color: var(--border-strong);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.workflow-node.selected {
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(var(--primary-rgb), 0.2);
}

.workflow-node.trigger {
    border-color: var(--success);
}

.workflow-node.trigger.selected {
    box-shadow: 0 0 0 3px rgba(var(--success-rgb), 0.2);
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

.node-content {
    display: flex;
    align-items: center;
    padding: 16px;
    gap: 12px;
}

.node-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    background: var(--background-2);
    border-radius: var(--radius-sm);
    color: var(--text-secondary);
}

.workflow-node.trigger .node-icon {
    background: rgba(var(--success-rgb), 0.1);
    color: var(--success);
}

.node-info {
    flex: 1;
    min-width: 0;
}

.node-type {
    font-size: 11px;
    text-transform: uppercase;
    color: var(--text-secondary);
    margin-bottom: 2px;
}

.node-name {
    font-weight: 500;
    font-size: 14px;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.node-actions {
    opacity: 0;
    transition: opacity 0.2s ease;
}

.workflow-node:hover .node-actions {
    opacity: 1;
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