<script setup>
    import { ref, onMounted } from 'vue';
    import { useRouter, useRoute } from 'vue-router';
    import { api } from '@utils/api';
    import { common } from '@utils/common';
    
    import MainLayout from '@account/layouts/main/view.vue';
    import HeaderComponent from '@account/components/header/view.vue';
    import InputComponent from '@form/input/view.vue';
    import ButtonComponent from '@form/button/view.vue';
    import { PhLock, PhEye, PhEyeSlash, PhCheckCircle } from "@phosphor-icons/vue";
    
    const router = useRouter();
    const route = useRoute();
    
    const validatingToken = ref(true);
    const tokenValid = ref(false);
    const showPassword = ref(false);
    const showConfirmPassword = ref(false);
    const loading = ref(false);
    const resetSuccess = ref(false);
    
    const token = route.query.token;
    
    onMounted(async () => {
        if (!token) {
            common.notification('Invalid reset link', false);
            router.push('/account/login');
            return;
        }
        
        try {
            const response = await api.post('account/validate-reset-token', {
                token: token
            });
            
            validatingToken.value = false;
            
            if (response.data && response.data.valid === true) {
                tokenValid.value = true;
            } else {
                tokenValid.value = false;
                common.notification('This reset link is invalid or has expired', false);
                setTimeout(() => {
                    router.push('/account/recovery');
                }, 2000);
            }
        } catch (error) {
            validatingToken.value = false;
            tokenValid.value = false;
            common.notification('Invalid reset link', false);
            setTimeout(() => {
                router.push('/account/recovery');
            }, 2000);
        }
    });
    
    function togglePasswordVisibility(field) {
        if (field === 'password') {
            showPassword.value = !showPassword.value;
        } else {
            showConfirmPassword.value = !showConfirmPassword.value;
        }
    }
    
    async function handleFormSubmit(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const password = formData.get('password');
        const confirmPassword = formData.get('confirmPassword');
        
        if (!password || !confirmPassword) {
            common.notification('Please fill in all fields', false);
            return;
        }
        
        if (password.length < 8) {
            common.notification('Password must be at least 8 characters', false);
            return;
        }
        
        if (password !== confirmPassword) {
            common.notification('Passwords do not match', false);
            return;
        }
        
        loading.value = true;
        
        try {
            const response = await fetch('/api/account/reset-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    token: token,
                    password: password
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                resetSuccess.value = true;
                loading.value = false;
                
                setTimeout(() => {
                    router.push('/account/login');
                }, 3000);
            } else {
                common.notification(data.message || 'Failed to reset password', false);
                loading.value = false;
            }
        } catch (error) {
            common.notification('An error occurred. Please try again.', false);
            loading.value = false;
        }
    }
</script>

<template>
    <main-layout>
        <template #content>
            <div class="account-c-reset-password p-4xl">
                <div v-if="validatingToken" class="text-center p-4xl">
                    <div class="spinner"></div>
                    <p>Validating reset link...</p>
                </div>

                <div v-else-if="resetSuccess" class="text-center">

                    <header-component 
                        heading="Password Reset Successfully!" 
                        description="Your password has been changed. Redirecting you to login..." 
                    />
                </div>

                <div v-else-if="tokenValid">
                    <header-component 
                        heading="Reset Your Password" 
                        description="Create a new password for your account" 
                    />

                    <form @submit="handleFormSubmit">
                        <input-component 
                            name="password" 
                            label="New Password" 
                            :type="showPassword ? 'text' : 'password'" 
                            placeholder="Enter new password (min 8 characters)" 
                            :iconLeft="{ component: PhLock, weight: 'bold' }"
                            :iconRight="{ 
                                component: showPassword ? PhEyeSlash : PhEye, 
                                weight: 'bold'
                            }"
                            :required="true"
                            autocomplete="new-password"
                            @click:iconRight="() => togglePasswordVisibility('password')"
                        />
                        
                        <div class="p-xl"></div>
                        
                        <input-component 
                            name="confirmPassword" 
                            label="Confirm New Password" 
                            :type="showConfirmPassword ? 'text' : 'password'" 
                            placeholder="Confirm new password" 
                            :iconLeft="{ component: PhLock, weight: 'bold' }"
                            :iconRight="{ 
                                component: showConfirmPassword ? PhEyeSlash : PhEye, 
                                weight: 'bold'
                            }"
                            :required="true"
                            autocomplete="new-password"
                            @click:iconRight="() => togglePasswordVisibility('confirm')"
                        />
                       
                        <div class="p-2xl"></div>

                        <button-component 
                            label="Reset Password" 
                            type="submit"
                            :loading="loading"
                        />
                    </form>

                    <div class="p-3xl"></div>

                    <div class="flex-center fw-500">
                        <div>
                            Remember your password? <router-link class="underline" to="/account/login">Sign in</router-link>
                        </div>
                    </div>
                </div>

                <div v-else class="text-center p-4xl">
                    <p>Redirecting...</p>
                </div>
            </div>
        </template>
    </main-layout>
</template>

<style scoped>
.account-c-reset-password 
{
    max-width: 380px;
    width: 100vw;
}

.spinner 
{
    border: 3px solid #f3f3f3;
    border-top: 3px solid #667eea;
    border-radius: 50%;
    width: 40px;
    height: 40px;
    animation: spin 1s linear infinite;
    margin: 0 auto;
}

.success-icon 
{
    margin-bottom: 20px;
}

@keyframes spin 
{
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}
</style>