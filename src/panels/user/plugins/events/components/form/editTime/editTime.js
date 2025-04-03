import { ref, reactive, computed, onMounted } from 'vue';
import { common } from '@utils/common';

// Generate time options in 15-minute intervals (00:00 to 23:45)
const generateTimeOptions = () => {
    const options = [];
    for (let hour = 0; hour < 24; hour++) {
        for (let minute = 0; minute < 60; minute += 15) {
            const formattedHour = hour.toString().padStart(2, '0');
            const formattedMinute = minute.toString().padStart(2, '0');
            const timeString = `${formattedHour}:${formattedMinute}`;
            
            options.push({
                label: timeString,
                value: timeString
            });
        }
    }
    return options;
};

export const timeLogic = (props, emit) => {
    // Default structure for a day's schedule
    const createDefaultDay = (name) => ({
        name,
        enabled: false,
        startTime: '09:00',
        endTime: '17:00',
        pauses: []
    });

    // Initialize week days
    const days = reactive([
        createDefaultDay('Monday'),
        createDefaultDay('Tuesday'),
        createDefaultDay('Wednesday'),
        createDefaultDay('Thursday'),
        createDefaultDay('Friday'),
        createDefaultDay('Saturday'),
        createDefaultDay('Sunday')
    ]);

    // State for copy functionality
    const copySourceIndex = ref(null);
    const showCopyModal = ref(false);
    const selectedDays = reactive(new Set());
    
    // Generate time options for dropdowns
    const timeOptions = computed(() => generateTimeOptions());

    // Initialize with existing schedule if provided
    onMounted(() => {
        if (props.initialSchedule && props.initialSchedule.schedule) {
            console.log("Initializing with schedule:", props.initialSchedule.schedule);
            const schedule = props.initialSchedule.schedule;
            
            days.forEach((day, index) => {
                const dayName = day.name.toLowerCase();
                if (schedule[dayName]) {
                    const dayData = schedule[dayName];
                    
                    // Update enabled status
                    days[index].enabled = dayData.enabled || false;
                    
                    // Only apply times and breaks if the day is enabled
                    if (dayData.enabled) {
                        // Update times (remove seconds part if present)
                        if (dayData.start_time) {
                            days[index].startTime = dayData.start_time.substring(0, 5);
                        }
                        
                        if (dayData.end_time) {
                            days[index].endTime = dayData.end_time.substring(0, 5);
                        }
                        
                        // Update breaks/pauses
                        if (dayData.breaks && Array.isArray(dayData.breaks)) {
                            days[index].pauses = dayData.breaks.map(breakItem => ({
                                startTime: breakItem.start_time.substring(0, 5),
                                endTime: breakItem.end_time.substring(0, 5)
                            }));
                        }
                    }
                }
            });
            
            // Trigger an initial update after initialization
            setTimeout(() => updateSchedule(), 0);
        }
    });

    // Map our component format to the API format
    const mapToApiFormat = () => {
        const schedule = {};
        
        days.forEach(day => {
            const dayName = day.name.toLowerCase();
            if (day.enabled) {
                // Format time to include seconds
                const startTime = day.startTime + ':00';
                const endTime = day.endTime + ':00';
                
                // Map pauses to breaks with proper time format
                const breaks = day.pauses.map(pause => ({
                    start_time: pause.startTime + ':00',
                    end_time: pause.endTime + ':00'
                }));
                
                schedule[dayName] = {
                    enabled: true,
                    start_time: startTime,
                    end_time: endTime,
                    breaks: breaks
                };
            } else {
                // Always include disabled days with default times
                schedule[dayName] = {
                    enabled: false,
                    start_time: '09:00:00',
                    end_time: '17:00:00',
                    breaks: []
                };
            }
        });
        
        return { schedule };
    };

    // Update the schedule and emit changes
    const updateSchedule = () => {
        const apiData = mapToApiFormat();
        
        // Force reactivity update by cloning days
        days.forEach((day, index) => {
            // Ensure Vue picks up the changes
            if (day.pauses.length > 0) {
                // Touch the array to ensure reactivity
                day.pauses = [...day.pauses];
            }
        });
        
        emit('update', apiData);
    };

    // Validate time format and enforce 24-hour format (HH:MM)
    const validateTimeFormat = (timeString) => {
        // Basic regex to match 24-hour format (00:00 to 23:59)
        const regex = /^([01]\d|2[0-3]):([0-5]\d)$/;
        
        if (regex.test(timeString)) {
            return timeString;
        }
        
        // Try to auto-correct common issues
        if (/^\d{1,2}:\d{2}$/.test(timeString)) {
            // Single digit hour, add leading zero
            const parts = timeString.split(':');
            return `${parts[0].padStart(2, '0')}:${parts[1]}`;
        }
        
        if (/^\d{1,2}$/.test(timeString)) {
            // Just hours, add minutes
            return `${timeString.padStart(2, '0')}:00`;
        }
        
        // If nothing works, return a default time
        console.warn('Invalid time format:', timeString);
        return '09:00';
    };

    // Functions for day and time management
    const updateDayStatus = (dayIndex, enabled) => {
        days[dayIndex].enabled = enabled;
        // Log to verify the update
        console.log(`Day ${dayIndex} enabled: ${days[dayIndex].enabled}`);
        updateSchedule();
    };

    const updateDayTime = (dayIndex, timeType, value) => {
        // KEY FIX: Force reactivity by directly setting the value
        console.log("VALUE", value);

        const validatedTime = validateTimeFormat(value);
        days[dayIndex][timeType] = validatedTime;
        // Log to verify the update
        console.log(`Day ${dayIndex} ${timeType}: ${days[dayIndex][timeType]}`);
        updateSchedule();
    };

    const addPause = (dayIndex) => {
        days[dayIndex].pauses.push({
            startTime: '12:00',
            endTime: '13:00'
        });
        // Force reactivity update
        days[dayIndex].pauses = [...days[dayIndex].pauses];
        console.log(`Added pause to day ${dayIndex}`, days[dayIndex].pauses);
        updateSchedule();
    };

    const removePause = (dayIndex, pauseIndex) => {
        days[dayIndex].pauses.splice(pauseIndex, 1);
        // Force reactivity update
        days[dayIndex].pauses = [...days[dayIndex].pauses];
        console.log(`Removed pause from day ${dayIndex}`, days[dayIndex].pauses);
        updateSchedule();
    };

    const updatePauseTime = (dayIndex, pauseIndex, timeType, value) => {
        // KEY FIX: Force reactivity by directly setting the value
        const validatedTime = validateTimeFormat(value);
        days[dayIndex].pauses[pauseIndex][timeType] = validatedTime;
        
        // Force reactivity update for the entire pauses array
        days[dayIndex].pauses = [...days[dayIndex].pauses];
        console.log(`Updated pause time for day ${dayIndex}`, days[dayIndex].pauses);
        updateSchedule();
    };

    // Open copy modal
    const openCopyModal = (dayIndex) => {
        if (!days[dayIndex].enabled) {
            common.notification("Can't copy from a disabled day", false);
            return;
        }
        
        // Store the source day index
        copySourceIndex.value = dayIndex;

        // Clear previously selected days
        selectedDays.clear();
        
        // Show the modal
        showCopyModal.value = true;
        
        console.log("Opening copy modal with source day:", days[dayIndex]);
    };

    // Close copy modal
    const closeCopyModal = () => {
        showCopyModal.value = false;
        selectedDays.clear();
    };

    // Toggle day selection in copy modal
    const toggleDaySelection = (dayIndex) => {
        if (selectedDays.has(dayIndex)) {
            selectedDays.delete(dayIndex);
        } else {
            selectedDays.add(dayIndex);
        }
        console.log("Selected days for copy:", Array.from(selectedDays));
    };

    // Get all days except the source day for copy functionality
    const eligibleDaysForCopy = computed(() => {
        if (copySourceIndex.value === null) return [];
        
        return days.map((day, index) => ({
            ...day,
            index,
            isSource: index === copySourceIndex.value
        })).filter(day => !day.isSource);
    });

    // Apply copied time to selected days
    const applyTimesToSelectedDays = () => {
        if (copySourceIndex.value === null) return;
        
        const sourceDay = days[copySourceIndex.value];
        console.log("Source day for copying:", sourceDay);
        
        let appliedCount = 0;
        
        // Copy to all selected days
        selectedDays.forEach(targetIndex => {
            if (targetIndex !== copySourceIndex.value) {
                // Enable the day if it wasn't already enabled
                days[targetIndex].enabled = true;
                
                // Copy main times
                days[targetIndex].startTime = sourceDay.startTime;
                days[targetIndex].endTime = sourceDay.endTime;
                
                // Copy pauses - create new objects to ensure reactivity
                days[targetIndex].pauses = sourceDay.pauses.map(pause => ({
                    startTime: pause.startTime,
                    endTime: pause.endTime
                }));
                
                console.log(`Applied times to day ${targetIndex}:`, days[targetIndex]);
                
                appliedCount++;
            }
        });
        
        // Show success notification
        if (appliedCount > 0) {
            common.notification(`Times copied to ${appliedCount} day${appliedCount > 1 ? 's' : ''}`, true);
        } else {
            common.notification("No days were updated", false);
        }
        
        // Close the modal
        closeCopyModal();
        updateSchedule();
    };

    return {
        days,
        timeOptions,
        eligibleDaysForCopy,
        updateDayStatus,
        updateDayTime,
        addPause,
        removePause,
        updatePauseTime,
        openCopyModal,
        showCopyModal,
        closeCopyModal,
        selectedDays,
        toggleDaySelection,
        applyTimesToSelectedDays,
        copySourceIndex
    };
};