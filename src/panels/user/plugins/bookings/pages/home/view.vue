<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { storage } from '@utils/storage';
import { common } from '@utils/common';
import { BookingsService } from '@user_bookings/services/bookings';
import { timezoneUtils } from '@utils/timezone';
import { api } from '@utils/api';
import ToggleComponent from '@form/toggle/view.vue';
// Layout components
import MainLayout from '@layouts/main/view.vue';
import HeadingComponent from '@global/heading/view.vue';
import BookingsList from '@user_bookings/components/list/view.vue';
import TabsComponent from '@global/tabs/view.vue';
import ButtonComponent from '@form/button/view.vue';

import { syncCalendarEvents, syncSpecificCalendar } from '@user_integrations/services/CalendarSync';
async function handleSyncClick() {
  await syncCalendarEvents();
}

// State variables
const bookings = ref([]);
const isLoading = ref(true);
const currentTab = ref('upcoming');
const searchQuery = ref('');
const currentTimezone = ref(timezoneUtils.getUserTimezone());
const refreshCounter = ref(0);

// External events state
const showExternalEvents = ref(storage.get('user.showExternalEvents') === true);
const isLoadingExternalEvents = ref(false);
const showExternalEventsBool = showExternalEvents.value;

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
        
        // Safely access the nested data structure with defaults
        const bookingsData = (data && data.bookings) ? data.bookings : [];
        
        // Process bookings data
        const processedBookings = processBookingsData(bookingsData);
        bookings.value = processedBookings || []; // Ensure it's always an array
        
        // If external events are enabled, fetch them separately
        if (showExternalEvents.value) {
            await fetchExternalEvents(startTime, endTime);
        }
    } catch (error) {
        console.error('Error fetching bookings:', error);
        common.notification('Error loading bookings', false);
        bookings.value = []; // Reset to empty array on error
    } finally {
        isLoading.value = false;
    }
}

