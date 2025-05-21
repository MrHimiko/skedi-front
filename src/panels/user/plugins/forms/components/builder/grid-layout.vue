<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { GridLayout, GridItem } from 'vue-grid-layout';
import { common } from '@utils/common';
import { popup } from '@utils/popup';
import Button from '@form/button/view.vue';
import Notice from '@global/notice/view.vue';
import FieldSettings from './field-settings.vue';
import { PhGear, PhTrash, PhCopy } from "@phosphor-icons/vue";

const props = defineProps({
    fields: {
        type: Array,
        required: true
    },
    editMode: {
        type: Boolean,
        default: false
    }
});

const emit = defineEmits([
    'update-field',
    'delete-field',
    'duplicate-field',
    'update-layout'
]);

// Convert form fields to grid layout items
const layoutItems = ref([]);

// Grid config
const cols = ref(12);
const rowHeight = ref(80);
const isDraggable = computed(() => props.editMode);
const isResizable = computed(() => props.editMode);

// Watch for changes in fields
watch(() => props.fields, () => {
    updateLayoutFromFields();
}, { deep: true });

// Watch for changes in edit mode
watch(() => props.editMode, () => {
    updateLayoutFromFields();
});

// Initialize the layout from fields
const updateLayoutFromFields = () => {
    layoutItems.value = props.fields.map((field, index) => {
        // Get existing layout item if available
        const existingItem = layoutItems.value.find(item => item.i === field.id);
        
        // Default layout properties if not set
        const x = field.layout?.x ?? (index % 2) * 6;  // Place in 2 columns initially
        const y = field.layout?.y ?? Math.floor(index / 2) * 4;  // Stack by 4 rows
        const w = field.layout?.w ?? field.colSpan ?? 12;  // Default to full width
        const h = field.layout?.h ?? (field.type === 'textarea' ? 3 : 2);  // Taller for textarea
        
        return {
            i: field.id,
            x: existingItem?.x ?? x,
            y: existingItem?.y ?? y,
            w: existingItem?.w ?? w,
            h: existingItem?.h ?? h,
            field: field
        };
    });
};

// Handle layout changes
const onLayoutUpdated = (newLayout) => {
    // Update all fields with their new layout positions
    newLayout.forEach(item => {
        const field = props.fields.find(f => f.id === item.i);
        if (field) {
            // Create a layout object with positions
            const layoutUpdate = {
                layout: {
                    x: item.x,
                    y: item.y,
                    w: item.w,
                    h: item.h
                },
                colSpan: item.w // Update colSpan to match width
            };
            
            // Update the field
            emit('update-field', field.id, layoutUpdate);
        }
    });
};

// Open field settings popup
const openFieldSettings = (field, event) => {
    event.stopPropagation();
    
    popup.open(
        'field-settings',
        null,
        FieldSettings,
        {
            field: field,
            formFields: props.fields.filter(f => f.id !== field.id),
            onUpdate: (updatedField) => {
                emit('update-field', field.id, updatedField);
                popup.close();
            }
        },
        {
            position: 'center'
        }
    );
};

// Delete a field
const deleteField = (fieldId, event) => {
    event.stopPropagation();
    
    if (confirm('Are you sure you want to delete this field?')) {
        emit('delete-field', fieldId);
        common.notification('Field deleted', true);
    }
};

// Duplicate a field
const duplicateField = (fieldId, event) => {
    event.stopPropagation();
    emit('duplicate-field', fieldId);
    common.notification('Field duplicated', true);
};

// Get icon component for a field type
const getFieldIcon = (fieldType) => {
    const icons = {
        input: 'text_fields',
        textarea: 'notes',
        select: 'list',
        radio: 'radio_button_checked',
        checkbox: 'check_box',
        date: 'calendar_month',
        image: 'image',
        video: 'videocam',
        file: 'attach_file',
        rating: 'star',
        divider: 'horizontal_rule'
    };
    
    return icons[fieldType] || 'help_outline';
};

// Initialize layout on mount
onMounted(() => {
    updateLayoutFromFields();
});
</script>

