<!-- src/components/global/topBar/view.vue -->
<script setup>
import { ref, computed, onMounted } from 'vue';
import { UserStore } from '@stores/user';
import { popup } from '@utils/popup';
import { storage } from '@utils/storage';
import InvitationNotifications from '@user_shared/components/invitationNotifications/view.vue';
import ButtonComponent from '@form/button/view.vue';

import { 
    PhBell, 
    PhX
} from "@phosphor-icons/vue";

const userStore = UserStore();

// State
const isVisible = ref(true);
const isDismissed = ref(false);

// Get invitation count from user store
const invitationCount = computed(() => {
    const userData = userStore.getData();
    console.log('TopBar userData:', userData);
    return userData?.pending_invitations_count || 0;
});

// Check if top bar should be shown
const shouldShowTopBar = computed(() => {
    return isVisible.value && !isDismissed.value && invitationCount.value > 0;
});

// Open invitations popup (same as sidebar)
function openInvitations() {
    popup.open(
        'invitations',
        null,
        InvitationNotifications,
        {},
        {
            position: 'center'
        }
    );
}

// Dismiss the top bar
function dismissTopBar() {
    isDismissed.value = true;
    
    // Save dismissal info to storage
    const dismissalData = {
        dismissedAt: Date.now(),
        lastInviteCount: invitationCount.value,
        expiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000) // 30 days from now
    };
    
    storage.set('topbar_invites_dismissed', dismissalData);
}

// Check if dismissal is still valid
function checkDismissalStatus() {
    const dismissalData = storage.get('topbar_invites_dismissed');
    
    if (!dismissalData) {
        isDismissed.value = false;
        return;
    }
    
    const now = Date.now();
    const { expiresAt, lastInviteCount } = dismissalData;
    
    // Show again if:
    // 1. Dismissal has expired (30 days passed)
    // 2. User has more invites than when they dismissed it
    if (now > expiresAt || invitationCount.value > lastInviteCount) {
        storage.remove('topbar_invites_dismissed');
        isDismissed.value = false;
    } else {
        isDismissed.value = true;
    }
}

onMounted(() => {
    checkDismissalStatus();
});
</script>

<template>
    <div v-if="shouldShowTopBar" class="c-top-bar">
        <div class="invitation-bar">
            <div class="invitation-content">
                <div class="invitation-icon">
                    <PhBell weight="bold" :size="18" />
                </div>
                
                <div class="invitation-message">
                    <span>You have {{ invitationCount }} new invite{{ invitationCount !== 1 ? 's' : '' }}</span>
                </div>
                
                <div class="invitation-actions">
                    <ButtonComponent
                        label="View"
                        size="sm"
                        @click="openInvitations"
                    />
                </div>
            </div>
            
            <button 
                class="close-btn" 
                @click="dismissTopBar"
                v-tooltip="{ content: 'Don\'t show again', options: { placement: 'bottom' } }"
            >
                <PhX weight="bold" :size="16" />
            </button>
        </div>
    </div>
</template>

<style scoped>
.c-top-bar {
    width: 100%;
    position: sticky;
    top: 0;
    z-index: 100;
    border-bottom: 1px solid var(--border-color, #e5e7eb);
}

.invitation-bar {
    background: var(--brand-blue);
    color: white;
    padding: 8px;
    display: flex;
    align-items: center;
    justify-content: space-between;

}

.invitation-content {
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1;
}

.invitation-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    background: rgba(255, 255, 255, 0.15);
    border-radius: 8px;
}

.invitation-message {
    flex: 1;
}

.invitation-message span {
    font-weight: 500;
    font-size: 14px;
}

.invitation-actions {
    margin-left: 16px;
}

.close-btn {
    background: none;
    border: none;
    color: white;
    cursor: pointer;
    padding: 8px;
    border-radius: 6px;
    transition: background 0.2s ease;
    margin-left: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.close-btn:hover {
    background: rgba(255, 255, 255, 0.15);
}

/* Override button component styles for the white variant */
.invitation-actions :deep(.c-button) {
    background: rgba(255, 255, 255, 0.15);
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.3);
    font-weight: 500;
}

.invitation-actions :deep(.c-button:hover) {
    background: rgba(255, 255, 255, 0.25);
    border-color: rgba(255, 255, 255, 0.4);
}
</style>