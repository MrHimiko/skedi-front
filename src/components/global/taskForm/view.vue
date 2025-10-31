<template>
    <PopupLayout title="Custom Task" customClass="h-auto">
        <template #content>
            <div class="task-form">
                <div class="form-group">
                    <label>From</label>
                    <div class="datetime-row">
                        <div class="date-picker-wrapper">
                            <InputComponent
                                :value="form.start_date"
                                placeholder="DD/MM/YYYY"
                                :mask="'##/##/####'"
                                :iconRight="{ component: PhCalendar }"
                                readonly
                                v-dropdown="{ 
                                    component: DatePickerDropdown, 
                                    properties: () => ({ 
                                        value: form.start_date, 
                                        onChange: handleStartDateChange
                                    }) 
                                }"
                            />
                        </div>
                        <SelectComponent
                            :value="form.start_time"
                            @change="(value) => form.start_time = value"
                            :options="timeOptions"
                            placeholder="Select time"
                        />
                    </div>
                </div>

                <div class="form-group">
                    <label>To</label>
                    <div class="datetime-row">
                        <div class="date-picker-wrapper">
                            <InputComponent
                                :value="form.end_date"
                                placeholder="DD/MM/YYYY"
                                :mask="'##/##/####'"
                                :iconRight="{ component: PhCalendar }"
                                readonly
                                v-dropdown="{ 
                                    component: DatePickerDropdown, 
                                    properties: () => ({ 
                                        value: form.end_date, 
                                        onChange: handleEndDateChange
                                    }) 
                                }"
                            />
                        </div>
                        <SelectComponent
                            :value="form.end_time"
                            @change="(value) => form.end_time = value"
                            :options="timeOptions"
                            placeholder="Select time"
                        />
                    </div>
                </div>

                <div class="form-group">
                    <label>Title</label>
                    <InputComponent
                        :value="form.title"
                        @update:value="(value) => form.title = value"
                        placeholder="Enter task title"
                    />
                </div>

                <div class="form-group">
                    <label>Description</label>
                    <TextareaComponent
                        :value="form.description"
                        @update:value="(value) => form.description = value"
                        placeholder="Enter task description (optional)"
                        :rows="4"
                    />
                </div>

                <div class="form-actions">
                    <ButtonComponent
                        label="Cancel"
                        type="secondary"
                        class="i-popup-close"
                    />
                    <ButtonComponent
                        :label="entry ? 'Update' : 'Create'"
                        type="primary"
                        :loading="saving"
                        @click="saveTask"
                    />
                </div>
            </div>
        </template>
    </PopupLayout>
</template>

<script setup>
import { ref, computed, defineComponent, h, watch } from 'vue';
import { api } from '@utils/api';
import { common } from '@utils/common';
import VueDatePicker from "@vuepic/vue-datepicker";
import "@vuepic/vue-datepicker/dist/main.css";

// Layout and Components
import PopupLayout from '@layouts/popup/view.vue';
import ButtonComponent from '@form/button/view.vue';
import InputComponent from '@form/input/view.vue';
import TextareaComponent from '@form/textarea/view.vue';
import SelectComponent from '@form/select/view.vue';

// Icons
import { PhCalendar } from "@phosphor-icons/vue";

// Define the date picker dropdown component inline
const DatePickerDropdown = defineComponent({
    props: ['value', 'onChange'],
    setup(props) {
        const parseDate = (dateString) => {
            if (!dateString) return new Date();
            const parts = dateString.split('/');
            if (parts.length === 3) {
                const [day, month, year] = parts.map(Number);
                return new Date(year, month - 1, day);
            }
            return new Date(dateString);
        };

        const formatDate = (date) => {
            const day = date.getDate().toString().padStart(2, '0');
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const year = date.getFullYear();
            return `${day}/${month}/${year}`;
        };

        const date = ref(parseDate(props.value));

        // Watch for prop changes
        watch(() => props.value, (newValue) => {
            date.value = parseDate(newValue);
        });

        const handleSelect = (modelData) => {
            if (modelData instanceof Date && !isNaN(modelData)) {
                const formatted = formatDate(modelData);
                props.onChange(formatted);
                // Close dropdown after selection
                setTimeout(() => {
                    document.querySelector('.i-dropdown-close')?.click();
                }, 100);
            }
        };

        return () => h('div', { class: 'date-picker-dropdown' }, [
            h(VueDatePicker, {
                modelValue: date.value,
                'onUpdate:modelValue': handleSelect,
                inline: true,
                autoApply: true,
                enableTimePicker: false,
                format: 'dd/MM/yyyy',
                locale: 'en-GB',
                hideOffsetDates: true,
                monthChangeOnScroll: false
            })
        ]);
    }
});

const props = defineProps({
    entry: {
        type: Object,
        default: null
    },
    callback: {
        type: Function,
        required: true
    }
});

// Generate time options in 30-minute intervals
const timeOptions = computed(() => {
    const options = [];
    for (let hour = 0; hour < 24; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
            const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
            options.push({ 
                value: time, 
                label: time 
            });
        }
    }
    // Add 23:59 as the last option
    options.push({ 
        value: '23:59', 
        label: '23:59' 
    });
    return options;
});

// Form state
const saving = ref(false);

