<script setup>
import { ref, watch } from 'vue';
import PopupLayout from '@layouts/popup/view.vue';
import TabsComponent from '@global/tabs/view.vue';
import Input from '@form/input/view.vue';
import Textarea from '@form/textarea/view.vue';
import Toggle from '@form/toggle/view.vue';
import Select from '@form/select/view.vue';
import Button from '@form/button/view.vue';
import ConditionBuilder from '@user_forms/components/conditional-logic/condition-builder.vue';

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

// Local copy of field
const localField = ref({...props.field});
const activeTab = ref('general');

// Update local field when props change
watch(() => props.field, (newField) => {
    localField.value = {...newField};
}, { immediate: true });

// Handle tab changes
const handleTabChange = (event, tab) => {
    activeTab.value = tab.title.toLowerCase();
};

// Update field and notify parent
const updateField = () => {
    props.onUpdate({...localField.value});
};

// Update a simple field property
const updateProperty = (key, value) => {
    localField.value = {
        ...localField.value,
        [key]: value
    };
};

// Process textarea options for radio/checkbox fields
const processOptions = (optionsText) => {
    if (!optionsText) return [];
    
    return optionsText.split('\n')
        .filter(line => line.trim())
        .map((line, index) => {
            // If line contains : then split into label:value
            if (line.includes(':')) {
                const [label, value] = line.split(':').map(part => part.trim());
                return { label, value: value || `option_${index}` };
            }
            // Otherwise use the line as both label and value
            return { 
                label: line.trim(), 
                value: `option_${index}` 
            };
        });
};

// Convert options array to textarea text
const optionsToText = (options) => {
    if (!options || !Array.isArray(options)) return '';
    
    return options.map(option => 
        `${option.label}:${option.value}`
    ).join('\n');
};

// Update options from textarea
const updateOptionsFromText = (text) => {
    const options = processOptions(text);
    updateProperty('options', options);
};

// Update conditional logic
const updateConditionalLogic = (conditions, logic) => {
    localField.value.visibility = {
        conditions,
        logic
    };
};



const columnOptions = [
    { label: 'Full Width (12/12)', value: 12 },
    { label: 'Three-Quarters (9/12)', value: 9 },
    { label: 'Two-Thirds (8/12)', value: 8 },
    { label: 'Half (6/12)', value: 6 },
    { label: 'One-Third (4/12)', value: 4 },
    { label: 'Quarter (3/12)', value: 3 }
];


</script>

