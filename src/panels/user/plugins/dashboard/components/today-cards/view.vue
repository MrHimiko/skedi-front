<template>
    <div v-if="todayEvents.length > 0 || isLoading">
        <div class="schedule-header">
            <h4>Today's schedule</h4>
            <span 
                v-if="!isLoading && todayEvents.length > 0" 
                class="event-count-badge"
                @click="openTodayEventsPopup"
                title="View all today's events"
            >
                ({{ todayEvents.length }})
            </span>
        </div>
        
        <div class="today-cards" v-if="false">
            <!-- Check if we need slider (more than 3 events) -->
            <div v-if="todayEvents.length > 3" class="cards-slider-container">
                <div class="cards-slider" ref="sliderContainer">
                    <div class="cards-track" ref="cardsTrack" :style="trackStyle">
                        <div 
                            v-for="(event, index) in todayEvents" 
                            :key="index"
                            class="card-slide"
                        >
                            <div 
                                :class="['event-card', event.type, { 
                                    'is-now': event.isNow, 
                                    'is-canceled': event.status === 'canceled',
                                    'is-pending': event.status === 'pending'
                                }]"
                                @click="handleCardClick(event)"
                            >
                                <!-- Source Icon -->
                                <div class="source-icon" v-if="event.source">
                                    <img :src="getSourceIcon(event.source)" :alt="event.source" />
                                </div>
                                
                                <!-- Pending indicator -->
                                <div v-if="event.status === 'pending'" class="pending-indicator">
                                    ⚠️
                                </div>
                                
                                <!-- Event Content -->
                                <div class="card-content">
                                    <div class="event-header">
                                        <h3 class="event-title">{{ event.title }}</h3>
                                        <span class="event-time">{{ event.timeRange }}</span>
                                    </div>
                                    
                                    <div class="event-details">
                                        <p class="event-attendees" v-if="event.attendees && event.attendees !== 'No attendees'">
                                            {{ formatAttendees(event.attendees) }}
                                        </p>
                                        <p class="event-location" v-if="event.location">
                                            📍 {{ formatLocation(event.location) }}
                                        </p>
                                    </div>
                                </div>
                                
                                <!-- Action Button -->
                                <div class="card-actions">
                                    <span v-if="event.isNow" class="live">Live now</span>
                                    <button 
                                        v-else-if="event.isUpcoming && event.startsIn"
                                        class="upcoming-btn"
                                        disabled
                                    >
                                        Starts {{ event.startsIn }}
                                    </button>
                                    <span v-else-if="event.isPast" class="past">
                                        Completed
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Navigation arrows -->
                <button 
                    class="slider-arrow prev" 
                    @click="slidePrev"
                    :disabled="currentSlide === 0"
                >
                    ‹
                </button>
                <button 
                    class="slider-arrow next" 
                    @click="slideNext"
                    :disabled="currentSlide >= maxSlide"
                >
                    ›
                </button>
                
                <!-- Dots indicator -->
                <div class="slider-dots">
                    <span 
                        v-for="(dot, index) in totalDots" 
                        :key="index"
                        :class="['dot', { active: index === currentSlide }]"
                        @click="goToSlide(index)"
                    ></span>
                </div>
            </div>
            
            <!-- Simple grid if 3 or fewer events -->
            <div v-else class="cards-grid">
                <div 
                    v-for="(event, index) in todayEvents" 
                    :key="index"
                    class="grid-card"
                >
                    <div 
                        :class="['event-card', event.type, { 
                            'is-now': event.isNow, 
                            'is-canceled': event.status === 'canceled',
                            'is-pending': event.status === 'pending'
                        }]"
                        @click="handleCardClick(event)"
                    >
                        <!-- Source Icon -->
                        <div class="source-icon" v-if="event.source">
                            <img :src="getSourceIcon(event.source)" :alt="event.source" />
                        </div>
                        
                        <!-- Pending indicator -->
                        <div v-if="event.status === 'pending'" class="pending-indicator">
                            ⚠️
                        </div>
                        
                        <!-- Event Content -->
                        <div class="card-content">
                            <div class="event-header">
                                <h3 class="event-title">{{ event.title }}</h3>
                                <span class="event-time">{{ event.timeRange }}</span>
                            </div>
                            
                            <div class="event-details">
                                <p class="event-attendees" v-if="event.attendees && event.attendees !== 'No attendees'">
                                    {{ formatAttendees(event.attendees) }}
                                </p>
                                <p class="event-location" v-if="event.location">
                                    📍 {{ formatLocation(event.location) }}
                                </p>
                            </div>
                        </div>
                        
                        <!-- Action Button -->
                        <div class="card-actions">
                            <span v-if="event.isNow" class="live">Live now</span>
                            <button 
                                v-else-if="event.isUpcoming && event.startsIn"
                                class="upcoming-btn"
                                disabled
                            >
                                Starts {{ event.startsIn }}
                            </button>
                            <span v-else-if="event.isPast" class="past">
                                Completed
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Loading State -->
        <div v-if="isLoading" class="loading-container">
            <div class="loading-card">
                <div class="loading-skeleton"></div>
            </div>
            <div class="loading-card">
                <div class="loading-skeleton"></div>
            </div>
            <div class="loading-card">
                <div class="loading-skeleton"></div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { CalendarService } from '@user_dashboard/services/calendar';
