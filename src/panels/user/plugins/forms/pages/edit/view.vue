<script setup>
import { ref, onMounted, watch, onUnmounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { common } from '@utils/common';
import { createEmptyForm } from '@user_forms/utils/form-schema';
import { FormsService } from '@user_forms/services/forms';
import { UserStore } from '@stores/user';

import MainLayout from '@layouts/main/view.vue';
import HeadingComponent from '@global/heading/view.vue';
import Button from '@form/button/view.vue';
import Select from '@form/select/view.vue';

import BuilderView from '@user_forms/components/builder/view.vue';
import InlineTitleEditor from '@user_forms/components/inline-title-editor.vue';

import FormSettingsPopup from '@user_forms/components/builder/form-settings-popup.vue';
import { popup } from '@utils/popup';
import { fieldTypes } from '@user_forms/utils/field-types';

import { PhFloppyDisk, PhEye, PhGearSix, PhArrowLeft } from "@phosphor-icons/vue";

const route = useRoute();
const router = useRouter();
const userStore = UserStore();
const formId = route.params.id;
const formData = ref(createEmptyForm());
const isLoading = ref(true);
const isSaving = ref(false);
const isNewForm = ref(formId === 'new');
const hasUnsavedChanges = ref(false);
const selectedOrganizationId = ref(null);

let initialFormDataString = '';

// Get user organizations
const userOrganizations = computed(() => {
    const orgs = userStore.getOrganizations() || [];
    return orgs.map(org => ({
        label: org.entity?.name || 'Unknown Organization',
        value: org.entity?.id
    }));
});

// Set default organization
const setDefaultOrganization = () => {
    if (userOrganizations.value.length > 0 && !selectedOrganizationId.value) {
        selectedOrganizationId.value = userOrganizations.value[0].value;
    }
};

// Clean form data helper
const cleanFormData = (data) => {
    // First, normalize system field names
    const normalizedFields = data.fields.map(field => {
        // Normalize old system field names to new format
        if (field.name === 'name' && field.system_field) {
            return { ...field, name: 'system_contact_name' };
        }
        if (field.name === 'email' && field.system_field) {
            return { ...field, name: 'system_contact_email' };
        }
        return field;
    });
    
    // Remove duplicate system fields and fields that shouldn't exist
    const cleanedFields = [];
    const seenSystemFields = new Set();
    const fieldsToSkip = ['image', 'video']; // Field types we no longer support
    
    normalizedFields.forEach(field => {
        // Skip unsupported field types
        if (fieldsToSkip.includes(field.type)) {
            return;
        }
        
        // Handle system fields
        if (field.system_field) {
            const key = field.name;
            if (!seenSystemFields.has(key)) {
                seenSystemFields.add(key);
                cleanedFields.push(field);
            }
        } else {
            cleanedFields.push(field);
        }
    });
    
    // Now fix container children references
    cleanedFields.forEach(field => {
        if (field.children && Array.isArray(field.children)) {
            // Clean children array
            field.children = field.children
                .filter(childId => childId != null) // Remove nulls
                .map(childId => {
                    // Handle old system field references
                    if (childId === 'name') return 'system_contact_name';
                    if (childId === 'email') return 'system_contact_email';
                    return childId;
                })
                .filter(childId => {
                    // Check if the referenced field exists
                    const exists = cleanedFields.some(f => 
                        (f.id === childId) || (f.name === childId)
                    );
                    return exists;
                });
            
            // Remove duplicates
            field.children = [...new Set(field.children)];
        }
    });
    
    // Ensure system fields are at the beginning
    const systemFields = cleanedFields.filter(f => f.system_field);
    const regularFields = cleanedFields.filter(f => !f.system_field);
    
    // Sort system fields by order
    systemFields.sort((a, b) => (a.order || 0) - (b.order || 0));
    
    return {
        ...data,
        fields: [...systemFields, ...regularFields]
    };
};

watch(formData, (newData) => {
    if (initialFormDataString && !isLoading.value) {
        const currentDataString = JSON.stringify(newData);
        hasUnsavedChanges.value = currentDataString !== initialFormDataString;
    }
}, { deep: true });

const loadFormData = async () => {
    try {
        isLoading.value = true;
        
        if (isNewForm.value) {
            formData.value = createEmptyForm();
            initialFormDataString = JSON.stringify(formData.value);
            setDefaultOrganization();
        } else {
            const data = await FormsService.getForm(formId);
            
            const loadedFormData = {
                id: data.id,
                name: data.name || 'Untitled Form',
                description: data.description || '',
                fields: data.fields || [],
                layout: data.settings?.layout || {
                    type: "standard",
                    settings: {
                        autoSave: true,
                        surveyMode: false
                    }
                },
                submission: data.settings?.submission || {
                    successMessage: "Thank you for submitting!",
                    redirectUrl: null
                },
                advanced: data.settings?.advanced || {},
                enabled: data.is_active !== false
            };
            
            // Clean the loaded data
            formData.value = cleanFormData(loadedFormData);
            
            // Set organization from loaded form
            if (data.organization?.id) {
                selectedOrganizationId.value = data.organization.id;
            } else {
                setDefaultOrganization();
            }
            
            initialFormDataString = JSON.stringify(formData.value);
        }
    } catch (error) {
        console.error("Failed to load form:", error);
        common.notification("Failed to load form", false);
        router.push('/forms');
    } finally {
        isLoading.value = false;
    }
};

onMounted(() => {
    loadFormData();
    window.addEventListener('beforeunload', beforeUnloadHandler);
});

onUnmounted(() => {
    window.removeEventListener('beforeunload', beforeUnloadHandler);
});

const handleTitleUpdate = (newTitle) => {
    formData.value.name = newTitle;
};

const handleTitleSave = async (newTitle) => {
    try {
        formData.value.name = newTitle;
        await saveFormToAPI();
        common.notification('Form name updated successfully', true);
    } catch (error) {
        console.error('Error saving form name:', error);
        common.notification('Failed to save form name', false);
        throw error;
    }
};

const openFormSettings = () => {
    popup.open(
        'form-settings',
        null,
        FormSettingsPopup,
        {
            formData: formData.value,
            'update:form': (updatedForm) => {
                formData.value = { ...formData.value, ...updatedForm };
            },
            onSave: async (updatedForm) => {
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

const saveFormToAPI = async () => {
    // Validate organization selection
    if (!selectedOrganizationId.value) {
        common.notification('Please select an organization for this form', false);
        return null;
    }
    
    // Clean the form data before saving
    const cleanedFormData = cleanFormData(formData.value);
    
    const saveData = {
        name: cleanedFormData.name || 'Untitled Form',
        description: cleanedFormData.description || '',
        fields: cleanedFormData.fields || [],
        settings: {
            layout: cleanedFormData.layout || {},
            submission: cleanedFormData.submission || {},
            advanced: cleanedFormData.advanced || {}
        },
        is_active: cleanedFormData.enabled !== false,
        allow_multiple_submissions: true,
        requires_authentication: false,
        organization_id: selectedOrganizationId.value
    };
    
    console.log('Cleaned data being sent to API:', saveData);
    
    let savedForm;
    
    if (isNewForm.value) {
        savedForm = await FormsService.createForm(saveData, selectedOrganizationId.value);
        router.replace(`/forms/${savedForm.id}/edit`);
        isNewForm.value = false;
    } else {
        savedForm = await FormsService.updateForm(formId, saveData, selectedOrganizationId.value);
    }
    
    if (savedForm) {
        formData.value.id = savedForm.id;
        if (savedForm.name) {
            formData.value.name = savedForm.name;
        }
    }
    
    initialFormDataString = JSON.stringify(formData.value);
    hasUnsavedChanges.value = false;
    
    return savedForm;
};

const saveForm = async () => {
    try {
        isSaving.value = true;
        await saveFormToAPI();
        common.notification("Form saved successfully", true);
    } catch (error) {
        console.error("Failed to save form:", error);
        common.notification("Failed to save form", false);
    } finally {
        isSaving.value = false;
    }
};

const handleFormChange = (updatedForm) => {
    formData.value = { ...updatedForm };
};

const handleAddField = (fieldType) => {
    // Emit to builder to add field
    const builder = document.querySelector('.form-builder');
    if (builder) {
        builder.dispatchEvent(new CustomEvent('add-field-type', { 
            detail: { fieldType: fieldType.type } 
        }));
    }
};

const goBack = () => {
    if (hasUnsavedChanges.value) {
        if (confirm('You have unsaved changes. Are you sure you want to leave?')) {
            router.push('/forms');
        }
    } else {
        router.push('/forms');
    }
};


const beforeUnloadHandler = (event) => {
    if (hasUnsavedChanges.value) {
        event.preventDefault();
        event.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
    }
};
</script>

<template>
    <main-layout>
        <template #content>
            <div class="container-xl">
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
                            <div v-if="hasUnsavedChanges" class="unsaved-indicator">
                                <span class="unsaved-dot"></span>
                                <span class="unsaved-text">Unsaved changes</span>
                            </div>
                            
                            <Select
                                v-if="userOrganizations.length > 0"
                                :value="selectedOrganizationId"
                                :options="userOrganizations"
                                placeholder="Select Organization"
                                @change="(value) => selectedOrganizationId = value"
                                :disabled="isLoading || isSaving"
                                style="min-width: 200px"
                            />
                            
                            <Button 
                                as="tertiary icon size36" 
                                :iconLeft="{ component: PhGearSix, weight: 'bold' }" 
                                @click="openFormSettings"
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
                
                <div v-else class="builder-layout">

                    
                    <div class="builder-main">
                        <BuilderView 
                            :formData="formData"
                            @update:form="handleFormChange"
                        />
                    </div>
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

.builder-layout {
    display: grid;
    grid-template-columns: 1fr;
    gap: 20px;
}

.builder-sidebar {
    height: 100%;
}

.builder-main {
    height: 100%;
    overflow: hidden;
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

:deep(.container-xl) {
    padding-top: 0;
}

@media (max-width: 1024px) {
    .builder-layout {
        grid-template-columns: 1fr;
        height: auto;
    }
    
    .builder-sidebar {
        order: 2;
        height: 400px;
    }
    
    .builder-main {
        order: 1;
    }
}
</style>