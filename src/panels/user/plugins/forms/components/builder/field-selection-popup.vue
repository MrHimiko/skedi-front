// src/panels/user/plugins/forms/components/builder/field-selection-popup.vue

<script setup>
import { ref, computed } from 'vue';
import PopupLayout from '@layouts/popup/view.vue';
import { fieldTypes } from '@user_forms/utils/field-types';

const props = defineProps({
  onSelectField: {
    type: Function,
    required: true
  },
  containerType: {
    type: String,
    default: null
  }
});

// Filter available field types based on container context
const availableFieldTypes = computed(() => {
  // If not adding to a container, all field types are available
  if (!props.containerType) {
    return fieldTypes;
  }
  
  // Filter based on container type
  return fieldTypes.filter(fieldType => {
    // Groups can't contain steps or other groups
    if (props.containerType === 'group') {
      return fieldType.type !== 'step' && fieldType.type !== 'group';
    }
    
    // Steps can't contain other steps
    if (props.containerType === 'step') {
      return fieldType.type !== 'step';
    }
    
    return true;
  });
});

// Select a field type
const selectField = (fieldType) => {
  if (typeof props.onSelectField === 'function') {
    props.onSelectField(fieldType.type);
  } else {
    console.error('onSelectField prop is not a function');
  }
};

// Helper function to get field descriptions
function getFieldDescription(type) {
  const descriptions = {
    'input': 'Single line text entry for short responses',
    'textarea': 'Multi-line text area for longer responses',
    'select': 'Dropdown menu for selecting from a list of options',
    'radio': 'Radio buttons for selecting a single option',
    'checkbox': 'Checkboxes for selecting multiple options',
    'date': 'Date picker for selecting a date',
    'image': 'Display an image in your form',
    'video': 'Embed a video in your form',
    'file': 'Allow users to upload files',
    'rating': 'Star rating scale for feedback',
    'divider': 'Add a visual separator between sections',
    'step': 'Create a new form step for multi-page forms',
    'group': 'Group related fields together'
  };
  
  return descriptions[type] || 'Add this field to your form';
}
</script>

<template>
  <popup-layout :title="containerType ? `Add Field to ${containerType}` : 'Add Field'" customClass="h-auto">
    <template #content>
      <div class="field-selection-content">
        <p class="selection-description">
          Select a field type to add{{containerType ? ` to this ${containerType}` : ''}}:
        </p>
        
        <div class="fields-grid">
          <div 
            v-for="fieldType in availableFieldTypes" 
            :key="fieldType.type"
            class="field-type-card"
            @click="selectField(fieldType)"
          >
            <div class="field-type-icon">
              <component 
                :is="fieldType.icon.component" 
                :weight="fieldType.icon.weight || 'regular'" 
                size="24"
              />
            </div>
            <div class="field-type-info">
              <h3>{{ fieldType.label }}</h3>
              <p>{{ getFieldDescription(fieldType.type) }}</p>
            </div>
          </div>
        </div>
      </div>
    </template>
  </popup-layout>
</template>

<style scoped>
.field-selection-content {
  width: 100vw;
  max-width: 600px;
}

.selection-description {
  margin-bottom: 20px;
  color: var(--text-secondary);
}

.fields-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
  gap: 16px;
}

.field-type-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background-color: var(--background-0);
  cursor: pointer;
  transition: all 0.2s;
}

.field-type-card:hover {
  border-color: var(--brand-default);
  background-color: var(--background-1);
}

.field-type-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: var(--background-2);
  color: var(--brand-default);
}

.field-type-info {
  flex: 1;
}

.field-type-info h3 {
  font-weight: 600;
  margin-bottom: 4px;
  font-size: 14px;
}

.field-type-info p {
  font-size: 12px;
  color: var(--text-secondary);
}
</style>