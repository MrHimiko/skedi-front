<!-- src/panels/user/plugins/workflows/components/add-step-menu/view.vue -->
<script setup>
import { ref, computed } from 'vue';
import PopupView from '@layouts/popup/view.vue';
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

// Methods
function selectAction(action) {
    const stepConfig = {
        name: action.name,
        type: action.id,
        config: {}
    };
    
    props.onSelect(action.id, stepConfig);
    
    // Close the popup
    const popup = document.querySelector('.i-popup-close');
    if (popup) popup.click();
}

function getActionIcon(actionId) {
    return actionIcons[actionId] || actionIcons.default;
}

function getCategoryColor(category) {
    switch (category) {
        case 'communication':
            return 'communication';
        case 'integration':
            return 'integration';
        case 'utility':
            return 'utility';
        case 'logic':
            return 'logic';
        default:
            return 'default';
    }
}
</script>

<template>
    <PopupView title="Add Step" class="add-step-popup">
        <template #content>
            <div class="add-step-content">
                <!-- Search -->
                <div class="search-section">
                    <Input
                        v-model="searchQuery"
                        placeholder="Search actions..."
                        :iconLeft="{ component: PhMagnifyingGlass }"
                    />
                </div>
                
                <!-- No Actions -->
                <div v-if="!props.availableActions.length" class="no-actions">
                    <PhGearSix :size="48" weight="thin" />
                    <h3>No actions available</h3>
                    <p>Actions are being loaded...</p>
                </div>
                
                <!-- No Results -->
                <div v-else-if="!filteredActions.length" class="no-results">
                    <PhMagnifyingGlass :size="48" weight="thin" />
                    <h3>No actions found</h3>
                    <p>Try adjusting your search terms</p>
                </div>
                
                <!-- Actions Grid -->
                <div v-else class="actions-grid">
                    <div
                        v-for="action in filteredActions"
                        :key="action.id"
                        :class="['action-card', getCategoryColor(action.category)]"
                        @click="selectAction(action)"
                    >
                        <div class="action-icon">
                            <component :is="getActionIcon(action.id)" :size="24" weight="bold" />
                        </div>
                        
                        <div class="action-info">
                            <div class="action-name">{{ action.name }}</div>
                            <div class="action-description">{{ action.description }}</div>
                        </div>
                        
                        <div class="action-category">{{ action.category }}</div>
                    </div>
                </div>
            </div>
        </template>
    </PopupView>
</template>

<style scoped>
.add-step-popup {
    min-width: 600px;
}

.add-step-content {
    padding: 24px;
}

.search-section {
    margin-bottom: 24px;
}

.no-actions,
.no-results {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 20px;
    text-align: center;
    color: var(--text-secondary);
}

.no-actions svg,
.no-results svg {
    margin-bottom: 16px;
    opacity: 0.5;
}

.no-actions h3,
.no-results h3 {
    margin: 0 0 8px 0;
    font-size: 18px;
    color: var(--text-primary);
}

.no-actions p,
.no-results p {
    margin: 0;
    font-size: 14px;
}

.actions-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
}

.action-card {
    background: var(--background-0);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 16px;
    cursor: pointer;
    transition: all 0.2s;
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    min-height: 160px;
}

.action-card:hover {
    border-color: var(--black);
}





.action-icon {
    width: 64px;
    height: 64px;
    border-radius: var(--radius-lg);
    background: var(--background-2);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-secondary);
    margin-bottom: 16px;
    transition: all 0.2s;
}

.action-card.communication .action-icon {
    background: rgba(var(--blue-rgb), 0.1);
    color: var(--blue-default);
}

.action-card.integration .action-icon {
    background: rgba(var(--purple-rgb), 0.1);
    color: var(--purple-default);
}

.action-card.utility .action-icon {
    background: rgba(var(--orange-rgb), 0.1);
    color: var(--orange-default);
}

.action-card.logic .action-icon {
    background: rgba(var(--pink-rgb), 0.1);
    color: var(--pink-default);
}

.action-card:hover .action-icon {
    transform: scale(1.1);
}

.action-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
}

.action-name {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 8px;
}

.action-description {
    font-size: 13px;
    color: var(--text-secondary);
    line-height: 1.4;
}

.action-category {
    position: absolute;
    top: 8px;
    right: 8px;
    font-size: 10px;
    text-transform: uppercase;
    font-weight: 500;
    color: var(--text-tertiary);
    background: var(--background-2);
    padding: 3px 5px;
    border-radius: var(--radius-sm);
}

/* Responsive adjustments */
@media (max-width: 640px) {
    .add-step-popup {
        min-width: 90vw;
    }
    
    .actions-grid {
        grid-template-columns: 1fr;
    }
}
</style>