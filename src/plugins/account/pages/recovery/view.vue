<script setup>
    import { ref } from 'vue';
    import { form } from '@utils/form';
    import { common } from '@utils/common';
    
    import MainLayout from '@account/layouts/main/view.vue';
    import HeaderComponent from '@account/components/header/view.vue';
    import InputComponent from '@form/input/view.vue';
    import ButtonComponent from '@form/button/view.vue';
    import { PhEnvelopeSimple } from "@phosphor-icons/vue";
    
    const submitted = ref(false);
    const submittedEmail = ref('');
    
    function handleSubmit(event, fields, response, success) {
        if (!success) {
            return;
        }
        
        submittedEmail.value = fields.email || '';
        submitted.value = true;
        common.notification('Password reset link sent! Check your email.', true);
    }
</script>

<template>
    <main-layout>
        <template #content>
            <div class="account-c-recovery p-4xl">
                <header-component 
                    :heading="submitted ? 'Check Your Email' : 'Forgot Password'" 
                    :description="submitted ? 'We\'ve sent a password reset link to your email' : 'Please enter your email to reset the password'" 
                />

                <form @submit="event => form.toAPI(event, 'POST', 'account/forgot-password', handleSubmit)" v-if="!submitted">
                    <input-component 
                        name="email" 
                        label="E-mail" 
                        type="email" 
                        placeholder="Provide E-mail Address" 
                        :iconLeft="{ component: PhEnvelopeSimple, weight: 'bold' }" 
                        :required="true"
                    />
                   
                    <div class="p-2xl"></div>

                    <button-component 
                        label="Reset Password" 
                        type="submit"
                    />
                </form>
                
                <div v-else class="text-center" style="text-align: center;">
                    <div class="p-2xl"></div>
                    <p class="text-gray-600">
                        If an account with your email exists, you will receive a password reset link shortly.
                    </p>
                    <div class="p-2xl"></div>
                    <router-link to="/account/login" class="c-button brand">
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
    </main-layout>
</template>

<style scoped>
.account-c-recovery 
{
    max-width: 380px;
    width: 100vw;
}
</style>