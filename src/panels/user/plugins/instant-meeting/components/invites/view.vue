<script setup>
import { ref, onMounted } from 'vue';
import { api } from '@utils/api';
import { common } from '@utils/common';

import PopupLayout from '@layouts/popup/view.vue';
import ButtonComponent from '@form/button/view.vue';

import { 
    PhLightning,
    PhCheck,
    PhX,
    PhClock,
    PhArrowSquareOut
} from "@phosphor-icons/vue";

// State
const invites = ref([]);
const isLoading = ref(false);

// Load pending invites
async function loadInvites() {
    try {
        isLoading.value = true;
        
        const response = await api.get('instant-meetings/invites/pending');
        
        if (response.success && response.data) {
            invites.value = response.data.invites || [];
        }
    } catch (error) {
        console.error('Failed to load instant meeting invites:', error);
    } finally {
        isLoading.value = false;
    }
}

// Accept invite
async function acceptInvite(invite) {
    try {
        const response = await api.post(`instant-meetings/invites/${invite.id}/accept`);
        
        if (response.success) {
            common.notification('Meeting invite accepted!', true);
            
            // Remove from list
            invites.value = invites.value.filter(inv => inv.id !== invite.id);
            
            // Open meeting URL if available
            if (response.data?.meeting_url) {
                window.open(response.data.meeting_url, '_blank');
            }
        } else {
            common.notification(response.message || 'Failed to accept invite', false);
        }
    } catch (error) {
        console.error('Failed to accept invite:', error);
        common.notification('Failed to accept invite', false);
    }
}

// Decline invite
async function declineInvite(invite) {
    try {
        const response = await api.post(`instant-meetings/invites/${invite.id}/decline`);
        
        if (response.success) {
            common.notification('Meeting invite declined', true);
            
            // Remove from list
            invites.value = invites.value.filter(inv => inv.id !== invite.id);
        } else {
            common.notification(response.message || 'Failed to decline invite', false);
        }
    } catch (error) {
        console.error('Failed to decline invite:', error);
        common.notification('Failed to decline invite', false);
    }
}

// Join meeting directly
function joinMeeting(invite) {
    if (invite.meeting_url) {
        window.open(invite.meeting_url, '_blank');
    }
}

// Format time
function formatTime(dateString) {
    if (!dateString) return '';
    return new Date(dateString).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
}

// Check if meeting is happening now
function isHappeningNow(invite) {
    const now = new Date();
    const start = new Date(invite.start_time);
    const end = new Date(invite.end_time);
    return now >= start && now <= end;
}

// Check if meeting is in the past
function isPast(invite) {
    const now = new Date();
    const end = new Date(invite.end_time);
    return now > end;
}

onMounted(() => {
    loadInvites();
});
</script>

<template>
    <PopupLayout title="Instant Meeting Invites" customClass="h-auto instant-meeting-invites">
        <template #content>
            <!-- Loading State -->
            <div v-if="isLoading" class="loading-state">
                <p>Loading invites...</p>
            </div>
            
            <!-- Invites List -->
            <div v-else-if="invites.length > 0" class="invites-list">
                <div 
                    v-for="invite in invites" 
                    :key="invite.id"
                    class="invite-card"
                    :class="{ 
                        'is-now': isHappeningNow(invite),
                        'is-past': isPast(invite)
                    }"
                >
                    <div class="invite-icon">
                        <PhLightning weight="bold" />
                    </div>
                    
                    <div class="invite-content">
                        <h4>{{ invite.title }}</h4>
                        <p class="invite-meta">
                            From {{ invite.host.name }}
                        </p>
                        <div class="invite-time">
                            <PhClock :size="14" />
                            <span>{{ formatTime(invite.start_time) }} ({{ invite.duration }} min)</span>
                            <span v-if="isHappeningNow(invite)" class="now-badge">NOW</span>
                        </div>
                    </div>
                    
                    <div class="invite-actions">
                        <!-- Join button if meeting URL exists and happening now -->
                        <ButtonComponent
                            v-if="invite.meeting_url && isHappeningNow(invite)"
                            label="Join"
                            as="primary"
                            size="small"
                            :iconLeft="{ component: PhArrowSquareOut, weight: 'bold' }"
                            @click="joinMeeting(invite)"
                        />
                        
                        <!-- Accept/Decline buttons -->
                        <template v-if="!isPast(invite)">
                            <ButtonComponent
                                v-tooltip="{ content: 'Accept' }"
                                as="tertiary icon"
                                size="small"
                                :iconLeft="{ component: PhCheck, weight: 'bold' }"
                                @click="acceptInvite(invite)"
                            />
                            <ButtonComponent
                                v-tooltip="{ content: 'Decline' }"
                                as="tertiary icon"
                                size="small"
                                :iconLeft="{ component: PhX, weight: 'bold' }"
                                @click="declineInvite(invite)"
                            />
                        </template>
                        
                        <!-- Past meeting - just dismiss -->
                        <span v-else class="past-label">Expired</span>
                    </div>
                </div>
            </div>
            
            <!-- Empty State -->
            <div v-else class="empty-state">
                <PhLightning weight="bold" :size="32" />
                <p>No pending meeting invites</p>
            </div>
        </template>
    </PopupLayout>
</template>

<style scoped>
.instant-meeting-invites :deep(.popup-content) {
    min-width: 380px;
    max-width: 420px;
}

.loading-state,
.empty-state {
    padding: 32px;
    text-align: center;
    color: var(--text-secondary);
}

.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
}

.invites-list {
    display: flex;
    flex-direction: column;
}

.invite-card {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 16px;
    border-bottom: 1px solid var(--border);
    transition: background-color 0.15s ease;
}

.invite-card:last-child {
    border-bottom: none;
}

.invite-card:hover {
    background: var(--background-1);
}



.invite-card.is-past {
    opacity: 0.6;
}

.invite-icon {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    background: #fef3c7;
    color: #d97706;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.invite-card.is-now .invite-icon {
    background: #dcfce7;
    color: #16a34a;
}

.invite-content {
    flex: 1;
    min-width: 0;
}

.invite-content h4 {
    margin: 0 0 4px 0;
    font-size: 14px;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.invite-meta {
    margin: 0 0 6px 0;
    font-size: 13px;
    color: var(--text-secondary);
}

.invite-time {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: var(--text-tertiary);
}

.now-badge {
    background: #16a34a;
    color: white;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 10px;
    font-weight: 600;
}

.invite-actions {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
}

.past-label {
    font-size: 12px;
    color: var(--text-tertiary);
    font-style: italic;
}
</style>
