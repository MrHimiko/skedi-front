<script setup>
    import './style.css';
    import { handleSubmit } from './logic'
    import GoogleAccountOAuthHandler from '@account/components/google-auth/oauth-handler.js';

    import { form } from '@utils/form';
    import { PhSignIn, PhPassword, PhEnvelopeSimple } from "@phosphor-icons/vue";
    import HeaderComponent from '@account/components/header/view.vue';
    import InputComponent from '@form/input/view.vue';
    import ButtonComponent from '@form/button/view.vue';

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
    <div class="account-c-login p-4xl">
        <header-component 
            :google="true" 
            heading="Sign in" 
            separator="or sign in with email" 
            @google-auth="handleGoogleAuth"
        />

        <form type="POST" @submit="event => form.toAPI(event, 'POST', 'account/login', handleSubmit)">
            <input-component 
                name="email" 
                label="E-mail" 
                type="email" 
                placeholder="Provide E-mail Address" 
                :iconLeft="{ component: PhEnvelopeSimple, weight: 'bold'  }" 
                :required="true"
            />

            <div class="p-2xl"></div>

            <input-component 
                name="password" 
                label="Password"  
                type="password" 
                placeholder="Enter Password" 
                :required="true"
                :iconLeft="{ component: PhPassword, weight: 'bold'  }"
                @click:iconRight="togglePasswordVisibility" 
            />
            
            <div class="p-xl"></div>

            <button-component :iconLeft="{ component: PhSignIn, weight: 'bold'  }" label="Sign in" type="submit"/>
        </form>

        <div class="p-xl"></div>

        <div class="flex-between fw-500">
            <div>
                <router-link class="underline" to="/account/register">Create an account</router-link>
            </div>

            <div>
                <router-link class="underline" to="/account/recovery"> Forgot password? </router-link>
            </div>

        </div>
    </div>
</template>