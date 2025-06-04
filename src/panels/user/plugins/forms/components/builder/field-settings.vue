<script setup>
import { ref, watch, computed } from 'vue';
import PopupLayout from '@layouts/popup/view.vue';
import TabsComponent from '@global/tabs/view.vue';
import Input from '@form/input/view.vue';
import Textarea from '@form/textarea/view.vue';
import Toggle from '@form/toggle/view.vue';
import Select from '@form/select/view.vue';
import Button from '@form/button/view.vue';
import ConditionBuilder from '@user_forms/components/conditional-logic/condition-builder.vue';
import { textToOptions, optionsToText } from '@user_forms/utils/field-types';

const props = defineProps({
    field: {
        type: Object,
        required: true
    },
    formFields: {
        type: Array,
        default: () => []
    },
    onUpdate: {
        type: Function,
        required: true
    }
});

const localField = ref({...props.field});
const activeTab = ref('general');

// Check if field is a system field
const isSystemField = computed(() => localField.value.system_field === true);

// Check if field supports certain features
const supportsWidth = computed(() => 
    localField.value.type !== 'divider'
);

const supportsRequired = computed(() => 
    !['divider', 'group', 'step'].includes(localField.value.type) && !isSystemField.value
);

const supportsAdvanced = computed(() => 
    localField.value.type !== 'divider' && !isSystemField.value
);

const supportsLogic = computed(() => 
    !['divider'].includes(localField.value.type) && !isSystemField.value
);

// Determine available tabs
const availableTabs = computed(() => {
    const tabs = [];
    
    if (localField.value.type !== 'divider') {
        tabs.push({ title: 'General', active: activeTab.value === 'general' });
    }
    
    if (supportsAdvanced.value) {
        tabs.push({ title: 'Advanced', active: activeTab.value === 'advanced' });
    }
    
    if (supportsLogic.value) {
        tabs.push({ title: 'Logic', active: activeTab.value === 'logic' });
    }
    
    return tabs;
});

watch(() => props.field, (newField) => {
    localField.value = {...newField};
}, { immediate: true });

const handleTabChange = (event, tab) => {
    activeTab.value = tab.title.toLowerCase();
};

const updateField = () => {
    props.onUpdate({...localField.value});
};

const updateProperty = (key, value) => {
    localField.value = {
        ...localField.value,
        [key]: value
    };
};

const updateOptionsFromText = (text) => {
    const options = textToOptions(text);
    updateProperty('options', options);
};

const updateConditionalLogic = (conditions, logic) => {
    localField.value.visibility = {
        conditions,
        logic
    };
};
</script>

