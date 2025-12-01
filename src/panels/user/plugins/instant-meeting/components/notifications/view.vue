<!-- Full path: src/panels/user/plugins/instant-meeting/components/notifications/view.vue -->
<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { api } from '@utils/api';
import { common } from '@utils/common';
import { UserStore } from '@stores/user';
import { InstantMeetingService } from '../../services/InstantMeetingService.js';

import PopupLayout from '@layouts/popup/view.vue';
import ButtonComponent from '@form/button/view.vue';

import { 
    PhLightning,
    PhVideoCamera,
    PhClock,
    PhUser,
    PhX,
    PhArrowSquareOut
} from "@phosphor-icons/vue";

const userStore = UserStore();

// State
const meetings = ref([]);
const isLoading = ref(false);
let pollInterval = null;

// Load incoming instant meetings
async function loadMeetings() {
    try {
        isLoading.value = true;
        const data = await InstantMeetingService.getIncoming();
        meetings.value = data || [];
    } catch (error) {
        console.error('Failed to load instant meeting invites:', error);
    } finally {
        isLoading.value = false;
    }
}

// Join a meeting
function joinMeeting(meeting) {
    if (meeting.meeting_url) {
        window.open(meeting.meeting_url, '_blank');
    } else {
        common.notification('No meeting link available', false);
    }
}

// Dismiss a meeting notification
async function dismissMeeting(meeting) {
    try {
        // For now, just remove from local list
        // In future, could mark as dismissed on backend
        meetings.value = meetings.value.filter(m => m.participant_id !== meeting.participant_id);
    } catch (error) {
        console.error('Failed to dismiss meeting:', error);
    }
}

// Format time for display
function formatTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
}

// Get time until meeting ends
function getTimeRemaining(endTime) {
    const now = new Date();
    const end = new Date(endTime);
    const diff = Math.max(0, end - now);
    const minutes = Math.floor(diff / 60000);
    
    if (minutes <= 0) return 'Ending soon';
    if (minutes < 60) return `${minutes} min remaining`;
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m remaining`;
}

onMounted(() => {
    loadMeetings();
    
    // Poll for new meetings every 30 seconds
    pollInterval = setInterval(loadMeetings, 30000);
});

onUnmounted(() => {
    if (pollInterval) {
        clearInterval(pollInterval);
    }
});
</script>

<template>
    <PopupLayout title="Instant Meeting Invites" customClass="h-auto instant-meeting-notifications">
        <template #content>
            <!-- Loading State -->
            <div v-if="isLoading && meetings.length === 0" class="loading-state">
                <p>Loading invites...</p>
            </div>
            
            <!-- Empty State -->
            <div v-else-if="meetings.length === 0" class="empty-state">
                <PhLightning weight="bold" :size="32" class="empty-icon" />
                <p>No instant meeting invites</p>
            </div>
            
            <!-- Meetings List -->
            <div v-else class="meetings-list">
                <div 
                    v-for="meeting in meetings" 
                    :key="meeting.participant_id"
                    class="meeting-card"
                >
                    <div class="meeting-header">
                        <div class="meeting-icon">
                            <PhLightning weight="bold" />
                        </div>
                        <div class="meeting-info">
                            <h4>{{ meeting.title }}</h4>
                            <p class="meeting-host">
                                <PhUser weight="bold" :size="12" />
                                {{ meeting.host.name }}
                            </p>
                        </div>
                        <button class="dismiss-btn" @click="dismissMeeting(meeting)">
                            <PhX weight="bold" :size="16" />
                        </button>
                    </div>
                    
                    <div class="meeting-details">
                        <div class="detail">
                            <PhClock weight="bold" :size="14" />
                            <span>{{ formatTime(meeting.start_time) }} • {{ getTimeRemaining(meeting.end_time) }}</span>
                        </div>
                    </div>
                    
                    <div class="meeting-actions">
                        <ButtonComponent
                            v-if="meeting.meeting_url"
                            label="Join Meeting"
                            :iconLeft="{ component: PhArrowSquareOut, weight: 'bold' }"
                            @click="joinMeeting(meeting)"
                        />
                        <ButtonComponent
                            v-else
                            label="No Link Available"
                            as="secondary"
                            :disabled="true"
                        />
                    </div>
                </div>
            </div>
        </template>
    </PopupLayout>
</template>

<style scoped>
.instant-meeting-notifications {
    width: 100%;
    max-width: 400px;
}

.loading-state,
.empty-state {
    text-align: center;
    padding: 40px 20px;
    color: var(--text-secondary);
}

.empty-icon {
    color: var(--text-tertiary);
    margin-bottom: 12px;
}

.meetings-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.meeting-card {
    background: var(--background-0);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 16px;
}

.meeting-header {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 12px;
}

.meeting-icon {
    width: 40px;
    height: 40px;
    background: var(--yellow-light, #fffbeb);
    color: var(--yellow-dark, #92400e);
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.meeting-info {
    flex: 1;
}

.meeting-info h4 {
    font-size: 15px;
    font-weight: 600;
    margin: 0 0 4px 0;
}

.meeting-host {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 13px;
    color: var(--text-secondary);
    margin: 0;
}

.dismiss-btn {
    background: none;
    border: none;
    color: var(--text-tertiary);
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    transition: all 0.15s ease;
}

.dismiss-btn:hover {
    background: var(--background-1);
    color: var(--text-primary);
}

.meeting-details {
    margin-bottom: 12px;
}

.detail {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: var(--text-secondary);
}

.meeting-actions {
    display: flex;
    gap: 8px;
}

.meeting-actions :deep(.c-button) {
    flex: 1;
}
</style>