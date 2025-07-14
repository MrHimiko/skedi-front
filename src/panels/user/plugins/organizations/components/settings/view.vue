<script setup>
import { ref, onMounted } from 'vue';
import { api } from '@utils/api';
import { common } from '@utils/common';
import { popup } from '@utils/popup';

import ButtonComponent from '@form/button/view.vue';
import InputComponent from '@form/input/view.vue';
import TextareaComponent from '@form/textarea/view.vue';
import ConfirmComponent from '@floated/confirm/view.vue';

import { PhFloppyDisk, PhTrash } from "@phosphor-icons/vue";

const props = defineProps({
    organization: {
        type: Object,
        required: true
    },
    organizationId: {
        type: Number,
        required: true
    },
    isAdmin: {
        type: Boolean,
        default: false
    }
});

const emit = defineEmits(['refresh']);

// Form data
const formData = ref({
    name: '',
    description: ''
});

const isSaving = ref(false);
const hasChanges = ref(false);

// Initialize form data
function initializeForm() {
    formData.value = {
        name: props.organization.name || '',
        description: props.organization.description || ''
    };
    hasChanges.value = false;
}

// Watch for changes
function onFormChange() {
    hasChanges.value = true;
}

// Save organization settings
async function saveSettings() {
    if (!hasChanges.value) return;
    
    try {
        isSaving.value = true;
        
        const response = await api.put(`organizations/${props.organizationId}`, formData.value);
        
        if (response.success) {
            common.notification('Settings saved successfully', true);
            hasChanges.value = false;
            emit('refresh');
        } else {
            common.notification(response.message || 'Failed to save settings', false);
        }
    } catch (error) {
        console.error('Failed to save settings:', error);
        common.notification('Failed to save settings', false);
    } finally {
        isSaving.value = false;
    }
}

// Delete organization
function deleteOrganization() {
    popup.open(
        'delete-org-confirm',
        null,
        ConfirmComponent,
        {
            as: 'red',
            title: 'Delete Organization',
            description: `Are you sure you want to delete "${props.organization.name}"? This will permanently delete all teams, events, and data within this organization. This action cannot be undone.`,
            confirmLabel: 'Delete Organization',
            callback: async () => {
                try {
                    const response = await api.delete(`organizations/${props.organizationId}`);
                    
                    if (response.success) {
                        common.notification('Organization deleted successfully', true);
                        popup.close();
                        // Redirect to teams page
                        window.location.href = '/teams';
                    } else {
                        common.notification(response.message || 'Failed to delete organization', false);
                    }
                } catch (error) {
                    console.error('Failed to delete organization:', error);
                    common.notification('Failed to delete organization', false);
                }
            }
        },
        {
            position: 'center'
        }
    );
}

onMounted(() => {
    initializeForm();
});
</script>

<template>
    <div class="org-settings">
        <div class="settings-section">
            <h3>General Settings</h3>
            
            <form @submit.prevent="saveSettings">
                <div class="form-group">
                    <InputComponent
                        v-model="formData.name"
                        label="Organization Name"
                        placeholder="Enter organization name"
                        :required="true"
                        :disabled="!isAdmin"
                        @input="onFormChange"
                    />
                </div>
                
                <div class="form-group">
                    <TextareaComponent
                        v-model="formData.description"
                        label="Description"
                        placeholder="Brief description of your organization"
                        :rows="4"
                        :disabled="!isAdmin"
                        @input="onFormChange"
                    />
                </div>
                
                <div class="form-group">
                    <label class="form-label">Organization URL</label>
                    <div class="url-display">
                        https://skedi.com/{{ organization.slug }}
                    </div>
                    <p class="form-help">This URL cannot be changed</p>
                </div>
                
                <div v-if="isAdmin" class="form-actions">
                    <ButtonComponent
                        type="submit"
                        :iconLeft="{ component: PhFloppyDisk, weight: 'bold' }"
                        label="Save Changes"
                        :disabled="!hasChanges"
                        :loading="isSaving"
                    />
                </div>
            </form>
        </div>
        
        <!-- Danger Zone -->
        <div v-if="isAdmin" class="danger-zone">
            <h3>Danger Zone</h3>
            <div class="danger-content">
                <div class="danger-info">
                    <h4>Delete this organization</h4>
                    <p>Once you delete an organization, there is no going back. Please be certain.</p>
                </div>
                <ButtonComponent
                    as="red"
                    :iconLeft="{ component: PhTrash, weight: 'bold' }"
                    label="Delete Organization"
                    @click="deleteOrganization"
                />
            </div>
        </div>
    </div>
</template>

<style scoped>
.org-settings {
    max-width: 600px;
}

.settings-section {
    margin-bottom: 40px;
}

.settings-section h3 {
    margin: 0 0 24px 0;
    font-size: 18px;
    font-weight: 600;
}

.form-group {
    margin-bottom: 20px;
}

.form-label {
    display: block;
    margin-bottom: 8px;
    font-size: 14px;
    font-weight: 500;
    color: var(--text-primary);
}

.url-display {
    padding: 12px 16px;
    background: var(--background-2);
    border: 1px solid var(--border);
    border-radius: 6px;
    font-family: monospace;
    font-size: 14px;
    color: var(--text-secondary);
}

.form-help {
    margin: 8px 0 0 0;
    font-size: 13px;
    color: var(--text-secondary);
}

.form-actions {
    margin-top: 24px;
}

/* Danger Zone */
.danger-zone {
    padding: 24px;
    background: rgba(239, 68, 68, 0.05);
    border: 1px solid rgba(239, 68, 68, 0.2);
    border-radius: 8px;
}

.danger-zone h3 {
    margin: 0 0 16px 0;
    font-size: 16px;
    font-weight: 600;
    color: rgb(239, 68, 68);
}

.danger-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 20px;
}

.danger-info h4 {
    margin: 0 0 8px 0;
    font-size: 15px;
    font-weight: 600;
}

.danger-info p {
    margin: 0;
    font-size: 14px;
    color: var(--text-secondary);
}

@media (max-width: 640px) {
    .danger-content {
        flex-direction: column;
        align-items: flex-start;
    }
}
</style>