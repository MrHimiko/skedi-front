<template>
    <div class="dashboard-c-calendar">
        <!-- Calendar Header with Month/Year and View Toggle -->
        <div class="calendar-header">
            <div class="header-left">
                <div class="month-navigation">
                    <button @click="navigateMonth(-1)" class="nav-btn">
                        <PhArrowLeft size="16" />
                    </button>
                    <h2 class="current-month">{{ currentMonthLabel }}</h2>
                    <button @click="navigateMonth(1)" class="nav-btn">
                        <PhArrowRight size="16" />
                    </button>
                </div>
                <button @click="goToToday" class="today-btn">Today</button>
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

        <!-- Week View Header (only show for week view) -->
        <div class="heading cal-grid" v-if="currentView === 'week'">
            <div class="days-control">
                <div @click="shiftDays('left')" class="nav-arrow"> 
                    <PhArrowLeft size="16" /> 
                </div>
                <div @click="shiftDays('right')" class="nav-arrow"> 
                    <PhArrowRight size="16" /> 
                </div>
            </div>

            <!-- Dynamic Days -->
            <div 
                v-for="(day, index) in calendarData.days" 
                :key="index" 
                :class="['heading-cell', { 'is-today': day.isToday }]"
            >
                <span>{{ day.label }}</span>
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
                <span>Show canceled events</span>
            </label>
            
            <!-- Loading indicator -->
            <div v-if="isLoading" class="loading-indicator">
                <span>Loading events...</span>
            </div>
        </div>

        <!-- Calendar Body - Week View -->
        <div class="calendar" v-if="currentView === 'week'">
            <div class="calendar-inside cal-grid">
                <div>
                    <div v-for="(hour, hourIndex) in calendarData.hours" :key="hourIndex" style="height: 80px;">
                        <div :style="{ opacity: hour === '12 AM' ? '0' : '1' }" class="calendar-time">
                            <span>{{ hour }}</span>
                        </div>
                    </div>
                </div>

                <!-- Generate Cells for Each Day -->
                <div
                    v-for="(day, dayIndex) in calendarData.days"
                    :key="dayIndex"
                    :class="['calendar-cell', { 'is-today': day.isToday }]"
                >
                    <div class="calendar-cell-inside">
                        <!-- Render Events Dynamically -->
                        <div 
                            v-for="(event, eventIndex) in getEventsForDay(dayIndex)" 
                            :key="`${dayIndex}-${eventIndex}`"
                            :class="[
                                'calendar-item',
                                event.type,
                                { 
                                    'overlapping': event.overlapping,
                                    'is-canceled': event.status === 'canceled',
                                    'is-external': event.type === 'external'
                                }
                            ]"
                            :style="getEventStyle(event, dayIndex)"
                            @click="handleEventClick(event)"
                        >
                            <!-- Source Icon for External Events -->
                            <div class="event-source-icon" v-if="event.source">
                                <img :src="getSourceIcon(event.source)" :alt="event.source" />
                            </div>
                            
                            <div class="event-content">
                                <p class="event-title">{{ event.title }}</p>
                                <span class="event-time">{{ formatEventTime(event) }}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Calendar Body - Day View -->
        <div class="calendar day-view" v-if="currentView === 'day'">
            <div class="day-view-header">
                <h3 class="day-date">{{ selectedDayLabel }}</h3>
            </div>
            <div class="day-view-content">
                <div class="day-hours">
                    <div v-for="(hour, hourIndex) in calendarData.hours" :key="hourIndex" class="day-hour-slot">
                        <div class="hour-label">{{ hour }}</div>
                        <div class="hour-content">
                            <!-- Events for this hour -->
                            <div 
                                v-for="(event, eventIndex) in getEventsForHour(hour)" 
                                :key="eventIndex"
                                :class="['day-event', event.type]"
                                @click="handleEventClick(event)"
                            >
                                <div class="event-source-icon" v-if="event.source">
                                    <img :src="getSourceIcon(event.source)" :alt="event.source" />
                                </div>
                                <div class="event-content">
                                    <p class="event-title">{{ event.title }}</p>
                                    <span class="event-time">{{ formatEventTime(event) }}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Calendar Body - Month View -->
        <div class="calendar month-view" v-if="currentView === 'month'">
            <div class="month-header">
                <div class="weekday" v-for="day in weekdays" :key="day">{{ day }}</div>
            </div>
            <div class="month-body">
                <div 
                    v-for="(week, weekIndex) in monthWeeks" 
                    :key="weekIndex" 
                    class="month-week"
                >
                    <div 
                        v-for="(day, dayIndex) in week" 
                        :key="dayIndex"
                        :class="['month-day', { 
                            'is-today': day.isToday, 
                            'other-month': day.isOtherMonth,
                            'has-events': day.events.length > 0
                        }]"
                        @click="selectDay(day)"
                    >
                        <div class="day-number">{{ day.date.getDate() }}</div>
                        <div class="day-events">
                            <div 
                                v-for="(event, eventIndex) in day.events.slice(0, 3)" 
                                :key="eventIndex"
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
    </div>
