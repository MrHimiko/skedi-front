<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { CalendarService } from '@user_dashboard/services/calendar';
import { popup } from '@utils/popup';
import { PhCalendar } from "@phosphor-icons/vue";
import ExternalEventPopup from '@user_dashboard/components/externalEventPopup/view.vue';
import BookingDetailView from '@user_bookings/components/detail/view.vue';
import TodayEventsPopup from '@user_dashboard/components/todayEventsPopup/view.vue';

// Reactive data
const todayEvents = ref([]);
const isLoading = ref(true);
const currentSlide = ref(0);
const slidesPerView = ref(3);

// Computed properties for slider
const maxSlide = computed(() => {
    return Math.max(0, Math.ceil(todayEvents.value.length / slidesPerView.value) - 1);
});

const totalDots = computed(() => {
    return Math.ceil(todayEvents.value.length / slidesPerView.value);
});

const trackStyle = computed(() => ({
    transform: `translateX(-${currentSlide.value * (100 / slidesPerView.value)}%)`
}));

// Enhanced status calculation with buffer times
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
        const userTimezone = CalendarService.getUserTimezone();
        
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

// Slider functions
function slideNext() {
    if (currentSlide.value < maxSlide.value) {
        currentSlide.value++;
    }
}

function slidePrev() {
    if (currentSlide.value > 0) {
        currentSlide.value--;
    }
}

function goToSlide(index) {
    if (index >= 0 && index <= maxSlide.value) {
        currentSlide.value = index;
    }
}

// Handle card click - opens event details directly
function handleCardClick(event) {
    if (event.type === 'external') {
        // Show external event popup
        popup.open(
            'external-event-detail',
            null,
            ExternalEventPopup,
            { event },
            {
                position: 'center'
            }
        );
    } else {
        // Show internal booking details
        if (event.raw) {
            popup.open(
                'booking-detail',
                null,
                BookingDetailView,
                {
                    bookingId: event.raw.id || event.id,
                    bookingData: event.raw,
                    callback: (needsRefresh) => {
                        if (needsRefresh) {
                            // Refresh today's events if booking was modified
                            loadTodayEvents();
                        }
                    }
                },
                {
                    position: 'center'
                }
            );
        }
    }
}

// Open today events popup when clicking on count
function openTodayEventsPopup() {
    popup.open(
        'today-events',
        null,
        TodayEventsPopup,
        {
            onEventClick: handleCardClick
        },
        {
            position: 'center'
        }
    );
}

// Load today's events from API
async function loadTodayEvents() {
    try {
        isLoading.value = true;
        
        // Get today's events using CalendarService
        const events = await CalendarService.getTodayEvents();
        
        // Sort events by start time and show all today's events
        todayEvents.value = events
            .sort((a, b) => {
                return new Date(a.start_time) - new Date(b.start_time);
            })
            .slice(0, 10); // Limit to 10 events for the cards display
        
        // Reset slider position
        currentSlide.value = 0;
        
        // Update slides per view based on screen size
        updateSlidesPerView();
        
    } catch (error) {
        console.error('Error loading today events:', error);
        todayEvents.value = [];
    } finally {
        isLoading.value = false;
    }
}

// Update slides per view based on screen width
function updateSlidesPerView() {
    const width = window.innerWidth;
    if (width < 768) {
        slidesPerView.value = 1;
    } else if (width < 1024) {
        slidesPerView.value = 2;
    } else {
        slidesPerView.value = 3;
    }
}

// Helper functions for display
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

function getSourceIcon(source) {
    const icons = {
        'google_calendar': '/assets/icons/google-calendar.svg',
        'outlook': '/assets/icons/outlook.svg',
        'apple_calendar': '/assets/icons/apple-calendar.svg',
        'internal': '/assets/icons/internal-booking.svg'
    };
    return icons[source] || '/assets/icons/default-calendar.svg';
}


onMounted(() => {
    loadTodayEvents();
    window.addEventListener('resize', updateSlidesPerView);
});

onUnmounted(() => { 
    window.removeEventListener('resize', updateSlidesPerView);
});
</script>

<template>
    <div v-if="enhancedTodayEvents.length > 0 || isLoading">
            
        <div class="schedule-header">
            <h4>Today's schedule</h4>
            <span 
                v-if="!isLoading" 
                :class="['event-count-badge', { 'clickable': enhancedTodayEvents.length > 0 }]"
                @click="enhancedTodayEvents.length > 0 ? openTodayEventsPopup() : null"
                :title="enhancedTodayEvents.length > 0 ? 'View all today\'s events' : ''"
            >
                ({{ enhancedTodayEvents.length }})
            </span>
        </div>
            
    </div>

</template>

<style scoped>
.schedule-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 0;
}

.schedule-header h4 {
    margin-bottom: 0;
    display: inline-block;
}

.event-count-badge {
    color: var(--brand-blue);
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    padding: 2px 6px;
    border-radius: 4px;
}

.event-count-badge {
    cursor: default;
    opacity: 0.6;
}

.event-count-badge.clickable {
    cursor: pointer;
    opacity: 1;
}

.event-count-badge:hover {
    background: var(--background-1);
    transform: scale(1.05);
}

