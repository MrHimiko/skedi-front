<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { CalendarService } from '@user_dashboard/services/calendar';
import { common } from '@utils/common';
import { popup } from '@utils/popup';
import BookingDetailView from '@user_bookings/components/detail/view.vue';
import ExternalEventPopup from '@user_dashboard/components/externalEventPopup/view.vue';
import { PhCalendarBlank, PhCaretLeft, PhCaretRight } from "@phosphor-icons/vue";

// State management
const currentView = ref('week');
const currentWeekStart = ref(new Date());
const selectedDate = ref(new Date());
const isLoading = ref(false);
const showCanceled = ref(true);

// Calendar data
const calendarData = ref({
    days: [],
    hours: [],
    events: []
});

const allEvents = ref([]);

// Computed properties
const currentMonthYear = computed(() => {
    const date = currentView.value === 'week' ? currentWeekStart.value : selectedDate.value;
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
});

const weekDays = computed(() => {
    if (currentView.value !== 'week') return [];
    
    const days = [];
    const start = new Date(currentWeekStart.value);
    start.setDate(start.getDate() - start.getDay());
    
    for (let i = 0; i < 7; i++) {
        const date = new Date(start);
        date.setDate(start.getDate() + i);
        days.push({
            date: new Date(date),
            dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
            dayNumber: date.getDate(),
            isToday: isToday(date)
        });
    }
    return days;
});

const monthDays = computed(() => {
    if (currentView.value !== 'month') return [];
    
    const year = selectedDate.value.getFullYear();
    const month = selectedDate.value.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    const current = new Date(startDate);
    
    while (current <= lastDay || current.getDay() !== 0) {
        days.push({
            date: new Date(current),
            dayNumber: current.getDate(),
            isCurrentMonth: current.getMonth() === month,
            isToday: isToday(current),
            events: getEventsForDay(current)
        });
        current.setDate(current.getDate() + 1);
    }
    
    return days;
});

// Initialize calendar
async function initializeCalendar() {
    if (currentView.value === 'week') {
        await initializeWeekView();
    } else if (currentView.value === 'day') {
        initializeDayView();
    } else if (currentView.value === 'month') {
        await initializeMonthView();
    }
}

// Initialize week view
async function initializeWeekView() {
    // Create days
    const days = [];
    const currentDate = new Date(currentWeekStart.value);
    currentDate.setDate(currentDate.getDate() - currentDate.getDay());
    
    for (let i = 0; i < 7; i++) {
        const date = new Date(currentDate);
        date.setDate(currentDate.getDate() + i);
        days.push({
            date: new Date(date),
            dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
            dayNumber: date.getDate(),
            isToday: isToday(date)
        });
    }
    
    // Create hours
    const hours = [];
    for (let i = 0; i < 24; i++) {
        const hour = i === 0 ? 12 : i > 12 ? i - 12 : i;
        const period = i < 12 ? 'AM' : 'PM';
        hours.push(`${hour} ${period}`);
    }
    
    calendarData.value = {
        days,
        hours,
        events: []
    };
    
    // Fetch events
    await fetchCalendarEvents();
}

// Initialize day view
function initializeDayView() {
    const hours = [];
    for (let i = 0; i < 24; i++) {
        const hour = i === 0 ? 12 : i > 12 ? i - 12 : i;
        const period = i < 12 ? 'AM' : 'PM';
        hours.push(`${hour} ${period}`);
    }
    
    calendarData.value = {
        days: [selectedDate.value],
        hours,
        events: getEventsForDay(selectedDate.value)
    };
}

// Initialize month view
async function initializeMonthView() {
    calendarData.value = {
        days: [],
        hours: [],
        events: []
    };
    
    await fetchCalendarEvents();
}

// Check if date is today
function isToday(date) {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
}

// Get day index for event
function getDayIndexForEvent(event) {
    if (!event || !event.start_time || !calendarData.value.days) {
        return -1;
    }
    
    const eventDate = new Date(event.start_time);
    
    return calendarData.value.days.findIndex(day => {
        if (!day || !day.date) return false;
        const dayDate = new Date(day.date);
        return eventDate.getDate() === dayDate.getDate() &&
               eventDate.getMonth() === dayDate.getMonth() &&
               eventDate.getFullYear() === dayDate.getFullYear();
    });
}

// Calculate event position
function calculateEventPosition(startTime) {
    const date = new Date(startTime);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    return (hours * 80) + (minutes / 60 * 80);
}

