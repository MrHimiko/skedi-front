<script setup>
    import { ref } from 'vue';
    import { common } from '@utils/common';
    import { api } from '@utils/api';
    import { PhEnvelopeSimple, PhWarning, PhX } from "@phosphor-icons/vue";
    
    const props = defineProps({
        user: Object
    });
    
    const sending = ref(false);
    const dismissed = ref(false);
    const lastSentTime = ref(null);
    
    async function resendVerification() 
    {
        // Check if we sent recently (prevent spam)
        if (lastSentTime.value) 
        {
            const timeSince = Date.now() - lastSentTime.value;
            if (timeSince < 60000) // 1 minute
            {
                common.notification('Please wait a minute before requesting another email', false);
                return;
            }
        }
        
        sending.value = true;
        
        try 
        {
            const response = await api.post('/api/account/resend-verification');
            
            if (response.data.success) 
            {
                lastSentTime.value = Date.now();
                common.notification('Verification email sent! Check your inbox.', true);
            } 
            else 
            {
                common.notification(response.data.message || 'Failed to send verification email', false);
            }
        } 
        catch (error) 
        {
            common.notification('Failed to send verification email', false);
        } 
        finally 
        {
            sending.value = false;
        }
    }
    
    function dismiss() 
    {
        dismissed.value = true;
        // Store dismissal in sessionStorage so it doesn't show again this session
        sessionStorage.setItem('verify_reminder_dismissed', 'true');
    }
</script>

<template>
    <div v-if="props.user && !props.user.email_verified && !dismissed" class="verify-reminder">
        <div class="reminder-content">
            <PhWarning :size="20" />
            <div class="reminder-text">
                <strong>Verify your email</strong>
                <span>Check your inbox for verification link</span>
            </div>
            <button 
                @click="resendVerification" 
                :disabled="sending"
                class="btn-resend"
            >
                {{ sending ? '...' : 'Resend' }}
            </button>
            <button @click="dismiss" class="btn-dismiss">
                <PhX :size="16" />
            </button>
        </div>
    </div>
</template>

<style scoped>
.verify-reminder {
    background: #fef3c7;
    border-bottom: 1px solid #f59e0b;
    padding: 12px 20px;
    position: sticky;
    top: 0;
    z-index: 100;
}

.reminder-content {
    display: flex;
    align-items: center;
    gap: 12px;
    max-width: 1200px;
    margin: 0 auto;
    color: #92400e;
}

.reminder-text {
    flex: 1;
    display: flex;
    gap: 8px;
    align-items: center;
    flex-wrap: wrap;
}

.reminder-text strong {
    font-weight: 600;
}

.reminder-text span {
    font-size: 14px;
    opacity: 0.9;
}

.btn-resend {
    background: white;
    border: 1px solid #f59e0b;
    color: #92400e;
    padding: 4px 12px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s;
}

.btn-resend:hover:not(:disabled) {
    background: #fef3c7;
}

.btn-resend:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.btn-dismiss {
    background: none;
    border: none;
    color: #92400e;
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    opacity: 0.6;
    transition: opacity 0.2s;
}

.btn-dismiss:hover {
    opacity: 1;
}
</style>