<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '@utils/api';
import { common } from '@utils/common';
import { FormsService } from '@user_forms/services/forms';
import PopupView from '@layouts/popup/view.vue';
import Button from '@form/button/view.vue';
import SelectComponent from '@form/select/view.vue';
import Notice from '@global/notice/view.vue';
import { PhPencil, PhPlus } from "@phosphor-icons/vue";

const props = defineProps({
    eventId: {
        type: [String, Number],
        required: true
    },
    organizationId: {
        type: [String, Number],
        required: true
    },
    callback: {
        type: Function
    }
});

const router = useRouter();

// State
const isLoading = ref(true);
const isSaving = ref(false);
const attachedForm = ref(null);
const availableForms = ref([]);
const selectedFormId = ref('');
const hasChanges = ref(false);

// Computed
const formOptions = computed(() => {
    const options = availableForms.value.map(form => ({
        label: form.name,
        value: form.id.toString()
    }));
    
    // Add "Default form" option at the beginning
    options.unshift({
        label: 'Default form',
        value: ''
    });
    
    return options;
});

const selectedForm = computed(() => {
    if (!selectedFormId.value) return null;
    return availableForms.value.find(form => form.id.toString() === selectedFormId.value);
});

const hasNoForms = computed(() => {
    return availableForms.value.length === 0;
});

// Load current form attachment and available forms
const loadData = async () => {
    try {
        isLoading.value = true;
        
        // Load current form attached to event
        try {
            const response = await api.get(`organizations/${props.organizationId}/events/${props.eventId}/forms`);
            if (response && response.success && response.data) {
                attachedForm.value = response.data;
                selectedFormId.value = response.data.id.toString();
            }
        } catch (error) {
            // No form attached - that's okay
            console.log('No form currently attached to event');
        }
        
        // Load all available forms for the organization
        const forms = await FormsService.getForms(false, props.organizationId);
        availableForms.value = forms || [];
        
    } catch (error) {
        console.error('Error loading data:', error);
        common.notification('Failed to load form data', false);
    } finally {
        isLoading.value = false;
    }
};

// Handle form selection change
const handleFormChange = (value) => {
    selectedFormId.value = value;
    hasChanges.value = true;
};

// Save form attachment
const saveFormAttachment = async () => {
    try {
        isSaving.value = true;
        
        if (selectedFormId.value) {
            // Attach the selected form
            const response = await api.post(
                `organizations/${props.organizationId}/events/${props.eventId}/forms`,
                { form_id: parseInt(selectedFormId.value) }
            );
            
            if (response && response.success) {
                attachedForm.value = availableForms.value.find(
                    form => form.id === parseInt(selectedFormId.value)
                );
                common.notification('Form attached successfully', true);
            } else {
                throw new Error(response?.message || 'Failed to attach form');
            }
        } else {
            // Detach any existing form
            if (attachedForm.value) {
                const response = await api.delete(
                    `organizations/${props.organizationId}/events/${props.eventId}/forms`
                );
                
                if (response && response.success) {
                    attachedForm.value = null;
                    common.notification('Form detached successfully', true);
                } else {
                    throw new Error(response?.message || 'Failed to detach form');
                }
            }
        }
        
        hasChanges.value = false;
        
        // Call callback if provided
        if (props.callback) {
            props.callback(null, { form_id: selectedFormId.value }, null, true);
        }
        
        // Close popup
        document.querySelector('.i-popup-close').click();
        
    } catch (error) {
        console.error('Error saving form attachment:', error);
        common.notification(error.message || 'Failed to save form settings', false);
    } finally {
        isSaving.value = false;
    }
};

// Edit form - navigate to form editor
const editForm = () => {
    if (selectedForm.value) {
        router.push(`/forms/${selectedForm.value.id}/edit`);
    }
};

// Create new form
const createForm = () => {
    router.push('/forms/new/edit');
};

onMounted(() => {
    loadData();
});
</script>

<template>
    <PopupView title="Form Settings" customClass="h-auto event-form-settings">
        <template #content>
            <div v-if="isLoading" class="loading-section">
                <p>Loading form settings...</p>
            </div>
            
            <div v-else class="form-settings-content">
                <!-- Calendar Form section -->
                <div class="calendar-form-section">
                    <h3>Calendar Form</h3>
                    <p class="form-description">Selected form will be prompted to user after they select date & time for scheduling.</p>
                    
                    <div v-if="hasNoForms" class="no-forms-notice">
                        <Notice 
                            description="No forms exist yet. This event will use the default form." 
                            icon="info"
                            as="suggest"
                        />
                        <div class="create-form-action">
                            <Button 
                                :iconLeft="{ component: PhPlus, weight: 'bold' }" 
                                label="Create custom form" 
                                @click="createForm"
                            />
                        </div>
                    </div>
                    
                    <div v-else class="form-selector">
                        <SelectComponent
                            :options="formOptions"
                            :value="selectedFormId"
                            placeholder="Select a form"
                            @change="handleFormChange"
                        />
                        
                        <!-- Default form info -->
                        <div v-if="!selectedFormId" class="default-form-info">
                            <p>Default form is asking user for Name, Email & Message</p>
                        </div>
                        
                        <div v-if="selectedForm" class="selected-form-actions">
                            <Button 
                                as="secondary"
                                :iconLeft="{ component: PhPencil, weight: 'bold' }" 
                                label="Edit form" 
                                @click="editForm"
                            />
                        </div>
                        
                        <div class="additional-actions">
                            <Button 
                                as="tertiary"
                                :iconLeft="{ component: PhPlus, weight: 'bold' }" 
                                label="Create new form" 
                                @click="createForm"
                            />
                        </div>
                    </div>
                </div>
                
                <!-- Action buttons -->
                <div class="actions grid grid-2 gap-2xl">
                    <div>
                        <div class="c-button tertiary pointer i-popup-close">Cancel</div>
                    </div>
                    <div>
                        <Button 
                            type="button" 
                            label="Save Changes" 
                            :loading="isSaving" 
                            :disabled="!hasChanges"
                            @click="saveFormAttachment"
                        />
                    </div>
                </div>
            </div>
        </template>
    </PopupView>
</template>

<style scoped>
.event-form-settings {
    width: 100%;
    max-width: 500px;
}

.loading-section {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 200px;
    color: var(--text-secondary);
}

.form-settings-content {
    padding: 20px 0;
}

.calendar-form-section h3 {
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 8px;
}

.form-description {
    font-size: 14px;
    color: var(--text-secondary);
    margin-bottom: 20px;
}

.no-forms-notice {
    margin-bottom: 20px;
}

.create-form-action {
    margin-top: 16px;
    display: flex;
    justify-content: center;
}

.form-selector {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.default-form-info {
    background-color: var(--background-1);
    padding: 12px 16px;
    border-radius: var(--radius-md);
}

.default-form-info p {
    margin: 0;
    font-size: 14px;
    color: var(--text-secondary);
}

.selected-form-actions {
    display: flex;
    gap: 12px;
}

.additional-actions {
    display: flex;
    justify-content: center;
}

.actions {
    margin-top: 30px;
    padding-top: 20px;
    border-top: 1px solid var(--border);
}
</style>