<template>
    <popup-layout :title="`Edit ${localField.type} Field`" customClass="h-auto">
        <template #content>
            <div class="field-settings-content">
                <div class="settings-tabs">
                    <TabsComponent 
                        :tabs="[
                            { title: 'General', active: activeTab === 'general' },
                            { title: 'Advanced', active: activeTab === 'advanced' },
                            { title: 'Logic', active: activeTab === 'logic' }
                        ]"
                        :onClick="handleTabChange"
                    />
                </div>
                
                <div class="settings-content scrollbar">
                    <!-- General tab -->
                    <div v-if="activeTab === 'general'" class="settings-tab">
                        <Input
                            label="Field Label"
                            :value="localField.label"
                            @onInput="(e, value) => updateProperty('label', value)"
                        />
                        
                        <Select
                            label="Field Width"
                            :value="localField.colSpan || 12"
                            :options="columnOptions"
                            @change="(value) => updateProperty('colSpan', parseInt(value))"
                        />
                        
                        <Toggle
                            v-if="localField.type !== 'divider'"
                            label="Required Field"
                            :value="localField.required || false"
                            @update:value="(value) => updateProperty('required', value)"
                        />
                        
                        <!-- Field type specific settings -->
                        
                        <!-- Input field settings -->
                        <div v-if="localField.type === 'input'" class="field-specific-settings">
                            <Input
                                label="Placeholder"
                                :value="localField.placeholder || ''"
                                @onInput="(e, value) => updateProperty('placeholder', value)"
                            />
                            
                            <Select
                                label="Input Type"
                                :value="localField.inputType || 'text'"
                                :options="[
                                    { label: 'Text', value: 'text' },
                                    { label: 'Email', value: 'email' },
                                    { label: 'Number', value: 'number' },
                                    { label: 'Phone', value: 'tel' },
                                    { label: 'URL', value: 'url' },
                                    { label: 'Password', value: 'password' }
                                ]"
                                @change="(value) => updateProperty('inputType', value)"
                            />
                            
                            <Input
                                label="Validation Pattern (Regex)"
                                :value="localField.validationPattern || ''"
                                @onInput="(e, value) => updateProperty('validationPattern', value)"
                            />
                        </div>
                        
                        <!-- Textarea field settings -->
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
                        
                        <!-- Select field settings -->
                        <div v-else-if="localField.type === 'select'" class="field-specific-settings">
                            <Input
                                label="Placeholder"
                                :value="localField.placeholder || ''"
                                @onInput="(e, value) => updateProperty('placeholder', value)"
                            />
                            
                            <Textarea
                                label="Options (one per line, format: label:value)"
                                :value="optionsToText(localField.options)"
                                @onInput="updateOptionsFromText"
                                placeholder="Option 1:option_1&#10;Option 2:option_2&#10;Option 3:option_3"
                            />
                        </div>
                        
                        <!-- Radio & Checkbox fields settings -->
                        <div v-else-if="['radio', 'checkbox'].includes(localField.type)" class="field-specific-settings">
                            <Textarea
                                label="Options (one per line, format: label:value)"
                                :value="optionsToText(localField.options)"
                                @onInput="updateOptionsFromText"
                                placeholder="Option 1:option_1&#10;Option 2:option_2&#10;Option 3:option_3"
                            />
                        </div>
                        
                        <!-- Date field settings -->
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
                        
                        <!-- File field settings -->
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
                        
                        <!-- Rating field settings -->
                        <div v-else-if="localField.type === 'rating'" class="field-specific-settings">
                            <Input
                                label="Max Rating"
                                :value="localField.maxRating?.toString() || '5'"
                                type="number"
                                @onInput="(e, value) => updateProperty('maxRating', parseInt(value) || 5)"
                            />
                        </div>
                        
                        <!-- Image field settings -->
                        <div v-else-if="localField.type === 'image'" class="field-specific-settings">
                            <Input
                                label="Image URL"
                                :value="localField.src || ''"
                                @onInput="(e, value) => updateProperty('src', value)"
                            />
                            
                            <Input
                                label="Alt Text"
                                :value="localField.alt || ''"
                                @onInput="(e, value) => updateProperty('alt', value)"
                            />
                        </div>
                        
                        <!-- Video field settings -->
                        <div v-else-if="localField.type === 'video'" class="field-specific-settings">
                            <Input
                                label="Video URL"
                                :value="localField.src || ''"
                                @onInput="(e, value) => updateProperty('src', value)"
                            />
                            
                            <Toggle
                                label="Autoplay"
                                :value="localField.autoplay || false"
                                @update:value="(value) => updateProperty('autoplay', value)"
                            />
                        </div>
                    </div>
                    
                    <!-- Advanced tab -->
                    <div v-else-if="activeTab === 'advanced'" class="settings-tab">
                        <Input
                            label="Field ID"
                            :value="localField.id"
                            disabled
                        />
                        
                        <Input
                            label="CSS Class"
                            :value="localField.cssClass || ''"
                            @onInput="(e, value) => updateProperty('cssClass', value)"
                        />
                        
                        <Toggle
                            label="Hide Label"
                            :value="localField.hideLabel || false"
                            @update:value="(value) => updateProperty('hideLabel', value)"
                        />
                        
                        <Toggle
                            label="Read Only"
                            :value="localField.readOnly || false"
                            @update:value="(value) => updateProperty('readOnly', value)"
                        />
                    </div>
                    
                    <!-- Logic tab -->
                    <div v-else-if="activeTab === 'logic'" class="settings-tab">
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
    width: 100%;
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