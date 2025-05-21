<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import { calculateLayout } from './grid-layout';
import Button from '@form/button/view.vue';
import Notice from '@global/notice/view.vue';
import { PhGear, PhTrash, PhCopy, PhArrowsOutCardinal } from "@phosphor-icons/vue";
import { popup } from '@utils/popup';
import FieldSettings from './field-settings.vue';
import { common } from '@utils/common';

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
    'duplicate-field'
]);

// Grid container ref
const gridContainer = ref(null);

// Track which field is being interacted with
const activeFieldId = ref(null);
const isDragging = ref(false);
const isResizing = ref(false);
const dragStartPos = ref({ x: 0, y: 0 });
const resizeStartPos = ref({ x: 0, y: 0 });
const originalLayout = ref(null);

// Visual feedback elements
const ghostElement = ref(null);
const dropIndicator = ref({ show: false, x: 0, y: 0, w: 0, h: 0 });

// Grid settings
const columns = 12;
const cellHeight = 80;
const gridGap = 16;

// Calculate grid layout
const layoutFields = computed(() => {
    return props.fields.map(field => ({
        ...field,
        layout: field.layout ? {...field.layout} : {
            x: 0,
            y: 0,
            w: field.colSpan || 12,
            h: field.type === 'textarea' ? 3 : 2
        }
    }));
});

// Get position styles for a field
const getFieldStyles = (field) => {
    // Ensure we have valid layout properties
    const layout = field.layout || { 
        x: 0, 
        y: 0, 
        w: field.colSpan || 12, 
        h: field.type === 'textarea' ? 3 : 2 
    };
    
    // Create a safe layout object with defaults
    const safeLayout = {
        x: layout.x ?? 0,
        y: layout.y ?? 0,
        w: layout.w ?? (field.colSpan || 12),
        h: layout.h ?? (field.type === 'textarea' ? 3 : 2)
    };
    
    return {
        gridColumn: `span ${safeLayout.w}`,
        gridRow: `span ${safeLayout.h}`,
        position: 'relative'
    };
};