// Fetch external calendar events
async function fetchExternalEvents(startTime, endTime) {
    if (!showExternalEvents.value) return;
    
    isLoadingExternalEvents.value = true;
    
    try {
        // Format dates for query params
        const startDate = new Date(startTime).toISOString().split('T')[0];
        const endDate = new Date(endTime).toISOString().split('T')[0];
        
        // Build query params
        const params = new URLSearchParams({
            start_date: startDate,
            end_date: endDate,
            sync: 'auto'
        });
        
        // Call the API directly
        const response = await api.get(`user/integrations/events?${params.toString()}`);
        
        if (response && response.success && response.data && Array.isArray(response.data.events)) {
            // Process events with timezone handling - use the same approach as for bookings
            const processedEvents = [];
            
            // Get stored timezone or default to browser
            const userTimezone = storage.get('user.timezone') || Intl.DateTimeFormat().resolvedOptions().timeZone;
            
            for (const event of response.data.events) {
                try {
                    // Make sure startTime is a valid date string
                    if (!event.start_time) continue;
                    
                    // Extract date and time parts - handle both formats
                    // Server might return "2025-05-15 09:30:00" or ISO format
                    let startDateTime, endDateTime;
                    
                    if (event.start_time.includes('T')) {
                        // It's an ISO string
                        startDateTime = new Date(event.start_time);
                        endDateTime = new Date(event.end_time || event.start_time);
                    } else {
                        // It's in the format "2025-05-15 09:30:00"
                        const [startDatePart, startTimePart] = event.start_time.split(' ');
                        const [endDatePart, endTimePart] = event.end_time ? event.end_time.split(' ') : [startDatePart, "00:00:00"];
                        
                        // Parse as UTC to preserve the exact time point
                        startDateTime = new Date(`${startDatePart}T${startTimePart}Z`);
                        endDateTime = new Date(`${endDatePart}T${endTimePart}Z`);
                    }
                    
                    // Format time in user's timezone
                    const userTimeFormatter = new Intl.DateTimeFormat('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false,
                        timeZone: userTimezone
                    });
                    
                    // Format date in user's timezone
                    const userDateFormatter = new Intl.DateTimeFormat('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        weekday: 'long',
                        timeZone: userTimezone
                    });
                    
                    // Create the needed properties with timezone-adjusted values
                    const processedEvent = {
                        ...event,
                        type: 'external_event',
                        formattedStart: userTimeFormatter.format(startDateTime),
                        formattedEnd: userTimeFormatter.format(endDateTime),
                        dateKey: userDateFormatter.format(startDateTime)
                    };
                    
                    processedEvents.push(processedEvent);
                } catch (err) {
                    console.error('Error processing external event:', err, event);
                }
            }
            
            // If we have processed events, add them to the bookings
            if (processedEvents.length > 0) {
                addExternalEventsToBookings(processedEvents);
            }
        }
    } catch (error) {
        console.error('Error fetching external events:', error);
    } finally {
        isLoadingExternalEvents.value = false;
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
        // Skip if booking is missing required properties
        if (!booking || !booking.dateKey) return;
        
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

// Add external events to the bookings list with proper date headers
function addExternalEventsToBookings(events) {
    if (!Array.isArray(events) || events.length === 0) return;
    if (!Array.isArray(bookings.value)) {
        bookings.value = []; // Ensure bookings.value is an array
    }
    
    // Create a map of all date headers
    const dateHeaders = {};
    const bookingsList = [...bookings.value];
    
    // First find all existing date headers
    bookingsList.forEach((item, index) => {
        if (item && item.type === 'header') {
            dateHeaders[item.formattedDate] = index;
        }
    });
    
    // Group events by dateKey
    const eventsByDate = {};
    events.forEach(event => {
        if (!event || !event.dateKey) return;
        
        if (!eventsByDate[event.dateKey]) {
            eventsByDate[event.dateKey] = [];
        }
        
        eventsByDate[event.dateKey].push(event);
    });
    
    // For each date group, either add to existing header or create new one
    Object.entries(eventsByDate).forEach(([dateKey, dateEvents]) => {
        // If we have a header for this date already
        if (dateHeaders[dateKey] !== undefined) {
            const headerIndex = dateHeaders[dateKey];
            
            // Find all events already under this header
            let nextHeaderIndex = -1;
            for (let i = headerIndex + 1; i < bookingsList.length; i++) {
                if (bookingsList[i] && bookingsList[i].type === 'header') {
                    nextHeaderIndex = i;
                    break;
                }
            }
            
            // Insert at appropriate position
            if (nextHeaderIndex === -1) {
                // No next header, append to the end
                bookingsList.push(...dateEvents);
            } else {
                // Insert before the next header
                bookingsList.splice(nextHeaderIndex, 0, ...dateEvents);
            }
        } else {
            // We don't have this date yet, create a new header and add events
            
            // Find where to insert this date (in chronological order)
            const headerDate = new Date(dateKey);
            let insertIndex = bookingsList.length;
            
            // Find the correct position to insert
            for (let i = 0; i < bookingsList.length; i++) {
                if (bookingsList[i] && bookingsList[i].type === 'header' && 
                    new Date(bookingsList[i].formattedDate) > headerDate) {
                    insertIndex = i;
                    break;
                }
            }
            
            // Insert the new header
            const newHeader = {
                type: 'header',
                date: headerDate,
                formattedDate: dateKey
            };
            
            // Insert header and events at the correct position
            bookingsList.splice(insertIndex, 0, newHeader, ...dateEvents);
        }
    });
    
    // Sort events within each date by start time
    const finalBookings = [];
    let currentHeader = null;
    let currentEvents = [];
    
    // Group by headers
    bookingsList.forEach(item => {
        if (!item) return;
        
        if (item.type === 'header') {
            // If we have a previous header, add it and its events
            if (currentHeader) {
                finalBookings.push(currentHeader);
                
                // Sort events by start time
                currentEvents.sort((a, b) => {
                    if (!a || !a.start_time) return 1;
                    if (!b || !b.start_time) return -1;
                    return new Date(a.start_time) - new Date(b.start_time);
                });
                
                finalBookings.push(...currentEvents);
            }
            
            // Start a new header group
            currentHeader = item;
            currentEvents = [];
        } else {
            // Add to current event group
            currentEvents.push(item);
        }
    });
    
    // Add the last header and its events
    if (currentHeader) {
        finalBookings.push(currentHeader);
        
        // Sort events by start time
        currentEvents.sort((a, b) => {
            if (!a || !a.start_time) return 1;
            if (!b || !b.start_time) return -1;
            return new Date(a.start_time) - new Date(b.start_time);
        });
        
        finalBookings.push(...currentEvents);
    }
    
    // Update the bookings array
    bookings.value = finalBookings;
}

// Toggle external events visibility
function toggleExternalEvents() {
    showExternalEvents.value = !showExternalEvents.value;
    storage.set('user.showExternalEvents', showExternalEvents.value);
    
    // Re-fetch data with or without external events
    fetchBookings();
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
    // Ensure bookings.value is an array
    if (!Array.isArray(bookings.value)) {
        return [];
    }
    
    if (!searchQuery.value) return bookings.value;
    
    const query = searchQuery.value.toLowerCase();
    
    return bookings.value.filter(item => {
        // Skip null/undefined items
        if (!item) return false;
        
        // Always keep headers for structure
        if (item.type === 'header') return true;
        
        // External event search
        if (item.type === 'external_event') {
            return (
                (item.title && item.title.toLowerCase().includes(query)) ||
                (item.description && item.description.toLowerCase().includes(query)) ||
                (item.location && item.location.toLowerCase().includes(query)) ||
                (item.calendar_name && item.calendar_name.toLowerCase().includes(query))
            );
        }
        
        // Regular booking search
        return (
            (item.title && item.title.toLowerCase().includes(query)) ||
            (item.description && item.description.toLowerCase().includes(query)) ||
            (item.location && item.location.toLowerCase().includes(query)) ||
            (item.attendees && Array.isArray(item.attendees) && 
             item.attendees.some(a => a && a.name && a.name.toLowerCase().includes(query)))
        );
    });
});

