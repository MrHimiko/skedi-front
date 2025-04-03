<script setup lang="ts">
    import './style.css';
    
    defineProps({
        label: String,
        name: String,
        as: String,
        type: {
            type: String,
            default: 'text',
        },
        required: Boolean,
        value: String,
        placeholder: String,
        iconLeft: {
            type: [Object, null], 
            default: null
        },
        iconRight: {
            type: [Object, null], 
            default: null
        },
    });

    defineEmits(['onInput']);
</script>

<template>
    <div :class="['c-textarea', as]">
        <div v-if="required || label" class="flex-between">
            <label v-if="label">{{ label }}</label>
            <span class="text-xs text-secondary" v-if="required">Required</span>
        </div>
        <div class="holder">
            <i v-if="iconLeft" class="icon left">{{ iconLeft }}</i>
            <textarea 
                autocomplete="off"
                :required="required"
                :type="type" 
                :placeholder="placeholder" 
                :name="name" 
                :value="value" 
                @input="$emit('onInput', $event.target.value)"
            />
            <i v-if="iconRight" class="icon right">{{ iconRight }}</i>
        </div>
    </div>
</template>
