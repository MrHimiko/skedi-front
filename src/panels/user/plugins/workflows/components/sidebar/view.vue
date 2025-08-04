<!-- src/panels/user/plugins/workflows/components/sidebar/view.vue -->
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
    PhCheck
} from "@phosphor-icons/vue";

const emit = defineEmits(['drag-start', 'drag-end']);

// Node categories
const categories = ref([
    {
        name: 'Triggers',
        expanded: true,
        nodes: [
            {
                id: 'trigger-booking-created',
                type: 'trigger',
                action: 'booking.created',
                name: 'Booking Created',
                description: 'When a new booking is created',
                icon: PhCalendar,
                color: '#10B981'
            },
            {
                id: 'trigger-booking-confirmed',
                type: 'trigger',
                action: 'booking.confirmed',
                name: 'Booking Confirmed',
                description: 'When a booking is confirmed',
                icon: PhCheck,
                color: '#10B981'
            },
            {
                id: 'trigger-booking-cancelled',
                type: 'trigger',
                action: 'booking.cancelled',
                name: 'Booking Cancelled',
                description: 'When a booking is cancelled',
                icon: PhWarning,
                color: '#EF4444'
            },
            {
                id: 'trigger-webhook',
                type: 'trigger',
                action: 'webhook',
                name: 'Webhook',
                description: 'Triggered by external webhook',
                icon: PhWebhook,
                color: '#8B5CF6'
            },
            {
                id: 'trigger-schedule',
                type: 'trigger',
                action: 'schedule',
                name: 'Schedule',
                description: 'Run on a schedule',
                icon: PhTimer,
                color: '#F59E0B'
            }
        ]
    },
    {
        name: 'Actions',
        expanded: true,
        nodes: [
            {
                id: 'action-send-email',
                type: 'action',
                action: 'send_email',
                name: 'Send Email',
                description: 'Send an email notification',
                icon: PhEnvelope,
                color: '#3B82F6'
            },
            {
                id: 'action-send-sms',
                type: 'action',
                action: 'send_sms',
                name: 'Send SMS',
                description: 'Send SMS message',
                icon: PhChatText,
                color: '#3B82F6'
            },
            {
                id: 'action-update-booking',
                type: 'action',
                action: 'update_booking',
                name: 'Update Booking',
                description: 'Update booking details',
                icon: PhCalendar,
                color: '#10B981'
            },
            {
                id: 'action-create-task',
                type: 'action',
                action: 'create_task',
                name: 'Create Task',
                description: 'Create a new task',
                icon: PhCheck,
                color: '#6366F1'
            },
            {
                id: 'action-webhook',
                type: 'action',
                action: 'webhook',
                name: 'Call Webhook',
                description: 'Make HTTP request',
                icon: PhGlobe,
                color: '#8B5CF6'
            },
            {
                id: 'action-update-database',
                type: 'action',
                action: 'update_database',
                name: 'Update Database',
                description: 'Update database record',
                icon: PhDatabase,
                color: '#EC4899'
            },
            {
                id: 'action-custom-code',
                type: 'action',
                action: 'custom_code',
                name: 'Custom Code',
                description: 'Run custom JavaScript',
                icon: PhCodeBlock,
                color: '#F97316'
            },
            {
                id: 'action-delay',
                type: 'action',
                action: 'delay',
                name: 'Delay',
                description: 'Wait for specified time',
                icon: PhClock,
                color: '#64748B'
            }
        ]
    },
    {
        name: 'Logic',
        expanded: true,
        nodes: [
            {
                id: 'condition-if',
                type: 'condition',
                action: 'if',
                name: 'If/Else',
                description: 'Conditional branching',
                icon: PhGitBranch,
                color: '#A855F7'
            },
            {
                id: 'condition-switch',
                type: 'condition',
                action: 'switch',
                name: 'Switch',
                description: 'Multiple condition paths',
                icon: PhQuestion,
                color: '#A855F7'
            },
            {
                id: 'action-loop',
                type: 'action',
                action: 'loop',
                name: 'Loop',
                description: 'Repeat actions',
                icon: PhRepeat,
                color: '#0EA5E9'
            },
            {
                id: 'action-stop',
                type: 'action',
                action: 'stop',
                name: 'Stop',
                description: 'Stop workflow execution',
                icon: PhStop,
                color: '#EF4444'
            }
        ]
    }
]);