<template>
    <popup-layout :title="`Edit ${localField.label || localField.type} Field`" customClass="h-auto">
        <template #content>
            <div class="field-settings-content">
                <div v-if="availableTabs.length > 1" class="settings-tabs">
                    <TabsComponent 
                        :tabs="availableTabs"
                        :onClick="handleTabChange"
                    />
                </div>
                
                <div class="settings-content scrollbar">
                    <!-- General tab -->
                    <div v-if="activeTab === 'general' && localField.type !== 'divider'" class="settings-tab">
                        <!-- Label (not for divider) -->
                        <Input
                            v-if="!['divider'].includes(localField.type)"
                            label="Field Label"
                            :value="localField.label"
                            @onInput="(e, value) => updateProperty('label', value)"
                            :disabled="isSystemField"
                        />
                        
                        <!-- Width (not for divider, group, step) -->
                        <Select
                            v-if="supportsWidth && !['group', 'step'].includes(localField.type)"
                            label="Field Width"
                            :value="localField.colSpan?.toString() || '12'"
                            :options="[
                                { label: 'Full Width (12/12)', value: '12' },
                                { label: 'Three-Quarters (9/12)', value: '9' },
                                { label: 'Two-Thirds (8/12)', value: '8' },
                                { label: 'Half (6/12)', value: '6' },
                                { label: 'One-Third (4/12)', value: '4' },
                                { label: 'Quarter (3/12)', value: '3' }
                            ]"
                            @change="(value) => updateProperty('colSpan', parseInt(value))"
                        />
                        
                        <!-- Required (not for divider, group, step) -->
                        <Toggle
                            v-if="supportsRequired"
                            label="Required Field"
                            :value="localField.required || false"
                            @update:value="(value) => updateProperty('required', value)"
                        />
                        
                        <!-- Field type specific settings -->
                        
                        <!-- Input field -->
                        <div v-if="localField.type === 'input' || localField.type === 'text'" class="field-specific-settings">
                            <Input
                                label="Placeholder"
                                :value="localField.placeholder || ''"
                                @onInput="(e, value) => updateProperty('placeholder', value)"
                                :disabled="isSystemField"
                            />
                            
                            <Select
                                v-if="!isSystemField"
                                label="Input Type"
                                :value="localField.inputType || 'text'"
                                :options="[
                                    { label: 'Text', value: 'text' },
                                    { label: 'Email', value: 'email' },
                                    { label: 'Number', value: 'number' },
                                    { label: 'Phone', value: 'tel' },
                                    { label: 'URL', value: 'url' }
                                ]"
                                @change="(value) => updateProperty('inputType', value)"
                            />
                        </div>
                        
                        <!-- Email field -->
                        <div v-else-if="localField.type === 'email'" class="field-specific-settings">
                            <Input
                                label="Placeholder"
                                :value="localField.placeholder || ''"
                                @onInput="(e, value) => updateProperty('placeholder', value)"
                                :disabled="isSystemField"
                            />
                        </div>
                        
                        <!-- Textarea -->
                        <div v-else-if="localField.type === 'textarea'" class="field-specific-settings">
                            <Input
                                label="Placeholder"
                                :value="localField.placeholder || ''"
                                @onInput="(e, value) => updateProperty('placeholder', value)"
                            />
                            
                            <Input
                                label="Rows"
                                :value="localField.rows?.toString() || '4'"
                                type="number"
                                @onInput="(e, value) => updateProperty('rows', parseInt(value) || 4)"
                            />
                        </div>
                        
                        <!-- Select/Radio/Checkbox -->
                        <div v-else-if="['select', 'radio', 'checkbox'].includes(localField.type)" class="field-specific-settings">
                            <Input
                                v-if="localField.type === 'select'"
                                label="Placeholder"
                                :value="localField.placeholder || ''"
                                @onInput="(e, value) => updateProperty('placeholder', value)"
                            />
                            
                            <Textarea
                                label="Options (one per line)"
                                :value="optionsToText(localField.options)"
                                @onInput="updateOptionsFromText"
                                placeholder="Option 1&#10;Option 2&#10;Option 3"
                                :rows="5"
                            />
                        </div>
                        
                        <!-- Date -->
                        <div v-else-if="localField.type === 'date'" class="field-specific-settings">
                            <Input
                                label="Placeholder"
                                :value="localField.placeholder || ''"
                                @onInput="(e, value) => updateProperty('placeholder', value)"
                            />
                            
                            <Toggle
                                label="Include Time"
                                :value="localField.includeTime || false"
                                @update:value="(value) => updateProperty('includeTime', value)"
                            />
                        </div>
                        
                        <!-- File -->
                        <div v-else-if="localField.type === 'file'" class="field-specific-settings">
                            <Toggle
                                label="Allow Multiple Files"
                                :value="localField.multiple || false"
                                @update:value="(value) => updateProperty('multiple', value)"
                            />
                            
                            <Input
                                label="Max File Size (MB)"
                                :value="localField.maxFileSize?.toString() || '5'"
                                type="number"
                                @onInput="(e, value) => updateProperty('maxFileSize', parseInt(value) || 5)"
                            />
                            
                            <Input
                                label="Accepted File Types"
                                :value="localField.acceptedFileTypes || ''"
                                placeholder=".jpg, .png, .pdf"
                                @onInput="(e, value) => updateProperty('acceptedFileTypes', value)"
                            />
                        </div>
                        
                        <!-- Rating -->
                        <div v-else-if="localField.type === 'rating'" class="field-specific-settings">
                            <Input
                                label="Max Rating"
                                :value="localField.maxRating?.toString() || '5'"
                                type="number"
                                @onInput="(e, value) => updateProperty('maxRating', parseInt(value) || 5)"
                            />
                        </div>
                        
                        <!-- Guest Repeater -->
                        <div v-else-if="localField.type === 'guest_repeater'" class="field-specific-settings">
                            <Input
                                label="Maximum Guests"
                                :value="localField.max_guests?.toString() || '10'"
                                type="number"
                                @onInput="(e, value) => updateProperty('max_guests', parseInt(value) || 10)"
                            />
                        </div>
                        
                        <!-- Step -->
                        <div v-else-if="localField.type === 'step'" class="field-specific-settings">
                            <Select
                                label="Button Text"
                                :value="localField.buttonText || 'Next'"
                                :options="[
                                    { label: 'Next', value: 'Next' },
                                    { label: 'Continue', value: 'Continue' },
                                    { label: 'Submit', value: 'Submit' },
                                    { label: 'Proceed', value: 'Proceed' }
                                ]"
                                @change="(value) => updateProperty('buttonText', value)"
                            />
                        </div>
                        
                        <!-- Group -->
                        <div v-else-if="localField.type === 'group'" class="field-specific-settings">
                            <Toggle
                                label="Collapsible Group"
                                :value="localField.collapsible || false"
                                @update:value="(value) => updateProperty('collapsible', value)"
                            />
                            
                            <Toggle
                                v-if="localField.collapsible"
                                label="Collapsed by Default"
                                :value="localField.collapsed || false"
                                @update:value="(value) => updateProperty('collapsed', value)"
                            />
                        </div>
                    </div>
                    
                    <!-- Advanced tab -->
                    <div v-else-if="activeTab === 'advanced' && supportsAdvanced" class="settings-tab">
                        <Input
                            label="Field ID"
                            :value="localField.id || localField.name || 'System Field'"
                            disabled
                        />
                        
                        <Input
                            label="CSS Class"
                            :value="localField.cssClass || ''"
                            @onInput="(e, value) => updateProperty('cssClass', value)"
                        />
                        
                        <Toggle
                            v-if="!['group', 'step'].includes(localField.type)"
                            label="Hide Label"
                            :value="localField.hideLabel || false"
                            @update:value="(value) => updateProperty('hideLabel', value)"
                        />
                        
                        <Toggle
                            v-if="!['group', 'step'].includes(localField.type)"
                            label="Read Only"
                            :value="localField.readOnly || false"
                            @update:value="(value) => updateProperty('readOnly', value)"
                        />
                    </div>
                    
                    <!-- Logic tab -->
                    <div v-else-if="activeTab === 'logic' && supportsLogic" class="settings-tab">
                        <ConditionBuilder
                            :conditions="localField.visibility?.conditions || []"
                            :logic="localField.visibility?.logic || 'all'"
                            :availableFields="formFields" 
                            @update="updateConditionalLogic"
                        />
                    </div>
                </div>
                
                <div class="action-buttons">
                    <div class="c-button tertiary i-popup-close pointer">Cancel</div>
                    <Button label="Save Changes" @click="updateField" />
                </div>
            </div>
        </template>
    </popup-layout>
</template>

<style scoped>
.field-settings-content {
    width: 100vw;
    max-width: 600px;
}

.settings-tabs {
    margin-bottom: 20px;
}

.settings-content {
    max-height: 60vh;
    overflow-y: auto;
}

.settings-tab {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.field-specific-settings {
    margin-top: 8px;
    padding-top: 16px;
    border-top: 1px solid var(--border-primary);
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.action-buttons {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    margin-top: 24px;
}
</style>