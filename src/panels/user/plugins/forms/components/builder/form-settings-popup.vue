// src/panels/user/plugins/forms/components/builder/form-settings-popup.vue

<script setup>
import { ref, watch } from 'vue';
import PopupLayout from '@layouts/popup/view.vue';
import TabsComponent from '@global/tabs/view.vue';
import Input from '@form/input/view.vue';
import Textarea from '@form/textarea/view.vue';
import Toggle from '@form/toggle/view.vue';
import Select from '@form/select/view.vue';
import Button from '@form/button/view.vue';

const props = defineProps({
  formData: {
    type: Object,
    required: true
  },
  onSave: {
    type: Function,
    required: false
  }
});

const emit = defineEmits(['update:form']);

// Local copy of form data
const localFormData = ref({ ...props.formData });
const activeTab = ref('general');
const isSaving = ref(false);

// Watch for changes in the form data prop
watch(() => props.formData, (newFormData) => {
  localFormData.value = { ...newFormData };
}, { immediate: true });

// Handle tab changes
const handleTabChange = (event, tab) => {
  activeTab.value = tab.title.toLowerCase();
};

// Update form data when input changes and emit immediately for name
const updateFormField = (field, value) => {
  console.log('Updating form field:', field, value);
  localFormData.value = {
    ...localFormData.value,
    [field]: value
  };
  
  // Emit immediately for name changes so header updates in real-time
  if (field === 'name') {
    emit('update:form', localFormData.value);
  }
};

// Update settings
const updateFormSetting = (key, value) => {
  console.log('Updating form setting:', key, value);
  const updatedSettings = {
    ...localFormData.value.layout.settings,
    [key]: value
  };
  
  localFormData.value = {
    ...localFormData.value,
    layout: {
      ...localFormData.value.layout,
      settings: updatedSettings
    }
  };
};

// Update layout type
const updateLayoutType = (value) => {
  console.log('Updating layout type:', value);
  localFormData.value = {
    ...localFormData.value,
    layout: {
      ...localFormData.value.layout,
      type: value
    }
  };
};

// Update submission settings
const updateSubmissionSetting = (key, value) => {
  console.log('Updating submission setting:', key, value);
  const updatedSubmission = {
    ...localFormData.value.submission,
    [key]: value
  };
  
  localFormData.value = {
    ...localFormData.value,
    submission: updatedSubmission
  };
};

// Update notifications
const updateNotificationSetting = (path, value) => {
  console.log('Updating notification setting:', path, value);
  const pathArray = path.split('.');
  const updatedNotifications = { ...localFormData.value.notifications };
  
  let current = updatedNotifications;
  for (let i = 0; i < pathArray.length - 1; i++) {
    if (!current[pathArray[i]]) {
      current[pathArray[i]] = {};
    }
    current = current[pathArray[i]];
  }
  current[pathArray[pathArray.length - 1]] = value;
  
  localFormData.value = {
    ...localFormData.value,
    notifications: updatedNotifications
  };
};

// Update advanced settings
const updateAdvancedSetting = (key, value) => {
  console.log('Updating advanced setting:', key, value);
  const updatedAdvanced = {
    ...localFormData.value.advanced,
    [key]: value
  };
  
  localFormData.value = {
    ...localFormData.value,
    advanced: updatedAdvanced
  };
};

// Save form settings - this now calls the API
const saveSettings = async () => {
  try {
    isSaving.value = true;
    console.log('Saving form settings to API:', localFormData.value);
    
    // Emit the updated form data
    emit('update:form', localFormData.value);
    
    // If onSave callback is provided, call it to save to API
    if (props.onSave && typeof props.onSave === 'function') {
      await props.onSave(localFormData.value);
    }
    
    // Close popup
    document.querySelector('.i-popup-close').click();
  } catch (error) {
    console.error('Error saving form settings:', error);
  } finally {
    isSaving.value = false;
  }
};
</script>

