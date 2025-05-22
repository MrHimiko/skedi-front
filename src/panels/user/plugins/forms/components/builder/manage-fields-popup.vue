// src/panels/user/plugins/forms/components/builder/manage-fields-popup.vue

<template>
  <popup-layout title="Manage Fields" customClass="h-auto">
    <template #content>
      <div class="manage-fields-content">
        <p class="manage-description">
          Select fields to include in this {{ container.type }}:
        </p>
        
        <div v-if="availableFields.length === 0" class="no-fields">
          <p>No available fields to add to this {{ container.type }}.</p>
        </div>
        
        <div v-else class="fields-selection">
          <div 
            v-for="field in availableFields" 
            :key="field.id"
            class="field-item"
          >
            <div class="field-checkbox">
              <input 
                type="checkbox" 
                :id="'field_' + field.id" 
                :checked="isSelected(field.id)"
                @change="toggleField(field.id)"
              />
              <label :for="'field_' + field.id">
                <div class="field-info">
                  <div class="field-icon">
                    <i>{{ getFieldIcon(field.type) }}</i>
                  </div>
                  <div class="field-details">
                    <span class="field-label">{{ field.label }}</span>
                    <span class="field-type">{{ field.type }}</span>
                  </div>
                </div>
              </label>
            </div>
          </div>
        </div>
        
        <div class="action-buttons">
          <div class="c-button tertiary i-popup-close pointer">Cancel</div>
          <Button label="Save" @click="saveSelection" />
        </div>
      </div>
    </template>
  </popup-layout>
</template>


<script setup>
import { ref, onMounted } from 'vue';
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

// Initialize selected fields
onMounted(() => {
  // Start with existing children if any
  if (props.container.children && Array.isArray(props.container.children)) {
    selectedFieldIds.value = [...props.container.children];
  } else {
    selectedFieldIds.value = [];
  }
});

// Check if a field is selected
const isSelected = (fieldId) => {
  return selectedFieldIds.value.includes(fieldId);
};

// Toggle field selection
const toggleField = (fieldId) => {
  if (isSelected(fieldId)) {
    // Remove field from selection
    selectedFieldIds.value = selectedFieldIds.value.filter(id => id !== fieldId);
  } else {
    // Add field to selection
    selectedFieldIds.value.push(fieldId);
  }
};

// Save the selection
const saveSelection = () => {
  if (typeof props.onSave === 'function') {
    props.onSave(selectedFieldIds.value);
  } else {
    console.error('onSave prop is not a function');
  }
};

// Get icon for a field type
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
    divider: 'horizontal_rule',
    step: 'linear_scale',
    group: 'folder'
  };
  
  return icons[fieldType] || 'help_outline';
};
</script>

<style scoped>
.manage-fields-content {
  width: 100%;
  max-width: 600px;
}

.manage-description {
  margin-bottom: 20px;
  color: var(--text-secondary);
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
  margin-bottom: 20px;
}

.field-item {
  padding: 10px;
  border-bottom: 1px solid var(--border);
}

.field-item:last-child {
  border-bottom: none;
}

.field-checkbox {
  display: flex;
  align-items: center;
}

.field-checkbox input[type="checkbox"] {
  margin-right: 10px;
}

.field-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.field-icon {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background-color: var(--background-2);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--brand-default);
}

.field-icon i {
  font-size: 14px;
}

.field-details {
  display: flex;
  flex-direction: column;
}

.field-label {
  font-weight: 600;
  font-size: 14px;
}

.field-type {
  font-size: 12px;
  color: var(--text-secondary);
  text-transform: capitalize;
}

.action-buttons {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-top: 24px;
}
</style>