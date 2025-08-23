
<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { CalendarService } from '@user_dashboard/services/calendar';
import { common } from '@utils/common';
import { popup } from '@utils/popup';
import BookingDetailView from '@user_bookings/components/detail/view.vue';
import ExternalEventPopup from '@user_dashboard/components/externalEventPopup/view.vue';
import TodayEventsPopup from '@user_dashboard/components/todayEventsPopup/view.vue';
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
const navigationLabel = computed(() => {
    if (currentView.value === 'week') {
        // Show week range like "Dec 15 - Dec 21, 2024"
        const start = new Date(currentWeekStart.value);
        start.setDate(start.getDate() - start.getDay());
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        
        const startMonth = monthNames[start.getMonth()];
        const endMonth = monthNames[end.getMonth()];
        const startDay = start.getDate();
        const endDay = end.getDate();
        const year = end.getFullYear();
        
        if (start.getMonth() === end.getMonth()) {
            // Same month
            return `${startMonth} ${startDay} - ${endDay}, ${year}`;
        } else if (start.getFullYear() === end.getFullYear()) {
            // Different months, same year
            return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
        } else {
            // Different years
            return `${startMonth} ${startDay}, ${start.getFullYear()} - ${endMonth} ${endDay}, ${year}`;
        }
    } else if (currentView.value === 'day') {
        // Show full date
        return selectedDate.value.toLocaleDateString('en-US', { 
            weekday: 'long',
            month: 'long', 
            day: 'numeric',
            year: 'numeric' 
        });
    } else {
        // Month view - show month and year
        return selectedDate.value.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
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
    
    // Create the days grid - include days from previous month to fill grid
    while (current <= lastDay || current.getDay() !== 0) {
        days.push({
            date: new Date(current),
            dayNumber: current.getDate(),
            isCurrentMonth: current.getMonth() === month,
            isToday: isToday(current),
            events: [] // Initialize empty, will be populated in updateEvents
        });
        current.setDate(current.getDate() + 1);
    }
    
    return days;
});

// Add this function to get additional CSS classes for availability events
function getAvailabilityClasses(event) {
    if (event.type !== 'availability') return '';
    
    const classes = [];
    
    if (event.title.includes('🏝️') || event.title.toLowerCase().includes('vacation')) {
        classes.push('vacation');
    } else if (event.title.includes('✈️') || event.title.toLowerCase().includes('travel')) {
        classes.push('travel');
    } else if (event.title.includes('🤒') || event.title.toLowerCase().includes('sick')) {
        classes.push('sick-leave');
    } else if (event.title.includes('📅') || event.title.toLowerCase().includes('holiday')) {
        classes.push('public-holiday');
    }
    
    return classes.join(' ');
}

// Add this function to get data attributes for event styling
function getEventDataAttributes(event) {
    return {
        'data-type': event.type || 'unknown',
        'data-source': event.source || '',
        'data-status': event.status || 'confirmed'
    };
}

// Update the getSourceDisplayName function to handle availability events
function getSourceDisplayName(source) {
    const names = {
        'google_calendar': 'Google Calendar',
        'outlook': 'Outlook Calendar',
        'apple_calendar': 'Apple Calendar',
        'out_of_office': 'Out of Office',
        'internal': 'Internal',
        'external_calendar': 'External Calendar'
    };
    return names[source] || source || 'Unknown';
}

// Initialize calendar
async function initializeCalendar() {
    if (currentView.value === 'week') {
        await initializeWeekView();
    } else if (currentView.value === 'day') {
        await initializeDayView();
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
async function initializeDayView() {
    const hours = [];
    for (let i = 0; i < 24; i++) {
        const hour = i === 0 ? 12 : i > 12 ? i - 12 : i;
        const period = i < 12 ? 'AM' : 'PM';
        hours.push(`${hour} ${period}`);
    }
    
    calendarData.value = {
        days: [selectedDate.value],
        hours,
        events: []
    };
    
    // Fetch events for the selected day
    await fetchCalendarEvents();
}

// Initialize month view
async function initializeMonthView() {
    calendarData.value = {
        days: monthDays.value,
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

// Get events for a specific day
function getEventsForDay(date) {
    return allEvents.value.filter(event => {
        const eventDate = new Date(event.start_time);
        return eventDate.getDate() === date.getDate() &&
               eventDate.getMonth() === date.getMonth() &&
               eventDate.getFullYear() === date.getFullYear();
    });
}

// FIXED: Fetch calendar events with proper date ranges for each view
async function fetchCalendarEvents() {
    try {
        isLoading.value = true;
        console.log('📅 Fetching calendar events for view:', currentView.value);
        
        let startDate, endDate;
        
        if (currentView.value === 'week') {
            startDate = new Date(currentWeekStart.value);
            startDate.setDate(startDate.getDate() - startDate.getDay());
            startDate.setHours(0, 0, 0, 0);
            
            endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + 6);
            endDate.setHours(23, 59, 59, 999);
        } else if (currentView.value === 'day') {
            // For day view, fetch events for the selected day
            startDate = new Date(selectedDate.value);
            startDate.setHours(0, 0, 0, 0);
            
            endDate = new Date(selectedDate.value);
            endDate.setHours(23, 59, 59, 999);
        } else if (currentView.value === 'month') {
            // FIXED: For month view, get the full month + surrounding days
            const year = selectedDate.value.getFullYear();
            const month = selectedDate.value.getMonth();
            
            // Start from first day of month
            const firstDayOfMonth = new Date(year, month, 1);
            // Go back to Sunday before the first day
            startDate = new Date(firstDayOfMonth);
            startDate.setDate(startDate.getDate() - firstDayOfMonth.getDay());
            startDate.setHours(0, 0, 0, 0);
            
            // End at last day of month
            const lastDayOfMonth = new Date(year, month + 1, 0);
            // Go forward to Saturday after the last day
            endDate = new Date(lastDayOfMonth);
            const daysToAdd = 6 - lastDayOfMonth.getDay();
            endDate.setDate(endDate.getDate() + daysToAdd);
            endDate.setHours(23, 59, 59, 999);
        }
        
        console.log('📅 Fetching events for date range:', {
            view: currentView.value,
            start: startDate.toISOString(),
            end: endDate.toISOString(),
            totalDays: Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24))
        });
        
        // FIXED: Use getEventsForDateRange for proper date range support
        const events = await CalendarService.getEventsForDateRange(startDate, endDate);
        console.log('📦 Received events from CalendarService:', events.length, 'events');
        
        allEvents.value = events;
        
        updateEvents();
        
    } catch (error) {
        console.error('💥 Error fetching calendar events:', error);
        common.notification('Failed to load calendar events', false);
        allEvents.value = [];
    } finally {
        isLoading.value = false;
    }
}

// FIXED: Update events with proper month view handling
function updateEvents() {
    console.log('🔄 updateEvents called');
    console.log('📦 allEvents.value:', allEvents.value.length, 'events');
    console.log('🔍 showCanceled.value:', showCanceled.value);
    console.log('📍 currentView:', currentView.value);
    
    // Filter events based on showCanceled
    let filteredEvents = showCanceled.value 
        ? allEvents.value 
        : allEvents.value.filter(event => event.status !== 'canceled');
    
    console.log('🎯 After filter, events count:', filteredEvents.length);
    
    if (currentView.value === 'week') {
        updateWeekViewEvents(filteredEvents);
    } else if (currentView.value === 'day') {
        // For day view, filter events for the selected day
        const dayEvents = filteredEvents.filter(event => {
            const eventDate = new Date(event.start_time);
            return eventDate.getDate() === selectedDate.value.getDate() &&
                   eventDate.getMonth() === selectedDate.value.getMonth() &&
                   eventDate.getFullYear() === selectedDate.value.getFullYear();
        });
        calendarData.value.events = dayEvents;
    } else if (currentView.value === 'month') {
        // FIXED: Month view - populate events for each day
        calendarData.value.events = filteredEvents;
        
        // Update each day in monthDays with its events
        const days = monthDays.value;
        days.forEach(day => {
            day.events = filteredEvents.filter(event => {
                const eventDate = new Date(event.start_time);
                return eventDate.getDate() === day.date.getDate() &&
                       eventDate.getMonth() === day.date.getMonth() &&
                       eventDate.getFullYear() === day.date.getFullYear();
            });
        });
        
        console.log('📅 Month view events populated for', days.length, 'days');
        console.log('📅 Events per day sample:', days.slice(0, 5).map(d => ({ date: d.date.toDateString(), events: d.events.length })));
    }
}

// Update week view events with positions and overlap detection
function updateWeekViewEvents(events) {
    console.log('📍 updateWeekViewEvents called with', events.length, 'events');
    const userTimezone = CalendarService.getUserTimezone();
    
    // Create events with position data
    const eventsWithPositions = events.map(event => {
        console.log('📌 Processing event:', event.title);
        
        // Use the formatted times to extract the actual hours in user's timezone
        let startHour, endHour;
        
        if (event.formattedStart && event.formattedEnd) {
            // Extract hours from formatted time strings (format: "HH:MM")
            const [startHours, startMinutes] = event.formattedStart.split(':').map(Number);
            const [endHours, endMinutes] = event.formattedEnd.split(':').map(Number);
            
            startHour = startHours + (startMinutes / 60);
            endHour = endHours + (endMinutes / 60);
            
            console.log('🕐 Using formatted times:', {
                formattedStart: event.formattedStart,
                formattedEnd: event.formattedEnd,
                startHour,
                endHour
            });
        } else {
            // Fallback: format the times to get hours in user's timezone
            const start = CalendarService.convertToUserTimezone(event.start_time);
            const end = CalendarService.convertToUserTimezone(event.end_time);
            
            startHour = start.getHours() + (start.getMinutes() / 60);
            endHour = end.getHours() + (end.getMinutes() / 60);
            
            console.log('🕐 Using fallback calculation:', {
                start: start.toString(),
                end: end.toString(),
                startHour,
                endHour
            });
        }
        
        // Calculate position and height
        const position = startHour * 80; // 80px per hour
        const height = Math.max((endHour - startHour) * 80, 20); // Minimum 20px height
        
        // Find which day this event belongs to
        const eventDate = CalendarService.convertToUserTimezone(event.start_time);
        let dayIndex = -1;
        
        calendarData.value.days.forEach((day, index) => {
            if (day.date.getDate() === eventDate.getDate() &&
                day.date.getMonth() === eventDate.getMonth() &&
                day.date.getFullYear() === eventDate.getFullYear()) {
                dayIndex = index;
            }
        });
        
        return {
            ...event,
            position,
            height,
            dayIndex,
            left: 0,
            width: 100,
            overlapping: false
        };
    });
    
    // Store events with positions
    calendarData.value.events = eventsWithPositions;
}

// Format event time for display
function formatEventTime(event) {
    if (event.formattedStart && event.formattedEnd) {
        return `${event.formattedStart} - ${event.formattedEnd}`;
    }
    
    return CalendarService.formatTimeRange(event.start_time, event.end_time);
}

// Parse hour from string to number
function parseHour(hourStr) {
    const [time, period] = hourStr.split(' ');
    let hour = parseInt(time);
    
    if (period === 'AM') {
        return hour === 12 ? 0 : hour;
    } else {
        return hour === 12 ? 12 : hour + 12;
    }
}

// Get events for specific hour (day view)
function getEventsForHour(hour) {
    if (currentView.value !== 'day') return [];
    
    const hourNumber = parseHour(hour);
    
    return calendarData.value.events.filter(event => {
        // Use formatted start time to get the hour in user's timezone
        if (event.formattedStart) {
            const [eventHours] = event.formattedStart.split(':').map(Number);
            return eventHours === hourNumber;
        }
        
        // Fallback
        const startTime = CalendarService.convertToUserTimezone(event.start_time);
        return startTime.getHours() === hourNumber;
    });
}

// Handle event click - FIXED: Pass correct data structure
function handleEventClick(event) {
    console.log('🖱️ Event clicked:', event);
    
    if (event.type === 'external') {
        // Show external event popup
        popup.open(
            'external-event-detail',
            null,
            ExternalEventPopup,
            { event },
            {
                position: 'center'
            }
        );
    } else if (event.type === 'booking' || event.type === 'internal' || event.source === 'internal') {
        // FIXED: Show internal booking details with proper data structure
        const bookingData = event.raw || {
            id: event.booking_id || event.id,
            title: event.title,
            start_time: event.start_time,
            end_time: event.end_time,
            description: event.description,
            location: event.location,
            guests: event.guests,
            status: event.status
        };
        
        popup.open(
            'booking-detail',
            null,
            BookingDetailView,
            {
                bookingId: event.booking_id || event.id,
                bookingData: bookingData,
                callback: (needsRefresh) => {
                    if (needsRefresh) {
                        // Refresh calendar if booking was modified
                        fetchCalendarEvents();
                    }
                }
            },
            {
                position: 'center'
            }
        );
    } else if (event.type === 'availability') {
        // Show availability event info (you might want to create a dedicated popup for this)
        common.notification(`${event.title}: ${event.description || 'No details'}`, true);
    }
}

// Handle today button click
function handleTodayClick() {
    const today = new Date();
    if (currentView.value === 'week') {
        currentWeekStart.value = today;
        initializeCalendar();
    } else {
        selectedDate.value = today;
        initializeCalendar();
    }
}

// View management functions
function setView(view) {
    currentView.value = view;
    initializeCalendar();
}

function navigatePeriod(direction) {
    if (currentView.value === 'week') {
        // Navigate by week
        const newDate = new Date(currentWeekStart.value);
        newDate.setDate(newDate.getDate() + (direction * 7));
        currentWeekStart.value = newDate;
        initializeCalendar();
    } else if (currentView.value === 'day') {
        // Navigate by day
        const newDate = new Date(selectedDate.value);
        newDate.setDate(newDate.getDate() + direction);
        selectedDate.value = newDate;
        initializeCalendar();
    } else if (currentView.value === 'month') {
        // Navigate by month
        const newDate = new Date(selectedDate.value);
        newDate.setMonth(newDate.getMonth() + direction);
        selectedDate.value = newDate;
        initializeCalendar();
    }
}

function selectDay(day) {
    selectedDate.value = day.date;
    setView('day');
}

// Initialize on mount
onMounted(() => {
    initializeCalendar();
});

// Watch for view changes
watch(currentView, () => {
    initializeCalendar();
});

// Watch for week changes
watch(currentWeekStart, () => {
    if (currentView.value === 'week') {
        initializeCalendar();
    }
});
</script>

<template>
    <div class="dashboard-c-calendar">
        <!-- Calendar Header -->
        <div class="calendar-header">
            <div class="header-left">
                <div class="month-navigation">
                    <button class="nav-btn" @click="navigatePeriod(-1)">
                        <PhCaretLeft :size="20" />
                    </button>
                    <h2 class="current-month">{{ navigationLabel }}</h2>
                    <button class="nav-btn" @click="navigatePeriod(1)">
                        <PhCaretRight :size="20" />
                    </button>
                </div>
                <button class="today-btn" @click="handleTodayClick">Today</button>
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
                                    getAvailabilityClasses(event),
                                    {
                                        'is-canceled': event.status === 'canceled',
                                        'overlapping': event.overlapping
                                    }
                                ]"
                                v-bind="getEventDataAttributes(event)"
                                :style="{
                                    top: `${event.position}px`,
                                    height: `${event.height}px`,
                                    left: `${event.left}%`,
                                    width: `${event.width}%`,
                                    zIndex: event.overlapping ? 10 : 1
                                }"
                                @click="handleEventClick(event)"
                            >

                                
                                <div class="event-content">
                                    <div class="event-title">{{ event.title }}</div>
                                    <div class="event-time" v-if="event.type !== 'availability'">{{ formatEventTime(event) }}</div>
                                    <div class="event-time availability-time" v-else-if="event.formattedStart && event.formattedEnd">
                                        {{ event.formattedStart }} - {{ event.formattedEnd }}
                                    </div>
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
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
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
                            :class="[
                                'day-event',
                                event.type,
                                getAvailabilityClasses(event),
                                { 'is-canceled': event.status === 'canceled' }
                            ]"
                            v-bind="getEventDataAttributes(event)"
                            @click="handleEventClick(event)"
                        >

                            
                            <div class="event-content">
                                <div class="event-title">{{ event.title }}</div>
                                <div class="event-time">{{ formatEventTime(event) }}</div>
                                <div v-if="event.description && event.type === 'availability'" class="event-description">
                                    {{ event.description }}
                                </div>
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
                            :class="[
                                'month-event', 
                                event.type,
                                getAvailabilityClasses(event),
                                { 'is-canceled': event.status === 'canceled' }
                            ]"
                            v-bind="getEventDataAttributes(event)"
                            @click.stop="handleEventClick(event)"
                            :title="`${event.title} (${formatEventTime(event)})`"
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