<template>
  <popup-layout title="Form Settings" customClass="form-settings-popup">
    <template #content>
      <div class="form-settings-content">
        <div class="settings-tabs">
          <TabsComponent 
            :tabs="[
              { title: 'General', active: activeTab === 'general' },
              { title: 'Layout', active: activeTab === 'layout' },
              { title: 'Submission', active: activeTab === 'submission' },
              { title: 'Notifications', active: activeTab === 'notifications' },
              { title: 'Advanced', active: activeTab === 'advanced' }
            ]"
            :onClick="handleTabChange"
          />
        </div>
        
        <div class="settings-content scrollbar">
          <!-- General tab -->
          <div v-if="activeTab === 'general'" class="settings-tab">
            <h3>Basic Information</h3>
            <Input
              label="Form Name"
              :value="localFormData.name"
              @onInput="(e, value) => updateFormField('name', value)"
            />
            
            <Textarea
              label="Form Description"
              :value="localFormData.description || ''"
              @onInput="(value) => updateFormField('description', value)"
            />
            
            <Toggle
              label="Enable Form"
              :value="localFormData.enabled !== false"
              @update:value="(value) => updateFormField('enabled', value)"
            />
          </div>
          
          <!-- Layout tab -->
          <div v-else-if="activeTab === 'layout'" class="settings-tab">
            <h3>Display Settings</h3>
            
            <Select
              label="Form Layout"
              :value="localFormData.layout?.type || 'standard'"
              :options="[
                { label: 'Standard', value: 'standard' },
                { label: 'Card', value: 'card' },
                { label: 'Sidebar', value: 'sidebar' },
                { label: 'Wizard', value: 'wizard' }
              ]"
              @change="updateLayoutType"
            />
            
            <Toggle
              label="Show Progress Bar"
              :value="localFormData.layout?.settings?.showProgressBar !== false"
              @update:value="(value) => updateFormSetting('showProgressBar', value)"
            />
            
            <Toggle
              label="Show Field Numbers"
              :value="localFormData.layout?.settings?.showFieldNumbers === true"
              @update:value="(value) => updateFormSetting('showFieldNumbers', value)"
            />
            
            <Toggle
              label="Survey Mode (One question at a time)"
              :value="localFormData.layout?.settings?.surveyMode === true"
              @update:value="(value) => updateFormSetting('surveyMode', value)"
            />
            
            <Input
              label="Form Width (px)"
              :value="localFormData.layout?.settings?.formWidth || '800'"
              type="number"
              @onInput="(e, value) => updateFormSetting('formWidth', value)"
            />
          </div>
          
          <!-- Submission tab -->
          <div v-else-if="activeTab === 'submission'" class="settings-tab">
            <h3>Submission Handling</h3>
            
            <Textarea
              label="Success Message"
              :value="localFormData.submission?.successMessage || 'Thank you for submitting!'"
              @onInput="(value) => updateSubmissionSetting('successMessage', value)"
            />
            
            <Input
              label="Redirect URL (optional)"
              :value="localFormData.submission?.redirectUrl || ''"
              @onInput="(e, value) => updateSubmissionSetting('redirectUrl', value)"
            />
            
            <Toggle
              label="Auto Save Progress"
              :value="localFormData.layout?.settings?.autoSave !== false"
              @update:value="(value) => updateFormSetting('autoSave', value)"
            />
            
            <Toggle
              label="Allow Multiple Submissions"
              :value="localFormData.submission?.allowMultiple !== false"
              @update:value="(value) => updateSubmissionSetting('allowMultiple', value)"
            />
            
            <Toggle
              label="Require Login to Submit"
              :value="localFormData.submission?.requireLogin === true"
              @update:value="(value) => updateSubmissionSetting('requireLogin', value)"
            />
          </div>
          
          <!-- Notifications tab -->
          <div v-else-if="activeTab === 'notifications'" class="settings-tab">
            <h3>Email Notifications</h3>
            
            <Toggle
              label="Send Admin Notification Email"
              :value="localFormData.notifications?.adminEmail?.enabled === true"
              @update:value="(value) => updateNotificationSetting('adminEmail.enabled', value)"
            />
            
            <div v-if="localFormData.notifications?.adminEmail?.enabled">
              <Input
                label="Admin Email Address"
                :value="localFormData.notifications?.adminEmail?.to || ''"
                @onInput="(e, value) => updateNotificationSetting('adminEmail.to', value)"
              />
              
              <Input
                label="Email Subject"
                :value="localFormData.notifications?.adminEmail?.subject || 'New Form Submission'"
                @onInput="(e, value) => updateNotificationSetting('adminEmail.subject', value)"
              />
            </div>
            
            <div class="separator"></div>
            
            <Toggle
              label="Send Confirmation Email to User"
              :value="localFormData.notifications?.userEmail?.enabled === true"
              @update:value="(value) => updateNotificationSetting('userEmail.enabled', value)"
            />
            
            <div v-if="localFormData.notifications?.userEmail?.enabled">
              <Input
                label="Email Field ID"
                :value="localFormData.notifications?.userEmail?.fieldId || ''"
                @onInput="(e, value) => updateNotificationSetting('userEmail.fieldId', value)"
              />
              
              <Input
                label="Email Subject"
                :value="localFormData.notifications?.userEmail?.subject || 'Thank you for your submission'"
                @onInput="(e, value) => updateNotificationSetting('userEmail.subject', value)"
              />
              
              <Textarea
                label="Email Message"
                :value="localFormData.notifications?.userEmail?.message || 'Thank you for your submission. We have received your information.'"
                @onInput="(value) => updateNotificationSetting('userEmail.message', value)"
              />
            </div>
          </div>
          
          <!-- Advanced tab -->
          <div v-else-if="activeTab === 'advanced'" class="settings-tab">
            <h3>Advanced Settings</h3>
            
            <Input
              label="Form ID"
              :value="localFormData.id || 'New Form'"
              disabled
            />
            
            <Toggle
              label="Enable reCAPTCHA"
              :value="localFormData.advanced?.recaptcha?.enabled === true"
              @update:value="(value) => updateAdvancedSetting('recaptcha', { enabled: value })"
            />
            
            <Select
              label="Form Action"
              :value="localFormData.advanced?.action || 'default'"
              :options="[
                { label: 'Default (Process Internally)', value: 'default' },
                { label: 'Custom URL', value: 'url' },
                { label: 'Email Only', value: 'email' }
              ]"
              @change="(value) => updateAdvancedSetting('action', value)"
            />
            
            <Input
              v-if="localFormData.advanced?.action === 'url'"
              label="Custom Form Action URL"
              :value="localFormData.advanced?.actionUrl || ''"
              @onInput="(e, value) => updateAdvancedSetting('actionUrl', value)"
            />
            
            <Toggle
              label="Store Submissions in Database"
              :value="localFormData.advanced?.storeSubmissions !== false"
              @update:value="(value) => updateAdvancedSetting('storeSubmissions', value)"
            />
            
            <Input
              label="Submission Storage Period (days, 0 = forever)"
              :value="localFormData.advanced?.submissionRetention || '0'"
              type="number"
              @onInput="(e, value) => updateAdvancedSetting('submissionRetention', value)"
            />
          </div>
        </div>
        
        <div class="action-buttons">
          <div class="c-button tertiary i-popup-close pointer">Cancel</div>
          <Button 
            label="Save Settings" 
            @click="saveSettings"
            :loading="isSaving"
          />
        </div>
      </div>
    </template>
  </popup-layout>
</template>

<style scoped>
.form-settings-popup {
  /* Make the popup wider */
  max-width: 800px !important;
  width: 80vw !important;
}

.form-settings-content {
  width: 100%;
}

.settings-tabs {
  margin-bottom: 20px;
}

.settings-content {
  max-height: 60vh;
  overflow-y: auto;
  padding-right: 16px;
}

.settings-tab {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.settings-tab h3 {
  font-weight: 600;
  margin-bottom: 4px;
  font-size: 16px;
  color: var(--text-primary);
}

.separator {
  height: 1px;
  background-color: var(--border);
  margin: 16px 0;
}

.action-buttons {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-top: 24px;
}
</style>