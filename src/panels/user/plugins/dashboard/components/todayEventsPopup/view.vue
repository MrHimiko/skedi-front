<template>
    <PopupView title="Today's Schedule" customClass="today-events-popup">
        <template #content>
            <div class="today-events-container">
                <div v-if="isLoading" class="loading-state">
                    <div class="loading-spinner"></div>
                    <p>Loading today's events...</p>
                </div>
                
                <div v-else-if="!todayEvents || todayEvents.length === 0" class="empty-state">
                    <PhCalendarBlank :size="48" />
                    <h3>No events scheduled for today</h3>
                    <p>Your schedule is clear for the rest of the day.</p>
                </div>
                
                <div v-else class="events-list-container">
                    
                    <!-- Event count indicator -->
                    <div class="event-count">
                        <span class="count-badge">{{ todayEvents.length }}</span>
                        <span class="count-text">events today</span>
                    </div>
                    
                    <!-- Events List -->
                    <div class="events-list">
                        <div 
                            v-for="(event, index) in todayEvents" 
                            :key="`event-${index}`"
                            :class="[
                                'event-card',
                                event.type,
                                { 
                                    'is-now': event.isNow,
                                    'is-canceled': event.status === 'canceled',
                                    'is-pending': event.status === 'pending',
                                    'is-upcoming': event.isUpcoming
                                }
                            ]"
                            @click="handleEventClick(event)"
                        >
                            <!-- Status indicator -->
                            <div class="event-status-bar">
                                <span v-if="event.isNow" class="status-badge live">
                                    <span class="pulse"></span>
                                    Live Now
                                </span>
                                <span v-else-if="event.status === 'pending'" class="status-badge pending">
                                    <PhWarning :size="14" />
                                    Pending
                                </span>
                                <span v-else-if="event.isUpcoming" class="status-badge upcoming">
                                    Starts in {{ event.startsIn }}
                                </span>
                                <span v-else-if="event.status === 'canceled'" class="status-badge canceled">
                                    Canceled
                                </span>
                                <span v-else class="status-badge past">
                                    Completed
                                </span>
                            </div>
                            

                            <!-- Event Content -->
                            <div class="card-content">
                                <h3 class="event-title">{{ event.title }}</h3>
                                <div class="event-time">
                                    <PhClock :size="16" />
                                    {{ event.timeRange }}
                                </div>
                                
                                <div class="event-details">
                                    <p class="event-attendees" v-if="event.attendees && event.attendees !== 'No attendees'">
                                        <PhUsers :size="16" />
                                        {{ event.attendees }}
                                    </p>
                                    <p class="event-location" v-if="event.location">
                                        <PhMapPin :size="16" />
                                        {{ formatLocation(event.location) }}
                                    </p>
                                </div>
                            </div>
                            
                            <!-- Action Buttons -->
                            <div class="card-actions">
                                <button 
                                    v-if="event.meeting_link && event.isNow"
                                    class="action-btn primary"
                                    @click.stop="openMeeting(event.meeting_link)"
                                >
                                    <PhVideoCamera :size="16" />
                                    Join Meeting
                                </button>
                                
                                <button 
                                    class="action-btn secondary"
                                    @click.stop="handleEventClick(event)"
                                >
                                    <PhInfo :size="16" />
                                    View Details
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </template>
    </PopupView>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { CalendarService } from '@user_dashboard/services/calendar';
import { common } from '@utils/common';
import PopupView from '@layouts/popup/view.vue';

import { 
    PhCalendarBlank, 
    PhClock, 
    PhUsers, 
    PhMapPin, 
    PhVideoCamera,
    PhInfo,
    PhWarning
} from "@phosphor-icons/vue";

// Props
const props = defineProps({
    onEventClick: Function
});

// State
const todayEvents = ref([]);
const isLoading = ref(true);

// Get source icon based on calendar provider
function getSourceIcon(source) {
    const icons = {
        'google_calendar': 'https://global.divhunt.com/3858bb278694ec6c098fef9b26e059ab_2357.svg',
        'outlook': 'https://global.divhunt.com/41d16cde92f23c0849a7ddfd2065aa2e_3202.svg',
        'apple_calendar': '/icons/apple-calendar.svg'
    };
    return icons[source] || null;
}

// Format location for display
function formatLocation(location) {
    if (!location) return '';
    if (typeof location === 'object') {
        return location.name || location.address || location.value || 'Location';
    }
    return location;
}

// Handle event click
function handleEventClick(event) {
    if (props.onEventClick) {
        props.onEventClick(event);
    }
}

// Open meeting link
function openMeeting(url) {
    if (url) {
        window.open(url, '_blank');
    }
}

