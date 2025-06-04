<script setup>
import { ref, watch } from 'vue';
import { createField } from '@user_forms/utils/field-types';
import { ensureSystemFieldsOrder } from '@user_forms/utils/form-schema';
import { popup } from '@utils/popup';
import { common } from '@utils/common';

import CanvasComponent from './canvas.vue';
import FieldSelectionPopup from './field-selection-popup.vue';
import FieldSettings from './field-settings.vue';

const props = defineProps({
    formData: {
        type: Object,
        required: true
    }
});

const emit = defineEmits(['update:form']);

const form = ref({...props.formData});

watch(() => props.formData, (newFormData) => {
    form.value = {...newFormData};
}, { deep: true });

// Get next order number for fields
const getNextOrder = () => {
    const maxOrder = form.value.fields.reduce((max, field) => {
        return Math.max(max, field.order || 0);
    }, 0);
    return maxOrder + 1;
};

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
    const order = getNextOrder();
    const newField = createField(fieldType, order);
    
    if (!newField) {
        common.notification('Failed to create field', false);
        return;
    }
    
    // Check if it's a guest repeater and we already have one
    if (fieldType === 'system_contact_guests') {
        const existingGuestRepeater = form.value.fields.find(f => 
            f.type === 'guest_repeater' || f.name === 'system_contact_guests'
        );
        
        if (existingGuestRepeater) {
            common.notification('You can only have one Guest List field per form', false);
            return;
        }
    }
    
    const updatedFields = [...form.value.fields, newField];
    
    form.value = {
        ...form.value,
        fields: ensureSystemFieldsOrder(updatedFields)
    };
    
    emit('update:form', form.value);
    
    // Open settings for non-system fields
    if (!newField.system_field && fieldType !== 'divider') {
        setTimeout(() => {
            openFieldSettings(newField);
        }, 100);
    }
};

// Open field settings
const openFieldSettings = (field) => {
    popup.open(
        'field-settings',
        null,
        FieldSettings,
        {
            field: field,
            formFields: form.value.fields.filter(f => 
                (f.id !== field.id && f.name !== field.name) && !f.system_field
            ),
            onUpdate: (updatedField) => {
                updateField(field.id || field.name, updatedField);
                popup.close();
            }
        },
        {
            position: 'center'
        }
    );
};

// Update a field's properties
const updateField = (fieldId, updatedProps) => {
    const fieldIndex = form.value.fields.findIndex(field => 
        field.id === fieldId || field.name === fieldId
    );
    
    if (fieldIndex === -1) return;
    
    const updatedFields = [...form.value.fields];
    updatedFields[fieldIndex] = {
        ...updatedFields[fieldIndex],
        ...updatedProps
    };
    
    form.value = {
        ...form.value,
        fields: updatedFields
    };
    
    emit('update:form', form.value);
};

// Delete a field
const deleteField = (fieldId) => {
    // Check if it's a required system field
    const field = form.value.fields.find(f => f.id === fieldId || f.name === fieldId);
    if (field?.deletable === false) {
        common.notification('This field cannot be deleted', false);
        return;
    }
    
    // Remove from containers
    const updatedFields = form.value.fields.map(field => {
        if ((field.type === 'step' || field.type === 'group') && 
            field.children && 
            field.children.includes(fieldId)) {
            return {
                ...field,
                children: field.children.filter(id => id !== fieldId)
            };
        }
        return field;
    });
    
    // Remove the field
    form.value = {
        ...form.value,
        fields: updatedFields.filter(field => field.id !== fieldId && field.name !== fieldId)
    };
    
    emit('update:form', form.value);
};

// Duplicate a field
const duplicateField = (fieldId) => {
    const fieldToDuplicate = form.value.fields.find(field => 
        field.id === fieldId || field.name === fieldId
    );
    
    if (!fieldToDuplicate) return;
    
    // Can't duplicate system fields
    if (fieldToDuplicate.system_field) {
        common.notification('System fields cannot be duplicated', false);
        return;
    }
    
    // Can't duplicate guest repeater if one exists
    if (fieldToDuplicate.type === 'guest_repeater') {
        common.notification('You can only have one Guest List field per form', false);
        return;
    }
    
    const order = getNextOrder();
    const duplicatedField = {
        ...fieldToDuplicate,
        id: `field-${Date.now()}`,
        label: `${fieldToDuplicate.label} (Copy)`,
        order: order
    };
    
    // Clear children for containers
    if (duplicatedField.type === 'step' || duplicatedField.type === 'group') {
        duplicatedField.children = [];
    }
    
    form.value = {
        ...form.value,
        fields: [...form.value.fields, duplicatedField]
    };
    
    emit('update:form', form.value);
};

