<script setup>
    import './style.css';

    defineProps({
        label: {
            type: String,
        },
        name: {
            type: String,
        },
        type: {
            type: String,
            default: 'text',
        },
        required: {
            type: Boolean,
        },
        disabled: Boolean,
        value: {
            type: [String, Number],
        },
        placeholder: {
            type: String,
        },
        mask: {
            type: String
        },
        iconLeft: {
            type: [Object, null], 
            default: null,
        },
        iconRight: {
            type: [Object, null],
            default: null,
        },
        display: {
            type: [String, Number],
        },
        as: {
            type: String
        },
        onInput: {
            type: Function
        },
        onChange: {
            type: Function
        },
    });

    defineEmits(['onInput', 'onChange', 'onClickIconRight']);
</script>

<template>
    <div :class="['c-input', as]">
        <div v-if="required || label" class="flex-between">
            <label v-if="label">{{ label }}</label>
            <span class="text-xs text-secondary" v-if="required">Required</span>
        </div>
        <div class="holder">
            <slot name="left"></slot>
            <component label="icon" v-if="iconLeft" :is="iconLeft.component" class="icon left" v-bind="iconLeft" />
            <input 
                v-if="mask"
                autocomplete="off"
                :disabled="disabled"
                :required="required"
                :type="type" 
                :placeholder="placeholder" 
                :value="value" 
                :name="name" 
                v-mask="mask"
                @input="$event => onInput ? onInput($event, $event.target.value) : null"
                @change="$event => onChange ? onChange($event, $event.target.value) : null"
            />
            <input 
                v-if="!mask"
                autocomplete="off"
                :disabled="disabled"
                :required="required"
                :type="type" 
                :placeholder="placeholder" 
                :value="value" 
                :name="name" 
                @input="$event => $emit('onInput', $event, $event.target.value)"
                @change="$event => $emit('onChange', $event, $event.target.value)"
            />
            <div v-if="display" :class="['display', iconLeft ? 'icon' : '']">{{ display }}</div>
            <component v-if="iconRight" :is="iconRight.component" class="icon right" v-bind="iconRight" />
            <slot name="right"></slot>
        </div>
    </div>
</template>