.today-cards {
    margin-top: 14px!important;
    margin-bottom: 24px;
}

/* Grid layout for 3 or fewer cards */
.cards-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: 16px;
}

/* Slider container for more than 3 cards */
.cards-slider-container {
    position: relative;
    overflow: hidden;
    padding: 0 50px; /* Space for arrows */
}

.cards-slider {
    overflow: hidden;
}

.cards-track {
    display: flex;
    gap: 16px;
}

.card-slide {
    flex: 0 0 calc(33.333% - 11px);
    min-width: 0;
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
    height: 100%;
    min-height: 180px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
}

.event-card:hover {
    border-color: var(--brand-blue);
    transform: translateY(-2px);
}

/* ENHANCED: Live indicator with pulsing animation */
.event-card.live {
    border-color: #dc2626;
    background: linear-gradient(135deg, #fee2e2 0%, var(--background-0) 100%);
}

/* ENHANCED: Starting soon indicator */
.event-card.starting-soon {
    border-color: #ea580c;
    background: linear-gradient(135deg, #fed7aa 0%, var(--background-0) 100%);
}

/* Pending state */
.event-card.is-pending {
    border-color: #ea580c;
    background: linear-gradient(135deg, #fed7aa 0%, var(--background-0) 100%);
}

.pending-indicator {
    position: absolute;
    top: 12px;
    right: 12px;
    font-size: 20px;
}

/* Canceled state */
.event-card.is-canceled {
    opacity: 0.6;
}

.event-card.is-canceled .event-title {
    text-decoration: line-through;
}

/* Source Icon */
.source-icon {
    position: absolute;
    top: 16px;
    right: 16px;
    width: 20px;
    height: 20px;
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

.event-header {
    margin-bottom: 12px;
}

.event-title {
    font-size: 15px;
    font-weight: 600;
    margin: 0 0 6px;
    color: var(--text-primary);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

.event-time {
    font-size: 13px;
    font-weight: 500;
    color: var(--brand-blue);
    display: block;
}

.event-details {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.event-attendees,
.event-location {
    font-size: 12px;
    color: var(--text-secondary);
    margin: 0;
    display: -webkit-box;
    -webkit-line-clamp: 1;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

/* ENHANCED: Better status badges */
.card-actions {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid var(--border);
}

.status-badge {
    display: inline-block;
    padding: 6px 12px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 600;
    text-align: center;
    width: 100%;
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

.status-badge.upcoming {
    background: var(--background-1);
    color: var(--text-secondary);
    border: 1px solid var(--border);
}

.status-badge.completed {
    background: #16a34a;
    color: white;
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

@keyframes glow {
    from {
        box-shadow: 0 0 5px rgba(234, 88, 12, 0.5);
    }
    to {
        box-shadow: 0 0 15px rgba(234, 88, 12, 0.8);
    }
}

/* Slider Navigation */
.slider-arrow {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    background: white;
    border: 1px solid var(--border);
    border-radius: 50%;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 24px;
    color: var(--text-primary);
    z-index: 2;
    transition: all 0.2s ease;
}

.slider-arrow:hover:not(:disabled) {
    background: var(--background-1);
    border-color: var(--brand-blue);
}

.slider-arrow:disabled {
    opacity: 0.3;
    cursor: not-allowed;
}

.slider-arrow.prev {
    left: 0;
}

.slider-arrow.next {
    right: 0;
}

/* Dots */
.slider-dots {
    display: flex;
    justify-content: center;
    gap: 8px;
    margin-top: 16px;
}

.dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--border);
    cursor: pointer;
    transition: all 0.2s ease;
}

.dot.active {
    background: var(--brand-blue);
    width: 24px;
    border-radius: 4px;
}

/* Loading State */
.loading-container {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: 16px;
    margin-top: 14px;
    margin-bottom: 24px;
}

.loading-card {
    height: 180px;
    background: var(--background-0);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 16px;
}

.loading-skeleton {
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, var(--background-1) 25%, var(--background-2) 50%, var(--background-1) 75%);
    background-size: 200% 100%;
    animation: loading 1.5s infinite;
    border-radius: 6px;
}

@keyframes loading {
    0% {
        background-position: 200% 0;
    }
    100% {
        background-position: -200% 0;
    }
}

/* Responsive */
@media (max-width: 1024px) {
    .card-slide {
        flex: 0 0 calc(50% - 8px);
    }
}

@media (max-width: 768px) {
    .cards-slider-container {
        padding: 0 40px;
    }
    
    .card-slide {
        flex: 0 0 100%;
    }
    
    .cards-grid {
        grid-template-columns: 1fr;
    }
    
    .event-card {
        min-height: 160px;
    }
}

@media (max-width: 480px) {
    .cards-slider-container {
        padding: 0;
    }
    
    .slider-arrow {
        width: 32px;
        height: 32px;
        font-size: 20px;
    }
    
    .slider-arrow.prev {
        left: 10px;
    }
    
    .slider-arrow.next {
        right: 10px;
    }
    
    .event-card {
        min-height: 140px;
        padding: 12px;
    }
    
    .event-title {
        font-size: 14px;
    }
}
</style>