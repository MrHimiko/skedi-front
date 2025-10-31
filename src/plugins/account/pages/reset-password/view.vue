<script setup>
    import { ref, onMounted } from 'vue';
    import { useRouter, useRoute } from 'vue-router';
    import { api } from '@utils/api';
    import { common } from '@utils/common';
    
    import HeaderComponent from '@account/components/header/view.vue';
    import InputComponent from '@form/input/view.vue';
    import ButtonComponent from '@form/button/view.vue';
    import { PhLock, PhEye, PhEyeSlash } from "@phosphor-icons/vue";
    
    const router = useRouter();
    const route = useRoute();
    
    const password = ref('');
    const confirmPassword = ref('');
    const loading = ref(false);
    const validatingToken = ref(true);
    const tokenValid = ref(false);
    const showPassword = ref(false);
    const showConfirmPassword = ref(false);
    
    const token = route.query.token;
    
    onMounted(async () => {
        if (!token) {
            common.notification('Invalid reset link', false);
            router.push('/account/login');
            return;
        }
        
        try {
            const response = await api.post('/api/account/validate-reset-token', {
                token: token
            });
            
            if (response.data.data?.valid) {
                tokenValid.value = true;
            } else {
                common.notification('This reset link is invalid or has expired', false);
                router.push('/account/recovery');
            }
        } catch (error) {
            common.notification('Invalid reset link', false);
            router.push('/account/recovery');
        } finally {
            validatingToken.value = false;
        }
    });
    
    async function handleSubmit(event) {
        event.preventDefault();
        
        if (!password.value || !confirmPassword.value) {
            common.notification('Please fill in all fields', false);
            return;
        }
        
        if (password.value.length < 8) {
            common.notification('Password must be at least 8 characters', false);
            return;
        }
        
        if (password.value !== confirmPassword.value) {
            common.notification('Passwords do not match', false);
            return;
        }
        
        loading.value = true;
        
        try {
            const response = await api.post('/api/account/reset-password', {
                token: token,
                password: password.value
            });
            
            if (response.data.success) {
                common.notification('Password reset successfully! Redirecting to login...', true);
                setTimeout(() => {
                    router.push('/account/login');
                }, 2000);
            } else {
                common.notification(response.data.message || 'Failed to reset password', false);
            }
        } catch (error) {
            common.notification('An error occurred. Please try again.', false);
        } finally {
            loading.value = false;
        }
    }
    
    function togglePasswordVisibility(field) {
        if (field === 'password') {
            showPassword.value = !showPassword.value;
        } else {
            showConfirmPassword.value = !showConfirmPassword.value;
        }
    }
</script>

<template>
    <div class="account-c-reset-password p-4xl">
        <header-component 
            heading="Reset Your Password" 
            description="Create a new password for your account" 
        />

        <div v-if="validatingToken" class="text-center p-4xl">
            <div class="spinner"></div>
            <p>Validating reset link...</p>
        </div>

        <form @submit="handleSubmit" v-else-if="tokenValid">
            <input-component 
                name="password" 
                label="New Password" 
                :type="showPassword ? 'text' : 'password'" 
                placeholder="Enter new password" 
                :iconLeft="{ component: PhLock, weight: 'bold' }"
                :iconRight="{ 
                    component: showPassword ? PhEyeSlash : PhEye, 
                    weight: 'bold',
                    onClick: () => togglePasswordVisibility('password')
                }"
                :required="true"
                v-model="password"
                autocomplete="new-password"
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
                    weight: 'bold',
                    onClick: () => togglePasswordVisibility('confirm')
                }"
                :required="true"
                v-model="confirmPassword"
                autocomplete="new-password"
            />
           
            <div class="p-2xl"></div>

            <button-component 
                label="Reset Password" 
                type="submit"
                :loading="loading"
                :disabled="loading"
            />
        </form>

        <div class="p-3xl"></div>

        <div class="flex-center fw-500">
            <div>
                Remember your password? <router-link class="underline" to="/account/login">Sign in</router-link>
            </div>
        </div>
    </div>
</template>


