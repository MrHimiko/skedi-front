<script setup>
    import './style.css';
    import { PhGoogleLogo } from "@phosphor-icons/vue";
    import ButtonComponent from '@form/button/view.vue'

    defineProps({
        heading: {
            type: String,
            required: true,
        },
        description: {
            type: String,
        },
        separator: {
            type: String,
        },
        google: {
            type: Boolean,
        },
    });

    const emit = defineEmits(['google-auth']);

    function handleGoogleClick() {
        emit('google-auth');
    }
</script>

<template>
    <div class="account-c-header">
        <img src="/images/logo.svg">

        <div class="m-4xl"></div>

        <h1 class="text-xl font-bold">{{ heading }}</h1>

        <p v-if="description" class="description">{{ description }}</p>

        <div v-if="description" class="p-xl"></div>
        <div v-if="google" class="p-xl"></div>

        <div v-if="google">
            <button-component 
                as="stroke" 
                :iconLeft="{ component: PhGoogleLogo, weight: 'bold' }" 
                label="Connect with Google" 
                @click="handleGoogleClick"
            />
        </div>

        <div v-if="google" class="p-xl"></div>

        <div v-if="separator" class="separator">
            <div></div>
            <p class="text-xs font-bold">{{ separator }}</p>
        </div>

        <div v-if="separator" class="p-2xl"></div>
    </div>
</template>