// Calculate event height
function calculateEventHeight(startTime, endTime) {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const durationMs = end - start;
    const durationHours = durationMs / (1000 * 60 * 60);
    return Math.max(durationHours * 80 - 2, 20);
}

// Format event time
function formatEventTime(event) {
    if (!event || !event.start_time) return '';
    
    const start = new Date(event.start_time);
    const end = event.end_time ? new Date(event.end_time) : null;
    
    const formatTime = (date) => {
        const hours = date.getHours();
        const minutes = date.getMinutes();
        const amPm = hours >= 12 ? "PM" : "AM";
        const formattedHours = hours % 12 === 0 ? 12 : hours % 12;
        const formattedMinutes = minutes.toString().padStart(2, '0');
        return `${formattedHours}:${formattedMinutes} ${amPm}`;
    };
    
    return end ? `${formatTime(start)} - ${formatTime(end)}` : formatTime(start);
}

// Handle event click - Updated to use proper modals
function handleEventClick(event) {
    console.log('Event clicked:', event);
    
    if (event.type === 'external') {
        // Use the ExternalEventPopup component for external events
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
        // Use the BookingDetailView for internal events
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
                            // Refresh calendar events if booking was modified
                            fetchCalendarEvents();
                        }
                    }
                },
                {
                    position: 'center'
                }
            );
        } else {
            console.error('No booking data available for internal event:', event);
            common.notification('Unable to load booking details', false);
        }
    }
}

// Get source display name
function getSourceDisplayName(source) {
    const names = {
        'google_calendar': 'Google Calendar',
        'outlook': 'Outlook Calendar',
        'apple_calendar': 'Apple Calendar'
    };
    return names[source] || 'External Calendar';
}

// Get events for a specific day
function getEventsForDay(date) {
    return allEvents.value.filter(event => {
        const eventDate = new Date(event.start_time);
        return eventDate.getDate() === date.getDate() &&
               eventDate.getMonth() === date.getMonth() &&
               eventDate.getFullYear() === date.getFullYear();
    });
}

// Fetch calendar events
async function fetchCalendarEvents() {
    try {
        isLoading.value = true;
        console.log('📅 Fetching calendar events...');
        
        let startDate, endDate;
        
        if (currentView.value === 'week') {
            startDate = new Date(currentWeekStart.value);
            startDate.setDate(startDate.getDate() - startDate.getDay());
            startDate.setHours(0, 0, 0, 0);
            
            endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + 6);
            endDate.setHours(23, 59, 59, 999);
        } else if (currentView.value === 'month') {
            const year = selectedDate.value.getFullYear();
            const month = selectedDate.value.getMonth();
            startDate = new Date(year, month, 1);
            endDate = new Date(year, month + 1, 0);
            endDate.setHours(23, 59, 59, 999);
        }
        
        console.log('📅 Fetching events for date range:', {
            start: startDate.toISOString(),
            end: endDate.toISOString()
        });
        
        // Use CalendarService for consistent data handling
        const events = await CalendarService.getWeekEvents(startDate);
        console.log('📦 Received events from CalendarService:', events);
        
        allEvents.value = events;
        console.log('💾 Stored in allEvents.value:', allEvents.value);
        
        updateEvents();
        
    } catch (error) {
        console.error('💥 Error fetching calendar events:', error);
        common.notification('Failed to load calendar events', false);
        allEvents.value = [];
    } finally {
        isLoading.value = false;
    }
}

// Update events based on filters
function updateEvents() {
    console.log('🔄 updateEvents called');
    console.log('📦 allEvents.value:', allEvents.value);
    console.log('🔍 showCanceled.value:', showCanceled.value);
    console.log('📍 calendarData.value.days:', calendarData.value.days);
    
    let filteredEvents = [...allEvents.value];
    
    // Filter canceled events if not showing them
    if (!showCanceled.value) {
        const beforeFilter = filteredEvents.length;
        filteredEvents = filteredEvents.filter(event => event.status !== 'canceled');
        console.log(`🚫 Filtered canceled events: ${beforeFilter} -> ${filteredEvents.length}`);
    }
    
    // Calculate positions and overlaps
    const eventsWithPositions = [];
    
    for (const event of filteredEvents) {
        console.log('🔄 Processing event for position:', event.title);
        
        const dayIndex = getDayIndexForEvent(event);
        console.log('📍 Event day index:', dayIndex);
        
        if (dayIndex === -1) {
            console.log('❌ Event not in current view days, skipping');
            continue;
        }
        
        const position = calculateEventPosition(event.start_time);
        const height = calculateEventHeight(event.start_time, event.end_time);
        
        console.log('📐 Event position/height:', { position, height });
        
        const eventWithPosition = {
            ...event,
            dayIndex,
            position,
            height,
            overlapping: false
        };
        
        eventsWithPositions.push(eventWithPosition);
        console.log('✅ Added event with position:', eventWithPosition.title);
    }
    
    // Calculate overlaps (simplified)
    for (let i = 0; i < eventsWithPositions.length; i++) {
        for (let j = i + 1; j < eventsWithPositions.length; j++) {
            const event1 = eventsWithPositions[i];
            const event2 = eventsWithPositions[j];
            
            if (event1.dayIndex === event2.dayIndex) {
                const overlap = 
                    (event1.position < event2.position + event2.height) &&
                    (event1.position + event1.height > event2.position);
                
                if (overlap) {
                    event1.overlapping = true;
                    event2.overlapping = true;
                }
            }
        }
    }
    
    calendarData.value.events = eventsWithPositions;
    console.log('✅ Final events with positions:', calendarData.value.events);
}