// Search
const searchQuery = ref('');
const filteredCategories = computed(() => {
    if (!searchQuery.value) return categories.value;
    
    const query = searchQuery.value.toLowerCase();
    return categories.value.map(category => ({
        ...category,
        nodes: category.nodes.filter(node => 
            node.name.toLowerCase().includes(query) ||
            node.description.toLowerCase().includes(query)
        )
    })).filter(category => category.nodes.length > 0);
});

// Toggle category
function toggleCategory(category) {
    category.expanded = !category.expanded;
}

// Drag handlers
function handleDragStart(e, node) {
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('nodeType', JSON.stringify(node));
    emit('drag-start');
}

function handleDragEnd() {
    emit('drag-end');
}
</script>

<template>
    <div class="workflow-sidebar">
        <div class="sidebar-header">
            <h3>Workflow Nodes</h3>
            <input
                v-model="searchQuery"
                type="text"
                placeholder="Search nodes..."
                class="search-input"
            />
        </div>
        
        <div class="sidebar-content scrollbar">
            <div
                v-for="category in filteredCategories"
                :key="category.name"
                class="node-category"
            >
                <div 
                    class="category-header"
                    @click="toggleCategory(category)"
                >
                    <span class="category-name">{{ category.name }}</span>
                    <span class="category-toggle">
                        {{ category.expanded ? '−' : '+' }}
                    </span>
                </div>
                
                <div v-if="category.expanded" class="category-nodes">
                    <div
                        v-for="node in category.nodes"
                        :key="node.id"
                        class="node-item"
                        draggable="true"
                        @dragstart="handleDragStart($event, node)"
                        @dragend="handleDragEnd"
                    >
                        <div class="node-icon" :style="{ backgroundColor: node.color + '20', color: node.color }">
                            <component :is="node.icon" :size="20" />
                        </div>
                        <div class="node-info">
                            <div class="node-name">{{ node.name }}</div>
                            <div class="node-description">{{ node.description }}</div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div v-if="filteredCategories.length === 0" class="no-results">
                No nodes found matching "{{ searchQuery }}"
            </div>
        </div>
        
        <div class="sidebar-footer">
            <p class="help-text">Drag nodes to canvas to add them</p>
        </div>
    </div>
</template>

<style scoped>
.workflow-sidebar {
    width: 280px;
    background-color: var(--background-0);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    display: flex;
    flex-direction: column;
    height: 100%;
}

.sidebar-header {
    padding: 16px;
    border-bottom: 1px solid var(--border);
}

.sidebar-header h3 {
    margin: 0 0 12px 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
}

.search-input {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    font-size: 14px;
    background-color: var(--background-1);
    color: var(--text-primary);
    transition: border-color 0.2s;
}

.search-input:focus {
    outline: none;
    border-color: var(--primary);
}

.sidebar-content {
    flex: 1;
    overflow-y: auto;
    padding: 8px;
}

.node-category {
    margin-bottom: 16px;
}

.category-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    cursor: pointer;
    user-select: none;
    border-radius: var(--radius-sm);
    transition: background-color 0.2s;
}

.category-header:hover {
    background-color: var(--background-1);
}

.category-name {
    font-weight: 600;
    font-size: 14px;
    color: var(--text-primary);
}

.category-toggle {
    font-size: 18px;
    color: var(--text-secondary);
}

.category-nodes {
    padding: 4px 0;
}

.node-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 12px;
    margin: 2px 0;
    border-radius: var(--radius-sm);
    cursor: grab;
    transition: all 0.2s;
    border: 1px solid transparent;
}

.node-item:hover {
    background-color: var(--background-1);
    border-color: var(--border);
}

.node-item:active {
    cursor: grabbing;
    opacity: 0.8;
}

.node-icon {
    width: 40px;
    height: 40px;
    border-radius: var(--radius-sm);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.node-info {
    flex: 1;
    min-width: 0;
}

.node-name {
    font-weight: 500;
    font-size: 14px;
    color: var(--text-primary);
    margin-bottom: 2px;
}

.node-description {
    font-size: 12px;
    color: var(--text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.no-results {
    text-align: center;
    padding: 32px 16px;
    color: var(--text-secondary);
    font-size: 14px;
}

.sidebar-footer {
    padding: 12px 16px;
    border-top: 1px solid var(--border);
}

.help-text {
    font-size: 12px;
    color: var(--text-secondary);
    text-align: center;
    margin: 0;
}
</style>