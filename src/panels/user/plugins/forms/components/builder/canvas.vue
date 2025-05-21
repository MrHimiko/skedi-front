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
    'add-field'
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

// Toggle edit mode
const toggleEditMode = () => {
    isEditingLayout.value = !isEditingLayout.value;
    
    // Show notification about edit mode
    if (isEditingLayout.value) {
        common.notification('Layout edit mode enabled. Drag fields to reposition, resize handles to change dimensions.', true);
    } else {
        common.notification('Layout saved', true);
    }
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
                    class="mr-2"
                    :as="isEditingLayout ? 'brand' : 'tertiary'" 
                    :iconLeft="{ component: PhPencilSimple, weight: 'bold' }" 
                    :label="isEditingLayout ? 'Save Layout' : 'Edit Layout'" 
                    @click="toggleEditMode"
                />
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