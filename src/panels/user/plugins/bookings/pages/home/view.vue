<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { storage } from '@utils/storage';
import { common } from '@utils/common';
import { BookingsService } from '@user_bookings/services/bookings';
import { timezoneUtils } from '@utils/timezone';
import { api } from '@utils/api';
import ToggleComponent from '@form/toggle/view.vue';
import MainLayout from '@layouts/main/view.vue';
import HeadingComponent from '@global/heading/view.vue';
import BookingsList from '@user_bookings/components/list/view.vue';
import TabsComponent from '@global/tabs/view.vue';
import ButtonComponent from '@form/button/view.vue';
import { PhArrowsClockwise, PhQuestion } from "@phosphor-icons/vue";

// State
const bookings = ref([]);
const isLoading = ref(true);
const currentTab = ref('upcoming');
const searchQuery = ref('');
const currentTimezone = ref(timezoneUtils.getUserTimezone());
const refreshCounter = ref(0);
const showExternalEvents = ref(storage.get('user.showExternalEvents') === true);
const isLoadingExternalEvents = ref(false);

// Constants
const THREE_MONTHS_MS = 90 * 24 * 60 * 60 * 1000;
const FIVE_MINUTES_MS = 5 * 60 * 1000;


const isExternalEventsEnabled = computed(() => {
    return currentTab.value === 'upcoming' || currentTab.value === 'past';
});


// Sync calendar events
async function handleSyncClick() {
    isLoadingExternalEvents.value = true;
    try {
        await fetchBookings();
        common.notification('Calendar sync completed', true);
    } catch (error) {
        console.error('Error syncing calendar:', error);
        common.notification('Failed to sync calendar', false);
    } finally {
        isLoadingExternalEvents.value = false;
    }
}

// Fetch bookings based on current tab
async function fetchBookings() {
    isLoading.value = true;
    
    try {
        const now = new Date();
        let startTime, endTime;
        
        // Set time ranges based on selected tab
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
        
        const data = await BookingsService.getBookings({
            status: currentTab.value,
            startTime,
            endTime,
            page: 1,
            pageSize: 100,
            useCache: false
        });
        
        const bookingsData = (data && data.bookings) ? data.bookings : [];
        const processedBookings = processBookingsData(bookingsData);
        bookings.value = processedBookings || [];
        
        if (showExternalEvents.value) {
            await fetchExternalEvents(startTime, endTime);
        }
    } catch (error) {
        console.error('Error fetching bookings:', error);
        common.notification('Error loading bookings', false);
        bookings.value = [];
    } finally {
        isLoading.value = false;
    }
}

