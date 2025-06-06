<script setup>
import Input from '@form/input/view.vue';
import Textarea from '@form/textarea/view.vue';
import Select from '@form/select/view.vue';
import Toggle from '@form/toggle/view.vue';
import Date from '@form/date/view.vue';
import Separator from '@global/separator/view.vue';

const props = defineProps({
    field: {
        type: Object,
        required: true
    },
    isPreview: {
        type: Boolean,
        default: false
    },
    value: {
        type: [String, Number, Boolean, Array],
        default: null
    }
});

const emit = defineEmits(['update:field', 'update:value']);

const updateValue = (event, value) => {
    emit('update:value', value);
};
</script>

<template>
    <div class="field-renderer" :class="{ preview: isPreview }">
        <!-- System Name Field -->
        <div v-if="field.name === 'system_contact_name' || field.type === 'text'" class="field-wrapper">
            <Input
                :label="field.label"
                :placeholder="field.placeholder || ''"
                :required="field.required"
                :value="value"
                :type="field.inputType || 'text'"
                :disabled="isPreview"
                @onInput="updateValue"
            />
            <p v-if="field.description" class="field-description">{{ field.description }}</p>
        </div>
        
        <!-- System Email Field -->
        <div v-else-if="field.name === 'system_contact_email' || field.type === 'email'" class="field-wrapper">
            <Input
                :label="field.label"
                :placeholder="field.placeholder || ''"
                :required="field.required"
                :value="value"
                type="email"
                :disabled="isPreview"
                @onInput="updateValue"
            />
            <p v-if="field.description" class="field-description">{{ field.description }}</p>
        </div>
        
        <!-- Guest Repeater Field -->
        <div v-else-if="field.type === 'guest_repeater'" class="field-wrapper">
            <label class="field-label">{{ field.label }}</label>
            <div class="guest-repeater">
                <div class="guest-repeater-placeholder">
                    <i>group_add</i>
                    <span>Guest management interface</span>
                    <p class="text-xs text-secondary">Max {{ field.max_guests || 10 }} guests</p>
                </div>
            </div>
            <p v-if="field.description" class="field-description">{{ field.description }}</p>
        </div>
        
        <!-- Input Field -->
        <div v-else-if="field.type === 'input'" class="field-wrapper">
            <Input
                :label="field.label"
                :placeholder="field.placeholder || ''"
                :required="field.required"
                :value="value"
                :type="field.inputType || 'text'"
                :disabled="isPreview"
                @onInput="updateValue"
            />
            <p v-if="field.description" class="field-description">{{ field.description }}</p>
        </div>
        
        <!-- Textarea Field -->
        <div v-else-if="field.type === 'textarea'" class="field-wrapper">
            <Textarea
                :label="field.label"
                :placeholder="field.placeholder || ''"
                :required="field.required"
                :value="value"
                :disabled="isPreview"
                @onInput="updateValue"
            />
            <p v-if="field.description" class="field-description">{{ field.description }}</p>
        </div>
        
        <!-- Select Field -->
        <div v-else-if="field.type === 'select'" class="field-wrapper">
            <Select
                :label="field.label"
                :placeholder="field.placeholder || 'Select an option'"
                :required="field.required"
                :value="value"
                :options="field.options || []"
                :disabled="isPreview"
                @change="updateValue"
            />
            <p v-if="field.description" class="field-description">{{ field.description }}</p>
        </div>
        
        <!-- Radio Buttons -->
        <div v-else-if="field.type === 'radio'" class="field-wrapper">
            <label class="field-label">
                {{ field.label }}
                <span v-if="field.required" class="required-mark">*</span>
            </label>
            <div class="radio-options">
                <div 
                    v-for="(option, index) in field.options" 
                    :key="index"
                    class="radio-option"
                >
                    <input 
                        type="radio" 
                        :name="field.id || field.name" 
                        :value="option.value"
                        :checked="value === option.value"
                        :disabled="isPreview"
                        @change="(e) => updateValue(e, option.value)"
                    />
                    <label>{{ option.label }}</label>
                </div>
            </div>
            <p v-if="field.description" class="field-description">{{ field.description }}</p>
        </div>
        
        <!-- Checkboxes -->
        <div v-else-if="field.type === 'checkbox'" class="field-wrapper">
            <label class="field-label">
                {{ field.label }}
                <span v-if="field.required" class="required-mark">*</span>
            </label>
            <div class="checkbox-options">
                <div 
                    v-for="(option, index) in field.options" 
                    :key="index"
                    class="checkbox-option"
                >
                    <Toggle
                        :label="option.label"
                        :value="Array.isArray(value) ? value.includes(option.value) : false"
                        :disabled="isPreview"
                        @update:value="(checked) => {
                            const newValue = Array.isArray(value) ? [...value] : [];
                            if (checked && !newValue.includes(option.value)) {
                                newValue.push(option.value);
                            } else if (!checked) {
                                const index = newValue.indexOf(option.value);
                                if (index !== -1) newValue.splice(index, 1);
                            }
                            updateValue(null, newValue);
                        }"
                    />
                </div>
            </div>
            <p v-if="field.description" class="field-description">{{ field.description }}</p>
        </div>
        
        <!-- Date Picker -->
        <div v-else-if="field.type === 'date'" class="field-wrapper">
            <Date
                :label="field.label"
                :placeholder="field.placeholder || 'Select a date'"
                :required="field.required"
                :value="value"
                :disabled="isPreview"
                @onChange="updateValue"
            />
            <p v-if="field.description" class="field-description">{{ field.description }}</p>
        </div>
        
        <!-- Divider -->
        <div v-else-if="field.type === 'divider'" class="field-wrapper">
            <Separator />
        </div>
        
        <!-- File Upload -->
        <div v-else-if="field.type === 'file'" class="field-wrapper">
            <label class="field-label">
                {{ field.label }}
                <span v-if="field.required" class="required-mark">*</span>
            </label>
            <div class="file-upload">
                <i>file_upload</i>
                <span>{{ field.multiple ? 'Upload Files' : 'Upload File' }}</span>
                <p class="text-xs text-secondary">
                    Max {{ field.maxFileSize || 5 }}MB
                    <span v-if="field.acceptedFileTypes">• {{ field.acceptedFileTypes }}</span>
                </p>
            </div>
            <p v-if="field.description" class="field-description">{{ field.description }}</p>
        </div>
        
        <!-- Rating -->
        <div v-else-if="field.type === 'rating'" class="field-wrapper">
            <label class="field-label">
                {{ field.label }}
                <span v-if="field.required" class="required-mark">*</span>
            </label>
            <div class="rating-stars">
                <div 
                    v-for="i in (field.maxRating || 5)" 
                    :key="i"
                    class="rating-star"
                    :class="{ active: value >= i }"
                    @click="isPreview ? null : updateValue(null, i)"
                >
                    <i>star</i>
                </div>
            </div>
            <p v-if="field.description" class="field-description">{{ field.description }}</p>
        </div>
        
        <!-- Unknown field type -->
        <div v-else class="field-wrapper">
            <div class="unknown-field">
                <i>help_outline</i>
                <span>Unknown field type: {{ field.type }}</span>
            </div>
        </div>
    </div>
