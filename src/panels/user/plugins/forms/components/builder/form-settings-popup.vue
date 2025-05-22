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
  }
});

const emit = defineEmits(['update:form']);

// Local copy of form data
const localFormData = ref({...props.formData});
const activeTab = ref('general');

// Watch for changes in the form data prop
watch(() => props.formData, (newFormData) => {
  localFormData.value = {...newFormData};
}, { immediate: true });

// Handle tab changes
const handleTabChange = (event, tab) => {
  activeTab.value = tab.title.toLowerCase();
};

// Update form data when input changes
const updateFormField = (field, value) => {
  localFormData.value = {
    ...localFormData.value,
    [field]: value
  };
};

// Update settings
const updateFormSetting = (key, value) => {
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

// Update submission settings
const updateSubmissionSetting = (key, value) => {
  const updatedSubmission = {
    ...localFormData.value.submission,
    [key]: value
  };
  
  localFormData.value = {
    ...localFormData.value,
    submission: updatedSubmission
  };
};

// Save form settings
const saveSettings = () => {
  emit('update:form', localFormData.value);
  document.querySelector('.i-popup-close').click();
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
              :value="localFormData.layout.type || 'standard'"
              :options="[
                { label: 'Standard', value: 'standard' },
                { label: 'Card', value: 'card' },
                { label: 'Sidebar', value: 'sidebar' },
                { label: 'Wizard', value: 'wizard' }
              ]"
              @change="(value) => localFormData.layout.type = value"
            />
            
            <Toggle
              label="Show Progress Bar"
              :value="localFormData.layout.settings.showProgressBar"
              @update:value="(value) => updateFormSetting('showProgressBar', value)"
            />
            
            <Toggle
              label="Show Field Numbers"
              :value="localFormData.layout.settings.showFieldNumbers"
              @update:value="(value) => updateFormSetting('showFieldNumbers', value)"
            />
            
            <Toggle
              label="Survey Mode (One question at a time)"
              :value="localFormData.layout.settings.surveyMode"
              @update:value="(value) => updateFormSetting('surveyMode', value)"
            />
            
            <Input
              label="Form Width (px)"
              :value="localFormData.layout.settings.formWidth || '800'"
              type="number"
              @onInput="(e, value) => updateFormSetting('formWidth', value)"
            />
          </div>
          
          <!-- Submission tab -->
          <div v-else-if="activeTab === 'submission'" class="settings-tab">
            <h3>Submission Handling</h3>
            
            <Textarea
              label="Success Message"
              :value="localFormData.submission.successMessage"
              @onInput="(value) => updateSubmissionSetting('successMessage', value)"
            />
            
            <Input
              label="Redirect URL (optional)"
              :value="localFormData.submission.redirectUrl || ''"
              @onInput="(e, value) => updateSubmissionSetting('redirectUrl', value)"
            />
            
            <Toggle
              label="Auto Save Progress"
              :value="localFormData.layout.settings.autoSave"
              @update:value="(value) => updateFormSetting('autoSave', value)"
            />
            
            <Toggle
              label="Allow Multiple Submissions"
              :value="localFormData.submission.allowMultiple || false"
              @update:value="(value) => updateSubmissionSetting('allowMultiple', value)"
            />
            
            <Toggle
              label="Require Login to Submit"
              :value="localFormData.submission.requireLogin || false"
              @update:value="(value) => updateSubmissionSetting('requireLogin', value)"
            />
          </div>
          
          <!-- Notifications tab -->
          <div v-else-if="activeTab === 'notifications'" class="settings-tab">
            <h3>Email Notifications</h3>
            
            <Toggle
              label="Send Admin Notification Email"
              :value="localFormData.notifications?.adminEmail?.enabled || false"
              @update:value="(value) => {
                if (!localFormData.notifications) localFormData.notifications = {};
                if (!localFormData.notifications.adminEmail) localFormData.notifications.adminEmail = {};
                localFormData.notifications.adminEmail.enabled = value;
              }"
            />
            
            <div v-if="localFormData.notifications?.adminEmail?.enabled">
              <Input
                label="Admin Email Address"
                :value="localFormData.notifications?.adminEmail?.to || ''"
                @onInput="(e, value) => {
                  if (!localFormData.notifications) localFormData.notifications = {};
                  if (!localFormData.notifications.adminEmail) localFormData.notifications.adminEmail = {};
                  localFormData.notifications.adminEmail.to = value;
                }"
              />
              
              <Input
                label="Email Subject"
                :value="localFormData.notifications?.adminEmail?.subject || 'New Form Submission'"
                @onInput="(e, value) => {
                  if (!localFormData.notifications) localFormData.notifications = {};
                  if (!localFormData.notifications.adminEmail) localFormData.notifications.adminEmail = {};
                  localFormData.notifications.adminEmail.subject = value;
                }"
              />
            </div>
            
            <div class="separator"></div>
            
            <Toggle
              label="Send Confirmation Email to User"
              :value="localFormData.notifications?.userEmail?.enabled || false"
              @update:value="(value) => {
                if (!localFormData.notifications) localFormData.notifications = {};
                if (!localFormData.notifications.userEmail) localFormData.notifications.userEmail = {};
                localFormData.notifications.userEmail.enabled = value;
              }"
            />
            
            <div v-if="localFormData.notifications?.userEmail?.enabled">
              <Input
                label="Email Field ID"
                :value="localFormData.notifications?.userEmail?.fieldId || ''"
                @onInput="(e, value) => {
                  if (!localFormData.notifications) localFormData.notifications = {};
                  if (!localFormData.notifications.userEmail) localFormData.notifications.userEmail = {};
                  localFormData.notifications.userEmail.fieldId = value;
                }"
              />
              
              <Input
                label="Email Subject"
                :value="localFormData.notifications?.userEmail?.subject || 'Thank you for your submission'"
                @onInput="(e, value) => {
                  if (!localFormData.notifications) localFormData.notifications = {};
                  if (!localFormData.notifications.userEmail) localFormData.notifications.userEmail = {};
                  localFormData.notifications.userEmail.subject = value;
                }"
              />
              
              <Textarea
                label="Email Message"
                :value="localFormData.notifications?.userEmail?.message || 'Thank you for your submission. We have received your information.'"
                @onInput="(value) => {
                  if (!localFormData.notifications) localFormData.notifications = {};
                  if (!localFormData.notifications.userEmail) localFormData.notifications.userEmail = {};
                  localFormData.notifications.userEmail.message = value;
                }"
              />
            </div>
          </div>
          
          <!-- Advanced tab -->
          <div v-else-if="activeTab === 'advanced'" class="settings-tab">
            <h3>Advanced Settings</h3>
            
            <Input
              label="Form ID"
              :value="localFormData.id"
              disabled
            />
            
            <Toggle
              label="Enable reCAPTCHA"
              :value="localFormData.advanced?.recaptcha?.enabled || false"
              @update:value="(value) => {
                if (!localFormData.advanced) localFormData.advanced = {};
                if (!localFormData.advanced.recaptcha) localFormData.advanced.recaptcha = {};
                localFormData.advanced.recaptcha.enabled = value;
              }"
            />
            
            <Select
              label="Form Action"
              :value="localFormData.advanced?.action || 'default'"
              :options="[
                { label: 'Default (Process Internally)', value: 'default' },
                { label: 'Custom URL', value: 'url' },
                { label: 'Email Only', value: 'email' }
              ]"
              @change="(value) => {
                if (!localFormData.advanced) localFormData.advanced = {};
                localFormData.advanced.action = value;
              }"
            />
            
            <Input
              v-if="localFormData.advanced?.action === 'url'"
              label="Custom Form Action URL"
              :value="localFormData.advanced?.actionUrl || ''"
              @onInput="(e, value) => {
                if (!localFormData.advanced) localFormData.advanced = {};
                localFormData.advanced.actionUrl = value;
              }"
            />
            
            <Toggle
              label="Store Submissions in Database"
              :value="localFormData.advanced?.storeSubmissions !== false"
              @update:value="(value) => {
                if (!localFormData.advanced) localFormData.advanced = {};
                localFormData.advanced.storeSubmissions = value;
              }"
            />
            
            <Input
              label="Submission Storage Period (days, 0 = forever)"
              :value="localFormData.advanced?.submissionRetention || '0'"
              type="number"
              @onInput="(e, value) => {
                if (!localFormData.advanced) localFormData.advanced = {};
                localFormData.advanced.submissionRetention = value;
              }"
            />
          </div>
        </div>
        
        <div class="action-buttons">
          <div class="c-button tertiary i-popup-close pointer">Cancel</div>
          <Button label="Save Settings" @click="saveSettings" />
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