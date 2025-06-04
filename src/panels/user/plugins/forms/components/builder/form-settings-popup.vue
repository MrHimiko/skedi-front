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

const localFormData = ref({ ...props.formData });
const activeTab = ref('general');
const isSaving = ref(false);

watch(() => props.formData, (newFormData) => {
    localFormData.value = { ...newFormData };
}, { immediate: true });

const handleTabChange = (event, tab) => {
    activeTab.value = tab.title.toLowerCase();
};

const updateFormField = (field, value) => {
    localFormData.value = {
        ...localFormData.value,
        [field]: value
    };
    
    if (field === 'name') {
        emit('update:form', localFormData.value);
    }
};

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

const updateLayoutType = (value) => {
    localFormData.value = {
        ...localFormData.value,
        layout: {
            ...localFormData.value.layout,
            type: value
        }
    };
};

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

const updateAdvancedSetting = (key, value) => {
    const updatedAdvanced = {
        ...localFormData.value.advanced,
        [key]: value
    };
    
    localFormData.value = {
        ...localFormData.value,
        advanced: updatedAdvanced
    };
};

const saveSettings = async () => {
    try {
        isSaving.value = true;
        
        emit('update:form', localFormData.value);
        
        if (props.onSave && typeof props.onSave === 'function') {
            await props.onSave(localFormData.value);
        }
        
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
                            label="Survey Mode (One question at a time)"
                            :value="localFormData.layout?.settings?.surveyMode === true"
                            @update:value="(value) => updateFormSetting('surveyMode', value)"
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