// Initialize form with separate date and time fields
const initializeForm = () => {
    if (props.entry) {
        // Parse UTC time and convert to local time
        // Ensure we're parsing as UTC by adding 'Z' if not present
        const startTimeStr = props.entry.start_time + (props.entry.start_time.endsWith('Z') ? '' : 'Z');
        const endTimeStr = props.entry.end_time + (props.entry.end_time.endsWith('Z') ? '' : 'Z');
        
        const startDate = new Date(startTimeStr);
        const endDate = new Date(endTimeStr);
        
        return {
            start_date: formatDateForInput(startDate),
            start_time: formatTimeForInput(startDate),
            end_date: formatDateForInput(endDate),
            end_time: formatTimeForInput(endDate),
            title: props.entry.title || '',
            description: props.entry.description || '',
        };
    }
    
    // Default: tomorrow 00:00 to 23:59
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    return {
        start_date: formatDateForInput(tomorrow),
        start_time: '00:00',
        end_date: formatDateForInput(tomorrow),
        end_time: '23:59',
        title: '',
        description: '',
    };
};

const form = ref(initializeForm());

// Format date for date component (dd/mm/yyyy) - uses local timezone
function formatDateForInput(date) {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

// Format time for select (HH:mm) - uses local timezone
function formatTimeForInput(date) {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = Math.floor(date.getMinutes() / 30) * 30; // Round to nearest 30 min
    return `${hours}:${minutes.toString().padStart(2, '0')}`;
}

// Parse date from dd/mm/yyyy format
function parseDateFromInput(dateStr) {
    const [day, month, year] = dateStr.split('/');
    return new Date(year, month - 1, day);
}

// Combine date and time into ISO string (will be in UTC)
function combineDateTimeToISO(dateStr, timeStr) {
    const date = parseDateFromInput(dateStr);
    const [hours, minutes] = timeStr.split(':');
    date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    return date.toISOString();
}

// Handle date changes
function handleStartDateChange(newDate) {
    form.value.start_date = newDate;
}

function handleEndDateChange(newDate) {
    form.value.end_date = newDate;
}

// Methods
async function saveTask() {
    // Validation
    if (!form.value.start_date || !form.value.start_time || !form.value.end_date || !form.value.end_time) {
        common.notification('Please select both start and end dates/times', false);
        return;
    }
    
    if (!form.value.title || form.value.title.trim() === '') {
        common.notification('Please enter a task title', false);
        return;
    }
    
    saving.value = true;
    try {
        // Combine date and time fields into ISO strings
        const data = {
            start_time: combineDateTimeToISO(form.value.start_date, form.value.start_time),
            end_time: combineDateTimeToISO(form.value.end_date, form.value.end_time),
            title: form.value.title.trim(),
            description: form.value.description.trim(),
            source: 'custom_task'
        };
        
        console.log('Saving task data:', data);
        
        // Validate that end time is after start time
        if (new Date(data.start_time) >= new Date(data.end_time)) {
            common.notification('End time must be after start time', false);
            saving.value = false;
            return;
        }
        
        let response;
        if (props.entry) {
            response = await api.put(`user/out-of-office/${props.entry.id}`, data);
        } else {
            response = await api.post('user/out-of-office', data);
        }
        
        if (response.success) {
            common.notification(props.entry ? 'Task updated' : 'Task created', true);
            
            // Call callback and close popup
            if (props.callback) {
                props.callback(null, data, response, true);
            }
            
            // Close popup
            document.querySelector('.i-popup-close')?.click();
        } else {
            common.notification(response.message || 'Failed to save', false);
        }
    } catch (error) {
        common.notification('An error occurred', false);
    } finally {
        saving.value = false;
    }
}
</script>

<style scoped>
.task-form {
    padding: 20px;
    width: 500px;
}

.form-group {
    margin-bottom: 20px;
}

.form-group label {
    display: block;
    font-weight: 500;
    font-size: 14px;
    margin-bottom: 8px;
    color: var(--text-secondary);
}

.datetime-row {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 12px;
    align-items: center;
}

.form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    margin-top: 24px;
    padding-top: 24px;
    border-top: 1px solid var(--border);
}

.date-picker-wrapper {
    flex: 2;
}

.date-picker-dropdown {
    background-color: var(--white);
    border-radius: var(--radius-md);
    border: 1px solid var(--border);
    padding: 10px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

/* Override VueDatePicker styles for date-only mode */
.date-picker-dropdown :deep(.dp__action_buttons) {
    display: none !important;
}

.date-picker-dropdown :deep(.dp__time_input) {
    display: none !important;
}

/* Light theme overrides for VueDatePicker */
.date-picker-dropdown :deep(.dp__theme_light) {
    --dp-background-color: #ffffff;
    --dp-text-color: #212121;
    --dp-hover-color: #f3f3f3;
    --dp-hover-text-color: #212121;
    --dp-hover-icon-color: #959595;
    --dp-primary-color: #1976d2;
    --dp-primary-text-color: #f8f5f5;
    --dp-secondary-color: #c0c4cc;
    --dp-border-color: #ddd;
    --dp-menu-border-color: #ddd;
    --dp-border-color-hover: #aaaeb7;
    --dp-disabled-color: #f6f6f6;
    --dp-scroll-bar-background: #f3f3f3;
    --dp-scroll-bar-color: #959595;
    --dp-success-color: #76d275;
    --dp-success-color-disabled: #a3d9b1;
    --dp-icon-color: #959595;
    --dp-danger-color: #ff6f60;
    --dp-highlight-color: rgba(25, 118, 210, 0.1);
}
</style>