// Load today's events
async function loadTodayEvents() {
    try {
        isLoading.value = true;
        
        // Get today's events using CalendarService
        const events = await CalendarService.getTodayEvents();
        
        // Sort events by start time - show all events for today
        todayEvents.value = events.sort((a, b) => {
            return new Date(a.start_time) - new Date(b.start_time);
        });
        
    } catch (error) {
        console.error('Error loading today events:', error);
        common.notification('Failed to load today\'s events', false);
        todayEvents.value = [];
    } finally {
        isLoading.value = false;
    }
}

// Initialize on mount
onMounted(() => {
    loadTodayEvents();
});
</script>

<style scoped>
.today-events-popup {
    max-width: 900px;
    width: 90vw;
}

.today-events-container {
    padding: 20px;
    min-height: 300px;
    max-height: 70vh;
    overflow-y: auto;
}

/* Loading State */
.loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 300px;
    gap: 16px;
}

.loading-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid var(--border);
    border-top: 3px solid var(--brand-blue);
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

/* Empty State */
.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 300px;
    text-align: center;
    color: var(--text-secondary);
}

.empty-state h3 {
    margin: 16px 0 8px;
    font-size: 18px;
    font-weight: 600;
    color: var(--text-primary);
}

.empty-state p {
    margin: 0;
    font-size: 14px;
}

/* Event Count */
.event-count {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 20px;
}

.count-badge {
    background: var(--brand-blue);
    color: white;
    padding: 4px 12px;
    border-radius: 20px;
    font-weight: 600;
    font-size: 14px;
}

.count-text {
    color: var(--text-secondary);
    font-size: 14px;
}

/* Events List */
.events-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

/* Event Card */
.event-card {
    background: var(--background-0);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 16px;
    position: relative;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    flex-direction: column;
}

.event-card:hover {
    border-color: var(--brand-blue);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

/* Pending status special styling */


/* Status Bar */
.event-status-bar {
    position: absolute;
    top: 16px;
    right: 16px;
}

.event-card:has(.past) {
        opacity: 0.6;
}

.status-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
        position: absolute;
    right: 0px;
    top:0px;
}

.status-badge.live {
    background: #fee2e2;
    color: #dc2626;
}

.status-badge.upcoming {
    background: #dbeafe;
    color: #2563eb;
}

.status-badge.pending {
    background: #fed7aa;
    color: #ea580c;
}

.status-badge.canceled {
    background: var(--red-default);
    color: white;
}

.status-badge.past {
    background: #f3f4f6;
    color: #6b7280;

}

/* Pulse animation for live events */
.pulse {
    display: inline-block;
    width: 8px;
    height: 8px;
    background: #dc2626;
    border-radius: 50%;
    animation: pulse 2s infinite;
}

@keyframes pulse {
    0% {
        box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.7);
    }
    70% {
        box-shadow: 0 0 0 10px rgba(220, 38, 38, 0);
    }
    100% {
        box-shadow: 0 0 0 0 rgba(220, 38, 38, 0);
    }
}

/* Source Icon */
.source-icon {
    position: absolute;
    top: 16px;
    left: 16px;
    width: 24px;
    height: 24px;
}

.source-icon img {
    width: 100%;
    height: 100%;
    object-fit: contain;
}

/* Card Content */
.card-content {
    flex: 1;
}

.event-title {
    font-size: 16px;
    font-weight: 600;
    margin: 0 0 8px;
    color: var(--text-primary);
}

.event-time {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 14px;
    font-weight: 500;
    color: var(--brand-blue);
    margin-bottom: 12px;
}

.event-details {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.event-attendees,
.event-location {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: var(--text-secondary);
    margin: 0;
}

/* Card Actions */
.card-actions {
    display: flex;
    gap: 8px;
    margin-top: 16px;
}

.action-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    border: none;
}

.action-btn.primary {
    background: var(--brand-blue);
    color: white;
}

.action-btn.primary:hover {
    background: var(--brand-blue-dark);
}

.action-btn.secondary {
    background: var(--background-1);
    color: var(--text-primary);
    border: 1px solid var(--border);
}

.action-btn.secondary:hover {
    background: var(--background-2);
}

/* Canceled state */
.event-card.is-canceled {
    opacity: 0.6;
}

.event-card.is-canceled .event-title {
    text-decoration: line-through;
}

/* Responsive */
@media (max-width: 768px) {
    .today-events-popup {
        width: 95vw;
    }
    
    .event-card {
        padding: 12px;
    }
    
    .event-title {
        font-size: 15px;
    }
}

@media (max-width: 480px) {
    .today-events-container {
        padding: 12px;
    }
    
    .event-card {
        padding: 10px;
    }
    
    .card-actions {
        flex-direction: column;
    }
    
    .action-btn {
        width: 100%;
    }
}

@media (max-width: 480px) {
    .today-events-container {
        padding: 12px;
    }
    
    .event-card {
        padding: 10px;
    }
    
    .card-actions {
        flex-direction: column;
    }
    
    .action-btn {
        width: 100%;
    }
}
</style>