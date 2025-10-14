<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { BookingsService } from '@user_bookings/services/bookings';
import { storage } from '@utils/storage';

// Components
import TabsComponent from '@global/tabs/view.vue';
import BookingsList from '@user_bookings/components/list/view.vue';

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
const allBookings = ref([]);
const isLoading = ref(false);
const currentTab = ref('upcoming');
const searchQuery = ref('');
const refreshCounter = ref(0);

// Constants
const THREE_MONTHS_MS = 90 * 24 * 60 * 60 * 1000;

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

// Get user's timezone (same as BookingsService)
function getUserTimezone() {
    return storage.get('user.timezone') || Intl.DateTimeFormat().resolvedOptions().timeZone;
}

// Normalize booking data with TIMEZONE CONVERSION (same as BookingsService)
function normalizeBooking(booking) {
    if (!booking || booking.type === 'header') return booking;
    
    try {
        const userTimezone = getUserTimezone();
        
        // Extract date and time parts from server format "2025-10-14 13:45:00"
        const [datePart, timePart] = booking.start_time.split(' ');
        const [endDatePart, endTimePart] = booking.end_time.split(' ');
        
        // Parse as UTC to preserve the exact time point
        // This is critical - we treat server time as UTC
        const serverDate = new Date(`${datePart}T${timePart}Z`);
        const serverEndDate = new Date(`${endDatePart}T${endTimePart}Z`);
        
        // Format time in user's timezone
        const userTimeFormatter = new Intl.DateTimeFormat('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: userTimezone
        });
        
        const userDateFormatter = new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long',
            timeZone: userTimezone
        });
        
        // These are properly localized to user's timezone
        const formattedStart = userTimeFormatter.format(serverDate);
        const formattedEnd = userTimeFormatter.format(serverEndDate);
        const dateKey = userDateFormatter.format(serverDate);
        
        // CRITICAL: Add type: 'booking' - BookingsList component requires this!
        return {
            ...booking,
            type: 'booking', // THIS IS REQUIRED!
            dateKey: dateKey,
            booking_id: booking.booking_id || booking.id,
            id: booking.id || booking.booking_id,
            event_id: booking.event_id,
            start_time: booking.start_time, // Keep original for date comparisons
            end_time: booking.end_time,
            formattedStart: formattedStart, // Timezone-converted times for display
            formattedEnd: formattedEnd,
            title: booking.title || booking.event_name || 'Untitled Booking',
            status: booking.status || 'confirmed',
            guests: booking.guests || [],
            hosts: booking.hosts || [],
            location: booking.location || [],
            meeting_link: booking.meeting_link || null,
            color: '#FFDE0E', // Default color
            // Keep these for reference
            originalStartTime: booking.start_time,
            originalEndTime: booking.end_time
        };
    } catch (error) {
        console.error('Error in timezone conversion:', error, booking);
        // Fallback to raw values
        return {
            ...booking,
            type: 'booking',
            formattedStart: booking.start_time.split(' ')[1].substring(0, 5),
            formattedEnd: booking.end_time.split(' ')[1].substring(0, 5),
            dateKey: booking.start_time.split(' ')[0],
            title: booking.title || booking.event_name || 'Untitled Booking',
            booking_id: booking.booking_id || booking.id,
            id: booking.id || booking.booking_id,
            guests: booking.guests || [],
            hosts: booking.hosts || [],
            location: booking.location || [],
            color: '#FFDE0E'
        };
    }
}

// Filter bookings for this specific event only
const eventBookings = computed(() => {
    if (!Array.isArray(allBookings.value)) return [];
    
    const filtered = allBookings.value.filter(item => {
        if (!item) return false;
        if (item.type === 'header') return false;
        
        // Convert both to strings for comparison
        const itemEventId = String(item.event_id);
        const targetEventId = String(props.eventId);
        
        return itemEventId === targetEventId;
    });
    
    // Normalize all bookings - this adds type: 'booking' and timezone conversion
    const normalized = filtered.map(normalizeBooking);
    
    console.log('✅ Normalized bookings with timezone conversion:', normalized);
    
    return normalized;
});

// STATIC booking statistics - always show all bookings for this event
const bookingStats = computed(() => {
    const stats = {
        upcoming: 0,
        past: 0,
        canceled: 0,
        pending: 0,
        all: 0
    };
    
    const now = new Date();
    
    eventBookings.value.forEach(booking => {
        if (!booking || booking.type === 'header') return;
        
        stats.all++;
        
        const status = booking.status?.toLowerCase();
        
        if (status === 'canceled') {
            stats.canceled++;
        } else if (status === 'pending') {
            stats.pending++;
        } else if (status === 'confirmed') {
            // Parse server time as UTC for comparison
            const [datePart, timePart] = booking.originalStartTime.split(' ');
            const bookingTime = new Date(`${datePart}T${timePart}Z`);
            
            if (bookingTime > now) {
                stats.upcoming++;
            } else {
                stats.past++;
            }
        }
    });
    
    return stats;
});

