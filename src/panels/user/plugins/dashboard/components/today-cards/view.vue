<template>
    <h4> Todays schedule </h4>
    <div class="today-cards" v-if="!isLoading && todayEvents.length > 0">
        <div class="cards-container">
            <div 
                v-for="(event, index) in todayEvents" 
                :key="index"
                :class="['event-card', event.type, { 'is-now': event.isNow, 'is-canceled': event.status === 'canceled' }]"
                @click="handleCardClick(event)"
            >
                <!-- Source Icon -->
                <div class="source-icon" v-if="event.source">
                    <img :src="getSourceIcon(event.source)" :alt="event.source" />
                </div>
                
                <!-- Event Content -->
                <div class="card-content">
                    <div class="event-header">
                        <h3 class="event-title">{{ event.title }}</h3>
                        <span class="event-time">{{ event.timeRange }}</span>
                    </div>
                    
                    <div class="event-details">
                        <p class="event-attendees" v-if="event.attendees">
                            {{ event.attendees }}
                        </p>
                        <p class="event-location" v-if="event.location">
                            📍 {{ event.location }}
                        </p>
                    </div>
                </div>
                
                <!-- Action Button -->
                <div class="card-actions">

                     <span v-if="event.isNow" class="live"> Live now </span> 

                    <button 
                        v-else-if="event.isUpcoming && event.startsIn"
                        class="upcoming-btn"
                        disabled
                    >
                        Starts {{ event.startsIn }}
                    </button>
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
    
    <!-- Empty State -->
    <div v-if="!isLoading && todayEvents.length === 0" class="empty-state">
        <p>No meetings scheduled for today</p>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';

// Hardcoded data as requested - will be replaced with API call later
const todayEvents = ref([
    {
        id: 1,
        title: "Call with Nemanja",
        timeRange: "3:00 AM - 3:30 AM",
        attendees: "You, Nemanja Stojanovic",
        location: "Google Meet",
        type: "internal",
        source: null,
        status: "confirmed",
        isNow: true,
        isUpcoming: false,
        startsIn: null,
        joinUrl: "https://meet.google.com/abc-def-ghi"
    },
    {
        id: 2,
        title: "Odnesi Marku graficku",
        timeRange: "3:00 AM - 3:30 AM",
        attendees: "You, Marko Petrovic",
        location: "Office",
        type: "external",
        source: "google_calendar",
        status: "confirmed",
        isNow: false,
        isUpcoming: true,
        startsIn: "2h",
        joinUrl: null
    },
    {
        id: 3,
        title: "Project Review Meeting",
        timeRange: "5:00 AM - 6:00 AM",
        attendees: "You, Team leads",
        location: "Conference Room A",
        type: "internal",
        source: null,
        status: "confirmed",
        isNow: false,
        isUpcoming: true,
        startsIn: "4h",
        joinUrl: "https://zoom.us/j/123456789"
    }
]);

const isLoading = ref(false);

// Get source icon based on calendar provider
function getSourceIcon(source) {
    const icons = {
        'google_calendar': 'https://global.divhunt.com/3858bb278694ec6c098fef9b26e059ab_2357.svg',
        'outlook': 'https://global.divhunt.com/41d16cde92f23c0849a7ddfd2065aa2e_3202.svg',
        'apple_calendar': '/icons/apple-calendar.svg'
    };
    return icons[source] || null;
}

// Handle card click
function handleCardClick(event) {
    if (event.type === 'external') {
        // Show simple popup for external events
        const sourceName = getSourceDisplayName(event.source);
        if (confirm(`This event is scheduled on ${sourceName}. Would you like to view details in the external calendar?`)) {
            // TODO: Implement external calendar link opening
            console.log('Open external event:', event);
        }
    } else {
        // Show detailed popup for internal events
        console.log('Show internal event details:', event);
        // TODO: Implement detailed event popup
    }
}

// Get display name for source
function getSourceDisplayName(source) {
    const names = {
        'google_calendar': 'Google Calendar',
        'outlook': 'Outlook Calendar',
        'apple_calendar': 'Apple Calendar'
    };
    return names[source] || 'External Calendar';
}

// Open meeting link
function openMeeting(url) {
    if (url) {
        window.open(url, '_blank');
    }
}

onMounted(() => {
    console.log('Today cards component mounted with hardcoded data');
});
</script>

<style scoped>
.today-cards {
    margin-top: 14px!important;
    margin-bottom: 24px;
}

.cards-container {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: 16px;
}

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
    justify-content: space-between;
}

.event-card:hover {
    border-color: var(--brand-blue);
}

.event-card .live {
        background: #ffde0e;
    color: black;
    padding: 5px 12px;
    border-radius: 5px;
    font-weight: 600;
}

.event-card.is-canceled {
    opacity: 0.6;
    background: var(--background-1);
}

.event-card.is-canceled .event-title {
    text-decoration: line-through;
}



.source-icon {
    position: absolute;
    top: 12px;
    right: 12px;
    width: 20px;
    height: 20px;
}

.source-icon img {
    width: 100%;
    height: 100%;
    object-fit: contain;
}

.card-content {
    flex: 1;
    margin-right: 32px;
}

.event-header {
    margin-bottom: 12px;
}

.event-title {
    font-size: 16px;
    font-weight: 600;
    margin: 0 0 4px 0;
    color: var(--text-primary);
    line-height: 1.3;
}

.event-time {
    font-size: 13px;
    color: var(--text-secondary);
    font-weight: 500;
}

.event-details {
    margin-bottom: 16px;
}

.event-attendees,
.event-location {
    font-size: 13px;
    color: var(--text-secondary);
    margin: 4px 0;
    line-height: 1.3;
}

.card-actions {
    display: flex;
    justify-content: flex-end;
    margin-top: auto;
    position: absolute;
    bottom: 15px;
    right: 15px;
}

.join-btn {
    background: var(--brand-green);
    color: white;
    border: none;
    border-radius: 6px;
    padding: 8px 16px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s ease;
}

.join-btn:hover {
    background: var(--brand-green-hover, #16a34a);
}

.upcoming-btn {
    background: var(--background-1);
    color: var(--text-secondary);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 8px 16px;
    font-size: 13px;
    font-weight: 500;
    cursor: not-allowed;
}

/* Loading States */
.loading-container {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: 16px;
    margin-bottom: 24px;
}

.loading-card {
    background: var(--background-0);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 16px;
    min-height: 120px;
}

.loading-skeleton {
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, 
        var(--background-1) 25%, 
        var(--background-2) 50%, 
        var(--background-1) 75%
    );
    background-size: 200% 100%;
    animation: loading 1.5s infinite;
    border-radius: 8px;
}

@keyframes loading {
    0% {
        background-position: 200% 0;
    }
    100% {
        background-position: -200% 0;
    }
}

/* Empty State */
.empty-state {
    text-align: center;
    padding: 40px 20px;
    color: var(--text-secondary);
    font-size: 14px;
    border: 1px solid var(--border);
    border-radius: 12px;
    background: var(--background-0);
    margin-bottom: 24px;
}

/* Responsive design */
@media (max-width: 768px) {
    .cards-container,
    .loading-container {
        grid-template-columns: 1fr;
    }
    
    .event-card {
        min-height: 100px;
    }
    
    .card-content {
        margin-right: 24px;
    }
}
</style>