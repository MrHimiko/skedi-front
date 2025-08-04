<!-- src/panels/user/plugins/workflows/components/popups/trigger-select.vue -->
<script setup>
import { ref, computed } from 'vue';
import PopupView from '@layouts/popup/view.vue';
import Input from '@form/input/view.vue';
import { 
    PhMagnifyingGlass,
    PhCalendar,
    PhWebhooksLogo,
    PhClock,
    PhLightning
} from "@phosphor-icons/vue";

const props = defineProps({
    triggers: {
        type: Array,
        default: () => []
    },
    onSelect: {
        type: Function,
        required: true
    }
});

const searchQuery = ref('');

const triggerIcons = {
    'booking.created': PhCalendar,
    'booking.cancelled': PhCalendar,
    'booking.reminder': PhClock,
    'webhook': PhWebhooksLogo,
    'default': PhLightning
};

const filteredTriggers = computed(() => {
    if (!searchQuery.value) return props.triggers;
    
    const query = searchQuery.value.toLowerCase();
    return props.triggers.filter(trigger => 
        trigger.name.toLowerCase().includes(query) ||
        trigger.description.toLowerCase().includes(query)
    );
});

function selectTrigger(trigger) {
    props.onSelect(trigger);
}

function getTriggerIcon(triggerId) {
    return triggerIcons[triggerId] || triggerIcons.default;
}
</script>

<template>
    <PopupView title="Choose a trigger">
        <template #content>
            <div class="trigger-select">
                <!-- Search -->
                <div class="search-container">
                    <Input
                        v-model="searchQuery"
                        placeholder="Search triggers..."
                        :iconLeft="{ component: PhMagnifyingGlass }"
                    />
                </div>
                
                <!-- Triggers list -->
                <div class="triggers-list">
                    <div v-if="filteredTriggers.length === 0" class="no-results">
                        No triggers found
                    </div>
                    
                    <div
                        v-for="trigger in filteredTriggers"
                        :key="trigger.id"
                        class="trigger-item"
                        @click="selectTrigger(trigger)"
                    >
                        <div class="trigger-icon">
                            <component :is="getTriggerIcon(trigger.id)" :size="24" weight="bold" />
                        </div>
                        
                        <div class="trigger-info">
                            <div class="trigger-name">{{ trigger.name }}</div>
                            <div class="trigger-description">{{ trigger.description }}</div>
                        </div>
                    </div>
                </div>
            </div>
        </template>
    </PopupView>
</template>

<style scoped>
.trigger-select {
    width: 100%;
}

.search-container {
    padding: 20px;
    border-bottom: 1px solid var(--border);
}

.triggers-list {
    max-height: 400px;
    overflow-y: auto;
}

.no-results {
    padding: 40px;
    text-align: center;
    color: var(--text-secondary);
}

.trigger-item {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 16px 20px;
    cursor: pointer;
    transition: background 0.2s ease;
    border-bottom: 1px solid var(--border);
}

.trigger-item:hover {
    background: var(--background-2);
}

.trigger-item:last-child {
    border-bottom: none;
}

.trigger-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    background: var(--background-2);
    border-radius: var(--radius-md);
    color: var(--primary);
}

.trigger-info {
    flex: 1;
}

.trigger-name {
    font-weight: 500;
    font-size: 15px;
    color: var(--text-primary);
    margin-bottom: 4px;
}

.trigger-description {
    font-size: 13px;
    color: var(--text-secondary);
}
</style>