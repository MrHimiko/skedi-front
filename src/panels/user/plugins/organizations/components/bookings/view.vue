<!-- src/panels/user/plugins/organizations/components/bookings/view.vue -->
<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { api } from '@utils/api';
import { common } from '@utils/common';
import { UserStore } from '@stores/user';

import BookingsList from '@user_bookings/components/list/view.vue';
import TabsComponent from '@global/tabs/view.vue';
import InputComponent from '@form/input/view.vue';

import { PhMagnifyingGlass } from "@phosphor-icons/vue";

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

const userStore = UserStore();

// State
const bookings = ref([]);
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

// Current user ID
const userId = computed(() => userStore.getId());

// Filter bookings by search query
const filteredBookings = computed(() => {
    if (!searchQuery.value) return bookings.value;
    
    const query = searchQuery.value.toLowerCase();
    
    return bookings.value.filter(booking => {
        if (booking.type === 'header') return true;
        
        const searchableFields = [
            booking.event_name,
            booking.title,
            booking.customer_email,
            booking.customer_name,
            booking.notes
        ];
        
        return searchableFields.some(field => 
            field && field.toLowerCase().includes(query)
        );
    });
});

// Statistics
const stats = computed(() => {
    const result = {
        upcoming: 0,
        past: 0,
        pending: 0,
        canceled: 0,
        all: 0
    };
    
    bookings.value.forEach(booking => {
        if (booking.type === 'header') return;
        
        result.all++;
        const status = booking.status?.toLowerCase() || 'confirmed';
        
        if (status === 'pending') {
            result.pending++;
        } else if (status === 'canceled' || status === 'cancelled') {
            result.canceled++;
        } else {
            const now = new Date();
            const startTime = new Date(booking.start_time);
            
            if (startTime > now) {
                result.upcoming++;
            } else {
                result.past++;
            }
        }
    });
    
    return result;
});

// Process bookings to add required fields
function processBookings(rawBookings) {
    if (!Array.isArray(rawBookings) || rawBookings.length === 0) {
        return [];
    }
    
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const processedBookings = [];
    const groupedByDate = {};
    
    rawBookings.forEach(booking => {
        try {
            // Parse server time as UTC
            const [datePart, timePart] = booking.start_time.split(' ');
            const [endDatePart, endTimePart] = booking.end_time.split(' ');
            
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
                month: '2-digit',
                day: '2-digit',
                timeZone: userTimezone
            });
            
            const formattedStart = userTimeFormatter.format(serverDate);
            const formattedEnd = userTimeFormatter.format(serverEndDate);
            const dateKey = userDateFormatter.format(serverDate);
            
            // Create normalized booking with required properties
            const normalizedBooking = {
                ...booking,
                type: 'booking', // REQUIRED by BookingsList component
                dateKey: dateKey,
                booking_id: booking.booking_id || booking.id,
                id: booking.id || booking.booking_id,
                event_id: booking.event_id,
                start_time: booking.start_time,
                end_time: booking.end_time,
                formattedStart: formattedStart,
                formattedEnd: formattedEnd,
                title: booking.title || booking.event_name || 'Untitled Booking',
                status: booking.status || 'confirmed',
                guests: booking.guests || [],
                hosts: booking.hosts || [],
                location: booking.location || [],
                meeting_link: booking.meeting_link || null,
                color: '#FFDE0E',
                originalStartTime: booking.start_time,
                originalEndTime: booking.end_time
            };
            
            // Group by date
            if (!groupedByDate[dateKey]) {
                groupedByDate[dateKey] = [];
            }
            groupedByDate[dateKey].push(normalizedBooking);
            
        } catch (error) {
            console.error('Error normalizing booking:', error, booking);
        }
    });
    
    // Sort dates
    const sortedDates = Object.keys(groupedByDate).sort((a, b) => {
        return new Date(a) - new Date(b);
    });
    
    // Build result with headers
    sortedDates.forEach(dateKey => {
        // Add date header
        processedBookings.push({
            type: 'header',
            date: new Date(dateKey),
            formattedDate: dateKey
        });
        
        // Sort bookings within this date by start time
        const sortedBookings = groupedByDate[dateKey].sort((a, b) => {
            return new Date(a.start_time) - new Date(b.start_time);
        });
        
        processedBookings.push(...sortedBookings);
    });
    
    return processedBookings;
}