// Filter by current tab
const tabFilteredBookings = computed(() => {
    const now = new Date();
    
    const filtered = eventBookings.value.filter(booking => {
        if (!booking || booking.type === 'header') return false;
        
        const status = booking.status?.toLowerCase();
        
        // Parse server time as UTC for comparison
        const [datePart, timePart] = booking.originalStartTime.split(' ');
        const bookingTime = new Date(`${datePart}T${timePart}Z`);
        
        let shouldShow = false;
        
        switch (currentTab.value) {
            case 'upcoming':
                shouldShow = status === 'confirmed' && bookingTime > now;
                break;
            case 'past':
                shouldShow = status === 'confirmed' && bookingTime <= now;
                break;
            case 'canceled':
                shouldShow = status === 'canceled';
                break;
            case 'pending':
                shouldShow = status === 'pending';
                break;
            case 'all':
                shouldShow = true;
                break;
            default:
                shouldShow = false;
        }
        
        return shouldShow;
    });
    
    console.log('After tab filter:', filtered.length, 'bookings');
    
    return filtered;
});

// Add date headers to filtered bookings
const bookingsWithHeaders = computed(() => {
    if (tabFilteredBookings.value.length === 0) return [];
    
    const grouped = {};
    
    // Group bookings by dateKey (already timezone-converted in normalizeBooking)
    tabFilteredBookings.value.forEach(booking => {
        const dateKey = booking.dateKey;
        
        if (!grouped[dateKey]) {
            grouped[dateKey] = {
                dateKey: dateKey,
                bookings: []
            };
        }
        
        grouped[dateKey].bookings.push(booking);
    });
    
    // Sort date keys
    const sortedDates = Object.keys(grouped).sort((a, b) => {
        return new Date(a) - new Date(b);
    });
    
    // Build result with headers
    const result = [];
    sortedDates.forEach(dateKey => {
        const group = grouped[dateKey];
        
        // Add header
        result.push({
            type: 'header',
            date: new Date(dateKey),
            formattedDate: dateKey // Already formatted by normalizeBooking
        });
        
        // Add bookings sorted by original time (UTC)
        const sortedBookings = group.bookings.sort((a, b) => {
            const [datePartA, timePartA] = a.originalStartTime.split(' ');
            const [datePartB, timePartB] = b.originalStartTime.split(' ');
            const timeA = new Date(`${datePartA}T${timePartA}Z`);
            const timeB = new Date(`${datePartB}T${timePartB}Z`);
            return timeA - timeB;
        });
        
        result.push(...sortedBookings);
    });
    
    console.log('Final data with headers:', result);
    
    return result;
});

// Apply search filter
const filteredBookings = computed(() => {
    if (!searchQuery.value) {
        return bookingsWithHeaders.value;
    }
    
    const query = searchQuery.value.toLowerCase();
    const result = [];
    let currentHeader = null;
    let headerBookings = [];
    
    for (const item of bookingsWithHeaders.value) {
        if (!item) continue;
        
        if (item.type === 'header') {
            if (currentHeader && headerBookings.length > 0) {
                result.push(currentHeader);
                result.push(...headerBookings);
            }
            currentHeader = item;
            headerBookings = [];
        } else {
            const matches = (
                (item.title && item.title.toLowerCase().includes(query)) ||
                (item.guests && Array.isArray(item.guests) && 
                 item.guests.some(guest => 
                     (guest.name && guest.name.toLowerCase().includes(query)) ||
                     (guest.email && guest.email.toLowerCase().includes(query))
                 )) ||
                (item.hosts && Array.isArray(item.hosts) && 
                 item.hosts.some(host => 
                     (host.name && host.name.toLowerCase().includes(query)) ||
                     (host.email && host.email.toLowerCase().includes(query))
                 ))
            );
            
            if (matches) {
                headerBookings.push(item);
            }
        }
    }
    
    if (currentHeader && headerBookings.length > 0) {
        result.push(currentHeader);
        result.push(...headerBookings);
    }
    
    return result;
});

// Get bookings happening now
const nowBookings = computed(() => {
    const now = new Date();
    const nowStart = new Date(now.getTime() - 5 * 60 * 1000);
    const nowEnd = new Date(now.getTime() + 5 * 60 * 1000);
    
    return eventBookings.value.filter(booking => {
        if (!booking || booking.type === 'header') return false;
        
        // Parse server time as UTC
        const [datePart, timePart] = booking.originalStartTime.split(' ');
        const startTime = new Date(`${datePart}T${timePart}Z`);
        
        return startTime >= nowStart && startTime <= nowEnd && booking.status === 'confirmed';
    });
});

