<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { common } from '@utils/common';
import { createEmptyForm } from '@user_forms/utils/form-schema';

import MainLayout from '@layouts/main/view.vue';
import HeadingComponent from '@global/heading/view.vue';
import Button from '@form/button/view.vue';
import BuilderView from '@user_forms/components/builder/view.vue';

import FormSettingsPopup from '@user_forms/components/builder/form-settings-popup.vue';
import { popup } from '@utils/popup';

import { PhFloppyDisk, PhEye } from "@phosphor-icons/vue";

const route = useRoute();
const formId = route.params.id;
const formData = ref(createEmptyForm());
const isLoading = ref(true);
const isSaving = ref(false);

// Open form settings popup
const openFormSettings = () => {
    popup.open(
        'form-settings',
        null,
        FormSettingsPopup,
        {
            formData: formData.value,
            'update:form': (updatedForm) => {
                formData.value = updatedForm;
                common.notification('Form settings updated', true);
            }
        },
        {
            position: 'center'
        }
    );
};

// In a real implementation, this would fetch the form from the API
onMounted(async () => {
    // Simulate API call
    try {
        isLoading.value = true;
        
        if (formId && formId !== 'new') {
            // In production, this would be an API call
            // const response = await api.get(`forms/${formId}`);
            // if (response.success) {
            //     formData.value = response.data;
            // }
            
            // For now, we'll use the empty form
            formData.value = createEmptyForm();
            formData.value.id = formId;
            formData.value.name = "Sample Form";
        }
    } catch (error) {
        console.error("Failed to load form:", error);
        common.notification("Failed to load form", false);
    } finally {
        isLoading.value = false;
    }
});

// Save the form data
const saveForm = async () => {
    try {
        isSaving.value = true;
        
        // Log the form data for now
        console.log("Form data to save:", formData.value);
        
        // In production, this would be an API call
        // const response = await api.put(`forms/${formId}`, formData.value);
        // if (response.success) {
        //     common.notification("Form saved successfully", true);
        // }
        
        common.notification("Form saved successfully (simulation)", true);
    } catch (error) {
        console.error("Failed to save form:", error);
        common.notification("Failed to save form", false);
    } finally {
        isSaving.value = false;
    }
};

// Handle form changes
const handleFormChange = (updatedForm) => {
    formData.value = updatedForm;
};
</script>

<template>
    <main-layout>
        <template #content>
            <div class="container-xl">
                <HeadingComponent :title="formData.name || 'Form Builder'">
                    <template #right>
                        <div class="flex gap-lg">
                            <Button 
                                as="stroke" 
                                :iconLeft="{ component: PhGearSix, weight: 'bold' }" 
                                label="Settings" 
                                @click="openFormSettings"
                            />
                            <Button 
                                as="stroke" 
                                :iconLeft="{ component: PhEye, weight: 'bold' }" 
                                label="Preview"
                            />
                            <Button 
                                :iconLeft="{ component: PhFloppyDisk, weight: 'bold' }" 
                                label="Save" 
                                @click="saveForm"
                                :loading="isSaving"
                            />
                        </div>
                    </template>
                </HeadingComponent>

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
</style>