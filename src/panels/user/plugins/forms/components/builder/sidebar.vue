<script setup>
import { ref, computed } from 'vue';
import { common } from '@utils/common';
import TabsComponent from '@global/tabs/view.vue';
import { fieldTypes } from '@user_forms/utils/field-types';

const props = defineProps({
    fieldTypes: {
        type: Array,
        required: true
    },
    existingFields: {
        type: Array,
        default: () => []
    }
});

const emit = defineEmits(['add-field']);

const activeTab = ref('fields');

const tabs = [
    { title: 'Fields', value: 'fields' },
    { title: 'Templates', value: 'templates' }
];

const handleTabClick = (event, tab) => {
    activeTab.value = tab.value;
};

// Check if guest repeater can be added
const canAddGuestRepeater = computed(() => {
    const guestRepeaters = props.existingFields.filter(f => 
        f.type === 'guest_repeater' || f.name === 'system_contact_guests'
    );
    return guestRepeaters.length === 0;
});

// Filter field types
const availableFieldTypes = computed(() => {
    return props.fieldTypes.filter(fieldType => {
        // Skip system name and email fields
        if (['system_contact_name', 'system_contact_email'].includes(fieldType.type)) {
            return false;
        }
        
        // Check guest repeater limit
        if (fieldType.type === 'system_contact_guests' && !canAddGuestRepeater.value) {
            return false;
        }
        
        return true;
    });
});

const addField = (fieldType) => {
    emit('add-field', fieldType);
    
    if (fieldType.type === 'system_contact_guests') {
        common.notification('Added Guest List field', true);
    } else {
        common.notification(`Added ${fieldType.label} field`, true);
    }
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
                    v-for="fieldType in availableFieldTypes" 
                    :key="fieldType.type"
                    class="field-type-item"
                    :class="{ 
                        'disabled': fieldType.type === 'system_contact_guests' && !canAddGuestRepeater
                    }"
                    @click="addField(fieldType)"
                >
                    <div class="field-type-icon">
                        <component 
                            :is="fieldType.icon.component" 
                            :weight="fieldType.icon.weight || 'regular'" 
                        />
                    </div>
                    <div class="field-type-label">{{ fieldType.label }}</div>
                    <div 
                        v-if="fieldType.system && fieldType.maxCount" 
                        class="field-type-badge"
                    >
                        Max 1
                    </div>
                </div>
                
                <div 
                    v-if="!canAddGuestRepeater" 
                    class="field-type-note"
                >
                    Guest List field already added
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
    position: relative;
}

.field-type-item:hover:not(.disabled) {
    background-color: var(--background-1);
}

.field-type-item.disabled {
    opacity: 0.5;
    cursor: not-allowed;
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
    flex: 1;
}

.field-type-badge {
    font-size: 10px;
    background-color: var(--background-2);
    color: var(--text-secondary);
    padding: 2px 6px;
    border-radius: 4px;
}

.field-type-note {
    font-size: 12px;
    color: var(--text-tertiary);
    text-align: center;
    padding: 8px;
    font-style: italic;
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