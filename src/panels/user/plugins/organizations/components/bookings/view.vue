<!-- src/panels/user/plugins/organizations/components/bookings/view.vue -->
<script setup>
import { ref, computed, onMounted } from 'vue';
import { api } from '@utils/api';
import { common } from '@utils/common';
import { BookingsService } from '@user_bookings/services/bookings';

import BookingsList from '@user_bookings/components/list/view.vue';
import TabsComponent from '@global/tabs/view.vue';
import InputComponent from '@form/input/view.vue';

import { PhMagnifyingGlass, PhCaretDown, PhCaretUp } from "@phosphor-icons/vue";

const props = defineProps({
    organization: {
        type: Object,
        required: true
    },
    organizationId: {
        type: Number,
        required: true
    },
    isAdmin: {
        type: Boolean,
        default: false
    }
});

// State
const events = ref([]);
const bookingsByEvent = ref({});
const expandedEvents = ref(new Set());
const isLoading = ref(true);
const currentTab = ref('upcoming');
const searchQuery = ref('');

// Tab configuration
const tabs = [
    { key: 'upcoming', title: 'Upcoming' },
    { key: 'past', title: 'Past' },
    { key: 'pending', title: 'Pending' },
    { key: 'canceled', title: 'Canceled' }
];

// Statistics by event
const eventStats = computed(() => {
    const stats = {};
    
    events.value.forEach(event => {
        const bookings = bookingsByEvent.value[event.id] || [];
        const now = new Date();
        
        stats[event.id] = {
            upcoming: 0,
            past: 0,
            pending: 0,
            canceled: 0,
            all: bookings.length
        };
        
        bookings.forEach(booking => {
            if (booking.type === 'header') return;
            
            const status = booking.status?.toLowerCase();
            const bookingTime = new Date(booking.start_time);
            
            if (status === 'canceled') {
                stats[event.id].canceled++;
            } else if (status === 'pending') {
                stats[event.id].pending++;
            } else if (status === 'confirmed') {
                if (bookingTime > now) {
                    stats[event.id].upcoming++;
                } else {
                    stats[event.id].past++;
                }
            }
        });
    });
    
    return stats;
});

// Get count for current tab
function getEventCount(eventId) {
    const stats = eventStats.value[eventId];
    if (!stats) return 0;
    
    return stats[currentTab.value] || 0;
}

// Filter events by search
const filteredEvents = computed(() => {
    if (!searchQuery.value) return events.value;
    
    const query = searchQuery.value.toLowerCase();
    return events.value.filter(event => 
        event.name.toLowerCase().includes(query)
    );
});

// Toggle event expansion
function toggleEvent(eventId) {
    if (expandedEvents.value.has(eventId)) {
        expandedEvents.value.delete(eventId);
    } else {
        expandedEvents.value.add(eventId);
        // Load bookings for this event if not already loaded
        if (!bookingsByEvent.value[eventId]) {
            loadEventBookings(eventId);
        }
    }
}

// Check if event is expanded
function isEventExpanded(eventId) {
    return expandedEvents.value.has(eventId);
}

// Load all events for this organization
async function loadEvents() {
    try {
        isLoading.value = true;
        
        const response = await api.get(`organizations/${props.organizationId}/events`);
        
        if (response.success && response.data) {
            events.value = response.data.filter(event => !event.deleted);
        }
    } catch (error) {
        console.error('Failed to load events:', error);
        common.notification('Failed to load events', false);
    } finally {
        isLoading.value = false;
    }
}

// Load bookings for a specific event
async function loadEventBookings(eventId) {
    try {
        const now = new Date();
        const THREE_MONTHS_MS = 90 * 24 * 60 * 60 * 1000;
        
        let startTime, endTime;
        
        if (currentTab.value === 'upcoming') {
            startTime = now.toISOString();
            endTime = new Date(now.getTime() + THREE_MONTHS_MS).toISOString();
        } else if (currentTab.value === 'past') {
            startTime = new Date(now.getTime() - THREE_MONTHS_MS).toISOString();
            endTime = now.toISOString();
        } else if (currentTab.value === 'pending') {
            startTime = now.toISOString();
            endTime = new Date(now.getTime() + THREE_MONTHS_MS).toISOString();
        } else if (currentTab.value === 'canceled') {
            startTime = new Date(now.getTime() - THREE_MONTHS_MS).toISOString();
            endTime = new Date(now.getTime() + THREE_MONTHS_MS).toISOString();
        }
        
        const response = await api.get(
            `organizations/${props.organizationId}/events/${eventId}/bookings`,
            {
                status: currentTab.value,
                start_time: startTime,
                end_time: endTime
            }
        );
        
        if (response.success && response.data) {
            bookingsByEvent.value[eventId] = response.data;
        }
    } catch (error) {
        console.error(`Failed to load bookings for event ${eventId}:`, error);
        bookingsByEvent.value[eventId] = [];
    }
}