</template>

<script setup>
import './style.css';
import { ref, computed, onMounted, watch } from 'vue';
import { PhArrowLeft, PhArrowRight } from "@phosphor-icons/vue";
import { CalendarService } from '@user_dashboard/services/calendar';
import { common } from '@utils/common';

const hourHeight = 80; // 1 hour = 80px
const stepHeight = 20; // 15 minutes = 20px

// Reactive data
const currentWeekStart = ref(new Date());
const currentView = ref('week'); // 'day', 'week', 'month'
const selectedDate = ref(new Date());
const showCanceled = ref(false);
const allEvents = ref([]);
const isLoading = ref(false);

// Calendar structure
const calendarData = ref({
    days: [],
    events: [],
    hours: [
        "12 AM", "1 AM", "2 AM", "3 AM", "4 AM", "5 AM", "6 AM", "7 AM", "8 AM", "9 AM", "10 AM", "11 AM",
        "12 PM", "1 PM", "2 PM", "3 PM", "4 PM", "5 PM", "6 PM", "7 PM", "8 PM", "9 PM", "10 PM", "11 PM"
    ]
});

// Computed properties
const currentMonthLabel = computed(() => {
    const date = currentView.value === 'week' ? currentWeekStart.value : selectedDate.value;
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
});

const selectedDayLabel = computed(() => {
    return selectedDate.value.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
});

const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const monthWeeks = computed(() => {
    if (currentView.value !== 'month') return [];
    
    const year = selectedDate.value.getFullYear();
    const month = selectedDate.value.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const weeks = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= lastDay || currentDate.getDay() !== 0) {
        const week = [];
        for (let i = 0; i < 7; i++) {
            const dayEvents = allEvents.value.filter(event => {
                if (!showCanceled.value && event.status === 'canceled') return false;
                const eventDate = new Date(event.start_time);
                return eventDate.toDateString() === currentDate.toDateString();
            });
            
            week.push({
                date: new Date(currentDate),
                isToday: isDateToday(currentDate),
                isOtherMonth: currentDate.getMonth() !== month,
                events: dayEvents
            });
            currentDate.setDate(currentDate.getDate() + 1);
        }
        weeks.push(week);
        if (weeks.length >= 6) break; // Limit to 6 weeks max
    }
    
    return weeks;
});

// Initialize calendar based on current view
function initializeCalendar() {
    if (currentView.value === 'week') {
        initializeWeekView();
    } else if (currentView.value === 'day') {
        initializeDayView();
    } else if (currentView.value === 'month') {
        initializeMonthView();
    }
    fetchEvents();
}

// Initialize week view
function initializeWeekView() {
    const weekStart = getWeekStart(currentWeekStart.value);
    const days = [];
    
    for (let i = 0; i < 7; i++) {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + i);
        
        const isToday = isDateToday(date);
        
        days.push({
            date: date,
            label: formatDayLabel(date),
            isToday: isToday
        });
    }
    
    calendarData.value.days = days;
}

// Initialize day view
function initializeDayView() {
    // Day view uses selectedDate
    calendarData.value.days = [{
        date: selectedDate.value,
        label: formatDayLabel(selectedDate.value),
        isToday: isDateToday(selectedDate.value)
    }];
}

// Initialize month view
function initializeMonthView() {
    // Month view is handled by computed property monthWeeks
    calendarData.value.days = [];
}

// Get week start (Monday)
function getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
}

// Check if date is today
function isDateToday(date) {
    const today = new Date();
    return date.toDateString() === today.toDateString();
}

// Format day label
function formatDayLabel(date) {
    const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const dayName = days[date.getDay()];
    const dayNumber = date.getDate();
    return `${dayName} ${dayNumber}`;
}

// Shift days left/right
function shiftDays(direction) {
    const newDate = new Date(currentWeekStart.value);
    if (direction === 'left') {
        newDate.setDate(newDate.getDate() - 7);
    } else {
        newDate.setDate(newDate.getDate() + 7);
    }
    currentWeekStart.value = newDate;
    initializeCalendar();
}

