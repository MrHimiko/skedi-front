<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { api } from '@utils/api';
import { UserStore } from '@stores/user';

// Components
import TabsComponent from '@global/tabs/view.vue';
import BookingsList from '@user_bookings/components/list/view.vue';

// Icons
import { PhCalendar, PhClock, PhX, PhCheck } from '@phosphor-icons/vue';

const props = defineProps({
    event: {
        type: Object,
        required: true
    },
    eventId: {
        type: [String, Number],
        required: true
    },
    organizationId: {
        type: [String, Number],
        required: true
    }
});

// State
const userStore = UserStore();
const bookings = ref([]);
const isLoading = ref(false);
const currentTab = ref('upcoming');
const searchQuery = ref('');
const refreshCounter = ref(0);

// Tabs configuration
const tabs = computed(() => [
    { 
        title: 'Upcoming', 
        active: currentTab.value === 'upcoming' 
    },
    { 
        title: 'Past', 
        active: currentTab.value === 'past' 
    },
    { 
        title: 'Canceled', 
        active: currentTab.value === 'canceled' 
    },
    { 
        title: 'Pending', 
        active: currentTab.value === 'pending' 
    },
    { 
        title: 'All', 
        active: currentTab.value === 'all' 
    }
]);

// Booking statistics
const bookingStats = computed(() => {
    const stats = {
        upcoming: 0,
        past: 0,
        canceled: 0,
        pending: 0,
        all: 0
    };
    
    if (!Array.isArray(bookings.value)) return stats;
    
    bookings.value.forEach(booking => {
        if (!booking || booking.type === 'header') return;
        
        stats.all++;
        
        switch (booking.status?.toLowerCase()) {
            case 'confirmed':
                const bookingTime = new Date(booking.start_time);
                const now = new Date();
                if (bookingTime > now) {
                    stats.upcoming++;
                } else {
                    stats.past++;
                }
                break;
            case 'canceled':
                stats.canceled++;
                break;
            case 'pending':
                stats.pending++;
                break;
        }
    });
    
    return stats;
});

// Get bookings happening now
const nowBookings = computed(() => {
    if (!Array.isArray(bookings.value)) return [];
    
    const now = new Date();
    const nowStart = new Date(now.getTime() - 5 * 60 * 1000); // 5 minutes before
    const nowEnd = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes after
    
    return bookings.value.filter(booking => {
        if (!booking || booking.type === 'header') return false;
        
        const startTime = new Date(booking.start_time);
        return startTime >= nowStart && startTime <= nowEnd && booking.status === 'confirmed';
    });
});

// Filter bookings based on current tab and search
const filteredBookings = computed(() => {
    if (!Array.isArray(bookings.value)) return [];
    
    let filtered = bookings.value.filter(booking => {
        if (!booking) return false;
        if (booking.type === 'header') return true;
        
        // Filter by tab
        const now = new Date();
        const bookingTime = new Date(booking.start_time);
        
        switch (currentTab.value) {
            case 'upcoming':
                if (booking.status !== 'confirmed' || bookingTime <= now) return false;
                break;
            case 'past':
                if (booking.status !== 'confirmed' || bookingTime > now) return false;
                break;
            case 'canceled':
                if (booking.status !== 'canceled') return false;
                break;
            case 'pending':
                if (booking.status !== 'pending') return false;
                break;
            case 'all':
                // Show all bookings
                break;
            default:
                return false;
        }
        
        return true;
    });
    
    // Apply search filter
    if (searchQuery.value) {
        const query = searchQuery.value.toLowerCase();
        filtered = filtered.filter(booking => {
            if (!booking || booking.type === 'header') return true;
            
            return (
                (booking.title && booking.title.toLowerCase().includes(query)) ||
                (booking.guests && Array.isArray(booking.guests) && 
                 booking.guests.some(guest => 
                     (guest.name && guest.name.toLowerCase().includes(query)) ||
                     (guest.email && guest.email.toLowerCase().includes(query))
                 )) ||
                (booking.hosts && Array.isArray(booking.hosts) && 
                 booking.hosts.some(host => 
                     (host.name && host.name.toLowerCase().includes(query)) ||
                     (host.email && host.email.toLowerCase().includes(query))
                 ))
            );
        });
    }
    
    return filtered;
});

