<script setup lang="ts">
    import './style.css';

    defineProps({
        label: {
            type: String,
        },
        type: {
            type: String,
        },
        iconLeft: {
            type: [Object, null], 
            default: null
        },
        iconRight: {
            type: [Object, null],
            default: null
        },
        as: {
            type: String,
            default: 'brand',
        },
        loading: {
            type: Boolean,
        },
    });
</script>

<template>
    <button :type="type" :class="['c-button', as, (loading ? 'loading' : '')]">
        <component v-if="iconLeft" :is="iconLeft.component" class="icon-left" />
        <span>{{ label }}</span>
        <component v-if="iconRight" :is="iconRight.component" class="icon-right" />
        <div class="loader">
            <div></div>
        </div>
    </button>
</template>