// Fetch events from API
async function fetchEvents() {
    isLoading.value = true;
    
    try {
        console.log('🚀 Calendar fetchEvents called');
        console.log('📍 Current view:', currentView.value);
        console.log('📍 Current week start:', currentWeekStart.value);
        console.log('📍 Selected date:', selectedDate.value);
        
        let startDate, endDate;
        
        if (currentView.value === 'week') {
            const weekStart = getWeekStart(currentWeekStart.value);
            startDate = weekStart;
            endDate = new Date(weekStart);
            endDate.setDate(weekStart.getDate() + 6);
            endDate.setHours(23, 59, 59, 999);
        } else if (currentView.value === 'day') {
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
    
    // Calculate overlaps
    calculateOverlaps(eventsWithPositions);
    
    console.log('🎉 Final events with positions:', eventsWithPositions);
    calendarData.value.events = eventsWithPositions;
    console.log('💾 Stored in calendarData.value.events:', calendarData.value.events);
}

// Get day index for event
function getDayIndexForEvent(event) {
    console.log('🔍 getDayIndexForEvent called for event:', event.title);
    console.log('📅 Event start_time:', event.start_time);
    
    const eventDate = new Date(event.start_time);
    console.log('📅 Parsed event date:', eventDate);
    console.log('📅 Event date string:', eventDate.toDateString());
    
    console.log('📅 Available calendar days:');
    for (let i = 0; i < calendarData.value.days.length; i++) {
        const dayDate = calendarData.value.days[i].date;
        console.log(`  Day ${i}: ${dayDate.toDateString()} (${dayDate.toISOString()})`);
        
        if (eventDate.toDateString() === dayDate.toDateString()) {
            console.log(`✅ Found matching day at index ${i}`);
            return i;
        }
    }
    
    console.log('❌ No matching day found for event');
    return -1;
}

// Calculate event position
function calculateEventPosition(startTime) {
    const date = new Date(startTime);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    return (hours * hourHeight) + (minutes * (hourHeight / 60));
}

// Calculate event height
function calculateEventHeight(startTime, endTime) {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const durationMs = end.getTime() - start.getTime();
    const durationHours = durationMs / (1000 * 60 * 60);
    return Math.max(durationHours * hourHeight, 40); // Minimum 40px height
}

// Calculate overlaps
function calculateOverlaps(events) {
    for (const event of events) {
        const overlappingEvents = events.filter(e => 
            e !== event && 
            e.dayIndex === event.dayIndex &&
            !(e.position + e.height <= event.position || e.position >= event.position + event.height)
        );
        
        event.overlapping = overlappingEvents.length > 0;
        event.overlapIndex = 0;
        event.overlapTotal = overlappingEvents.length + 1;
        
        // Calculate overlap positioning
        if (event.overlapping) {
            const sameTimeEvents = [event, ...overlappingEvents].sort((a, b) => {
                if (a.position === b.position) {
                    return a.type === 'internal' ? -1 : 1; // Internal events first
                }
                return a.position - b.position;
            });
            
            event.overlapIndex = sameTimeEvents.indexOf(event);
        }
    }
}

// Get events for specific day
function getEventsForDay(dayIndex) {
    const events = calendarData.value.events.filter(event => event.dayIndex === dayIndex);
    console.log(`📋 getEventsForDay(${dayIndex}) returning ${events.length} events:`, events.map(e => e.title));
    return events;
}

// Get event style
function getEventStyle(event, dayIndex) {
    let style = {
        top: `${event.position}px`,
        height: `${event.height}px`,
        zIndex: event.type === 'internal' ? 10 : 5
    };
    
    // Handle overlapping events
    if (event.overlapping && event.overlapTotal > 1) {
        const width = 100 / event.overlapTotal;
        const left = (width * event.overlapIndex);
        
        style.width = `${width - 2}%`;
        style.left = `${left}%`;
    }
    
    return style;
}

// Get source icon
function getSourceIcon(source) {
    const icons = {
        'google_calendar': 'https://global.divhunt.com/3858bb278694ec6c098fef9b26e059ab_2357.svg',
        'outlook': 'https://global.divhunt.com/41d16cde92f23c0849a7ddfd2065aa2e_3202.svg',
        'apple_calendar': '/icons/apple-calendar.svg'
    };
    return icons[source] || null;
}

// Format event time
function formatEventTime(event) {
    const start = new Date(event.start_time);
    const end = new Date(event.end_time);
    
    const formatTime = (date) => {
        const hours = date.getHours();
        const minutes = date.getMinutes();
        const amPm = hours >= 12 ? "PM" : "AM";
        const formattedHours = hours % 12 === 0 ? 12 : hours % 12;
        const formattedMinutes = minutes.toString().padStart(2, '0');
        return `${formattedHours}:${formattedMinutes} ${amPm}`;
    };
    
    return `${formatTime(start)} - ${formatTime(end)}`;
}

// Handle event click
function handleEventClick(event) {
    console.log('Event clicked:', event);
    
    if (event.type === 'external') {
        // Simple popup for external events
        const sourceName = getSourceDisplayName(event.source);
        const message = `Event: ${event.title}\nSource: ${sourceName}\nTime: ${event.timeRange || formatEventTime(event)}\n\nWould you like to view details in the external calendar?`;
        
        if (confirm(message)) {
            // TODO: Open external calendar link
            console.log('Open external event:', event);
        }
    } else {
        // Detailed popup for internal events
        const message = `Event: ${event.title}\nTime: ${event.timeRange || formatEventTime(event)}\nAttendees: ${event.attendees || 'You'}\nLocation: ${event.location || 'TBD'}`;
        
        if (event.joinUrl && confirm(message + '\n\nWould you like to join the meeting?')) {
            window.open(event.joinUrl, '_blank');
        } else {
            alert(message);
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

// Watch for week changes
watch(currentWeekStart, () => {
    initializeCalendar();
});

// Initialize on mount
onMounted(() => {
    initializeCalendar();
});
</script>