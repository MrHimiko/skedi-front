<script setup>
    import { ref, onMounted } from 'vue';
    import { useRouter, useRoute } from 'vue-router';
    import { api } from '@utils/api';
    import { common } from '@utils/common';
    import { storage } from '@utils/storage';
    
    import HeaderComponent from '@account/components/header/view.vue';
    import ButtonComponent from '@form/button/view.vue';
    import { PhCheckCircle, PhXCircle } from "@phosphor-icons/vue";
    
    const router = useRouter();
    const route = useRoute();
    
    const verifying = ref(true);
    const verified = ref(false);
    const error = ref('');
    
    const token = route.query.token;
    
    onMounted(async () => {
        if (!token) {
            error.value = 'Invalid verification link';
            verifying.value = false;
            return;
        }
        
        try {
            const response = await api.post('/api/account/verify-email', {
                token: token
            });
            
            if (response.data.success) {
                verified.value = true;
                common.notification('Email verified successfully!', true);
                
                // Redirect to survey or dashboard after 2 seconds
                setTimeout(() => {
                    if (storage.get('token')) {
                        window.location.href = '/survey';
                    } else {
                        router.push('/account/login');
                    }
                }, 2000);
            } else {
                error.value = response.data.message || 'Verification failed';
            }
        } catch (err) {
            error.value = 'This verification link is invalid or has expired';
        } finally {
            verifying.value = false;
        }
    });
</script>


<template>
    <div class="account-c-verify-email p-4xl">
        <div v-if="verifying" class="text-center">
            <header-component 
                heading="Verifying Email" 
                description="Please wait while we verify your email address..." 
            />
            <div class="p-3xl"></div>
            <div class="spinner"></div>
        </div>
        
        <div v-else-if="verified" class="text-center">
            <div class="success-icon">
                <PhCheckCircle :size="64" color="#10b981" />
            </div>
            <header-component 
                heading="Email Verified!" 
                description="Your email has been successfully verified" 
            />
            <div class="p-2xl"></div>
            <button-component 
                label="Continue to Dashboard" 
                @click="goToDashboard"
            />
        </div>
        
        <div v-else class="text-center">
            <div class="error-icon">
                <PhXCircle :size="64" color="#ef4444" />
            </div>
            <header-component 
                heading="Verification Failed" 
                :description="error" 
            />
            <div class="p-2xl"></div>
            <router-link to="/account/login" class="btn btn-primary">
                Go to Login
            </router-link>
        </div>
    </div>
</template>