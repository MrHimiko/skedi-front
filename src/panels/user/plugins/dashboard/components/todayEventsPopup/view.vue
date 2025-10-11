<script setup>
import { ref, computed, onMounted } from 'vue';
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

// Enhanced status calculation (same logic as today-cards)
function getEventStatus(event) {
    if (!event.start_time || !event.end_time) {
        return { status: 'unknown', text: 'Unknown', class: '' };
    }

    const now = new Date();
    const startTime = CalendarService.convertToUserTimezone(event.start_time);
    const endTime = CalendarService.convertToUserTimezone(event.end_time);
    
    // Calculate time differences in minutes
    const startDiffMinutes = Math.floor((startTime - now) / (1000 * 60));
    const endDiffMinutes = Math.floor((endTime - now) / (1000 * 60));
    
    // Current time is during the event
    if (now >= startTime && now <= endTime) {
        return { 
            status: 'live', 
            text: 'Live now', 
            class: 'live',
            isLive: true
        };
    }
    
    // Event is starting soon (within 10 minutes)
    if (startDiffMinutes > 0 && startDiffMinutes <= 10) {
        const minutesText = startDiffMinutes === 1 ? '1 minute' : `${startDiffMinutes} minutes`;
        return { 
            status: 'starting-soon', 
            text: `Starting in ${minutesText}`, 
            class: 'starting-soon',
            isStartingSoon: true
        };
    }
    
    // Event is in the future (more than 10 minutes)
    if (startDiffMinutes > 10) {
        const hours = Math.floor(startDiffMinutes / 60);
        const minutes = startDiffMinutes % 60;
        let timeText = '';
        
        if (hours > 0) {
            timeText = hours === 1 ? '1 hour' : `${hours} hours`;
            if (minutes > 0) {
                timeText += ` ${minutes}m`;
            }
        } else {
            timeText = minutes === 1 ? '1 minute' : `${minutes} minutes`;
        }
        
        return { 
            status: 'upcoming', 
            text: `Starts in ${timeText}`, 
            class: 'upcoming',
            isUpcoming: true
        };
    }
    
    // Event is in the past
    return { 
        status: 'completed', 
        text: 'Completed', 
        class: 'completed',
        isPast: true
    };
}

// Enhanced events with status and time info
const enhancedTodayEvents = computed(() => {
    return todayEvents.value.map(event => {
        const statusInfo = getEventStatus(event);
        
        // Format time range in user's timezone
        let timeRange = '';
        if (event.formattedStart && event.formattedEnd) {
            // Convert to 12-hour format for better readability
            const formatTo12Hour = (time24) => {
                const [hours, minutes] = time24.split(':');
                const hour = parseInt(hours);
                const ampm = hour >= 12 ? 'PM' : 'AM';
                const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
                return `${hour12}:${minutes} ${ampm}`;
            };
            
            timeRange = `${formatTo12Hour(event.formattedStart)} - ${formatTo12Hour(event.formattedEnd)}`;
        } else if (event.start_time && event.end_time) {
            // Fallback using CalendarService
            timeRange = CalendarService.formatTimeRange(event.start_time, event.end_time);
        }
        
        return {
            ...event,
            timeRange,
            statusInfo,
            // Legacy properties for backward compatibility
            isNow: statusInfo.isLive,
            isUpcoming: statusInfo.isUpcoming,
            isPast: statusInfo.isPast,
            startsIn: statusInfo.isUpcoming || statusInfo.isStartingSoon ? statusInfo.text.replace('Starts in ', '') : null
        };
    });
});

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
    if (typeof location === 'string') return location;
    if (Array.isArray(location) && location.length > 0) {
        const loc = location[0];
        if (loc.type === 'google_meet') return 'Google Meet';
        if (loc.type === 'zoom') return 'Zoom';
        if (loc.type === 'link' || loc.type === 'address') return loc.value || '';
        return loc.name || loc.value || '';
    }
    return '';
}