// View management functions
function setView(view) {
    currentView.value = view;
    initializeCalendar();
}

function navigateMonth(direction) {
    if (currentView.value === 'week') {
        const newDate = new Date(currentWeekStart.value);
        newDate.setMonth(newDate.getMonth() + direction);
        currentWeekStart.value = newDate;
    } else {
        const newDate = new Date(selectedDate.value);
        newDate.setMonth(newDate.getMonth() + direction);
        selectedDate.value = newDate;
    }
    initializeCalendar();
}

function goToToday() {
    const today = new Date();
    if (currentView.value === 'week') {
        currentWeekStart.value = today;
    } else {
        selectedDate.value = today;
    }
    initializeCalendar();
}

function selectDay(day) {
    selectedDate.value = day.date;
    setView('day');
}

// Get events for specific hour (day view)
function getEventsForHour(hour) {
    if (currentView.value !== 'day') return [];
    
    const hourNumber = parseHour(hour);
    return calendarData.value.events.filter(event => {
        const eventHour = new Date(event.start_time).getHours();
        return eventHour === hourNumber;
    });
}

// Parse hour string to number
function parseHour(hourStr) {
    const [time, period] = hourStr.split(' ');
    let hour = parseInt(time);
    if (period === 'PM' && hour !== 12) hour += 12;
    if (period === 'AM' && hour === 12) hour = 0;
    return hour;
}

// Watch for week changes
watch(currentWeekStart, () => {
    initializeCalendar();
});

// Initialize on mount
onMounted(() => {
    initializeCalendar();
});
</script>