// Load bookings for the organization
async function loadBookings() {
    try {
        isLoading.value = true;
        
        if (!userId.value) {
            console.error('No user ID available');
            return;
        }
        
        // Calculate date range based on current tab
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
        
        // Build query parameters similar to /bookings page
        const params = new URLSearchParams({
            start_time: startTime,
            end_time: endTime,
            status: currentTab.value,
            organization_id: props.organizationId.toString(),
            page: '1',
            page_size: '100'
        });
        
        const apiUrl = `user/${userId.value}/bookings?${params.toString()}`;
        console.log('🔗 Organization Bookings API URL:', apiUrl);
        
        const response = await api.get(apiUrl);
        console.log('📦 Organization Bookings API response:', response);
        
        if (response && response.success) {
            const rawBookings = response.data?.bookings || [];
            console.log('📦 Raw bookings count:', rawBookings.length);
            console.log('📦 Sample raw booking:', rawBookings[0]);
            
            // Process bookings with timezone conversion and proper structure
            bookings.value = processBookings(rawBookings);
            console.log('✅ Processed bookings count:', bookings.value.length);
            console.log('✅ Sample processed booking:', bookings.value.find(b => b.type === 'booking'));
        } else {
            bookings.value = [];
            common.notification('Failed to load bookings', false);
        }
    } catch (error) {
        console.error('Failed to load bookings:', error);
        bookings.value = [];
        common.notification('Failed to load bookings', false);
    } finally {
        isLoading.value = false;
    }
}

// Handle tab change
function handleTabChange(event, tab, index) {
    currentTab.value = tabs[index].key;
    loadBookings();
}

// Refresh bookings
function refreshBookings() {
    loadBookings();
}

// Watch for organization ID changes
watch(() => props.organizationId, () => {
    loadBookings();
});

// Initialize
onMounted(() => {
    loadBookings();
});
</script>

<template>
    <div class="organization-bookings">
       
        
        <!-- Tabs -->
        <div class="bookings-tabs">
            <TabsComponent
                :tabs="tabs"
                :active="tabs.find(t => t.key === currentTab)?.title"
                :onClick="handleTabChange"
            />
        </div>
        
        <!-- Bookings List -->
        <div class="bookings-content">
            <div v-if="isLoading" class="loading-state">
                <p>Loading bookings...</p>
            </div>
            
            <div v-else-if="filteredBookings.length === 0" class="empty-state">
                <p>No {{ currentTab }} bookings found{{ searchQuery ? ' matching your search' : '' }}</p>
            </div>
            
            <BookingsList
                v-else
                :bookings="filteredBookings"
                :isLoading="isLoading"
                @refresh="refreshBookings"
            />
        </div>
    </div>
</template>

<style scoped>
.organization-bookings {
    display: flex;
    flex-direction: column;
    gap: 24px;
}

.bookings-header {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.stats-row {
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
}

.stat-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 16px;
    background: var(--background-1);
    border-radius: 8px;
    min-width: 100px;
}

.stat-label {
    font-size: 13px;
    color: var(--text-secondary);
}

.stat-value {
    font-size: 24px;
    font-weight: 600;
    color: var(--text-primary);
}

.header-actions {
    display: flex;
    gap: 12px;
}

.search-box {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 16px;
    background: var(--background-1);
    border-radius: 8px;
    border: 1px solid var(--border);
}

.search-box svg {
    color: var(--text-secondary);
}



.bookings-content {
    min-height: 200px;
}

.loading-state,
.empty-state {
    padding: 60px 20px;
    text-align: center;
}

.loading-state p,
.empty-state p {
    margin: 0;
    color: var(--text-secondary);
    font-size: 14px;
}


</style>
