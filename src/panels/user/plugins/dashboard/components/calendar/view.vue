// src/panels/user/plugins/dashboard/components/calendar/view.vue

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
const currentMonthYear = computed(() => {
    const date = currentView.value === 'week' ? currentWeekStart.value : selectedDate.value;
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
});

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
        } else if (currentView.value === 'day') {
            // For day view, fetch events for the selected day
            startDate = new Date(selectedDate.value);
            startDate.setHours(0, 0, 0, 0);
            
            endDate = new Date(selectedDate.value);
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
        // Month view handles events differently
        calendarData.value.events = filteredEvents;
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
            
            const formatter = new Intl.DateTimeFormat('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
                timeZone: userTimezone
            });
            
            const startFormatted = formatter.format(start);
            const endFormatted = formatter.format(end);
            
            const [startHours, startMinutes] = startFormatted.split(':').map(Number);
            const [endHours, endMinutes] = endFormatted.split(':').map(Number);
            
            startHour = startHours + (startMinutes / 60);
            endHour = endHours + (endMinutes / 60);
            
            console.log('🕐 Calculated from timezone formatter:', {
                startFormatted,
                endFormatted,
                startHour,
                endHour,
                timezone: userTimezone
            });
        }
        
        // Find which day column this event belongs to (using dateKey or manual check)
        const eventDate = CalendarService.convertToUserTimezone(event.start_time);
        const eventDateFormatter = new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'numeric',
            day: 'numeric',
            timeZone: userTimezone
        });
        const eventDateStr = eventDateFormatter.format(eventDate);
        
        const dayIndex = calendarData.value.days.findIndex(day => {
            const dayDate = new Date(day.date);
            const dayDateStr = eventDateFormatter.format(dayDate);
            return dayDateStr === eventDateStr;
        });
        
        console.log('📅 Event day index:', dayIndex, 'for date:', eventDateStr);
        
        if (dayIndex === -1) {
            console.log('⚠️ Event outside current week view:', event.title);
            return null;
        }
        
        // Calculate position and height based on timezone-aware hours
        const position = (startHour * 80) + 10; // 80px per hour + 10px offset
        const duration = endHour - startHour;
        let height = duration * 80; // 80px per hour
        
        // Handle events that span across midnight
        if (endHour < startHour) {
            // Event ends next day
            height = ((24 - startHour) + endHour) * 80;
        }
        
        // Minimum height for short events
        const minHeight = 25;
        if (height < minHeight) {
            height = minHeight;
        }
        
        console.log(`📏 Event position: ${position}px, height: ${height}px (duration: ${duration}h)`);
        
        return {
            ...event,
            dayIndex,
            position,
            height,
            startHour,
            endHour,
            left: 0,
            width: 100,
            overlapping: false
        };
    }).filter(Boolean);
    
    // Group events by day
    const eventsByDay = {};
    eventsWithPositions.forEach(event => {
        if (!eventsByDay[event.dayIndex]) {
            eventsByDay[event.dayIndex] = [];
        }
        eventsByDay[event.dayIndex].push(event);
    });
    
    // Process overlaps for each day
    Object.keys(eventsByDay).forEach(dayIndex => {
        const dayEvents = eventsByDay[dayIndex];
        
        // Sort events by start time
        dayEvents.sort((a, b) => a.startHour - b.startHour);
        
        // Find overlapping groups
        const groups = [];
        dayEvents.forEach(event => {
            let placed = false;
            
            for (const group of groups) {
                const overlaps = group.some(groupEvent => {
                    return event.startHour < groupEvent.endHour && 
                           event.endHour > groupEvent.startHour;
                });
                
                if (overlaps) {
                    group.push(event);
                    placed = true;
                    break;
                }
            }
            
            if (!placed) {
                groups.push([event]);
            }
        });
        
        // Calculate positions for each group
        groups.forEach(group => {
            const count = group.length;
            if (count > 1) {
                const widthPerEvent = 100 / count;
                group.forEach((event, index) => {
                    event.width = widthPerEvent;
                    event.left = index * widthPerEvent;
                    event.overlapping = true;
                });
            } else {
                group[0].width = 100;
                group[0].left = 0;
            }
        });
    });
    
    calendarData.value.events = eventsWithPositions;
    console.log('✅ Final events with positions:', calendarData.value.events);
}

// Format event time using timezone-aware formatting
function formatEventTime(event) {
    // Use the formatted times from the service which respect user's timezone
    if (event.formattedStart && event.formattedEnd) {
        return `${event.formattedStart} - ${event.formattedEnd}`;
    }
    
    // Fallback to manual formatting
    const userTimezone = CalendarService.getUserTimezone();
    const start = CalendarService.convertToUserTimezone(event.start_time);
    const end = CalendarService.convertToUserTimezone(event.end_time);
    
    const formatter = new Intl.DateTimeFormat('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: userTimezone
    });
    
    return `${formatter.format(start)} - ${formatter.format(end)}`;
}

// Handle event click
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

// Handle Today button click - opens popup with today's events
function handleTodayClick() {
    popup.open(
        'today-events',
        null,
        TodayEventsPopup,
        {
            onEventClick: handleEventClick
        },
        {
            position: 'center'
        }
    );
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
    const userTimezone = CalendarService.getUserTimezone();
    
    return calendarData.value.events.filter(event => {
        // Use formatted start time to get the hour in user's timezone
        if (event.formattedStart) {
            const [eventHours] = event.formattedStart.split(':').map(Number);
            return eventHours === hourNumber;
        }
        
        // Fallback: format the time to get hour in user's timezone
        const startTime = CalendarService.convertToUserTimezone(event.start_time);
        const formatter = new Intl.DateTimeFormat('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: userTimezone
        });
        
        const formatted = formatter.format(startTime);
        const [eventHours] = formatted.split(':').map(Number);
        return eventHours === hourNumber;
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
                                    {
                                        'is-canceled': event.status === 'canceled',
                                        'overlapping': event.overlapping
                                    }
                                ]"
                                :style="{
                                    top: `${event.position}px`,
                                    height: `${event.height}px`,
                                    left: `${event.left}%`,
                                    width: `${event.width}%`,
                                    zIndex: event.overlapping ? 10 : 1
                                }"
                                @click="handleEventClick(event)"
                            >
                                <!-- External event source icon -->
                                <div class="event-source-icon" v-if="event.source">
                                    <img :src="event.source_icon" :alt="getSourceDisplayName(event.source)" />
                                </div>
                                
                                <div class="event-content">
                                    <div class="event-title">{{ event.title }}</div>
                                    <div class="event-time">{{ formatEventTime(event) }}</div>
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
                                { 'is-canceled': event.status === 'canceled' }
                            ]"
                            @click="handleEventClick(event)"
                        >
                            <!-- External event source icon -->
                            <div class="event-source-icon" v-if="event.source">
                                <img :src="event.source_icon" :alt="getSourceDisplayName(event.source)" />
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