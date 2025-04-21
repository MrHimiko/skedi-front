<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { storage } from '@utils/storage';
import { common } from '@utils/common';
import { BookingsService } from '@user_bookings/services/bookings';
import { timezoneUtils } from '@utils/timezone';

// Layout components
import MainLayout from '@layouts/main/view.vue';
import HeadingComponent from '@global/heading/view.vue';
import BookingsList from '@user_bookings/components/list/view.vue';
import TabsComponent from '@global/tabs/view.vue';

// State variables
const bookings = ref([]);
const isLoading = ref(true);
const currentTab = ref('upcoming');
const searchQuery = ref('');
const currentTimezone = ref(timezoneUtils.getUserTimezone());
const refreshCounter = ref(0);

// Time constants
const THREE_MONTHS_MS = 90 * 24 * 60 * 60 * 1000;
const FIVE_MINUTES_MS = 5 * 60 * 1000;

// Fetch bookings based on current tab
async function fetchBookings() {
    isLoading.value = true;
    
    try {
        const now = new Date();
        let startTime, endTime;
        
        // Set time ranges based on selected tab
        if (currentTab.value === 'upcoming') {
            startTime = now.toISOString();
            const futureDate = new Date(now.getTime() + THREE_MONTHS_MS);
            endTime = futureDate.toISOString();
        } else if (currentTab.value === 'past') {
            const pastDate = new Date(now.getTime() - THREE_MONTHS_MS);
            startTime = pastDate.toISOString();
            endTime = now.toISOString();
        } else if (currentTab.value === 'pending') {
            startTime = now.toISOString();
            const futureDate = new Date(now.getTime() + THREE_MONTHS_MS);
            endTime = futureDate.toISOString();
        } else if (currentTab.value === 'canceled') {
            const pastDate = new Date(now.getTime() - THREE_MONTHS_MS);
            startTime = pastDate.toISOString();
            const futureDate = new Date(now.getTime() + THREE_MONTHS_MS);
            endTime = futureDate.toISOString();
        }
        
        // Use BookingsService with pagination and caching for efficiency
        const data = await BookingsService.getBookings({
            status: currentTab.value,
            startTime,
            endTime,
            page: 1,
            pageSize: 100,
            useCache: false // Ensure fresh data on tab switch
        });
        
        // Access the correct nested data structure
        const bookingsData = data.bookings || [];
        
        // Process bookings data
        const processedBookings = processBookingsData(bookingsData);
        bookings.value = processedBookings;
    } catch (error) {
        console.error('Error fetching bookings:', error);
        common.notification('Error loading bookings', false);
    } finally {
        isLoading.value = false;
    }
}

// Process bookings data to add additional properties and organize by date
function processBookingsData(data) {
    // Handle empty data
    if (!Array.isArray(data) || data.length === 0) {
        return [];
    }
    
    // Group bookings by date key (which includes timezone adjustment)
    const groupedBookings = {};
    const now = new Date();
    
    data.forEach(booking => {
        // Use the dateKey that was calculated in handleTimezoneConversion
        // This is already in the user's timezone and handles day boundary changes
        const dateKey = booking.dateKey;
        
        // For "Now" detection, create date objects from the formatted times in user's timezone
        const userTimezone = storage.get('user.timezone') || Intl.DateTimeFormat().resolvedOptions().timeZone;
        
        // Check if booking is happening now (±5 minutes)
        // Use current time in user's timezone
        const userNow = new Date(new Intl.DateTimeFormat('en-US', {
            timeZone: userTimezone
        }).format(now));
        
        // Use the datetime from API directly here
        const startTime = new Date(booking.start_time + 'Z');
        const endTime = new Date(booking.end_time + 'Z');
        
        const isWithinTimeFrame = 
            startTime.getTime() - FIVE_MINUTES_MS <= now.getTime() && 
            endTime.getTime() + FIVE_MINUTES_MS >= now.getTime();
        
        // Add additional properties
        const enhancedBooking = {
            ...booking,
            isNow: isWithinTimeFrame
        };
        
        // Group by date
        if (!groupedBookings[dateKey]) {
            groupedBookings[dateKey] = [];
        }
        
        groupedBookings[dateKey].push(enhancedBooking);
    });
    
    // Convert to array format with date headers - sorted by date
    const processedData = [];
    
    // Sort date keys correctly
    const sortedDateKeys = Object.keys(groupedBookings).sort((a, b) => {
        // Create dates from the formatted date strings
        return new Date(a) - new Date(b);
    });
    
    sortedDateKeys.forEach(dateKey => {
        // Add date header
        processedData.push({
            type: 'header',
            date: new Date(dateKey),
            formattedDate: dateKey, // Use the formatted date directly
            bookings: groupedBookings[dateKey]
        });
        
        // Add bookings for this date
        groupedBookings[dateKey].forEach(booking => {
            processedData.push({
                type: 'booking',
                ...booking
            });
        });
    });
    
    return processedData;
}