// Load ALL bookings at once (past + upcoming + canceled + pending)
async function loadBookings() {
    try {
        isLoading.value = true;
        
        const now = new Date();
        const pastStart = new Date(now.getTime() - THREE_MONTHS_MS).toISOString();
        const futureEnd = new Date(now.getTime() + THREE_MONTHS_MS).toISOString();
        
        console.log('=== LOADING BOOKINGS FOR EVENT', props.eventId, '===');
        
        // Load all types of bookings
        const [upcomingData, pastData, canceledData, pendingData] = await Promise.all([
            BookingsService.getBookings({
                status: 'upcoming',
                startTime: now.toISOString(),
                endTime: futureEnd,
                page: 1,
                pageSize: 200,
                useCache: false,
                internalOnly: true
            }),
            BookingsService.getBookings({
                status: 'past',
                startTime: pastStart,
                endTime: now.toISOString(),
                page: 1,
                pageSize: 200,
                useCache: false,
                internalOnly: true
            }),
            BookingsService.getBookings({
                status: 'canceled',
                startTime: pastStart,
                endTime: futureEnd,
                page: 1,
                pageSize: 200,
                useCache: false,
                internalOnly: true
            }),
            BookingsService.getBookings({
                status: 'pending',
                startTime: now.toISOString(),
                endTime: futureEnd,
                page: 1,
                pageSize: 200,
                useCache: false,
                internalOnly: true
            })
        ]);
        
        // Combine all bookings (filter out headers, we'll add our own)
        // Note: BookingsService already applies timezone conversion, but we need raw data
        // So we'll work with the original data and apply our own conversion
        const combinedBookings = [
            ...(upcomingData?.bookings || []),
            ...(pastData?.bookings || []),
            ...(canceledData?.bookings || []),
            ...(pendingData?.bookings || [])
        ].filter(item => item && item.type !== 'header');
        
        // Remove duplicates by booking_id
        const uniqueBookings = [];
        const seenIds = new Set();
        
        combinedBookings.forEach(booking => {
            const bookingId = booking.booking_id || booking.id;
            if (!seenIds.has(bookingId)) {
                seenIds.add(bookingId);
                // Use originalStartTime if it exists (from BookingsService conversion), otherwise use start_time
                const rawBooking = {
                    ...booking,
                    start_time: booking.originalStartTime || booking.start_time,
                    end_time: booking.originalEndTime || booking.end_time
                };
                uniqueBookings.push(rawBooking);
            }
        });
        
        allBookings.value = uniqueBookings;
        
        console.log('✅ Loaded', allBookings.value.length, 'total bookings');
        console.log('✅ Filtered to', eventBookings.value.length, 'bookings for event', props.eventId);
        
    } catch (error) {
        console.error('Failed to load bookings:', error);
        allBookings.value = [];
    } finally {
        isLoading.value = false;
    }
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

onMounted(() => {
    loadBookings();
});
</script>

<template>
    <div class="event-bookings">
        <!-- Header with STATIC stats -->
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
            <div v-if="isLoading" style="padding: 40px; text-align: center;">
                Loading bookings...
            </div>
            
            <BookingsList 
                v-else
                :bookings="filteredBookings" 
                :isLoading="isLoading"
                @refresh="handleBookingRefresh"
            />
            
           
        </div>
    </div>
</template>

<style scoped>
.event-bookings {
    display: flex;
    flex-direction: column;
    gap: 24px;
}

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
    font-size: 14px;
    background: var(--background-0);
    color: var(--text-primary);
}

.search-input:focus {
    outline: none;
    border-color: var(--primary);
}

.now-section {
    padding: 16px;
    background: var(--primary-light);
    border-radius: 12px;
    border: 1px solid var(--primary);
}

.now-indicator {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
    font-weight: 600;
    color: var(--primary);
    font-size: 14px;
}

.dot {
    width: 8px;
    height: 8px;
    background: var(--primary);
    border-radius: 50%;
    animation: pulse 2s infinite;
}

@keyframes pulse {
    0%, 100% {
        opacity: 1;
    }
    50% {
        opacity: 0.5;
    }
}

.tabs-section {
    margin-top: 8px;
}

.bookings-content {
    min-height: 200px;
}

.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 20px;
    text-align: center;
}

.empty-state h4 {
    margin: 0 0 8px 0;
    font-size: 18px;
    font-weight: 600;
    color: var(--text-primary);
}

.empty-state p {
    margin: 0;
    color: var(--text-secondary);
    font-size: 14px;
}

@media (max-width: 768px) {
    .bookings-header {
        flex-direction: column;
        align-items: flex-start;
    }
    
    .booking-stats {
        width: 100%;
        overflow-x: auto;
    }
}
</style>