// Format attendees for display
function formatAttendees(attendees) {
    if (!attendees || attendees === 'No attendees') return '';
    if (typeof attendees === 'string') return attendees;
    if (Array.isArray(attendees)) {
        return attendees.length === 1 
            ? attendees[0].name || attendees[0].email || attendees[0]
            : `${attendees.length} attendees`;
    }
    return '';
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

<template>
    <PopupView title="Today's Schedule" customClass="today-events-popup">
        <template #content>
            <div class="today-events-container">
                <div v-if="isLoading" class="loading-state">
                    <div class="loading-spinner"></div>
                    <p>Loading today's events...</p>
                </div>
                
                <div v-else-if="!enhancedTodayEvents || enhancedTodayEvents.length === 0" class="empty-state">
                    <PhCalendarBlank :size="48" />
                    <h3>No events scheduled for today</h3>
                    <p>Your schedule is clear for the rest of the day.</p>
                </div>
                
                <div v-else class="events-list-container">
                    <!-- Event count indicator -->
                    <div class="event-count">
                        <span class="count-badge">{{ enhancedTodayEvents.length }}</span>
                        <span class="count-text">events today</span>
                    </div>
                    
                    <!-- Events List -->
                    <div class="events-list">
                        <div 
                            v-for="(event, index) in enhancedTodayEvents" 
                            :key="`event-${index}`"
                            :class="[
                                'event-card',
                                event.type,
                                event.statusInfo.class,
                                { 
                                    'is-canceled': event.status === 'canceled',
                                    'is-pending': event.status === 'pending'
                                }
                            ]"
                            @click="handleEventClick(event)"
                        >
                            <!-- Status indicator -->
                            <div class="event-status-bar">
                                <span v-if="event.statusInfo.isLive" class="status-badge live">
                                    <span class="pulse"></span>
                                    🔴 {{ event.statusInfo.text }}
                                </span>
                                <span v-else-if="event.statusInfo.isStartingSoon" class="status-badge starting-soon">
                                    🟡 {{ event.statusInfo.text }}
                                </span>
                                <span v-else-if="event.status === 'pending'" class="status-badge pending">
                                    <PhWarning :size="14" />
                                    Pending
                                </span>
                                <span v-else-if="event.statusInfo.isUpcoming" class="status-badge upcoming">
                                    🕒 {{ event.statusInfo.text }}
                                </span>
                                <span v-else-if="event.status === 'canceled'" class="status-badge canceled">
                                    Canceled
                                </span>
                                <span v-else class="status-badge completed">
                                    ✅ {{ event.statusInfo.text }}
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
                                    <p class="event-attendees" v-if="formatAttendees(event.attendees)">
                                        <PhUsers :size="16" />
                                        {{ formatAttendees(event.attendees) }}
                                    </p>
                                    <p class="event-location" v-if="formatLocation(event.location)">
                                        <PhMapPin :size="16" />
                                        {{ formatLocation(event.location) }}
                                    </p>
                                </div>
                            </div>
                            
                            <!-- Action Buttons -->
                            <div class="card-actions">
                                <button 
                                    v-if="event.meeting_link && event.statusInfo.isLive"
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
    font-weight: 600;
    font-size: 12px;
    padding: 4px 8px;
    border-radius: 12px;
}

.count-text {
    font-size: 14px;
    color: var(--text-secondary);
}

/* Events List */
.events-list {
    display: flex;
    flex-direction: column-reverse;
    gap: 12px;
}

/* Event Card */
.event-card {
    background: var(--background-0);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 16px;
    cursor: pointer;
    transition: all 0.2s ease;
    position: relative;
    overflow: hidden;
}

.event-card:hover {
    border-color: var(--brand-blue);
    transform: translateX(4px);
}

/* Enhanced: Live card styling */
.event-card.live {
    border-color: #dc2626;
    background: linear-gradient(135deg, #fee2e2 0%, var(--background-0) 100%);
}

/* Enhanced: Starting soon styling */
.event-card.starting-soon {
    border-color: #ea580c;
    background: linear-gradient(135deg, #fed7aa 0%, var(--background-0) 100%);
}

/* Event Status Bar */
.event-status-bar {
    margin-bottom: 12px;
}

.status-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    font-weight: 600;
    padding: 4px 8px;
    border-radius: 12px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.status-badge.live {
    background: #dc2626;
    color: white;
    animation: pulse 2s infinite;
}

.status-badge.starting-soon {
    background: #ea580c;
    color: white;
    animation: glow 2s ease-in-out infinite alternate;
}

.status-badge.pending {
    background: #f59e0b;
    color: white;
}

.status-badge.upcoming {
    background: var(--background-1);
    color: var(--text-secondary);
    border: 1px solid var(--border);
}

.status-badge.completed {
    background: #16a34a;
    color: white;
}

.status-badge.canceled {
    background: #dc2626;
    color: white;
    opacity: 0.7;
}

.pulse {
    display: inline-block;
    width: 8px;
    height: 8px;
    background: currentColor;
    border-radius: 50%;
    animation: pulse-dot 1.5s infinite;
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

@keyframes pulse-dot {
    0%, 100% {
        transform: scale(1);
        opacity: 1;
    }
    50% {
        transform: scale(1.2);
        opacity: 0.7;
    }
}

@keyframes glow {
    from {
        box-shadow: 0 0 5px rgba(234, 88, 12, 0.5);
    }
    to {
        box-shadow: 0 0 15px rgba(234, 88, 12, 0.8);
    }
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
</style>