// Handle tab changes
function handleTabChange(event, tab) {
  currentTab.value = tab.title.toLowerCase();
  fetchBookings();
}

// Handle booking refresh
function handleBookingRefresh() {
  // Increment counter to force refresh
  refreshCounter.value++;
  // Refetch bookings with current tab
  fetchBookings();
}

// Filter bookings with search query
const filteredBookings = computed(() => {
  if (!searchQuery.value) return bookings.value;
  
  const query = searchQuery.value.toLowerCase();
  
  // Use more efficient array methods for large datasets
  return bookings.value.filter(item => {
    if (item.type === 'header') return true;
    
    // Short-circuit evaluation for efficiency
    return (
      (item.title && item.title.toLowerCase().includes(query)) ||
      (item.description && item.description.toLowerCase().includes(query)) ||
      (item.location && item.location.toLowerCase().includes(query)) ||
      (item.attendees && item.attendees.some(a => a.name && a.name.toLowerCase().includes(query)))
    );
  });
});

// Get bookings happening now
const nowBookings = computed(() => {
  return bookings.value.filter(item => item.type === 'booking' && item.isNow);
});

// Initialize bookings on component mount
onMounted(() => {
  fetchBookings();
});

// Watch for refresh counter changes
watch(refreshCounter, () => {
  fetchBookings();
});

// Define tabs configuration
const tabs = [
  { title: 'Upcoming', active: currentTab.value === 'upcoming' },
  { title: 'Pending', active: currentTab.value === 'pending' },
  { title: 'Past', active: currentTab.value === 'past' },
  { title: 'Canceled', active: currentTab.value === 'canceled' }
];
</script>

<template>
  <main-layout>
    <template #content>
      <div class="container-lg">
        <HeadingComponent title="Bookings">
            <template #right>
                <div class="heading-actions">
                    <div class="timezone-info">
                        <span class="timezone-label">Timezone:</span>
                        <span class="timezone-value">{{ currentTimezone }}</span>
                    </div>
                    <div class="search-container">
                        <input 
                            type="text" 
                            v-model="searchQuery" 
                            placeholder="Search bookings..." 
                            class="search-input"
                        />
                    </div>
                </div>
            </template>
        </HeadingComponent>
        
        <!-- Now section (highlighted current bookings) -->
        <div v-if="nowBookings.length > 0" class="now-section">
          <div class="now-indicator">
            <span class="dot"></span>
            <span class="now-text">Now</span>
          </div>
          
          <BookingsList 
            :bookings="nowBookings" 
            :isLoading="isLoading"
            highlightStyle="now"
            @refresh="handleBookingRefresh"
          />
        </div>
        
        <!-- Tabs for filtering bookings -->
        <div class="tabs-container">
          <TabsComponent 
            :tabs="tabs" 
            :active="currentTab" 
            :onClick="handleTabChange"
          />
        </div>
        
        <!-- Main bookings list -->
        <BookingsList 
          :bookings="filteredBookings" 
          :isLoading="isLoading"
          @refresh="handleBookingRefresh"
        />
      </div>
    </template>
  </main-layout>
</template>

<style>
.search-container {
  width: 300px;
}

.search-input {
  width: 100%;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid var(--border);
  font-size: 14px;
}

.now-section {
  margin-bottom: 24px;
  border-left: 3px solid #ffd600;
  padding-left: 15px;
  border-radius: 3px;
}

.now-indicator {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}

.dot {
  width: 10px;
  height: 10px;
  background-color: #ffd600;
  border-radius: 50%;
  margin-right: 8px;
}

.now-text {
  font-weight: 600;
  color: var(--text-primary);
}

.tabs-container {
  margin-bottom: 20px;
}

.heading-actions {
    display: flex;
    align-items: center;
    gap: 20px;
}

.timezone-info {
    font-size: 13px;
    color: var(--text-secondary);
}

.timezone-label {
    font-weight: 500;
    margin-right: 5px;
}

.timezone-value {
    background-color: var(--background-1);
    padding: 4px 8px;
    border-radius: 4px;
}
</style>