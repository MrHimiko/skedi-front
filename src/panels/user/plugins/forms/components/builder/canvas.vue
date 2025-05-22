<script setup>
    import { ref } from 'vue';
    import { common } from '@utils/common';
    import { popup } from '@utils/popup';
    import Button from '@form/button/view.vue';
    import CustomGrid from './custom-grid.vue';
    import { PhPlus, PhPencilSimple } from "@phosphor-icons/vue";
    
    const props = defineProps({
        fields: {
            type: Array,
            required: true
        }
    });
    
    const emit = defineEmits([
        'update-field', 
        'delete-field',
        'duplicate-field',
        'move-field',
        'add-field',
        'add-field-to-container',
        'manage-container-fields'
    ]);
    
    // Interactive edit mode
    const isEditingLayout = ref(false);
    
    // Add a new field
    const addField = () => {
        emit('add-field');
    };
    
    // Delete a field
    const deleteField = (fieldId) => {
        emit('delete-field', fieldId);
    };
    
    // Duplicate a field
    const duplicateField = (fieldId) => {
        emit('duplicate-field', fieldId);
    };
    
    // Update a field
    const updateField = (fieldId, updates) => {
        emit('update-field', fieldId, updates);
    };
    
    // Move field up or down
    const moveField = (fieldId, direction) => {
        emit('move-field', fieldId, direction);
    };
    
    // Add field to container
    const addFieldToContainer = (containerId) => {
        emit('add-field-to-container', containerId);
    };
    
    // Manage container fields
    const manageContainerFields = (containerId, selectedFieldIds) => {
        emit('manage-container-fields', containerId, selectedFieldIds);
    };
    

</script>

<template>
    <div class="form-builder-canvas">
        <div class="canvas-header">
            <div class="header-left">
                <h2 class="text-base text-primary">Form Layout</h2>
                <p class="text-xs text-secondary">
                    Create and arrange fields to build your form
                </p>
            </div>
            <div class="header-right">

                <Button 
                    :iconLeft="{ component: PhPlus, weight: 'bold' }" 
                    label="Add Field" 
                    @click="addField"
                />
            </div>
        </div>
        
        <div class="canvas-content scrollbar">
            <CustomGrid
                :fields="fields"
                :editMode="isEditingLayout"
                @update-field="updateField"
                @delete-field="deleteField"
                @duplicate-field="duplicateField"
                @move-field="moveField"
                @add-field="addField"
                @add-field-to-container="addFieldToContainer"
                @manage-container-fields="manageContainerFields"
            />
        </div>
    </div>
</template>

<style scoped>
    .form-builder-canvas {
        background-color: var(--background-0);
        border: 1px solid var(--border);
        border-radius: var(--radius-md);
        display: flex;
        flex-direction: column;
        height: 100%;
    }
    
    .canvas-header {
        padding: 16px;
        border-bottom: 1px solid var(--border);
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    
    .header-right {
        display: flex;
        gap: 8px;
    }
    
    .mr-2 {
        margin-right: 8px;
    }
    
    .canvas-content {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
    }
</style>