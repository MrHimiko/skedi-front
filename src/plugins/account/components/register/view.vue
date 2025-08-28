<script setup>
    import './style.css';

    import { togglePasswordVisibility, handleSubmit } from './logic';
    import { form } from '@utils/form';
    import GoogleAccountOAuthHandler from '@account/components/google-auth/oauth-handler.js';

    import HeaderComponent from '@account/components/header/view.vue';
    import InputComponent from '@form/input/view.vue';
    import ButtonComponent from '@form/button/view.vue';
    import { PhSignIn, PhPassword, PhEye, PhEnvelopeSimple, PhUser } from "@phosphor-icons/vue";

    // Handle Google authentication
    async function handleGoogleAuth() {
        try {
            const oauthHandler = new GoogleAccountOAuthHandler();
            await oauthHandler.startOAuthFlow();
        } catch (error) {
            console.error('Google auth failed:', error);
            // You can add error notification here if needed
        }
    }
</script>

<template>
    <div class="account-c-register p-4xl">
        <header-component 
            :google="true" 
            heading="Sign up" 
            separator="or sign up with email" 
            @google-auth="handleGoogleAuth"
        />

        <form @submit="event => form.toAPI(event, 'POST', 'account/register', handleSubmit)">
            <input-component 
                name="name" 
                label="Full Name" 
                type="text" 
                placeholder="Enter your full name" 
                :iconLeft="{ component: PhUser, weight: 'bold' }" 
                :required="true"
            />

            <div class="p-2xl"></div>

            <input-component 
                name="email" 
                label="E-mail" 
                type="email" 
                placeholder="Provide E-mail Address" 
                :iconLeft="{ component: PhEnvelopeSimple, weight: 'bold' }" 
                :required="true"
            />

            <div class="p-2xl"></div>

            <input-component 
                name="password" 
                label="Password"  
                type="password" 
                placeholder="Enter Password" 
                :iconLeft="{ component: PhPassword, weight: 'bold' }"
                :iconRight="{ component: PhEye, weight: 'bold' }"
                :required="true"
                @click:iconRight="togglePasswordVisibility" 
            />
            
            <div class="p-2xl"></div>

            <button-component :iconLeft="{ component: PhSignIn, weight: 'bold' }" label="Create an account" type="submit"/>
        </form>

        <div class="p-3xl"></div>

        <div class="flex-center fw-500">
            <div>
                Have an account? <router-link class="underline" to="/account/login">Sign in</router-link>
            </div>
        </div>
    </div>
</template>