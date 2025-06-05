<script setup>
import { ref, onMounted, computed } from 'vue';
import PopupLayout from '@layouts/popup/view.vue';
import Button from '@form/button/view.vue';

const props = defineProps({
    container: {
        type: Object,
        required: true
    },
    availableFields: {
        type: Array,
        required: true
    },
    onSave: {
        type: Function,
        required: true
    }
});

// Selected field IDs
const selectedFieldIds = ref([]);

// Helper function to get consistent field identifier
const getFieldIdentifier = (field) => {
    // For guest repeater, always use the name
    if (field.type === 'guest_repeater' || field.name === 'system_contact_guests') {
        return field.name || 'system_contact_guests';
    }
    // For system fields, prefer name
    if (field.system_field) {
        return field.name || field.id;
    }
    // For other fields, prefer id over name
    return field.id || field.name;
};

// Initialize selected fields
onMounted(() => {
    if (props.container.children && Array.isArray(props.container.children)) {
        selectedFieldIds.value = [...props.container.children];
    } else {
        selectedFieldIds.value = [];
    }
    
    // Debug log
    console.log('Container:', props.container);
    console.log('Initial selected IDs:', selectedFieldIds.value);
    console.log('Available fields:', props.availableFields.map(f => ({
        id: f.id,
        name: f.name,
        type: f.type,
        identifier: getFieldIdentifier(f)
    })));
});

// Separate system fields and regular fields
const systemFields = computed(() => 
    props.availableFields.filter(f => f.system_field)
);

const regularFields = computed(() => 
    props.availableFields.filter(f => !f.system_field)
);

// Check if a field is selected
const isSelected = (field) => {
    const fieldId = getFieldIdentifier(field);
    return selectedFieldIds.value.includes(fieldId);
};

// Toggle field selection
const toggleField = (field) => {
    const fieldId = getFieldIdentifier(field);
    
    console.log('Toggling field:', field);
    console.log('Field identifier:', fieldId);
    console.log('Current selected:', selectedFieldIds.value);
    
    if (selectedFieldIds.value.includes(fieldId)) {
        selectedFieldIds.value = selectedFieldIds.value.filter(id => id !== fieldId);
    } else {
        selectedFieldIds.value.push(fieldId);
    }
    
    console.log('New selected:', selectedFieldIds.value);
};

// Save the selection
const saveSelection = () => {
    if (typeof props.onSave === 'function') {
        // Filter out any null or undefined values
        const cleanedSelection = selectedFieldIds.value.filter(id => id != null);
        
        console.log('Saving selection:', cleanedSelection);
        
        props.onSave(cleanedSelection);
    } else {
        console.error('onSave prop is not a function');
    }
};

// Get icon for a field type
const getFieldIcon = (field) => {
    const icons = {
        text: 'text_fields',
        email: 'email',
        guest_repeater: 'group_add',
        input: 'text_fields',
        textarea: 'notes',
        select: 'list',
        radio: 'radio_button_checked',
        checkbox: 'check_box',
        date: 'calendar_month',
        file: 'attach_file',
        rating: 'star',
        divider: 'horizontal_rule',
        step: 'linear_scale',
        group: 'folder'
    };
    
    return icons[field.type] || 'help_outline';
};

// Get field label with info
const getFieldLabel = (field) => {
    if (field.type === 'guest_repeater' || field.name === 'system_contact_guests') {
        return field.label || 'Guest List';
    }
    return field.label;
};

// Get field type display
const getFieldTypeDisplay = (field) => {
    if (field.type === 'guest_repeater') {
        return 'guest_repeater';
    }
    if (field.system_field) {
        return `${field.type} (System)`;
    }
    return field.type;
};
</script>

