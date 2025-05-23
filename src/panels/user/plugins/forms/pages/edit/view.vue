<script setup>
import { ref, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { common } from '@utils/common';
import { createEmptyForm } from '@user_forms/utils/form-schema';
import { FormsService } from '@user_forms/services/forms';

import MainLayout from '@layouts/main/view.vue';
import HeadingComponent from '@global/heading/view.vue';
import Button from '@form/button/view.vue';
import BuilderView from '@user_forms/components/builder/view.vue';
import InlineTitleEditor from '@user_forms/components/inline-title-editor.vue';

import FormSettingsPopup from '@user_forms/components/builder/form-settings-popup.vue';
import { popup } from '@utils/popup';

import { PhFloppyDisk, PhEye, PhGearSix, PhArrowLeft } from "@phosphor-icons/vue";

const route = useRoute();
const router = useRouter();
const formId = route.params.id;
const formData = ref(createEmptyForm());
const isLoading = ref(true);
const isSaving = ref(false);
const isNewForm = ref(formId === 'new');
const hasUnsavedChanges = ref(false);

let initialFormDataString = '';

// Watch for form changes to track unsaved changes
watch(formData, (newData) => {
    if (initialFormDataString && !isLoading.value) {
        const currentDataString = JSON.stringify(newData);
        hasUnsavedChanges.value = currentDataString !== initialFormDataString;
    }
}, { deep: true });

// Load form data
const loadFormData = async () => {
    try {
        isLoading.value = true;
        
        if (isNewForm.value) {
            // Create a new empty form
            formData.value = createEmptyForm();
            initialFormDataString = JSON.stringify(formData.value);
        } else {
            // Load existing form from API
            const data = await FormsService.getForm(formId);
            
            // Transform API data to match frontend structure
            formData.value = {
                id: data.id,
                name: data.name || 'Untitled Form',
                description: data.description || '',
                fields: data.fields || [],
                layout: data.settings?.layout || {
                    type: "standard",
                    settings: {
                        showProgressBar: true,
                        showFieldNumbers: false,
                        autoSave: true,
                        surveyMode: false
                    }
                },
                submission: data.settings?.submission || {
                    successMessage: "Thank you for submitting!",
                    redirectUrl: null,
                    allowMultiple: true,
                    requireLogin: false
                },
                notifications: data.settings?.notifications || {},
                advanced: data.settings?.advanced || {},
                enabled: data.is_active !== false
            };
            
            initialFormDataString = JSON.stringify(formData.value);
        }
    } catch (error) {
        console.error("Failed to load form:", error);
        common.notification("Failed to load form", false);
        // Redirect back to forms list on error
        router.push('/forms');
    } finally {
        isLoading.value = false;
    }
};

onMounted(() => {
    loadFormData();
});

// Handle title update from inline editor
const handleTitleUpdate = (newTitle) => {
    formData.value.name = newTitle;
};

// Handle title save from inline editor
const handleTitleSave = async (newTitle) => {
    try {
        // Update the form data
        formData.value.name = newTitle;
        
        // Save to API immediately
        await saveFormToAPI();
        
        common.notification('Form name updated successfully', true);
    } catch (error) {
        console.error('Error saving form name:', error);
        common.notification('Failed to save form name', false);
        throw error; // Re-throw so the inline editor can handle it
    }
};

// Open form settings popup
const openFormSettings = () => {
    popup.open(
        'form-settings',
        null,
        FormSettingsPopup,
        {
            formData: formData.value,
            'update:form': (updatedForm) => {
                console.log('Form settings updated:', updatedForm);
                formData.value = { ...formData.value, ...updatedForm };
            },
            onSave: async (updatedForm) => {
                // This callback will save the settings to the API
                console.log('Saving form settings to API via popup:', updatedForm);
                formData.value = { ...formData.value, ...updatedForm };
                await saveFormToAPI();
                common.notification('Form settings saved successfully', true);
            }
        },
        {
            position: 'center'
        }
    );
};

// Extract the save logic into a reusable function
const saveFormToAPI = async () => {
    // Prepare data for API
    const saveData = {
        name: formData.value.name || 'Untitled Form',
        description: formData.value.description || '',
        fields: formData.value.fields || [],
        settings: {
            layout: formData.value.layout || {},
            submission: formData.value.submission || {},
            notifications: formData.value.notifications || {},
            advanced: formData.value.advanced || {}
        },
        is_active: formData.value.enabled !== false,
        allow_multiple_submissions: formData.value.submission?.allowMultiple !== false,
        requires_authentication: formData.value.submission?.requireLogin === true
    };
    
    console.log('Data being sent to API:', saveData);
    
    let savedForm;
    
    if (isNewForm.value) {
        // Create new form
        savedForm = await FormsService.createForm(saveData);
        
        // Update URL to reflect the new form ID
        router.replace(`/forms/${savedForm.id}/edit`);
        isNewForm.value = false;
    } else {
        // Update existing form
        savedForm = await FormsService.updateForm(formId, saveData);
    }
    
    // Update form data with server response if needed
    if (savedForm) {
        formData.value.id = savedForm.id;
        if (savedForm.name) {
            formData.value.name = savedForm.name;
        }
    }
    
    // Update initial data to current state
    initialFormDataString = JSON.stringify(formData.value);
    hasUnsavedChanges.value = false;
    
    return savedForm;
};

// Save the form data
const saveForm = async () => {
    try {
        isSaving.value = true;
        
        await saveFormToAPI();
        
        if (isNewForm.value) {
            common.notification("Form created successfully", true);
        } else {
            common.notification("Form saved successfully", true);
        }
        
    } catch (error) {
        console.error("Failed to save form:", error);
        common.notification("Failed to save form", false);
    } finally {
        isSaving.value = false;
    }
};

// Handle form changes from builder
const handleFormChange = (updatedForm) => {
    console.log('Form changed in builder:', updatedForm);
    formData.value = { ...updatedForm };
};

// Go back to forms list
const goBack = () => {
    if (hasUnsavedChanges.value) {
        if (confirm('You have unsaved changes. Are you sure you want to leave?')) {
            router.push('/forms');
        }
    } else {
        router.push('/forms');
    }
};

// Preview form (placeholder)
const previewForm = () => {
    common.notification('Preview functionality coming soon', true);
};

// Prevent navigation with unsaved changes
const beforeUnloadHandler = (event) => {
    if (hasUnsavedChanges.value) {
        event.preventDefault();
        event.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
    }
};

onMounted(() => {
    window.addEventListener('beforeunload', beforeUnloadHandler);
});

// Clean up on unmount
import { onUnmounted } from 'vue';
onUnmounted(() => {
    window.removeEventListener('beforeunload', beforeUnloadHandler);
});
</script>

<template>
    <main-layout>
        <template #content>
            <div class="container-xl">
                <!-- Custom Header with Inline Title Editor -->
                <div class="custom-header">
                    <div class="header-left">
                        <Button 
                            as="tertiary icon" 
                            :iconLeft="{ component: PhArrowLeft, weight: 'bold' }" 
                            @click="goBack"
                            v-tooltip="{ content: 'Back to Forms' }"
                        />
                        
                        <InlineTitleEditor
                            :title="formData.name || (isNewForm ? 'New Form' : 'Form Builder')"
                            :isLoading="isLoading || isSaving"
                            @update:title="handleTitleUpdate"
                            @save="handleTitleSave"
                        />
                    </div>
                    
                    <div class="header-right">
                        <div class="flex gap-lg align-center">
                            <!-- Unsaved changes indicator -->
                            <div v-if="hasUnsavedChanges" class="unsaved-indicator">
                                <span class="unsaved-dot"></span>
                                <span class="unsaved-text">Unsaved changes</span>
                            </div>
                            
                            <Button 
                                as="stroke" 
                                :iconLeft="{ component: PhGearSix, weight: 'bold' }" 
                                label="Settings" 
                                @click="openFormSettings"
                                :disabled="isLoading"
                            />
                            <Button 
                                as="stroke" 
                                :iconLeft="{ component: PhEye, weight: 'bold' }" 
                                label="Preview"
                                @click="previewForm"
                                :disabled="isLoading"
                            />
                            <Button 
                                :iconLeft="{ component: PhFloppyDisk, weight: 'bold' }" 
                                label="Save" 
                                @click="saveForm"
                                :loading="isSaving"
                                :disabled="isLoading"
                            />
                        </div>
                    </div>
                </div>

                <div class="p-xl"></div>

                <div v-if="isLoading" class="loading-container flex-center">
                    <p>Loading form builder...</p>
                </div>
                
                <div v-else>
                    <BuilderView 
                        :formData="formData"
                        @update:form="handleFormChange"
                    />
                </div>
            </div>
        </template>
    </main-layout>
</template>

<style scoped>
.loading-container {
    min-height: 400px;
}

.custom-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 24px 0;
    border-bottom: 1px solid var(--border);
    margin-bottom: 0;
}

.header-left {
    display: flex;
    align-items: center;
    gap: 16px;
    flex: 1;
}

.header-right {
    display: flex;
    align-items: center;
}

.unsaved-indicator {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--text-secondary);
    font-size: 13px;
}

.unsaved-dot {
    width: 8px;
    height: 8px;
    background-color: var(--yellow-default);
    border-radius: 50%;
    animation: pulse 2s infinite;
}

.unsaved-text {
    font-style: italic;
}

@keyframes pulse {
    0% {
        opacity: 1;
    }
    50% {
        opacity: 0.5;
    }
    100% {
        opacity: 1;
    }
}

/* Remove default padding from container since we have custom header */
:deep(.container-xl) {
    padding-top: 0;
}
</style>