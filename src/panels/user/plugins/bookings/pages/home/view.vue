<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { common } from '@utils/common';
import { BookingsService } from '@user_bookings/services/bookings';

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
      pageSize: 100 // Adjust based on expected load
    });
    
    // Process bookings data
    const processedBookings = processBookingsData(data);
    bookings.value = processedBookings;
  } catch (error) {
    console.error('Error fetching bookings:', error);
    common.notification('Error loading bookings', false);
  } finally {
    isLoading.value = false;
  }
}

// Process bookings data to add additional properties
function processBookingsData(data) {
  // Group bookings by date
  const groupedBookings = {};
  const now = new Date();
  
  // Add isNow flag for meetings happening around current time (±5 minutes)
  data.forEach(booking => {
    const startTime = new Date(booking.start_time);
    const endTime = new Date(booking.end_time);
    const dateKey = startTime.toDateString();
    
    // Check if booking is happening now (±5 minutes)
    const isWithinTimeFrame = 
      startTime.getTime() - FIVE_MINUTES_MS <= now.getTime() && 
      endTime.getTime() + FIVE_MINUTES_MS >= now.getTime();
    
    // Add additional properties
    const enhancedBooking = {
      ...booking,
      isNow: isWithinTimeFrame,
      formattedStart: formatTime(startTime),
      formattedEnd: formatTime(endTime),
      dateKey
    };
    
    // Group by date
    if (!groupedBookings[dateKey]) {
      groupedBookings[dateKey] = [];
    }
    
    groupedBookings[dateKey].push(enhancedBooking);
  });
  
  // Convert to array format with date headers
  const processedData = [];
  Object.keys(groupedBookings).sort((a, b) => new Date(a) - new Date(b)).forEach(date => {
    // Add date header
    processedData.push({
      type: 'header',
      date: new Date(date),
      bookings: groupedBookings[date]
    });
    
    // Add bookings for this date
    groupedBookings[date].forEach(booking => {
      processedData.push({
        type: 'booking',
        ...booking
      });
    });
  });
  
  return processedData;
}

function formatTime(date) {
  return date.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false 
  });
}

// Handle tab changes
function handleTabChange(event, tab) {
  currentTab.value = tab.title.toLowerCase();
  fetchBookings();
}

// Filter bookings with search query
const filteredBookings = computed(() => {
  if (!searchQuery.value) return bookings.value;
  
  return bookings.value.filter(item => {
    if (item.type === 'header') return true;
    
    // Search in various booking fields
    return (
      item.title?.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      item.location?.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      item.attendees?.some(a => a.name?.toLowerCase().includes(searchQuery.value.toLowerCase()))
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

// Define tabs configuration
const tabs = [
  { title: 'Upcoming', active: true },
  { title: 'Pending', active: false },
  { title: 'Past', active: false },
  { title: 'Canceled', active: false }
];
</script>

<template>
  <main-layout>
    <template #content>
      <div class="container-lg">
        <HeadingComponent title="Bookings">
          <template #right>
            <div class="search-container">
              <input 
                type="text" 
                v-model="searchQuery" 
                placeholder="Search bookings..." 
                class="search-input"
              />
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
</style>