</template>

<style scoped>
.field-renderer {
    width: 100%;
}

.field-wrapper {
    margin-bottom: 8px;
}

.field-description {
    font-size: 12px;
    color: var(--text-secondary);
    margin-top: 4px;
}

.field-label {
    display: block;
    font-size: 13px;
    font-weight: 600;
    margin-bottom: 8px;
}

.required-mark {
    color: var(--red-default);
    margin-left: 2px;
}

.field-renderer.preview .field-wrapper {
    pointer-events: none;
}

.radio-options, .checkbox-options {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.radio-option, .checkbox-option {
    display: flex;
    align-items: center;
    gap: 8px;
}

.guest-repeater {
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: 20px;
    background-color: var(--background-1);
}

.guest-repeater-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: var(--text-tertiary);
    gap: 8px;
    text-align: center;
}

.guest-repeater-placeholder i {
    font-size: 32px;
}

.file-upload {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 20px;
    border: 1px dashed var(--border);
    border-radius: var(--radius-md);
    background-color: var(--background-1);
    color: var(--text-secondary);
    gap: 8px;
    cursor: pointer;
    text-align: center;
}

.rating-stars {
    display: flex;
    gap: 4px;
}

.rating-star {
    color: var(--text-tertiary);
    cursor: pointer;
    transition: color 0.2s;
}

.rating-star.active {
    color: var(--brand-yellow);
}

.rating-star:hover {
    color: var(--brand-yellow);
}

.unknown-field {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    background-color: var(--background-1);
    color: var(--text-secondary);
    gap: 8px;
}
</style>