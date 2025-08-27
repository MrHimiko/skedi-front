<script setup>
import { ref, onMounted } from 'vue';
import { api } from '@utils/api';
import { common } from '@utils/common';
import EditTime from '@user_events/components/form/editTime/editTime.vue';
import PopupView from '@layouts/popup/view.vue';
import Button from '@form/button/view.vue';
import SelectComponent from '@form/select/view.vue';
import { PhQuestion } from '@phosphor-icons/vue';

const props = defineProps({
    eventId: {
        type: [String, Number],
        required: true
    },
    organizationId: {
        type: [String, Number],
        required: true
    },
    callback: Function
});

// State variables
const isLoading = ref(true);
const isSubmitting = ref(false);
const eventData = ref(null);
const scheduleData = ref(null);
const bufferTime = ref(0);
const errorMessage = ref('');
const currentTimezone = ref('');

// Buffer time options
const bufferTimeOptions = [
    { label: 'No buffer time', value: 0 },
    { label: '15 minutes', value: 15 },
    { label: '30 minutes', value: 30 },
    { label: '45 minutes', value: 45 },
    { label: '1 hour', value: 60 },
    { label: '1 hour 30 minutes', value: 90 },
    { label: '2 hours', value: 120 }
];

// Method to handle the schedule update from the EditTime component
const updateSchedule = (data) => {
    console.log('Schedule data updated:', data);
    scheduleData.value = data;
};

// Method to handle buffer time change
const updateBufferTime = (value) => {
    bufferTime.value = value;
    console.log('Buffer time updated:', value);
};

// Fetch the current event data when the component is mounted
onMounted(async () => {
    // Get and format the current timezone
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    currentTimezone.value = timeZone;
    
    try {
        isLoading.value = true;
        errorMessage.value = '';
        
        // Fetch event data
        const response = await api.get(`events/${props.eventId}?organization_id=${props.organizationId}`);
        
        if (response && response.success && response.data) {
            eventData.value = response.data;
            
            // Initialize the schedule data with the existing schedule
            scheduleData.value = { schedule: response.data.schedule || {} };
            
            // Initialize buffer time from event data
            bufferTime.value = response.data.buffer_time || 0;
            
            console.log('Loaded event data:', eventData.value);
            console.log('Loaded buffer time:', bufferTime.value);
        } else {
            errorMessage.value = response?.message || 'Failed to load event data';
        }
    } catch (error) {
        console.error('Error fetching event data:', error);
        errorMessage.value = `Error loading event: ${error.message || 'Unknown error'}`;
    } finally {
        isLoading.value = false;
    }
});

// Method to handle form submission
const handleSubmit = async () => {
    if (!scheduleData.value) {
        common.notification('Please set up a schedule', false);
        return;
    }
    
    try {
        isSubmitting.value = true;
        
        // Prepare update data including both schedule and buffer time
        const updateData = {
            schedule: scheduleData.value.schedule,
            bufferTime: bufferTime.value
        };
        
        console.log('Updating schedule and buffer time with data:', updateData);
        
        // Call API to update the event
        const response = await api.put(`events/${props.eventId}?organization_id=${props.organizationId}`, updateData);
        
        if (response && response.success) {
            common.notification('Schedule and buffer time updated successfully!', true);
            
            // Call the callback if provided
            if (props.callback) {
                props.callback(null, updateData, response, true);
            }
            
            // Close popup
            document.querySelector('.i-popup-close').click();
        } else {
            common.notification('Failed to update schedule: ' + (response?.message || 'Unknown error'), false);
        }
    } catch (error) {
        console.error('API error:', error);
        common.notification('Error updating schedule: ' + (error.message || 'Unknown error'), false);
    } finally {
        isSubmitting.value = false;
    }
};
</script>

<template>
    <PopupView title="Edit Availability Schedule" customClass="h-auto event-times">
        <template #content>
            <div v-if="isLoading" class="loading-section">
                <p>Loading event data...</p>
            </div>
            
            <div v-else-if="errorMessage" class="error-section">
                <p class="error-message">{{ errorMessage }}</p>
                <Button label="Close" @click="document.querySelector('.i-popup-close').click()" />
            </div>
            
            <div v-else class="form-section">
                <p  style="margin-bottom:10px">Timezone ({{ currentTimezone }}).</p>
                <!-- EditTime Component --> 
                <div class="content scrollable">
                    <edit-time
                        @update="updateSchedule"
                        :initialSchedule="scheduleData"
                    />
                </div>


               <div class="buffer-time-section" style="margin-top: 24px;">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px;">
                        <h4 style="margin: 0; font-size: 16px; font-weight: 600;">Buffer Time</h4>
                        <PhQuestion 
                            :size="16" 
                            style="color: var(--text-tertiary); cursor: help;" 
                            v-tooltip="{
                                content: 'Buffer time is the required break period after each meeting ends. For example, if you set a 30-minute buffer and have a meeting from 2:00-3:00 PM, your next available slot will be at 3:30 PM. This gives you time to wrap up, take notes, or prepare for the next meeting.',
                                placement: 'top'
                            }"
                        />
                    </div>
                    
                    <SelectComponent
                        :value="bufferTime"
                        @change="updateBufferTime"
                        :options="bufferTimeOptions"
                        placeholder="Select buffer time"
                    />
                </div>
                
                <div class="actions grid grid-2 gap-2xl" style="margin-top: 50px;">
                    <div>
                        <div class="c-button tertiary pointer i-popup-close" as="stroke">Cancel</div>
                    </div>
                    <div>
                        <Button 
                            type="button" 
                            label="Save Changes" 
                            :loading="isSubmitting" 
                            @click="handleSubmit"
                        />
                    </div>
                </div>
            </div>
        </template>
    </PopupView>
</template>

<style scoped>
.loading-section,
.error-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 200px;
    text-align: center;
}

.error-message {
    color: var(--red-default);
    margin-bottom: 20px;
}

.form-section {
    margin-bottom: 30px;
}

.event-info {
    margin-bottom: 20px;
    padding: 15px;
    background-color: var(--background-1);
    border-radius: 8px;
}

.event-info h3 {
    margin-bottom: 5px;
    font-weight: 600;
}

.section-title {
    margin: 10px 0 15px;
    font-weight: 600;
    font-size: 16px;
}

.schedule-section {
    border-top: 1px solid var(--border);
    padding-top: 20px;
}

/* New timezone info styles */
.timezone-info {
    display: flex;
    align-items: center;
    background-color: var(--background-1);
    border-radius: 8px;
    padding: 12px;
    margin-bottom: 20px;
    gap: 10px;
}

.timezone-info .info-icon {
    color: var(--brand-default);
}

.timezone-info p {
    color: var(--text-secondary);
    font-size: 14px;
    margin: 0;
}
</style>