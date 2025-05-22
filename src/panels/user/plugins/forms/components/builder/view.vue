// src/panels/user/plugins/forms/components/builder/view.vue

<script setup>
    import { ref, watch } from 'vue';
    import { createField } from '@user_forms/utils/field-types';
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

    // Use a local copy of the form data
    const form = ref({...props.formData});

    // Watch for changes in props.formData
    watch(() => props.formData, (newFormData) => {
        form.value = {...newFormData};
    }, { deep: true });

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
        const newField = createField(fieldType);
        
        // Add to the fields array
        const updatedFields = [...form.value.fields, newField];
        
        // Update the form
        form.value = {
            ...form.value,
            fields: updatedFields
        };
        
        // Emit the update
        emit('update:form', form.value);
        
        // Immediately open settings for the new field
        setTimeout(() => {
            openFieldSettings(newField);
        }, 100);
    };

    // Open field settings immediately after adding a field
    const openFieldSettings = (field) => {
        popup.open(
            'field-settings',
            null,
            FieldSettings,
            {
                field: field,
                formFields: form.value.fields.filter(f => f.id !== field.id),
                onUpdate: (updatedField) => {
                    updateField(field.id, updatedField);
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
        const fieldIndex = form.value.fields.findIndex(field => field.id === fieldId);
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
        // First, remove this field from any containers that might reference it
        const updatedFields = form.value.fields.map(field => {
            if ((field.type === 'step' || field.type === 'group') && 
                field.children && 
                field.children.includes(fieldId)) {
                // Remove reference to the deleted field
                return {
                    ...field,
                    children: field.children.filter(id => id !== fieldId)
                };
            }
            return field;
        });
        
        // Then remove the field itself
        form.value = {
            ...form.value,
            fields: updatedFields.filter(field => field.id !== fieldId)
        };
        
        emit('update:form', form.value);
    };

    // Duplicate a field
    const duplicateField = (fieldId) => {
        const fieldToDuplicate = form.value.fields.find(field => field.id === fieldId);
        if (!fieldToDuplicate) return;
        
        const duplicatedField = {
            ...fieldToDuplicate,
            id: `field-${Date.now()}`,
            label: `${fieldToDuplicate.label} (Copy)`
        };
        
        // If duplicating a container, don't copy the children references
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
            // Moving a field within a container
            const containerIndex = form.value.fields.findIndex(field => field.id === containerId);
            if (containerIndex === -1) return;
            
            const container = form.value.fields[containerIndex];
            const children = container.children || [];
            const fieldIndex = children.indexOf(fieldId);
            
            if (fieldIndex === -1) return;
            
            // Can't move first item up or last item down
            if (direction === 'up' && fieldIndex === 0) return;
            if (direction === 'down' && fieldIndex === children.length - 1) return;
            
            // Create new children array with the field moved
            const newChildren = [...children];
            const fieldToMove = newChildren[fieldIndex];
            
            // Remove the field from its current position
            newChildren.splice(fieldIndex, 1);
            
            // Insert at new position
            const newIndex = direction === 'up' ? fieldIndex - 1 : fieldIndex + 1;
            newChildren.splice(newIndex, 0, fieldToMove);
            
            // Update container
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
            // Moving a field in the main form
            const fieldIndex = form.value.fields.findIndex(field => field.id === fieldId);
            if (fieldIndex === -1) return;
            
            // Can't move first item up or last item down
            if (direction === 'up' && fieldIndex === 0) return;
            if (direction === 'down' && fieldIndex === form.value.fields.length - 1) return;
            
            const updatedFields = [...form.value.fields];
            const fieldToMove = updatedFields[fieldIndex];
            
            // Remove the field from its current position
            updatedFields.splice(fieldIndex, 1);
            
            // Insert at new position
            const newIndex = direction === 'up' ? fieldIndex - 1 : fieldIndex + 1;
            updatedFields.splice(newIndex, 0, fieldToMove);
            
            form.value = {
                ...form.value,
                fields: updatedFields
            };
            
            emit('update:form', form.value);
        }
    };
    // Add a field to a container (step or group)
    const addFieldToContainer = (containerId) => {
        console.log('addFieldToContainer called with containerId:', containerId);
        
        // Find the container
        const containerIndex = form.value.fields.findIndex(field => field.id === containerId);
        if (containerIndex === -1) {
            console.error('Container not found:', containerId);
            return;
        }
        
        const container = form.value.fields[containerIndex];
        console.log('Container found:', container);
        
        // Open field selection popup
        popup.open(
            'add-field-to-container',
            null,
            FieldSelectionPopup,
            {
                onSelectField: (fieldType) => {
                    // Create the new field
                    const newField = createField(fieldType);
                    
                    // Don't allow adding steps to groups or groups to groups
                    if (container.type === 'group' && (fieldType === 'step' || fieldType === 'group')) {
                        common.notification('Cannot add a step or group to a group', false);
                        popup.close();
                        return;
                    }
                    
                    // Don't allow adding steps to steps
                    if (container.type === 'step' && fieldType === 'step') {
                        common.notification('Cannot add a step to another step', false);
                        popup.close();
                        return;
                    }
                    
                    // Add the field to the form
                    const updatedFields = [...form.value.fields, newField];
                    
                    // Update the container to include the new field
                    const children = container.children || [];
                    const updatedContainer = {
                        ...container,
                        children: [...children, newField.id]
                    };
                    
                    updatedFields[containerIndex] = updatedContainer;
                    
                    // Update the form
                    form.value = {
                        ...form.value,
                        fields: updatedFields
                    };
                    
                    // Emit the update
                    emit('update:form', form.value);
                    
                    // Immediately open settings for the new field
                    setTimeout(() => {
                        openFieldSettings(newField);
                    }, 100);
                    
                    popup.close();
                },
                // Pass container type to field selection to enforce restrictions
                containerType: container.type
            },
            {
                position: 'center'
            }
        );
    };

    // Manage container fields
    const manageContainerFields = (containerId, selectedFieldIds) => {
        console.log('manageContainerFields called with containerId:', containerId, 'selectedFieldIds:', selectedFieldIds);
        
        const containerIndex = form.value.fields.findIndex(field => field.id === containerId);
        if (containerIndex === -1) {
            console.error('Container not found:', containerId);
            return;
        }
        
        // Get current container
        const container = form.value.fields[containerIndex];
        
        // Get current children
        const currentChildren = container.children || [];
        
        // Determine which fields are newly added
        const addedFieldIds = selectedFieldIds.filter(id => !currentChildren.includes(id));
        
        // Determine which fields are removed
        const removedFieldIds = currentChildren.filter(id => !selectedFieldIds.includes(id));
        
        // Update the container
        const updatedFields = [...form.value.fields];
        updatedFields[containerIndex] = {
            ...updatedFields[containerIndex],
            children: selectedFieldIds
        };
        
        form.value = {
            ...form.value,
            fields: updatedFields
        };
        
        emit('update:form', form.value);
        
        // Show notification
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