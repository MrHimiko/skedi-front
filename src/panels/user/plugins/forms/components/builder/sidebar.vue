<script setup>
import { ref } from 'vue';
import { common } from '@utils/common';
import TabsComponent from '@global/tabs/view.vue';

const props = defineProps({
    fieldTypes: {
        type: Array,
        required: true
    }
});

const emit = defineEmits(['add-field']);

// Tab management
const activeTab = ref('fields');

const tabs = [
    { title: 'Fields', value: 'fields' },
    { title: 'Templates', value: 'templates' }
];

const handleTabClick = (event, tab) => {
    activeTab.value = tab.value;
};

// Add a field to the form
const addField = (fieldType) => {
    emit('add-field', fieldType);
    common.notification(`Added ${fieldType.label} field`, true);
};
</script>

<template>
    <div class="form-builder-sidebar">
        <div class="sidebar-header">
            <TabsComponent 
                :tabs="tabs.map(tab => ({ 
                    title: tab.title, 
                    active: activeTab === tab.value 
                }))" 
                @onClick="handleTabClick"
            />
        </div>
        
        <div class="sidebar-content scrollbar">
            <!-- Fields Tab -->
            <div v-if="activeTab === 'fields'" class="fields-list">
                <div 
                    v-for="fieldType in fieldTypes" 
                    :key="fieldType.type"
                    class="field-type-item"
                    @click="addField(fieldType)"
                >
                    <div class="field-type-icon">
                        <component 
                            :is="fieldType.icon.component" 
                            :weight="fieldType.icon.weight || 'regular'" 
                        />
                    </div>
                    <div class="field-type-label">{{ fieldType.label }}</div>
                </div>
            </div>
            
            <!-- Templates Tab -->
            <div v-else-if="activeTab === 'templates'" class="templates-list">
                <div class="templates-coming-soon">
                    <p>Form templates coming soon!</p>
                    <p class="text-xs text-secondary">
                        Save time with pre-built templates for common use cases
                    </p>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.form-builder-sidebar {
    background-color: var(--background-0);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    display: flex;
    flex-direction: column;
    height: 100%;
}

.sidebar-header {
    padding: 12px;
    border-bottom: 1px solid var(--border);
}

.sidebar-content {
    flex: 1;
    overflow-y: auto;
    padding: 8px;
}

.fields-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.field-type-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px;
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: background-color 0.2s;
}

.field-type-item:hover {
    background-color: var(--background-1);
}

.field-type-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    color: var(--text-secondary);
}

.field-type-label {
    font-size: 14px;
    font-weight: 500;
}

.templates-coming-soon {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    padding: 20px;
    text-align: center;
}
</style>