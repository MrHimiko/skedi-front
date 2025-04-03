<script setup>
    import './style.css';

    import HeaderComponent from '@account/components/header/view.vue';
    import InputComponent from '@form/input/view.vue';
    import ButtonComponent from '@form/button/view.vue';
    import { PhEnvelopeSimple } from "@phosphor-icons/vue";
</script>

<template>
    <div class="account-c-recovery p-4xl">
        <header-component heading="Forgot Password" description="Please enter your email to reset the password" />

        <form>
            <input-component 
                name="email" 
                label="E-mail" 
                type="email" 
                placeholder="Provide E-mail Address" 
                :iconLeft="{ component: PhEnvelopeSimple, weight: 'bold'  }" 
                :required="true"
            />
           
            <div class="p-2xl"></div>

            <button-component label="Reset Password" type="submit"/>
        </form>

        <div class="p-3xl"></div>

        <div class="flex-center fw-500">
            <div>
                Don't have  an account? <router-link class="underline" to="/account/register">Create an account</router-link>
            </div>
        </div>
    </div>
</template>
