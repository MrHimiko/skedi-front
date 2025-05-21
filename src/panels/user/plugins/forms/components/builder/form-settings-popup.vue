<script setup>
import { ref, watch } from 'vue';
import PopupLayout from '@layouts/popup/view.vue';
import Input from '@form/input/view.vue';
import Textarea from '@form/textarea/view.vue';
import Toggle from '@form/toggle/view.vue';
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

// Watch for changes in the form data prop
watch(() => props.formData, (newFormData) => {
    localFormData.value = {...newFormData};
}, { immediate: true });

// Update form data when input changes
const updateFormField = (field, value) => {
    localFormData.value = {
        ...localFormData.value,
        [field]: value
    };
};

// Update settings
const updateFormSettings = (key, value) => {
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
    <popup-layout title="Form Settings" customClass="h-auto">
        <template #content>
            <div class="form-settings-content">
                <div class="settings-section">
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
                </div>
                
                <div class="settings-section">
                    <h3>Display Settings</h3>
                    <Toggle
                        label="Show Progress Bar"
                        :value="localFormData.layout.settings.showProgressBar"
                        @update:value="(value) => updateFormSettings('showProgressBar', value)"
                    />
                    
                    <Toggle
                        label="Show Field Numbers"
                        :value="localFormData.layout.settings.showFieldNumbers"
                        @update:value="(value) => updateFormSettings('showFieldNumbers', value)"
                    />
                    
                    <Toggle
                        label="Auto Save Progress"
                        :value="localFormData.layout.settings.autoSave"
                        @update:value="(value) => updateFormSettings('autoSave', value)"
                    />
                    
                    <Toggle
                        label="Survey Mode (One question at a time)"
                        :value="localFormData.layout.settings.surveyMode"
                        @update:value="(value) => updateFormSettings('surveyMode', value)"
                    />
                </div>
                
                <div class="settings-section">
                    <h3>Submission Settings</h3>
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
.form-settings-content {
    max-width: 600px;
}

.settings-section {
    margin-bottom: 24px;
}

.settings-section h3 {
    font-weight: 600;
    margin-bottom: 16px;
}

.action-buttons {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    margin-top: 24px;
}
</style>