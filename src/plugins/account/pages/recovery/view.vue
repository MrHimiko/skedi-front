<script setup>
    import { ref } from 'vue';
    import { api } from '@utils/api';
    import { common } from '@utils/common';
    
    import HeaderComponent from '@account/components/header/view.vue';
    import InputComponent from '@form/input/view.vue';
    import ButtonComponent from '@form/button/view.vue';
    import { PhEnvelopeSimple } from "@phosphor-icons/vue";
    
    const email = ref('');
    const loading = ref(false);
    const submitted = ref(false);
    
    async function handleSubmit(event) {
        event.preventDefault();
        
        if (!email.value) {
            common.notification('Please enter your email address', false);
            return;
        }
        
        loading.value = true;
        
        try {
            const response = await api.post('/api/account/forgot-password', {
                email: email.value
            });
            
            if (response.data.success) {
                submitted.value = true;
                common.notification('Password reset link sent! Check your email.', true);
            } else {
                common.notification(response.data.message || 'Failed to send reset email', false);
            }
        } catch (error) {
            common.notification('An error occurred. Please try again.', false);
        } finally {
            loading.value = false;
        }
    }
</script>

<template>
    <div class="account-c-recovery p-4xl">
        <header-component 
            :heading="submitted ? 'Check Your Email' : 'Forgot Password'" 
            :description="submitted ? 'We\'ve sent a password reset link to your email' : 'Please enter your email to reset the password'" 
        />

        <form @submit="handleSubmit" v-if="!submitted">
            <input-component 
                name="email" 
                label="E-mail" 
                type="email" 
                placeholder="Provide E-mail Address" 
                :iconLeft="{ component: PhEnvelopeSimple, weight: 'bold' }" 
                :required="true"
                v-model="email"
            />
           
            <div class="p-2xl"></div>

            <button-component 
                label="Reset Password" 
                type="submit"
                :loading="loading"
                :disabled="loading"
            />
        </form>
        
        <div v-else class="text-center">
            <div class="p-2xl"></div>
            <p class="text-gray-600">
                If an account exists with {{ email }}, you will receive a password reset link shortly.
            </p>
            <div class="p-2xl"></div>
            <router-link to="/account/login" class="btn btn-primary">
                Back to Login
            </router-link>
        </div>

        <div class="p-3xl"></div>

        <div class="flex-center fw-500">
            <div>
                Don't have an account? <router-link class="underline" to="/account/register">Create an account</router-link>
            </div>
        </div>
    </div>
</template>