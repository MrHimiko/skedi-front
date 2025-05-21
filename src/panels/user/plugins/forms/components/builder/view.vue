<script setup>
import { ref, watch, reactive, markRaw } from 'vue';
import { createField } from '@user_forms/utils/field-types';
import { popup } from '@utils/popup';

import CanvasComponent from './canvas.vue';
import FieldSelectionPopup from './field-selection-popup.vue';

const props = defineProps({
    formData: {
        type: Object,
        required: true
    }
});

const emit = defineEmits(['update:form']);

// Use a non-reactive version of the form data for internal operations
const internalFormData = ref(markRaw({...props.formData}));
// Reactive form for the view
const form = ref({...props.formData});

// Track update state to prevent loops
const isUpdating = ref(false);
const updateQueue = ref([]);

// Watch for changes in props.formData
watch(() => props.formData, (newFormData) => {
    if (!isUpdating.value) {
        // Only update if we're not in the middle of our own update
        internalFormData.value = markRaw({...newFormData});
        form.value = {...newFormData};
    }
}, { deep: true });

// Queue updates and process them outside of Vue's reactivity system
function queueUpdate(callback) {
    if (isUpdating.value) {
        updateQueue.value.push(callback);
        return;
    }
    
    isUpdating.value = true;
    
    // Use setTimeout to break out of Vue's reactivity tracking
    setTimeout(() => {
        try {
            callback();
            
            // Apply the updates to the form
            form.value = {...internalFormData.value};
            
            // Emit the update
            emit('update:form', {...form.value});
        } finally {
            // Always reset the updating flag
            setTimeout(() => {
                isUpdating.value = false;
                
                // Process any queued updates
                if (updateQueue.value.length > 0) {
                    const nextCallback = updateQueue.value.shift();
                    queueUpdate(nextCallback);
                }
            }, 0);
        }
    }, 0);
}

// Open popup to add a new field
const openAddFieldPopup = () => {
    popup.open(
        'add-field',
        null,
        FieldSelectionPopup,
        {
            onSelectField: (fieldType) => {
                addField(fieldType);
                popup.close();
            }
        },
        {
            position: 'center'
        }
    );
};

// Add a new field
const addField = (fieldType) => {
    queueUpdate(() => {
        const newField = createField(fieldType);
        
        // Add layout properties
        newField.colSpan = fieldType === 'divider' ? 12 : 6; // Default half width for most fields
        newField.layout = {
            x: 0,
            y: internalFormData.value.fields.length * 4, // Place at the bottom
            w: fieldType === 'divider' ? 12 : 6,
            h: fieldType === 'textarea' ? 3 : 2
        };
        
        // Update internal (non-reactive) data first
        internalFormData.value = {
            ...internalFormData.value,
            fields: [...internalFormData.value.fields, newField]
        };
    });
};

// Update a field's properties
const updateField = (fieldId, updatedProps) => {
    queueUpdate(() => {
        const fieldIndex = internalFormData.value.fields.findIndex(field => field.id === fieldId);
        if (fieldIndex === -1) return;
        
        // Update the field in our internal data
        const updatedFields = [...internalFormData.value.fields];
        updatedFields[fieldIndex] = {
            ...updatedFields[fieldIndex],
            ...updatedProps
        };
        
        // Update internal data
        internalFormData.value = {
            ...internalFormData.value,
            fields: updatedFields
        };
    });
};

// Delete a field
const deleteField = (fieldId) => {
    queueUpdate(() => {
        internalFormData.value = {
            ...internalFormData.value,
            fields: internalFormData.value.fields.filter(field => field.id !== fieldId)
        };
    });
};

// Duplicate a field
const duplicateField = (fieldId) => {
    queueUpdate(() => {
        const fieldToDuplicate = internalFormData.value.fields.find(field => field.id === fieldId);
        if (!fieldToDuplicate) return;
        
        const duplicatedField = {
            ...fieldToDuplicate,
            id: `field-${Date.now()}`,
            label: `${fieldToDuplicate.label} (Copy)`
        };
        
        // Offset the layout position slightly for the duplicate
        if (duplicatedField.layout) {
            duplicatedField.layout = {
                ...duplicatedField.layout,
                x: (duplicatedField.layout.x + 1) % (12 - duplicatedField.layout.w + 1),
                y: duplicatedField.layout.y + 1
            };
        }
        
        // Add the duplicated field
        internalFormData.value = {
            ...internalFormData.value,
            fields: [...internalFormData.value.fields, duplicatedField]
        };
    });
};
</script>

<template>
    <div class="form-builder">
        <CanvasComponent 
            :fields="form.fields"
            @update-field="updateField"
            @delete-field="deleteField"
            @duplicate-field="duplicateField"
            @add-field="openAddFieldPopup"
        />
    </div>
</template>

<style scoped>
.form-builder {
    width: 100%;
}
</style>