// Safe update function 
const safeUpdateField = (fieldId, updates) => {
    // Use setTimeout to break the reactive chain
    setTimeout(() => {
        emit('update-field', fieldId, updates);
    }, 0);
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

// Calculate grid position from mouse coordinates
const getGridPosition = (mouseX, mouseY) => {
    if (!gridContainer.value) return { x: 0, y: 0 };
    
    const rect = gridContainer.value.getBoundingClientRect();
    const columnWidth = rect.width / columns;
    
    // Calculate grid position
    const gridX = Math.max(0, Math.floor((mouseX - rect.left) / columnWidth));
    const gridY = Math.max(0, Math.floor((mouseY - rect.top) / cellHeight));
    
    return { x: gridX, y: gridY };
};

// Create a visual ghost element for dragging
const createGhostElement = (element) => {
    if (!element) return null;
    
    // Create a clone of the element
    const ghost = element.cloneNode(true);
    
    // Style the ghost element
    ghost.style.position = 'absolute';
    ghost.style.top = '0';
    ghost.style.left = '0';
    ghost.style.zIndex = '9999';
    ghost.style.opacity = '0.7';
    ghost.style.pointerEvents = 'none';
    ghost.style.border = '2px dashed var(--brand-default)';
    ghost.style.backgroundColor = 'rgba(var(--brand-default-rgb), 0.1)';
    ghost.style.transition = 'none';
    ghost.classList.add('ghost-element');
    
    // Add the ghost to the document
    document.body.appendChild(ghost);
    
    return ghost;
};

// Start dragging a field
const startDrag = (field, event) => {
    if (!props.editMode || !event.target.closest('.drag-handle')) return;
    
    event.preventDefault();
    
    activeFieldId.value = field.id;
    isDragging.value = true;
    dragStartPos.value = { x: event.clientX, y: event.clientY };
    
    // Clone the layout
    originalLayout.value = {
        x: field.layout?.x || 0,
        y: field.layout?.y || 0,
        w: field.layout?.w || field.colSpan || 12,
        h: field.layout?.h || (field.type === 'textarea' ? 3 : 2)
    };
    
    // Create ghost element for dragging
    const fieldElement = event.target.closest('.field-item');
    if (fieldElement) {
        fieldElement.classList.add('dragging');
        ghostElement.value = createGhostElement(fieldElement);
        
        if (ghostElement.value) {
            // Position the ghost at the initial position
            ghostElement.value.style.width = `${fieldElement.offsetWidth}px`;
            ghostElement.value.style.height = `${fieldElement.offsetHeight}px`;
            ghostElement.value.style.transform = `translate(${fieldElement.offsetLeft}px, ${fieldElement.offsetTop}px)`;
        }
    }
    
    // Add global event listeners
    document.addEventListener('mousemove', handleDrag);
    document.addEventListener('mouseup', stopDrag);
};

// Handle dragging
const handleDrag = (event) => {
    if (!isDragging.value || !activeFieldId.value) return;
    
    // Get the field
    const field = props.fields.find(f => f.id === activeFieldId.value);
    if (!field) return;
    
    // Move the ghost element with the cursor
    if (ghostElement.value) {
        // Calculate delta from start position
        const deltaX = event.clientX - dragStartPos.value.x;
        const deltaY = event.clientY - dragStartPos.value.y;
        
        // Get the original field element
        const fieldElement = document.querySelector(`.field-item[data-field-id="${field.id}"]`);
        if (fieldElement) {
            // Position the ghost relative to original position + delta
            const originalLeft = fieldElement.offsetLeft;
            const originalTop = fieldElement.offsetTop;
            
            ghostElement.value.style.transform = `translate(${originalLeft + deltaX}px, ${originalTop + deltaY}px)`;
        }
    }
    
    // Calculate grid position from mouse coordinates
    const gridPos = getGridPosition(event.clientX, event.clientY);
    
    // Update drop indicator
    dropIndicator.value = {
        show: true,
        x: gridPos.x,
        y: gridPos.y,
        w: originalLayout.value.w,
        h: originalLayout.value.h
    };
};

// Stop dragging
const stopDrag = () => {
    document.removeEventListener('mousemove', handleDrag);
    document.removeEventListener('mouseup', stopDrag);
    
    // Remove ghost element
    if (ghostElement.value) {
        document.body.removeChild(ghostElement.value);
        ghostElement.value = null;
    }
    
    // Hide drop indicator
    dropIndicator.value.show = false;
    
    // Reset field styles
    const fieldElement = document.querySelector(`.field-item[data-field-id="${activeFieldId.value}"]`);
    if (fieldElement) {
        fieldElement.classList.remove('dragging');
        fieldElement.style.opacity = '1';
    }
    
    // If we were actually dragging, update field position
    if (isDragging.value && activeFieldId.value && dropIndicator.value.x !== originalLayout.value.x || dropIndicator.value.y !== originalLayout.value.y) {
        // Get final drop position
        const newX = dropIndicator.value.x;
        const newY = dropIndicator.value.y;
        
        // Reposition the field
        safeUpdateField(activeFieldId.value, {
            layout: {
                ...originalLayout.value,
                x: newX,
                y: newY
            }
        });
        
        // Provide feedback
        common.notification(`Field moved to position (${newX}, ${newY})`, true);
    }
    
    isDragging.value = false;
    activeFieldId.value = null;
    originalLayout.value = null;
};

// Start resizing a field
const startResize = (field, event) => {
    if (!props.editMode) return;
    
    event.preventDefault();
    event.stopPropagation();
    
    activeFieldId.value = field.id;
    isResizing.value = true;
    resizeStartPos.value = { x: event.clientX, y: event.clientY };
    
    // Clone the layout
    originalLayout.value = {
        x: field.layout?.x || 0,
        y: field.layout?.y || 0,
        w: field.layout?.w || field.colSpan || 12,
        h: field.layout?.h || (field.type === 'textarea' ? 3 : 2)
    };
    
    // Add resizing class
    const fieldElement = event.target.closest('.field-item');
    if (fieldElement) {
        fieldElement.classList.add('resizing');
    }
    
    // Add global event listeners
    document.addEventListener('mousemove', handleResize);
    document.addEventListener('mouseup', stopResize);
};

// Handle resizing
const handleResize = (event) => {
    if (!isResizing.value || !activeFieldId.value) return;
    
    const field = props.fields.find(f => f.id === activeFieldId.value);
    if (!field) return;
    
    // Get container dimensions
    const rect = gridContainer.value.getBoundingClientRect();
    const columnWidth = rect.width / columns;
    
    // Calculate delta and new width
    const deltaX = event.clientX - resizeStartPos.value.x;
    const columnsChange = Math.round(deltaX / columnWidth);
    const newWidth = Math.max(3, Math.min(12 - originalLayout.value.x, originalLayout.value.w + columnsChange));
    
    // Update field visually during resize
    const fieldElement = document.querySelector(`.field-item[data-field-id="${field.id}"]`);
    if (fieldElement) {
        // Visualize the new width (approximate)
        fieldElement.style.gridColumn = `span ${newWidth}`;
    }
};

// Stop resizing
const stopResize = () => {
    document.removeEventListener('mousemove', handleResize);
    document.removeEventListener('mouseup', stopResize);
    
    // Reset field styles
    const fieldElement = document.querySelector(`.field-item[data-field-id="${activeFieldId.value}"]`);
    if (fieldElement) {
        fieldElement.classList.remove('resizing');
        fieldElement.style.gridColumn = '';
    }
    
    // If we were resizing, update field width
    if (isResizing.value && activeFieldId.value) {
        const field = props.fields.find(f => f.id === activeFieldId.value);
        if (field) {
            // Calculate final width
            const rect = gridContainer.value.getBoundingClientRect();
            const columnWidth = rect.width / columns;
            const deltaX = event.clientX - resizeStartPos.value.x;
            const columnsChange = Math.round(deltaX / columnWidth);
            const newWidth = Math.max(3, Math.min(12 - originalLayout.value.x, originalLayout.value.w + columnsChange));
            
            // Update field width
            safeUpdateField(activeFieldId.value, {
                colSpan: newWidth,
                layout: {
                    ...originalLayout.value,
                    w: newWidth
                }
            });
            
            // Provide feedback
            common.notification(`Field resized to ${newWidth} columns`, true);
        }
    }
    
    isResizing.value = false;
    activeFieldId.value = null;
    originalLayout.value = null;
};

// Clean up on unmount
onMounted(() => {
    nextTick(() => {
        // Initialize layouts for fields that don't have them
        props.fields.forEach(field => {
            if (!field.layout) {
                safeUpdateField(field.id, {
                    colSpan: field.colSpan || 12,
                    layout: {
                        x: 0,
                        y: 0,
                        w: field.colSpan || 12,
                        h: field.type === 'textarea' ? 3 : 2
                    }
                });
            }
        });
    });
});
</script>

<template>
    <div class="custom-grid-container" :class="{ 'edit-mode': editMode }">
        <div v-if="fields.length === 0" class="empty-form-state">
            <Notice 
                description="Your form is empty. Click 'Add Field' to start building your form." 
                icon="info"
                as="suggest"
            />
        </div>
        
        <div 
            v-else
            ref="gridContainer"
            class="form-grid"
        >
            <!-- Drop indicator -->
            <div 
                v-if="dropIndicator.show" 
                class="drop-indicator"
                :style="{
                    gridColumn: `span ${dropIndicator.w}`,
                    gridRow: `span ${dropIndicator.h}`,
                    gridColumnStart: dropIndicator.x + 1,
                    gridRowStart: dropIndicator.y + 1
                }"
            ></div>
            
            <!-- Field Items -->
            <div 
                v-for="field in layoutFields" 
                :key="field.id"
                class="field-item"
                :class="{ 
                    draggable: editMode,
                    'being-dragged': isDragging && activeFieldId === field.id,
                    'being-resized': isResizing && activeFieldId === field.id
                }"
                :style="getFieldStyles(field)"
                :data-field-id="field.id"
            >
                <div class="field-content">
                    <div class="field-header">
                        <div class="field-info">
                            <div 
                                v-if="editMode" 
                                class="drag-handle"
                                @mousedown="(e) => startDrag(field, e)"
                            >
                                <PhArrowsOutCardinal weight="bold" />
                            </div>
                            <div class="field-icon">
                                <i>{{ getFieldIcon(field.type) }}</i>
                            </div>
                            <div class="field-details">
                                <h3 class="field-label">{{ field.label }}</h3>
                                <p class="field-type">{{ field.type }}</p>
                            </div>
                        </div>
                        
                        <div class="field-actions">
                            <Button 
                                as="tertiary icon" 
                                :iconLeft="{ component: PhGear, weight: 'bold' }" 
                                @click="(e) => openFieldSettings(field, e)"
                                v-tooltip="{ content: 'Settings' }"
                            />
                            <Button 
                                as="tertiary icon" 
                                :iconLeft="{ component: PhCopy, weight: 'bold' }" 
                                @click="(e) => duplicateField(field.id, e)"
                                v-tooltip="{ content: 'Duplicate' }"
                            />
                            <Button 
                                as="tertiary icon" 
                                :iconLeft="{ component: PhTrash, weight: 'bold' }" 
                                @click="(e) => deleteField(field.id, e)"
                                v-tooltip="{ content: 'Delete' }"
                            />
                        </div>
                    </div>
                    
                    <div v-if="editMode" class="field-dimensions">
                        {{ field.layout?.w || field.colSpan || 12 }}/12 columns
                    </div>
                    
                    <!-- Conditional logic indicator -->
                    <div 
                        v-if="field.visibility && field.visibility.conditions.length > 0"
                        class="field-logic-indicator"
                    >
                        <i>visibility</i>
                    </div>
                    
                    <!-- Resize handle (only in edit mode) -->
                    <div 
                        v-if="editMode && (field.layout?.w || field.colSpan || 12) < 12" 
                        class="resize-handle"
                        @mousedown="(e) => startResize(field, e)"
                    ></div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.custom-grid-container {
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

/* Grid layout */
.form-grid {
    display: grid;
    grid-template-columns: repeat(12, 1fr);
    gap: 16px;
    width: 100%;
    padding: 8px;
    position: relative;
    min-height: 200px;
}

/* Field styling */
.field-item {
    transition: all 0.2s;
    padding: 0;
    margin: 0;
    position: relative;
    min-height: 70px;
}

.field-content {
    background-color: var(--background-1);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    height: 100%;
    padding: 12px;
    position: relative;
    transition: all 0.2s;
}

.field-item.draggable .drag-handle {
    cursor: grab;
}

.edit-mode .field-content {
    border: 2px solid var(--border);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.field-item:hover .field-content {
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
    overflow: hidden;
}

.drag-handle {
    cursor: grab;
    color: var(--text-tertiary);
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    flex-shrink: 0;
}

.field-item.being-dragged .drag-handle {
    cursor: grabbing;
}

.drag-handle:hover {
    color: var(--brand-default);
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
    z-index: 1;
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
    z-index: 1;
}

/* Resize handle */
.resize-handle {
    position: absolute;
    top: 0;
    right: -8px;
    width: 16px;
    height: 100%;
    cursor: col-resize;
    z-index: 10;
}

.resize-handle::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 8px;
    transform: translateY(-50%);
    width: 4px;
    height: 24px;
    background-color: var(--brand-default);
    border-radius: 2px;
    opacity: 0;
    transition: opacity 0.2s;
}

.field-item:hover .resize-handle::after {
    opacity: 0.5;
}

.field-item.resizing .resize-handle::after {
    opacity: 1;
}

/* Drag and resize states */
.field-item.being-dragged .field-content {
    opacity: 0.3;
    border: 2px dashed var(--brand-default);
}

.field-item.being-resized .field-content {
    border: 2px dashed var(--brand-default);
}

/* Drop indicator */
.drop-indicator {
    background-color: rgba(var(--brand-default-rgb), 0.15);
    border: 2px dashed var(--brand-default);
    border-radius: var(--radius-md);
    z-index: 5;
    pointer-events: none;
}

/* Edit mode grid overlay */
.edit-mode .form-grid {
    background-image: linear-gradient(
        to right,
        rgba(var(--brand-default-rgb), 0.05) 1px,
        transparent 1px
    );
    background-size: calc(100% / 12) 100%;
    background-position: -1px 0;
}

/* Ghost element styles - applied with JS */
.ghost-element {
    pointer-events: none !important;
    z-index: 9999 !important;
    will-change: transform;
    transition: none !important;
}

/* Responsive styling */
@media (max-width: 768px) {
    .form-grid {
        grid-template-columns: 1fr;
    }
    
    .field-item {
        grid-column: 1 !important;
    }
    
    .resize-handle {
        display: none;
    }
}
</style>