<template>
    <div class="grid-layout-container" :class="{ 'edit-mode': editMode }">
        <div v-if="fields.length === 0" class="empty-form-state">
            <Notice 
                description="Your form is empty. Click 'Add Field' to start building your form." 
                icon="info"
                as="suggest"
            />
        </div>
        
        <GridLayout
            v-else
            v-model:layout="layoutItems"
            :col-num="cols"
            :row-height="rowHeight"
            :is-draggable="isDraggable"
            :is-resizable="isResizable"
            :vertical-compact="true"
            :use-css-transforms="true"
            :responsive="true"
            :margin="[16, 16]"
            @layout-updated="onLayoutUpdated"
        >
            <GridItem
                v-for="item in layoutItems"
                :key="item.i"
                :x="item.x"
                :y="item.y"
                :w="item.w"
                :h="item.h"
                :i="item.i"
                :min-w="2"
                :max-w="12"
                :min-h="1"
                :max-h="8"
                class="grid-item"
                :class="{ 'edit-mode': editMode }"
            >
                <div class="field-card">
                    <div class="field-header">
                        <div class="field-info">
                            <div class="field-icon">
                                <i>{{ getFieldIcon(item.field.type) }}</i>
                            </div>
                            <div class="field-details">
                                <h3 class="field-label">{{ item.field.label }}</h3>
                                <p class="field-type">{{ item.field.type }}</p>
                            </div>
                        </div>
                        
                        <div class="field-actions">
                            <Button 
                                as="tertiary icon" 
                                :iconLeft="{ component: PhGear, weight: 'bold' }" 
                                @click="(e) => openFieldSettings(item.field, e)"
                                v-tooltip="{ content: 'Settings' }"
                            />
                            <Button 
                                as="tertiary icon" 
                                :iconLeft="{ component: PhCopy, weight: 'bold' }" 
                                @click="(e) => duplicateField(item.field.i, e)"
                                v-tooltip="{ content: 'Duplicate' }"
                            />
                            <Button 
                                as="tertiary icon" 
                                :iconLeft="{ component: PhTrash, weight: 'bold' }" 
                                @click="(e) => deleteField(item.field.id, e)"
                                v-tooltip="{ content: 'Delete' }"
                            />
                        </div>
                    </div>
                    
                    <div v-if="editMode" class="field-dimensions">
                        {{ item.w }}/12 columns × {{ item.h }} rows
                    </div>
                    
                    <!-- Conditional logic indicator -->
                    <div 
                        v-if="item.field.visibility && item.field.visibility.conditions.length > 0"
                        class="field-logic-indicator"
                    >
                        <i>visibility</i>
                    </div>
                </div>
            </GridItem>
        </GridLayout>
    </div>
</template>

<style scoped>
.grid-layout-container {
    width: 100%;
    position: relative;
    padding-bottom: 60px; /* Add space at the bottom */
}

.empty-form-state {
    height: 300px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px;
}

/* Style grid items */
.grid-item {
    transition: all 0.2s;
    overflow: visible !important; /* Allow resize handles to overflow */
}

.grid-item.edit-mode {
    z-index: 1;
}

/* Field card styling */
.field-card {
    background-color: var(--background-1);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: 12px;
    height: 100%;
    position: relative;
    transition: all 0.2s;
}

.edit-mode .field-card {
    border: 2px solid var(--border);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.grid-item:hover .field-card {
    border-color: var(--brand-stroke);
}

.field-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
}

.field-info {
    display: flex;
    align-items: center;
    gap: 8px;
}

.field-icon {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background-color: var(--background-2);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--brand-default);
    flex-shrink: 0;
}

.field-icon i {
    font-size: 18px;
}

.field-details {
    display: flex;
    flex-direction: column;
    overflow: hidden;
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

.field-actions {
    display: flex;
    gap: 4px;
    flex-shrink: 0;
}

.field-dimensions {
    position: absolute;
    bottom: 8px;
    left: 8px;
    background-color: var(--brand-fill);
    color: var(--brand-default);
    font-size: 10px;
    padding: 2px 6px;
    border-radius: 4px;
    font-weight: 600;
}

.field-logic-indicator {
    position: absolute;
    top: 4px;
    right: 4px;
    background-color: var(--blue-fill);
    color: var(--blue-default);
    font-size: 10px;
    padding: 2px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
}

/* Edit mode styling */
.edit-mode .vue-grid-item:not(.vue-grid-placeholder) {
    background: rgba(var(--brand-default-rgb), 0.05);
    border: 1px dashed var(--brand-stroke);
}

/* Resize handles */
.edit-mode .vue-grid-item > .vue-resizable-handle {
    background-image: url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8' viewBox='0 0 8 8'%3E%3Cpath fill='%23888' d='M6.5 7.5L1 2v5.5h5.5z'/%3E%3C/svg%3E");
    background-position: bottom right;
    background-repeat: no-repeat;
    padding: 0 8px 8px 0;
    background-origin: content-box;
    box-sizing: border-box;
    cursor: se-resize;
    bottom: 0;
    right: 0;
    width: 20px;
    height: 20px;
    transform: none;
}

/* Dragging state */
.vue-grid-item.vue-grid-placeholder {
    background: var(--brand-fill);
    border: 1px solid var(--brand-stroke);
    opacity: 0.5;
}

/* Responsive styling */
@media (max-width: 768px) {
    .grid-layout-container {
        padding-bottom: 100px;
    }
}
</style>