// Move a field up or down
const moveField = (fieldId, direction, containerId = null) => {
    if (containerId) {
        // Moving within container
        const containerIndex = form.value.fields.findIndex(field => field.id === containerId);
        if (containerIndex === -1) return;
        
        const container = form.value.fields[containerIndex];
        const children = container.children || [];
        const fieldIndex = children.indexOf(fieldId);
        
        if (fieldIndex === -1) return;
        
        if (direction === 'up' && fieldIndex === 0) return;
        if (direction === 'down' && fieldIndex === children.length - 1) return;
        
        const newChildren = [...children];
        const fieldToMove = newChildren[fieldIndex];
        
        newChildren.splice(fieldIndex, 1);
        
        const newIndex = direction === 'up' ? fieldIndex - 1 : fieldIndex + 1;
        newChildren.splice(newIndex, 0, fieldToMove);
        
        const updatedFields = [...form.value.fields];
        updatedFields[containerIndex] = {
            ...updatedFields[containerIndex],
            children: newChildren
        };
        
        form.value = {
            ...form.value,
            fields: updatedFields
        };
        
        emit('update:form', form.value);
    } else {
        // Moving in main form
        const field = form.value.fields.find(f => f.id === fieldId || f.name === fieldId);
        if (!field) return;
        
        // Handle system fields differently
        if (field.system_field) {
            // System fields can only be reordered among themselves
            const systemFields = form.value.fields.filter(f => f.system_field);
            const regularFields = form.value.fields.filter(f => !f.system_field);
            
            const fieldIndex = systemFields.findIndex(f => 
                (f.id === field.id) || (f.name === field.name)
            );
            
            if (direction === 'up' && fieldIndex === 0) return;
            if (direction === 'down' && fieldIndex === systemFields.length - 1) return;
            
            const newSystemFields = [...systemFields];
            const [movedField] = newSystemFields.splice(fieldIndex, 1);
            const newIndex = direction === 'up' ? fieldIndex - 1 : fieldIndex + 1;
            newSystemFields.splice(newIndex, 0, movedField);
            
            // Update order values
            newSystemFields.forEach((field, index) => {
                field.order = index + 1;
            });
            
            form.value = {
                ...form.value,
                fields: [...newSystemFields, ...regularFields]
            };
            
            emit('update:form', form.value);
        } else {
            // Regular fields
            const fieldIndex = form.value.fields.findIndex(f => f.id === fieldId);
            if (fieldIndex === -1) return;
            
            const systemFieldsCount = form.value.fields.filter(f => f.system_field).length;
            
            if (direction === 'up' && fieldIndex <= systemFieldsCount) return;
            if (direction === 'down' && fieldIndex === form.value.fields.length - 1) return;
            
            const updatedFields = [...form.value.fields];
            const fieldToMove = updatedFields[fieldIndex];
            
            updatedFields.splice(fieldIndex, 1);
            
            const newIndex = direction === 'up' ? fieldIndex - 1 : fieldIndex + 1;
            updatedFields.splice(newIndex, 0, fieldToMove);
            
            form.value = {
                ...form.value,
                fields: updatedFields
            };
            
            emit('update:form', form.value);
        }
    }
};

// Add field to container
const addFieldToContainer = (containerId) => {
    const containerIndex = form.value.fields.findIndex(field => field.id === containerId);
    if (containerIndex === -1) return;
    
    const container = form.value.fields[containerIndex];
    
    popup.open(
        'add-field-to-container',
        null,
        FieldSelectionPopup,
        {
            onSelectField: (fieldType) => {
                const order = getNextOrder();
                const newField = createField(fieldType, order);
                
                if (!newField) {
                    common.notification('Failed to create field', false);
                    popup.close();
                    return;
                }
                
                // Validate container restrictions
                if (container.type === 'group' && (fieldType === 'step' || fieldType === 'group')) {
                    common.notification('Cannot add a step or group to a group', false);
                    popup.close();
                    return;
                }
                
                if (container.type === 'step' && fieldType === 'step') {
                    common.notification('Cannot add a step to another step', false);
                    popup.close();
                    return;
                }
                
                // Check guest repeater limit
                if (fieldType === 'system_contact_guests') {
                    const existingGuestRepeater = form.value.fields.find(f => 
                        f.type === 'guest_repeater' || f.name === 'system_contact_guests'
                    );
                    
                    if (existingGuestRepeater) {
                        common.notification('You can only have one Guest List field per form', false);
                        popup.close();
                        return;
                    }
                }
                
                const updatedFields = [...form.value.fields, newField];
                
                const children = container.children || [];
                const updatedContainer = {
                    ...container,
                    children: [...children, newField.id || newField.name]
                };
                
                updatedFields[containerIndex] = updatedContainer;
                
                form.value = {
                    ...form.value,
                    fields: updatedFields
                };
                
                emit('update:form', form.value);
                
                if (!newField.system_field && fieldType !== 'divider') {
                    setTimeout(() => {
                        openFieldSettings(newField);
                    }, 100);
                }
                
                popup.close();
            },
            containerType: container.type
        },
        {
            position: 'center'
        }
    );
};

// Manage container fields
const manageContainerFields = (containerId, selectedFieldIds) => {
    const containerIndex = form.value.fields.findIndex(field => field.id === containerId);
    if (containerIndex === -1) return;
    
    // Clean selected field IDs - no duplicates, no nulls
    const cleanedSelectedIds = [...new Set(selectedFieldIds.filter(id => id != null))];
    
    const updatedFields = [...form.value.fields];
    updatedFields[containerIndex] = {
        ...updatedFields[containerIndex],
        children: cleanedSelectedIds
    };
    
    form.value = {
        ...form.value,
        fields: updatedFields
    };
    
    emit('update:form', form.value);
    
    common.notification(`Updated fields in ${updatedFields[containerIndex].type}`, true);
};
</script>

<template>
    <div class="form-builder">
        <CanvasComponent 
            :fields="form.fields"
            @update-field="updateField"
            @delete-field="deleteField"
            @duplicate-field="duplicateField"
            @move-field="moveField"
            @add-field="openAddFieldPopup"
            @add-field-to-container="addFieldToContainer"
            @manage-container-fields="manageContainerFields"
        />
    </div>
</template>

<style scoped>
.form-builder {
    width: 100%;
}
</style>