import { popup } from '@utils/popup';
import BookingDetailView from '@user_bookings/components/detail/view.vue';
import ExternalEventPopup from '@user_dashboard/components/externalEventPopup/view.vue';
import TodayEventsPopup from '@user_dashboard/components/todayEventsPopup/view.vue';

// State
const todayEvents = ref([]);
const isLoading = ref(false);
const currentSlide = ref(0);
const slidesPerView = ref(3);

// Computed properties
const maxSlide = computed(() => {
    return Math.max(0, todayEvents.value.length - slidesPerView.value);
});

const totalDots = computed(() => {
    return Math.ceil(todayEvents.value.length / slidesPerView.value);
});

const trackStyle = computed(() => {
    const translateX = -(currentSlide.value * (100 / slidesPerView.value));
    return {
        transform: `translateX(${translateX}%)`,
        transition: 'transform 0.3s ease'
    };
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



// Format location 
function formatLocation(location) {
    if (!location) return '';
    
    // If it's already a string, return it directly
    if (typeof location === 'string') {
        return location;
    }
    
    // If it's an array, process the first location
    if (Array.isArray(location)) {
        if (location.length === 0) return '';
        
        const firstLocation = location[0];
        if (typeof firstLocation === 'string') {
            return firstLocation;
        }
        
        // Handle location object
        if (firstLocation.type === 'google_meet') {
            return 'Google Meet';
        } else if (firstLocation.type === 'link') {
            return firstLocation.value || 'Meeting Link';
        } else if (firstLocation.type === 'address') {
            return firstLocation.value || 'Address';
        } else if (firstLocation.type === 'in_person') {
            return firstLocation.address || 'In Person';
        } else if (firstLocation.type === 'custom') {
            return firstLocation.custom || 'Custom Location';
        }
        
        return firstLocation.value || firstLocation.address || 'Location';
    }
    
    // Try to parse as JSON (backwards compatibility)
    try {
        const parsed = JSON.parse(location);
        if (Array.isArray(parsed) && parsed.length > 0) {
            const firstLocation = parsed[0];
            return `${firstLocation.type}: ${firstLocation.value || firstLocation.address || ''}`;
        }
        return location;
    } catch (error) {
        // If JSON parsing fails, return the location as-is
        return location;
    }
}

// Format attendees
function formatAttendees(attendees) {
    if (!attendees) return '';
    if (attendees === 'No attendees') return '';
    // Truncate if too long
    if (attendees.length > 30) {
        return attendees.substring(0, 30) + '...';
    }
    return attendees;
}

// Slider navigation
function slidePrev() {
    if (currentSlide.value > 0) {
        currentSlide.value--;
    }
}

function slideNext() {
    if (currentSlide.value < maxSlide.value) {
        currentSlide.value++;
    }
}

function goToSlide(index) {
    currentSlide.value = index * slidesPerView.value;
    if (currentSlide.value > maxSlide.value) {
        currentSlide.value = maxSlide.value;
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

// Refresh events periodically (every minute to update "starts in" times)
let refreshInterval = null;

onMounted(() => {
    loadTodayEvents();
    
    // Update slides per view on resize
    window.addEventListener('resize', updateSlidesPerView);
    
    // Refresh every minute to update timing
    refreshInterval = setInterval(() => {
        loadTodayEvents();
    }, 60000); // 60 seconds
});

onUnmounted(() => {
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
    
    window.removeEventListener('resize', updateSlidesPerView);
});
</script>

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
}

/* Live indicator */
.event-card.is-now {
    border-color: #dc2626;
    background: linear-gradient(135deg, #fee2e2 0%, var(--background-0) 100%);
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
    margin: 0 0 4px;
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

/* Card Actions */
.card-actions {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid var(--border);
}

.live {
    background: #dc2626;
    color: white;
    padding: 6px 12px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    display: inline-block;
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

.upcoming-btn {
    background: var(--background-1);
    color: var(--text-secondary);
    padding: 6px 12px;
    border: 1px solid var(--border);
    border-radius: 6px;
    font-size: 12px;
    cursor: not-allowed;
    opacity: 0.7;
}

.past {
    color: var(--text-secondary);
    font-size: 12px;
    font-style: italic;
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