// Load bookings for all expanded events
async function loadAllExpandedBookings() {
    const promises = Array.from(expandedEvents.value).map(eventId => 
        loadEventBookings(eventId)
    );
    
    await Promise.all(promises);
}

// Handle tab change
function handleTabChange(event, tab) {
    currentTab.value = tab.title.toLowerCase();
    // Reload bookings for all expanded events with new tab filter
    loadAllExpandedBookings();
}

onMounted(() => {
    loadEvents();
});
</script>

<template>
    <div class="org-bookings-tab">
        <div class="bookings-header">
            <div class="header-info">
                <h3>Bookings</h3>
                <p>All bookings organized by event</p>
            </div>
            <div class="header-actions">
                <div class="search-box">
                    <InputComponent
                        v-model="searchQuery"
                        placeholder="Search events..."
                        :iconLeft="{ component: PhMagnifyingGlass }"
                    />
                </div>
            </div>
        </div>
        
        <!-- Tabs -->
        <div class="bookings-tabs">
            <TabsComponent
                :tabs="tabs"
                :active="tabs.find(t => t.key === currentTab)?.title"
                :onClick="handleTabChange"
            />
        </div>
        
        <div v-if="isLoading" class="loading-state">
            <p>Loading events...</p>
        </div>
        
        <div v-else-if="filteredEvents.length === 0" class="empty-state">
            <p>{{ searchQuery ? 'No events found' : 'No events with bookings' }}</p>
        </div>
        
        <div v-else class="events-list">
            <div 
                v-for="event in filteredEvents" 
                :key="event.id"
                class="event-section"
            >
                <div 
                    class="event-header"
                    @click="toggleEvent(event.id)"
                >
                    <div class="event-info">
                        <h4 class="event-name">{{ event.name }}</h4>
                        <span class="booking-count">
                            {{ getEventCount(event.id) }} {{ currentTab }} {{ getEventCount(event.id) === 1 ? 'booking' : 'bookings' }}
                        </span>
                    </div>
                    <div class="expand-icon">
                        <PhCaretDown v-if="!isEventExpanded(event.id)" :size="20" weight="bold" />
                        <PhCaretUp v-else :size="20" weight="bold" />
                    </div>
                </div>
                
                <div v-if="isEventExpanded(event.id)" class="event-bookings">
                    <div v-if="!bookingsByEvent[event.id]" class="loading-bookings">
                        <p>Loading bookings...</p>
                    </div>
                    <div v-else-if="bookingsByEvent[event.id].length === 0" class="no-bookings">
                        <p>No {{ currentTab }} bookings for this event</p>
                    </div>
                    <BookingsList
                        v-else
                        :bookings="bookingsByEvent[event.id]"
                        :currentTab="currentTab"
                    />
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.org-bookings-tab {
    display: flex;
    flex-direction: column;
    gap: 24px;
}

.bookings-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 20px;
}

.header-info h3 {
    margin: 0 0 8px 0;
    font-size: 20px;
    font-weight: 600;
}

.header-info p {
    margin: 0;
    color: var(--text-secondary);
    font-size: 14px;
}

.header-actions {
    display: flex;
    gap: 12px;
    align-items: center;
}

.search-box {
    width: 250px;
}

.bookings-tabs {
    margin-top: -8px;
}

.loading-state,
.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 20px;
    text-align: center;
}

.empty-state p {
    margin: 0;
    color: var(--text-secondary);
    font-size: 16px;
}

.events-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.event-section {
    background: var(--background-1);
    border: 1px solid var(--border);
    border-radius: 8px;
    overflow: hidden;
}

.event-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    cursor: pointer;
    transition: background 0.2s;
}

.event-header:hover {
    background: var(--background-2);
}

.event-info {
    display: flex;
    align-items: center;
    gap: 16px;
}

.event-name {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
}

.booking-count {
    font-size: 13px;
    color: var(--text-secondary);
    padding: 4px 12px;
    background: var(--background-2);
    border-radius: 12px;
}

.expand-icon {
    color: var(--text-secondary);
    transition: transform 0.2s;
}

.event-bookings {
    border-top: 1px solid var(--border);
    background: var(--background-0);
}

.loading-bookings,
.no-bookings {
    padding: 40px 20px;
    text-align: center;
}

.loading-bookings p,
.no-bookings p {
    margin: 0;
    color: var(--text-secondary);
    font-size: 14px;
}

@media (max-width: 768px) {
    .bookings-header {
        flex-direction: column;
    }
    
    .header-actions {
        width: 100%;
    }
    
    .search-box {
        width: 100%;
    }
    
    .event-info {
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
    }
}
</style>