// Load bookings for this specific event
async function loadBookings() {
    try {
        isLoading.value = true;
        
        // Use the correct API route with organization prefix
        const response = await api.get(`organizations/${props.organizationId}/events/${props.eventId}/bookings`);
        
        if (response.success && response.data) {
            // Process bookings to add date headers
            const processedBookings = processBookingsWithHeaders(response.data);
            bookings.value = processedBookings;
        } else {
            bookings.value = [];
        }
    } catch (error) {
        console.error('Failed to load event bookings:', error);
        bookings.value = [];
    } finally {
        isLoading.value = false;
    }
}

// Process bookings to add date headers (similar to main bookings page)
function processBookingsWithHeaders(bookingsList) {
    if (!Array.isArray(bookingsList) || bookingsList.length === 0) {
        return [];
    }
    
    // Group bookings by date
    const groupedByDate = {};
    const dateHeaders = [];
    
    bookingsList.forEach(booking => {
        if (!booking || !booking.start_time) return;
        
        // Parse the date from your API format "2025-08-27 10:00:00"
        const [datePart, timePart] = booking.start_time.split(' ');
        const date = new Date(`${datePart}T${timePart}`);
        const dateKey = date.toDateString();
        const formattedDate = date.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        });
        
        if (!groupedByDate[dateKey]) {
            groupedByDate[dateKey] = [];
            dateHeaders.push({
                type: 'header',
                formattedDate,
                dateKey,
                date
            });
        }
        
        // Add dateKey to booking for filtering and ensure proper format
        booking.dateKey = dateKey;
        
        // Normalize booking data to match what BookingsList expects
        const normalizedBooking = {
            ...booking,
            booking_id: booking.id,
            event_id: booking.event_id,
            // Convert your API format "2025-08-27 10:00:00" to ISO format
            start_time: `${datePart}T${timePart}`,
            end_time: booking.end_time ? `${booking.end_time.split(' ')[0]}T${booking.end_time.split(' ')[1]}` : `${datePart}T${timePart}`,
            status: booking.status,
            title: `Meeting with ${booking.guests?.[0]?.name || 'Guest'}`,
            guests: booking.guests || [],
            hosts: [], // Will be populated from event data if needed
            type: 'booking', // Add type to distinguish from headers
            // Add additional time fields that BookingsList might expect
            dateKey,
            formattedDate
        };
        
        groupedByDate[dateKey].push(normalizedBooking);
    });
    
    // Sort headers by date
    dateHeaders.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Build final array with headers and bookings
    const result = [];
    dateHeaders.forEach(header => {
        result.push(header);
        const bookings = groupedByDate[header.dateKey] || [];
        bookings.sort((a, b) => {
            const aTime = new Date(`${a.start_time.split(' ')[0]}T${a.start_time.split(' ')[1]}`);
            const bTime = new Date(`${b.start_time.split(' ')[0]}T${b.start_time.split(' ')[1]}`);
            return aTime - bTime;
        });
        result.push(...bookings);
    });
    
    return result;
}

// Handle tab change
function handleTabChange(event, tab) {
    currentTab.value = tab.title.toLowerCase();
}

// Handle booking refresh
function handleBookingRefresh() {
    refreshCounter.value++;
    loadBookings();
}

// Watch for search changes
watch(searchQuery, () => {
    // Debounce search if needed
});

onMounted(() => {
    loadBookings();
});
</script>