// Fetch external calendar events
async function fetchExternalEvents(startTime, endTime) {
    if (!showExternalEvents.value) return;
    
    isLoadingExternalEvents.value = true;
    
    try {
        const startDate = new Date(startTime).toISOString().split('T')[0];
        const endDate = new Date(endTime).toISOString().split('T')[0];
        
        const params = new URLSearchParams({
            start_date: startDate,
            end_date: endDate,
            sync: 'force'
        });
        
        const response = await api.get(`user/integrations/events?${params.toString()}`);
        
        if (response && response.success && response.data && Array.isArray(response.data.events)) {
            const processedEvents = processExternalEvents(response.data.events);
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

// Process external events
function processExternalEvents(events) {
    const processedEvents = [];
    const userTimezone = storage.get('user.timezone') || Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    console.log("WOW", events);
    // Get all internal bookings for duplicate checking
    const internalBookings = bookings.value.filter(item => 
        item && item.type === 'booking'
    );
    
    for (const event of events) {
        try {
            if (!event.start_time) continue;
            
            // Check if this external event is a duplicate of any internal booking
            let isDuplicate = false;
            for (const booking of internalBookings) {
                if (BookingsService.areEventsDuplicate(booking, event)) {
                    isDuplicate = true;
                    break;
                }
            }
            
            // Skip if duplicate
            if (isDuplicate) continue;
            
            let startDateTime, endDateTime;
            
            if (event.start_time.includes('T')) {
                startDateTime = new Date(event.start_time);
                endDateTime = new Date(event.end_time || event.start_time);
            } else {
                const [startDatePart, startTimePart] = event.start_time.split(' ');
                const [endDatePart, endTimePart] = event.end_time ? event.end_time.split(' ') : [startDatePart, "00:00:00"];
                startDateTime = new Date(`${startDatePart}T${startTimePart}Z`);
                endDateTime = new Date(`${endDatePart}T${endTimePart}Z`);
            }
            
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
            
            const dateKey = userDateFormatter.format(startDateTime);
            
            const processedEvent = {
                ...event,
                type: 'external_event',
                formattedStart: userTimeFormatter.format(startDateTime),
                formattedEnd: userTimeFormatter.format(endDateTime),
                dateKey,
                uniqueId: `ext_${event.source}_${event.source_id}`,
                startTimeMs: startDateTime.getTime(),
                endTimeMs: endDateTime.getTime()
            };
            
            processedEvents.push(processedEvent);
        } catch (err) {
            console.error('Error processing external event:', err, event);
        }
    }
    
    return processedEvents;
}

// Process bookings data to add additional properties and organize by date
function processBookingsData(data) {
    if (!Array.isArray(data) || data.length === 0) {
        return [];
    }
    
    const groupedBookings = {};
    const now = new Date();
    
    data.forEach(booking => {
        if (!booking || !booking.dateKey) return;
        
        const dateKey = booking.dateKey;
        const startTime = new Date(booking.start_time + 'Z');
        const endTime = new Date(booking.end_time + 'Z');
        
        const isWithinTimeFrame = 
            startTime.getTime() - FIVE_MINUTES_MS <= now.getTime() && 
            endTime.getTime() + FIVE_MINUTES_MS >= now.getTime();
        
        const enhancedBooking = {
            ...booking,
            isNow: isWithinTimeFrame
        };
        
        if (!groupedBookings[dateKey]) {
            groupedBookings[dateKey] = [];
        }
        
        groupedBookings[dateKey].push(enhancedBooking);
    });
    
    const processedData = [];
    const sortedDateKeys = Object.keys(groupedBookings).sort((a, b) => {
        return new Date(a) - new Date(b);
    });
    
    sortedDateKeys.forEach(dateKey => {
        processedData.push({
            type: 'header',
            date: new Date(dateKey),
            formattedDate: dateKey,
            bookings: groupedBookings[dateKey]
        });
        
        groupedBookings[dateKey].forEach(booking => {
            processedData.push({
                type: 'booking',
                ...booking
            });
        });
    });
    
    return processedData;
}

// Add external events to bookings list
function addExternalEventsToBookings(events) {
    if (!Array.isArray(events) || events.length === 0) return;
    if (!Array.isArray(bookings.value)) {
        bookings.value = [];
    }
    
    const processedEventIds = new Set();
    const dateHeaders = {};
    const bookingsList = [...bookings.value];
    
    bookingsList.forEach((item, index) => {
        if (item && item.type === 'header') {
            dateHeaders[item.formattedDate] = index;
        }
    });
    
    const eventsByDate = {};
    events.forEach(event => {
        if (!event || !event.dateKey || processedEventIds.has(event.id)) return;
        processedEventIds.add(event.id);
        if (!eventsByDate[event.dateKey]) {
            eventsByDate[event.dateKey] = [];
        }
        eventsByDate[event.dateKey].push(event);
    });
    
    const finalBookings = [];
    let hasAddedEvents = false;
    
    const existingHeaders = new Set();
    bookingsList.forEach(item => {
        if (item && item.type === 'header') {
            existingHeaders.add(item.formattedDate);
        }
    });
    
    Object.entries(eventsByDate).forEach(([dateKey, dateEvents]) => {
        hasAddedEvents = true;
        
        if (!existingHeaders.has(dateKey)) {
            const headerDate = new Date(dateKey);
            const newHeader = {
                type: 'header',
                date: headerDate,
                formattedDate: dateKey
            };
            finalBookings.push(newHeader);
            finalBookings.push(...dateEvents);
        } else {
            const headerIndex = bookingsList.findIndex(item => 
                item && item.type === 'header' && item.formattedDate === dateKey
            );
            
            if (headerIndex !== -1) {
                let nextHeaderIndex = bookingsList.findIndex((item, i) => 
                    i > headerIndex && item && item.type === 'header'
                );
                
                if (nextHeaderIndex === -1) nextHeaderIndex = bookingsList.length;
                
                const eventsToInsert = dateEvents.filter(event => 
                    !bookingsList.some(item => item && item.id === event.id)
                );
                
                if (eventsToInsert.length > 0) {
                    bookingsList.splice(nextHeaderIndex, 0, ...eventsToInsert);
                }
            }
        }
    });
    
    if (hasAddedEvents) {
        const combinedList = [...bookingsList, ...finalBookings];
        const sortedHeaders = [];
        const itemsByHeader = {};
        
        combinedList.forEach(item => {
            if (!item) return;
            
            if (item.type === 'header') {
                if (!sortedHeaders.some(h => h.formattedDate === item.formattedDate)) {
                    sortedHeaders.push(item);
                    itemsByHeader[item.formattedDate] = [];
                }
            } else if (item.dateKey) {
                if (!itemsByHeader[item.dateKey]) {
                    itemsByHeader[item.dateKey] = [];
                }
                if (!itemsByHeader[item.dateKey].some(i => i.id === item.id)) {
                    itemsByHeader[item.dateKey].push(item);
                }
            }
        });
        
        sortedHeaders.sort((a, b) => new Date(a.formattedDate) - new Date(b.formattedDate));
        
        const result = [];
        sortedHeaders.forEach(header => {
            result.push(header);
            const events = itemsByHeader[header.formattedDate] || [];
            events.sort((a, b) => {
                if (!a || !a.start_time) return 1;
                if (!b || !b.start_time) return -1;
                return new Date(a.start_time) - new Date(b.start_time);
            });
            result.push(...events);
        });
        
        bookings.value = result;
    } else {
        bookings.value = bookingsList;
    }
}

// Toggle external events visibility
function toggleExternalEvents() {
    if (!isExternalEventsEnabled.value) {
        showExternalEvents.value = false;
        storage.set('user.showExternalEvents', false);
        return;
    }
    
    showExternalEvents.value = !showExternalEvents.value;
    storage.set('user.showExternalEvents', showExternalEvents.value);
    fetchBookings();
}
// Handle tab changes
function handleTabChange(event, tab) {
    currentTab.value = tab.title.toLowerCase();
    
    // Disable external events for pending/canceled tabs
    if (!isExternalEventsEnabled.value && showExternalEvents.value) {
        showExternalEvents.value = false;
        storage.set('user.showExternalEvents', false);
    }
    
    fetchBookings();
}

// Handle booking refresh
function handleBookingRefresh() {
    refreshCounter.value++;
    fetchBookings();
}

// Filter bookings with search query
const filteredBookings = computed(() => {
    if (!Array.isArray(bookings.value)) {
        return [];
    }
    
    if (!searchQuery.value) return bookings.value;
    
    const query = searchQuery.value.toLowerCase();
    
    return bookings.value.filter(item => {
        if (!item) return false;
        if (item.type === 'header') return true;
        
        if (item.type === 'external_event') {
            return (
                (item.title && item.title.toLowerCase().includes(query)) ||
                (item.description && item.description.toLowerCase().includes(query)) ||
                (item.location && item.location.toLowerCase().includes(query)) ||
                (item.calendar_name && item.calendar_name.toLowerCase().includes(query))
            );
        }
        
        return (
            (item.title && item.title.toLowerCase().includes(query)) ||
            (item.description && item.description.toLowerCase().includes(query)) ||
            (item.guests && Array.isArray(item.guests) && 
             item.guests.some(g => g && ((g.name && g.name.toLowerCase().includes(query)) || 
                                       (g.email && g.email.toLowerCase().includes(query))))) ||
            (item.hosts && Array.isArray(item.hosts) && 
             item.hosts.some(h => h && ((h.name && h.name.toLowerCase().includes(query)) || 
                                      (h.email && h.email.toLowerCase().includes(query)))))
        );
    });
});

// Get bookings happening now
const nowBookings = computed(() => {
    if (!Array.isArray(bookings.value)) {
        return [];
    }
    
    return bookings.value.filter(item => {
        if (!item) return false;
        if (item.type === 'header') return false;
        
        if (item.type === 'booking') return !!item.isNow;
        
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

onMounted(() => {
    fetchBookings();
});

watch(isExternalEventsEnabled, (newValue) => {
    if (!newValue && showExternalEvents.value) {
        showExternalEvents.value = false;
        storage.set('user.showExternalEvents', false);
    }
});

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
                
                <!-- Now section -->
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
                            :value="showExternalEvents"
                            v-model="showExternalEvents"
                            @change="toggleExternalEvents"
                            label="Show External Events"
                            :disabled="!isExternalEventsEnabled"
                        />
                        <p>  </p>

                        <PhQuestion 
                            :size="16" 
                            style="color: var(--text-tertiary); cursor: help; margin-left: 8px;  " 
                            v-tooltip="{
                                content: 'Show events from connected calendar integrations',
                                placement: 'top'
                            }"
                        />

                    </div>

                    <ButtonComponent
                        label="Sync Now"
                        as="secondary w-auto"
                        :iconLeft="{ component: PhArrowsClockwise, weight: 'bold' }"
                        @click="handleSyncClick"
                        :disabled="isLoadingExternalEvents"
                        v-tooltip="{
                            content: 'Force a re sync with your calendar integrations to fetch fresh data. We cache your calendar every 30 minutes, so the information shown here may not always be up to date.',
                            placement: 'top'
                        }"
                    />
                </div>
                
                <div v-if="isLoadingExternalEvents && !isLoading" class="external-events-loading">
                    Loading external calendar events...
                </div>
                
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
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
}

.top-wrapper .c-toggle {
    gap: 10px;
    display: flex;
}

.c-toggle > div {
    margin-bottom:0;
}

.top-wrapper .c-toggle > .holder {
    order: -1;
}

.toggle-container .c-toggle[disabled='true'] {
    opacity: 0.5;
    cursor: not-allowed;
    pointer-events:none;
}
</style>