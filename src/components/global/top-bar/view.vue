<!-- 
  Full path: src/components/global/top-bar/view.vue
  
  REPLACE your existing top-bar/view.vue with this file.
  This adds instant meeting invite notifications alongside team invitations.
-->
<script setup>
import { ref, computed, onMounted } from 'vue';
import { UserStore } from '@stores/user';
import { popup } from '@utils/popup';
import { storage } from '@utils/storage';
import { api } from '@utils/api';
import InvitationNotifications from '@user_shared/components/invitationNotifications/view.vue';
import InstantMeetingInvites from '@user_instant-meeting/components/invites/view.vue';
import ButtonComponent from '@form/button/view.vue';

import { 
    PhBell, 
    PhX,
    PhLightning
} from "@phosphor-icons/vue";

const userStore = UserStore();

// State
const isVisible = ref(true);
const isDismissed = ref(false);
const instantMeetingInviteCount = ref(0);

// Get invitation count from user store
const invitationCount = computed(() => {
    const userData = userStore.getData();
    return userData?.pending_invitations_count || 0;
});

// Total notification count
const totalNotificationCount = computed(() => {
    return invitationCount.value + instantMeetingInviteCount.value;
});

// Check if top bar should be shown
const shouldShowTopBar = computed(() => {
    return isVisible.value && !isDismissed.value && totalNotificationCount.value > 0;
});

// Check if should show instant meeting bar (priority over team invites)
const hasInstantMeetingInvites = computed(() => {
    return instantMeetingInviteCount.value > 0;
});

// Load instant meeting invite count
async function loadInstantMeetingInviteCount() {
    try {
        const response = await api.get('instant-meetings/invites/count');
        if (response.success && response.data) {
            instantMeetingInviteCount.value = response.data.count || 0;
        }
    } catch (error) {
        console.error('Failed to load instant meeting invite count:', error);
    }
}

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

// Open instant meeting invites popup
function openInstantMeetingInvites() {
    popup.open(
        'instant-meeting-invites',
        null,
        InstantMeetingInvites,
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
        lastInstantMeetingCount: instantMeetingInviteCount.value,
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
    const { expiresAt, lastInviteCount, lastInstantMeetingCount } = dismissalData;
    
    // Show again if:
    // 1. Dismissal has expired (30 days passed)
    // 2. User has more invites than when they dismissed it
    // 3. User has instant meeting invites (always show these - they're time sensitive)
    if (now > expiresAt || 
        invitationCount.value > (lastInviteCount || 0) ||
        instantMeetingInviteCount.value > 0) {
        storage.remove('topbar_invites_dismissed');
        isDismissed.value = false;
    } else {
        isDismissed.value = true;
    }
}

onMounted(async () => {
    await loadInstantMeetingInviteCount();
    checkDismissalStatus();
    
    // Poll for instant meeting invites every 30 seconds (they're time-sensitive)
    setInterval(loadInstantMeetingInviteCount, 30000);
});
</script>

<template>
    <div v-if="shouldShowTopBar" class="c-top-bar">
        <!-- Instant Meeting Invites (Priority - shown first if any) -->
        <div v-if="hasInstantMeetingInvites" class="invitation-bar instant-meeting-bar">
            <div class="invitation-content">
                <div class="invitation-icon">
                    <PhLightning weight="bold" :size="18" />
                </div>
                
                <div class="invitation-message">
                    <span>⚡ You have {{ instantMeetingInviteCount }} instant meeting invite{{ instantMeetingInviteCount !== 1 ? 's' : '' }}</span>
                </div>
                <div>
                <ButtonComponent
                    label="View"
                    as="primary"
                    size="small"
                    @click="openInstantMeetingInvites"
                /></div>
            </div>
            
            <button class="dismiss-btn" @click="dismissTopBar">
                <PhX weight="bold" :size="16" />
            </button>
        </div>

        <!-- Team/Org Invitations (shown if no instant meeting invites) -->
        <div v-else-if="invitationCount > 0" class="invitation-bar">
            <div class="invitation-content">
                <div class="invitation-icon">
                    <PhBell weight="bold" :size="18" />
                </div>
                
                <div class="invitation-message">
                    <span>You have {{ invitationCount }} new invite{{ invitationCount !== 1 ? 's' : '' }}</span>
                </div>
                
                <ButtonComponent
                    label="View"
                    as="secondary"
                    size="small"
                    @click="openInvitations"
                />
            </div>
            
            <button class="dismiss-btn" @click="dismissTopBar">
                <PhX weight="bold" :size="16" />
            </button>
        </div>
    </div>
</template>

<style scoped>
.c-top-bar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 1000;
    background: var(--background-0);
    border-bottom: 1px solid var(--border);
}

.invitation-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 20px;
    background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
    color: white;
}

.invitation-bar.instant-meeting-bar {
    background:#1400ff;
}

.invitation-content {
    display: flex;
    align-items: center;
    gap: 12px;
    width:100%;
}

.invitation-icon {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;
}

.invitation-message {
    font-size: 14px;
    font-weight: 500;
}

.dismiss-btn {
    background: rgba(255, 255, 255, 0.2);
    border: none;
    border-radius: 6px;
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: white;
    transition: background 0.15s ease;
}

.dismiss-btn:hover {
    background: rgba(255, 255, 255, 0.3);
}


</style>