<template>
    <div class="event-bookings">
        <!-- Header with stats -->
        <div class="bookings-header">
            <div class="header-content">
                <h3>Event Bookings</h3>
                <p>All bookings for "{{ event.name }}"</p>
            </div>
            
            <div class="booking-stats">
                <div class="stat-item">
                    <div class="stat-number">{{ bookingStats.all }}</div>
                    <div class="stat-label">Total</div>
                </div>
                <div class="stat-item">
                    <div class="stat-number">{{ bookingStats.upcoming }}</div>
                    <div class="stat-label">Upcoming</div>
                </div>
                <div class="stat-item">
                    <div class="stat-number">{{ bookingStats.past }}</div>
                    <div class="stat-label">Past</div>
                </div>
                <div class="stat-item" v-if="bookingStats.pending > 0">
                    <div class="stat-number">{{ bookingStats.pending }}</div>
                    <div class="stat-label">Pending</div>
                </div>
                <div class="stat-item" v-if="bookingStats.canceled > 0">
                    <div class="stat-number">{{ bookingStats.canceled }}</div>
                    <div class="stat-label">Canceled</div>
                </div>
            </div>
        </div>
        
        <!-- Search -->
        <div class="search-section">
            <div class="search-container">
                <input 
                    type="text" 
                    v-model="searchQuery" 
                    placeholder="Search bookings..." 
                    class="search-input"
                />
            </div>
        </div>
        
        <!-- Now section -->
        <div v-if="nowBookings.length > 0" class="now-section">
            <div class="now-indicator">
                <span class="dot"></span>
                <span class="now-text">Happening Now</span>
            </div>
            
            <BookingsList 
                :bookings="nowBookings" 
                :isLoading="false"
                highlightStyle="now"
                @refresh="handleBookingRefresh"
            />
        </div>
        
        <!-- Tabs -->
        <div class="tabs-section">
            <TabsComponent 
                :tabs="tabs" 
                :active="currentTab" 
                :onClick="handleTabChange"
            />
        </div>
        
        <!-- Bookings List -->
        <div class="bookings-content">
            <BookingsList 
                :bookings="filteredBookings" 
                :isLoading="isLoading"
                @refresh="handleBookingRefresh"
            />
            
            <!-- Empty state -->
            <div v-if="!isLoading && filteredBookings.length === 0" class="empty-state">
                <PhCalendar :size="48" />
                <h4>No bookings found</h4>
                <p v-if="searchQuery">Try adjusting your search or switching to a different tab.</p>
                <p v-else-if="currentTab === 'upcoming'">No upcoming bookings for this event.</p>
                <p v-else-if="currentTab === 'past'">No past bookings for this event.</p>
                <p v-else-if="currentTab === 'canceled'">No canceled bookings for this event.</p>
                <p v-else-if="currentTab === 'pending'">No pending bookings for this event.</p>
                <p v-else>This event has no bookings yet.</p>
            </div>
        </div>
    </div>
</template>

<style scoped>
.event-bookings {
    display: flex;
    flex-direction: column;
    gap: 24px;
}

/* Header */
.bookings-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
}

.header-content h3 {
    margin: 0 0 4px 0;
    font-size: 20px;
    font-weight: 600;
    color: var(--text-primary);
}

.header-content p {
    margin: 0;
    color: var(--text-secondary);
    font-size: 14px;
}

.booking-stats {
    display: flex;
    gap: 16px;
}

.stat-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 12px 16px;
    background: var(--background-1);
    border: 1px solid var(--border);
    border-radius: 8px;
    min-width: 80px;
}

.stat-number {
    font-size: 20px;
    font-weight: 700;
    color: var(--primary);
    margin-bottom: 2px;
}

.stat-label {
    font-size: 12px;
    color: var(--text-secondary);
    font-weight: 500;
}

/* Search */
.search-section {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.search-container {
    flex: 1;
    max-width: 400px;
}

.search-input {
    width: 100%;
    padding: 10px 16px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--background-0);
    color: var(--text-primary);
    font-size: 14px;
}

.search-input:focus {
    outline: none;
    border-color: var(--primary);
}

.search-input::placeholder {
    color: var(--text-tertiary);
}

/* Now section */
.now-section {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.now-indicator {
    display: flex;
    align-items: center;
    gap: 8px;
}

.dot {
    width: 8px;
    height: 8px;
    background: var(--success);
    border-radius: 50%;
    animation: pulse 2s infinite;
}

.now-text {
    font-size: 14px;
    font-weight: 600;
    color: var(--success);
}

@keyframes pulse {
    0% { opacity: 1; }
    50% { opacity: 0.5; }
    100% { opacity: 1; }
}

/* Tabs */
.tabs-section {
    border-bottom: 1px solid var(--border);
    padding-bottom: 0;
}

/* Bookings content */
.bookings-content {
    flex: 1;
}

/* Empty state */
.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 20px;
    text-align: center;
    color: var(--text-secondary);
}

.empty-state h4 {
    margin: 16px 0 8px 0;
    color: var(--text-primary);
    font-size: 18px;
    font-weight: 600;
}

.empty-state p {
    margin: 0;
    max-width: 400px;
    line-height: 1.5;
}

@media (max-width: 768px) {
    .bookings-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 16px;
    }
    
    .booking-stats {
        width: 100%;
        justify-content: space-between;
        gap: 8px;
    }
    
    .stat-item {
        flex: 1;
        min-width: 0;
        padding: 8px 12px;
    }
    
    .stat-number {
        font-size: 16px;
    }
    
    .search-section {
        flex-direction: column;
        align-items: stretch;
        gap: 12px;
    }
    
    .search-container {
        max-width: none;
    }
}
</style>