// Get bookings happening now
const nowBookings = computed(() => {
    // Ensure bookings.value is an array
    if (!Array.isArray(bookings.value)) {
        return [];
    }
    
    return bookings.value.filter(item => {
        // Skip null/undefined items
        if (!item) return false;
        
        // Skip headers
        if (item.type === 'header') return false;
        
        // Regular bookings
        if (item.type === 'booking') return !!item.isNow;
        
        // For external events, check if they're happening now
        if (item.type === 'external_event') {
            try {
                const now = new Date();
                if (!item.start_time || !item.end_time) return false;
                
                const startTime = new Date(item.start_time);
                const endTime = new Date(item.end_time);
                return startTime <= now && endTime >= now;
            } catch {
                return false;
            }
        }
        
        return false;
    });
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
                
               
                <div class="top-wrapper">

                  <div class="tabs-container">
                      <TabsComponent 
                          :tabs="tabs" 
                          :active="currentTab" 
                          :onClick="handleTabChange"
                      />
                  </div>

                  <div class="toggle-container">
                    <ToggleComponent
                      id="showExternalEvents"
                      :value=showExternalEventsBool
                      v-model="showExternalEvents"
                      @change="toggleExternalEvents"
                      label="Show External Events"
                    />
                  </div>

                  <!-- Add sync button -->
                    <ButtonComponent
                      label="Sync Now"
                      as="secondary w-auto"
                      :iconLeft="{ component: PhSync, weight: 'bold' }"
                      @click="handleSyncClick"
                      :disabled="isLoadingExternalEvents"
                    />
                  
                </div>
                
                <!-- Loading indicator for external events -->
                <div v-if="isLoadingExternalEvents && !isLoading" class="external-events-loading">
                    Loading external calendar events...
                </div>
                
                <!-- Combined bookings list (includes both internal and external when toggle is on) -->
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

.toggle-container {
    display: flex;
    align-items: center;
}

.toggle-label {
    display: flex;
    align-items: center;
    cursor: pointer;
    user-select: none;
    color: var(--text-secondary);
    font-size: 14px;
}

.toggle-label input {
    margin-right: 8px;
}

.external-events-loading {
    margin-bottom: 15px;
    padding: 10px;
    text-align: center;
    background-color: var(--background-1);
    border-radius: 4px;
    color: var(--text-secondary);
    font-size: 14px;
}


.top-wrapper {
  display:flex;
  align-items:center;
  justify-content:space-between;
}

.top-wrapper .c-toggle {
  gap: 10px;
  display: flex;
}

.top-wrapper .c-toggle > .holder {order:-1;}

</style>