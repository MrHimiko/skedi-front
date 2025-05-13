<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { UserStore } from '@stores/user';
import ButtonComponent from '@form/button/view.vue';
import { common } from '@utils/common';
import { PhCalendar, PhClock, PhLink, PhVideo } from "@phosphor-icons/vue";
import { storage } from '@utils/storage';

const props = defineProps({
    events: {
        type: Array,
        required: true
    },
    isLoading: {
        type: Boolean,
        default: false
    }
});

// Copy event link to clipboard
async function copyEventLink(event) {
    if (event.html_link) {
        try {
            await navigator.clipboard.writeText(event.html_link);
            common.notification('Event link copied to clipboard', true);
        } catch (err) {
            common.notification('Failed to copy link', false);
        }
    } else {
        common.notification('No event link available', false);
    }
}

// Open event in original calendar
function openEventLink(event) {
    if (event.html_link) {
        window.open(event.html_link, '_blank');
    } else {
        common.notification('No event link available', false);
    }
}

// Get source icon component
function getSourceIcon(source) {
    // Could be extended with dynamic icon components based on source
    return PhCalendar;
}

// Format last synced time
function formatSyncTime(syncTime) {
    if (!syncTime) return 'Never';
    
    const syncDate = new Date(syncTime);
    const now = new Date();
    const diffMinutes = Math.floor((now - syncDate) / (1000 * 60));
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} hours ago`;
    
    return syncDate.toLocaleDateString();
}
</script>

<template>
    <div class="external-events">
        <div v-if="isLoading" class="loading-state">
            <p>Loading external events...</p>
        </div>
        
        <div v-else-if="events.length === 0" class="empty-state">
            <p>No external events found for this period</p>
        </div>
        
        <div v-else class="events-container">
            <div 
                v-for="(item, index) in events" 
                :key="index"
                :class="['event-item', item.type, item.status]"
            >
                <!-- Date Header -->
                <div v-if="item.type === 'header'" class="date-header">
                    {{ item.formattedDate }}
                </div>
                
                <!-- External Event Item -->
                <div v-else class="event-card">
                    <!-- Time indicator and color bar -->
                    <div class="time-indicator">
                        <div class="clr-box" :style="{ backgroundColor: item.color || '#4285F4' }"> </div>
                        {{ item.formattedStart || '--:--' }} - {{ item.formattedEnd || '--:--' }}
                    </div>
                    
                    <!-- Event details -->
                    <div class="event-details">
                        <div class="event-title">
                            {{ item.title }}
                            
                            <!-- Status badge -->
                            <span v-if="item.status !== 'confirmed'" class="status-badge">
                                {{ item.status }}
                            </span>
                        </div>
                        
                        <!-- Calendar source -->
                        <div class="event-source">
                            <span class="source-label">
                                <component :is="getSourceIcon(item.source)" weight="bold" size="14" />
                                {{ item.calendar_name || 'Calendar' }}
                            </span>
                            <span class="sync-time" :title="'Last synced: ' + item.synced_at">
                                Synced {{ formatSyncTime(item.synced_at) }}
                            </span>
                        </div>
                    </div>
                    
                    <!-- Actions -->
                    <div class="event-actions">
                        <ButtonComponent 
                            as="tertiary icon"
                            :iconLeft="{ component: PhLink, weight: 'bold' }"
                            title="Copy Event Link"
                            @click="copyEventLink(item)"
                        />
                        
                        <ButtonComponent 
                            as="tertiary icon"
                            :iconLeft="{ component: PhVideo, weight: 'bold' }"
                            title="Open in Calendar"
                            @click="openEventLink(item)"
                        />
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.external-events {
    margin-bottom: 30px;
}

.events-container {
    border: 1px solid var(--border);
    border-radius: 6px;
    overflow: hidden;
}

.loading-state,
.empty-state {
    padding: 20px;
    text-align: center;
    color: var(--text-secondary);
    background: var(--background-1);
    border-radius: 6px;
}

.date-header {
    font-weight: 500;
    background-color: var(--background-1);
    padding: 10px 20px;
    border-bottom: 1px solid var(--border);
}

.event-card {
    display: flex;
    align-items: center;
    padding: 16px 20px;
    background-color: var(--background-0);
    border-bottom: 1px solid var(--border);
    transition: background-color 0.2s ease;
}

.event-card:hover {
    background-color: var(--background-1);
}

.event-item:last-of-type .event-card {
    border-bottom: none;
}

.time-indicator {
    font-size: 13px;
    font-weight: 400;
    min-width: 120px;
    display: flex;
    align-items: center;
    gap: 15px;
}

.time-indicator .clr-box {
    width: 24px;
    height: 10px;
    border-radius: 100px;
}

.event-details {
    flex: 1;
    margin-left: 20px;
}

.event-title {
    font-weight: 500;
    margin-bottom: 5px;
    font-size: 15px;
    display: flex;
    align-items: center;
    gap: 10px;
}

.status-badge {
    font-size: 12px;
    font-weight: 500;
    padding: 2px 8px;
    border-radius: 10px;
    background-color: var(--background-1);
    color: var(--text-secondary);
    text-transform: capitalize;
}

.event-source {
    color: var(--text-secondary);
    font-size: 13px;
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.source-label {
    display: flex;
    align-items: center;
    gap: 5px;
}

.sync-time {
    font-size: 11px;
    color: var(--text-tertiary);
}

.event-actions {
    display: flex;
    align-items: center;
    gap: 8px;
}
</style>