<template>
    <div class="dashboard-c-calendar">
        <!-- Calendar Header -->
        <div class="calendar-header">
            <div class="header-left">
                <div class="month-navigation">
                    <button class="nav-btn" @click="navigateMonth(-1)">
                        <PhCaretLeft :size="20" />
                    </button>
                    <h2 class="current-month">{{ currentMonthYear }}</h2>
                    <button class="nav-btn" @click="navigateMonth(1)">
                        <PhCaretRight :size="20" />
                    </button>
                </div>
                <button class="today-btn" @click="goToToday">Today</button>
            </div>
            
            <div class="header-right">
                <div class="view-toggle">
                    <button 
                        :class="['view-btn', { active: currentView === 'day' }]"
                        @click="setView('day')"
                    >
                        Day
                    </button>
                    <button 
                        :class="['view-btn', { active: currentView === 'week' }]"
                        @click="setView('week')"
                    >
                        Week
                    </button>
                    <button 
                        :class="['view-btn', { active: currentView === 'month' }]"
                        @click="setView('month')"
                    >
                        Month
                    </button>
                </div>
            </div>
        </div>
        
        <!-- Calendar Filters -->
        <div class="calendar-filters">
            <label class="filter-toggle">
                <input 
                    type="checkbox" 
                    v-model="showCanceled"
                    @change="updateEvents"
                />
                Show canceled events
            </label>
            
            <div v-if="isLoading" class="loading-indicator">
                Loading events...
            </div>
        </div>
        
        <!-- Week View -->
        <div v-if="currentView === 'week'" class="calendar">
            <div class="cal-grid">
                <!-- Header row -->
                <div class="heading"></div>
                <div 
                    v-for="(day, index) in calendarData.days" 
                    :key="`heading-${index}`"
                    :class="['heading-cell', { 'is-today': day.isToday }]"
                >
                    <div>{{ day.dayName }} {{ day.dayNumber }}</div>
                </div>
                
                <!-- Time rows -->
                <template v-for="(hour, hourIndex) in calendarData.hours" :key="`hour-${hourIndex}`">
                    <div class="calendar-time">
                        <div>{{ hour }}</div>
                    </div>
                    <div 
                        v-for="(day, dayIndex) in calendarData.days" 
                        :key="`cell-${hourIndex}-${dayIndex}`"
                        :class="['calendar-cell', { 'is-today': day.isToday }]"
                    >
                        <div class="calendar-cell-inside" v-if="hourIndex === 0">
                            <!-- Events positioned absolutely within first hour cell -->
                            <div
                                v-for="event in calendarData.events.filter(e => e.dayIndex === dayIndex)"
                                :key="`event-${event.id}`"
                                :class="[
                                    'calendar-item',
                                    event.type,
                                    {
                                        'is-canceled': event.status === 'canceled',
                                        'overlapping': event.overlapping
                                    }
                                ]"
                                :style="{
                                    top: `${event.position}px`,
                                    height: `${event.height}px`,
                                    zIndex: event.overlapping ? 10 : 1
                                }"
                                @click="handleEventClick(event)"
                            >
                                <div v-if="event.source" class="event-source-icon">
                                    <img 
                                        v-if="event.source === 'google_calendar'"
                                        src="https://global.divhunt.com/3858bb278694ec6c098fef9b26e059ab_2357.svg"
                                        alt="Google Calendar"
                                    />
                                    <img 
                                        v-else-if="event.source === 'outlook'"
                                        src="https://global.divhunt.com/3858bb278694ec6c098fef9b26e059ab_2357.svg"
                                        alt="Outlook"
                                    />
                                    <PhCalendarBlank v-else :size="16" />
                                </div>
                                <div class="event-content">
                                    <div class="event-title">{{ event.title }}</div>
                                    <div class="event-time">{{ event.timeRange || formatEventTime(event) }}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </template>
            </div>
        </div>
        
        <!-- Day View -->
        <div v-else-if="currentView === 'day'" class="day-view">
            <div class="day-view-header">
                <h3 class="day-date">
                    {{ selectedDate.toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        month: 'long', 
                        day: 'numeric', 
                        year: 'numeric' 
                    }) }}
                </h3>
            </div>
            
            <div class="day-hours">
                <div v-for="hour in calendarData.hours" :key="hour" class="day-hour-slot">
                    <div class="hour-label">{{ hour }}</div>
                    <div class="hour-content">
                        <div
                            v-for="event in getEventsForHour(hour)"
                            :key="event.id"
                            :class="['day-event', event.type, { 'is-canceled': event.status === 'canceled' }]"
                            @click="handleEventClick(event)"
                        >
                            <div v-if="event.source" class="event-source-icon">
                                <img 
                                    v-if="event.source === 'google_calendar'"
                                    src="https://global.divhunt.com/3858bb278694ec6c098fef9b26e059ab_2357.svg"
                                    alt="Google Calendar"
                                />
                                <img 
                                    v-else-if="event.source === 'outlook'"
                                    src="https://global.divhunt.com/3858bb278694ec6c098fef9b26e059ab_2357.svg"
                                    alt="Outlook"
                                />
                                <PhCalendarBlank v-else :size="16" />
                            </div>
                            <div class="event-content">
                                <div class="event-title">{{ event.title }}</div>
                                <div class="event-time">{{ formatEventTime(event) }}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Month View -->
        <div v-else-if="currentView === 'month'" class="month-view">
            <div class="month-weekdays">
                <div v-for="day in ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']" :key="day" class="weekday">
                    {{ day }}
                </div>
            </div>
            
            <div class="month-grid">
                <div 
                    v-for="(day, index) in monthDays" 
                    :key="index"
                    :class="[
                        'month-day',
                        {
                            'other-month': !day.isCurrentMonth,
                            'is-today': day.isToday
                        }
                    ]"
                    @click="selectDay(day)"
                >
                    <div class="day-number">{{ day.dayNumber }}</div>
                    <div class="day-events">
                        <div
                            v-for="(event, eventIndex) in day.events.slice(0, 3)"
                            :key="event.id"
                            :class="['month-event', event.type]"
                            @click.stop="handleEventClick(event)"
                        >
                            {{ event.title }}
                        </div>
                        <div v-if="day.events.length > 3" class="more-events">
                            +{{ day.events.length - 3 }} more
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style src="./style.css"></style>