<template>
    <popup-layout title="Manage Fields" customClass="h-auto">
        <template #content>
            <div class="manage-fields-content">
                <p class="manage-description">
                    Select fields to include in this {{ container.type }}:
                </p>
                
                <p class="text-xs text-secondary mb-3">
                    Note: Selecting a field that's in another container will move it here
                </p>
                
                <div v-if="availableFields.length === 0" class="no-fields">
                    <p>No available fields to add to this {{ container.type }}.</p>
                </div>
                
                <div v-else class="fields-selection">
                    <!-- System Fields Section -->
                    <div v-if="systemFields.length > 0" class="fields-section">
                        <h4 class="section-title">System Fields</h4>
                        <div 
                            v-for="field in systemFields" 
                            :key="getFieldIdentifier(field)"
                            class="field-item"
                        >
                            <div class="field-checkbox">
                                <input 
                                    type="checkbox" 
                                    :id="'field_' + getFieldIdentifier(field)" 
                                    :checked="isSelected(field)"
                                    @change="toggleField(field)"
                                />
                                <label :for="'field_' + getFieldIdentifier(field)">
                                    <div class="field-info">
                                        <div class="field-icon system">
                                            <i>{{ getFieldIcon(field) }}</i>
                                        </div>
                                        <div class="field-details">
                                            <span class="field-label">{{ getFieldLabel(field) }}</span>
                                            <span class="field-type">{{ getFieldTypeDisplay(field) }}</span>
                                        </div>
                                    </div>
                                </label>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Regular Fields Section -->
                    <div v-if="regularFields.length > 0" class="fields-section">
                        <h4 class="section-title">Custom Fields</h4>
                        <div 
                            v-for="field in regularFields" 
                            :key="getFieldIdentifier(field)"
                            class="field-item"
                        >
                            <div class="field-checkbox">
                                <input 
                                    type="checkbox" 
                                    :id="'field_' + getFieldIdentifier(field)" 
                                    :checked="isSelected(field)"
                                    @change="toggleField(field)"
                                />
                                <label :for="'field_' + getFieldIdentifier(field)">
                                    <div class="field-info">
                                        <div class="field-icon">
                                            <i>{{ getFieldIcon(field) }}</i>
                                        </div>
                                        <div class="field-details">
                                            <span class="field-label">{{ getFieldLabel(field) }}</span>
                                            <span class="field-type">{{ getFieldTypeDisplay(field) }}</span>
                                        </div>
                                    </div>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="selected-count">
                    {{ selectedFieldIds.length }} field{{ selectedFieldIds.length !== 1 ? 's' : '' }} selected
                </div>
                
                <div class="action-buttons">
                    <div class="c-button tertiary i-popup-close pointer">Cancel</div>
                    <Button label="Save" @click="saveSelection" />
                </div>
            </div>
        </template>
    </popup-layout>
</template>

<style scoped>
.manage-fields-content {
    width: 100%;
    max-width: 600px;
}

.manage-description {
    margin-bottom: 8px;
    color: var(--text-secondary);
}

.mb-3 {
    margin-bottom: 12px;
}

.no-fields {
    background-color: var(--background-1);
    padding: 20px;
    border-radius: var(--radius-md);
    text-align: center;
    color: var(--text-tertiary);
    margin-bottom: 20px;
}

.fields-selection {
    max-height: 400px;
    overflow-y: auto;
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    margin-bottom: 16px;
}

.fields-section {
    padding: 0;
}

.fields-section:not(:last-child) {
    border-bottom: 1px solid var(--border);
}

.section-title {
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    color: var(--text-secondary);
    padding: 10px 15px;
    background-color: var(--background-1);
    border-bottom: 1px solid var(--border);
    margin: 0;
    position: sticky;
    top: 0;
    z-index: 1;
}

.field-item {
    padding: 10px 15px;
    border-bottom: 1px solid var(--border);
    transition: background-color 0.2s;
}

.field-item:hover {
    background-color: var(--background-1);
}

.field-item:last-child {
    border-bottom: none;
}

.field-checkbox {
    display: flex;
    align-items: center;
}

.field-checkbox input[type="checkbox"] {
    margin-right: 12px;
    cursor: pointer;
}

.field-checkbox label {
    flex: 1;
    cursor: pointer;
}

.field-info {
    display: flex;
    align-items: center;
    gap: 10px;
}

.field-icon {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background-color: var(--background-2);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--brand-default);
    flex-shrink: 0;
}

.field-icon.system {
    background-color: var(--brand-fill);
    color: var(--brand-default);
}

.field-icon i {
    font-size: 16px;
}

.field-details {
    display: flex;
    flex-direction: column;
    min-width: 0;
}

.field-label {
    font-weight: 600;
    font-size: 14px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.field-type {
    font-size: 12px;
    color: var(--text-secondary);
    text-transform: capitalize;
}

.selected-count {
    font-size: 13px;
    color: var(--text-secondary);
    text-align: center;
    margin-bottom: 16px;
}

.action-buttons {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
}
</style>