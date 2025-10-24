<!-- src/panels/user/plugins/organizations/components/settings/view.vue -->
<script setup>
import { ref, onMounted, watch } from 'vue';
import { api } from '@utils/api';
import { common } from '@utils/common';

import ButtonComponent from '@form/button/view.vue';
import InputComponent from '@form/input/view.vue';

import { PhFloppyDisk } from "@phosphor-icons/vue";

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
    slug: ''
});

const isSaving = ref(false);
const hasChanges = ref(false);

// Initialize form data
function initializeForm() {
    formData.value = {
        name: props.organization.name || '',
        slug: props.organization.slug || ''
    };
    hasChanges.value = false;
}

// Watch for organization prop changes and re-initialize form
watch(() => props.organization, (newOrg) => {
    if (newOrg && newOrg.name) {
        console.log('Organization prop changed, re-initializing form:', newOrg);
        initializeForm();
    }
}, { immediate: true, deep: true });

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
                        :value="formData.name"
                        label="Organization Name"
                        placeholder="Enter organization name"
                        :required="true"
                        :disabled="!isAdmin"
                        @onInput="(event, value) => { formData.name = value; onFormChange(); }"
                    />
                </div>
                
                <div class="form-group">
                    <div class="flex-between">
                        <label>Organization Link</label>
                        <span class="text-xs text-secondary">Required</span>
                    </div>
                    <div class="slug-input-wrapper">
                        <span class="slug-prefix">skedi.com/</span>
                        <input 
                            type="text"
                            :value="formData.slug"
                            placeholder="your-organization"
                            :required="true"
                            :disabled="!isAdmin"
                            class="slug-input"
                            @input="(e) => { formData.slug = e.target.value; onFormChange(); }"
                        />
                    </div>
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

.flex-between {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
}

.flex-between label {
    display: block;
    font-size: 13px;
    font-weight: 600;
}

.text-xs {
    font-size: 12px;
}

.text-secondary {
    color: var(--text-secondary);
}

.slug-input-wrapper {
    display: flex;
    align-items: center;
    border: 1px solid var(--border);
    border-radius: 6px;
    overflow: hidden;
    background: var(--background-0);
}

.slug-prefix {
    padding: 7px 12px;
    background: var(--background-2);
    color: var(--text-secondary);
    font-size: 14px;
    font-weight: 500;
    border-right: 1px solid var(--border);
    white-space: nowrap;
}

.slug-input {
    flex: 1;
    padding: 7px 12px;
    border: none;
    outline: none;
    font-size: 14px;
    background: transparent;
    color: var(--text-primary);
}

.slug-input:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.slug-input::placeholder {
    color: var(--text-secondary);
    opacity: 0.6;
}

.form-actions {
    margin-top: 24px;
}

@media (max-width: 640px) {
    .org-settings {
        max-width: 100%;
    }
}
</style>
