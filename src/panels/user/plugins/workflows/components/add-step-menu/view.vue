<!-- src/panels/user/plugins/workflows/components/add-step-menu/view.vue -->
<script setup>
import { ref, computed } from 'vue';
import Input from '@form/input/view.vue';

// Icons
import { 
    PhMagnifyingGlass,
    PhEnvelope,
    PhWebhooksLogo,
    PhClock,
    PhGitBranch,
    PhGearSix
} from "@phosphor-icons/vue";

const props = defineProps({
    availableActions: {
        type: Array,
        default: () => []
    },
    onSelect: {
        type: Function,
        required: true
    }
});

// State
const searchQuery = ref('');

// Action icons mapping
const actionIcons = {
    'send_email': PhEnvelope,
    'send_webhook': PhWebhooksLogo,
    'delay': PhClock,
    'condition': PhGitBranch,
    'default': PhGearSix
};

// Computed
const filteredActions = computed(() => {
    if (!searchQuery.value) return props.availableActions;
    
    const query = searchQuery.value.toLowerCase();
    return props.availableActions.filter(action => 
        action.name.toLowerCase().includes(query) ||
        action.description.toLowerCase().includes(query) ||
        action.category.toLowerCase().includes(query)
    );
});

const actionsByCategory = computed(() => {
    const categories = {};
    
    filteredActions.value.forEach(action => {
        const category = action.category || 'other';
        if (!categories[category]) {
            categories[category] = [];
        }
        categories[category].push(action);
    });
    
    return categories;
});

const categoryNames = {
    'communication': 'Communication',
    'integration': 'Integration', 
    'utility': 'Utility',
    'logic': 'Logic',
    'other': 'Other'
};

// Methods
function selectAction(action) {
    const stepConfig = {
        name: action.name,
        type: action.id,
        config: {}
    };
    
    props.onSelect(action.id, stepConfig);
}

function getActionIcon(actionId) {
    return actionIcons[actionId] || actionIcons.default;
}

function getCategoryIcon(category) {
    switch (category) {
        case 'communication':
            return PhEnvelope;
        case 'integration':
            return PhWebhooksLogo;
        case 'utility':
            return PhClock;
        case 'logic':
            return PhGitBranch;
        default:
            return PhGearSix;
    }
}
</script>

<template>
    <div class="add-step-menu">
        <!-- Search -->
        <div class="search-section">
            <Input
                v-model="searchQuery"
                placeholder="Search actions..."
                :iconLeft="{ component: PhMagnifyingGlass }"
            />
        </div>
        
        <!-- Actions by Category -->
        <div class="actions-section">
            <div v-if="Object.keys(actionsByCategory).length === 0" class="no-results">
                No actions found matching "{{ searchQuery }}"
            </div>
            
            <div v-for="(actions, category) in actionsByCategory" :key="category" class="category-section">
                <div class="category-header">
                    <component :is="getCategoryIcon(category)" :size="16" />
                    <span>{{ categoryNames[category] || category }}</span>
                </div>
                
                <div class="actions-list">
                    <div
                        v-for="action in actions"
                        :key="action.id"
                        class="action-item"
                        @click="selectAction(action)"
                    >
                        <div class="action-icon">
                            <component :is="getActionIcon(action.id)" :size="20" weight="bold" />
                        </div>
                        
                        <div class="action-info">
                            <div class="action-name">{{ action.name }}</div>
                            <div class="action-description">{{ action.description }}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.add-step-menu {
    min-width: 400px;
    max-height: 500px;
    background: var(--background-0);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
}

.search-section {
    padding: 16px;
    border-bottom: 1px solid var(--border);
}

.actions-section {
    max-height: 400px;
    overflow-y: auto;
    padding: 8px 0;
}

.no-results {
    padding: 32px 16px;
    text-align: center;
    color: var(--text-secondary);
    font-size: 14px;
}

.category-section {
    margin-bottom: 8px;
}

.category-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px 8px 16px;
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    color: var(--text-secondary);
    background: var(--background-1);
    border-bottom: 1px solid var(--border);
}

.actions-list {
    padding: 4px 0;
}

.action-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    cursor: pointer;
    transition: background-color 0.2s;
}

.action-item:hover {
    background: var(--background-2);
}

.action-icon {
    width: 40px;
    height: 40px;
    border-radius: var(--radius-md);
    background: var(--background-2);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-secondary);
    flex-shrink: 0;
}

.action-info {
    flex: 1;
    min-width: 0;
}

.action-name {
    font-weight: 500;
    color: var(--text-primary);
    margin-bottom: 2px;
}

.action-description {
    font-size: 13px;
    color: var(--text-secondary);
    line-height: 1.4;
}
</style>