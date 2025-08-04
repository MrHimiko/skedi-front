<!-- src/panels/user/plugins/workflows/components/popups/action-select.vue -->
<script setup>
import { ref, computed } from 'vue';
import PopupView from '@layouts/popup/view.vue';
import Input from '@form/input/view.vue';
import Button from '@form/button/view.vue';
import { 
    PhMagnifyingGlass,
    PhEnvelope,
    PhWebhooksLogo,
    PhClock,
    PhGearSix,
    PhGitBranch
} from "@phosphor-icons/vue";

const props = defineProps({
    actions: {
        type: Array,
        default: () => []
    },
    showPaths: {
        type: Boolean,
        default: false
    },
    onSelect: {
        type: Function,
        required: true
    }
});

const searchQuery = ref('');
const selectedPath = ref(null);

const actionIcons = {
    'email.send': PhEnvelope,
    'webhook.send': PhWebhooksLogo,
    'delay': PhClock,
    'condition': PhGitBranch,
    'default': PhGearSix
};

const filteredActions = computed(() => {
    if (!searchQuery.value) return props.actions;
    
    const query = searchQuery.value.toLowerCase();
    return props.actions.filter(action => 
        action.name.toLowerCase().includes(query) ||
        action.description.toLowerCase().includes(query)
    );
});

function selectAction(action) {
    props.onSelect(action, selectedPath.value);
}

function getActionIcon(actionId) {
    return actionIcons[actionId] || actionIcons.default;
}
</script>

<template>
    <PopupView title="Choose an action">
        <template #content>
            <div class="action-select">
                <!-- Path selection (for conditions) -->
                <div v-if="showPaths" class="path-selection">
                    <h3>Select path</h3>
                    <div class="path-buttons">
                        <Button
                            :as="selectedPath === 'true' ? 'success' : 'tertiary'"
                            label="Path A (True)"
                            @click="selectedPath = 'true'"
                        />
                        <Button
                            :as="selectedPath === 'false' ? 'error' : 'tertiary'"
                            label="Path B (False)"
                            @click="selectedPath = 'false'"
                        />
                    </div>
                </div>
                
                <!-- Search -->
                <div class="search-container">
                    <Input
                        v-model="searchQuery"
                        placeholder="Search actions..."
                        :iconLeft="{ component: PhMagnifyingGlass }"
                    />
                </div>
                
                <!-- Actions list -->
                <div class="actions-list">
                    <div v-if="filteredActions.length === 0" class="no-results">
                        No actions found
                    </div>
                    
                    <!-- Add special actions first -->
                    <div
                        class="action-item"
                        @click="selectAction({ id: 'condition', name: 'Path conditions', description: 'Split into paths based on conditions' })"
                    >
                        <div class="action-icon">
                            <PhGitBranch :size="24" weight="bold" />
                        </div>
                        
                        <div class="action-info">
                            <div class="action-name">Path conditions</div>
                            <div class="action-description">Split into paths based on conditions</div>
                        </div>
                    </div>
                    
                    <!-- Regular actions -->
                    <div
                        v-for="action in filteredActions"
                        :key="action.id"
                        class="action-item"
                        @click="selectAction(action)"
                    >
                        <div class="action-icon">
                            <component :is="getActionIcon(action.id)" :size="24" weight="bold" />
                        </div>
                        
                        <div class="action-info">
                            <div class="action-name">{{ action.name }}</div>
                            <div class="action-description">{{ action.description }}</div>
                        </div>
                    </div>
                </div>
            </div>
        </template>
    </PopupView>
</template>

<style scoped>
.action-select {
    width: 100%;
}

.path-selection {
    padding: 20px;
    border-bottom: 1px solid var(--border);
}

.path-selection h3 {
    font-size: 14px;
    font-weight: 500;
    margin-bottom: 12px;
    color: var(--text-primary);
}

.path-buttons {
    display: flex;
    gap: 12px;
}

.search-container {
    padding: 20px;
    border-bottom: 1px solid var(--border);
}

.actions-list {
    max-height: 400px;
    overflow-y: auto;
}

.no-results {
    padding: 40px;
    text-align: center;
    color: var(--text-secondary);
}

.action-item {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 16px 20px;
    cursor: pointer;
    transition: background 0.2s ease;
    border-bottom: 1px solid var(--border);
}

.action-item:hover {
    background: var(--background-2);
}

.action-item:last-child {
    border-bottom: none;
}

.action-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    background: var(--background-2);
    border-radius: var(--radius-md);
    color: var(--primary);
}

.action-info {
    flex: 1;
}

.action-name {
    font-weight: 500;
    font-size: 15px;
    color: var(--text-primary);
    margin-bottom: 4px;
}

.action-description {
    font-size: 13px;
    color: var(--text-secondary);
}
</style>