<script setup>
import { ref, computed, onMounted } from 'vue';
import { UserStore } from '@stores/user';
import { api } from '@utils/api';
import EditTime from '@user_events/components/form/editTime/editTime.vue';
import DurationOptions from '@user_events/components/form/eventEditDuration.vue';
import PopupView from '@layouts/popup/view.vue';
import Button from '@form/button/view.vue';
import InputComponent from '@form/input/view.vue';
import SelectComponent from '@form/select/view.vue';
import { common } from '@utils/common';
import LocationSelect from '@user_events/components/form/locationSelect/view.vue';

const userStore = UserStore();
const currentTimezone = ref(Intl.DateTimeFormat().resolvedOptions().timeZone);

// State variables
const currentStep = ref(1);
const totalSteps = 3;
const eventName = ref('');
const organizationId = ref('');
const showOrgSelection = ref(true);
const scheduleData = ref(null);
const durationData = ref(null);
const locationData = ref(null);
const isSubmitting = ref(false);

// Reference to duration component
const durationOptionsRef = ref(null);
const editTimeRef = ref(null);

// Initialize with the default values
durationData.value = [
    {
        title: 'Standard Meeting',
        description: '',
        duration: 30
    }
];

const props = defineProps({
    values: Function,
    endpoint: String,
    type: String,
    callback: Function,
    preselectedOrganizationId: {
        type: [String, Number],
        default: null
    }
});

import { toRaw } from 'vue';
const rawProps = toRaw(props);

// Set preselected organization if provided
onMounted(() => {
    if (props.preselectedOrganizationId) {
        organizationId.value = props.preselectedOrganizationId.toString();
        showOrgSelection.value = false; // Hide organization selection when preselected
    }
});

// Format organizations for select dropdown
const orgOptions = computed(() => {
    try {
        const orgsData = userStore.getOrganizations();
        if (!orgsData) return [];
        
        const orgArray = Array.isArray(orgsData.target) ? orgsData.target :
                        Array.isArray(orgsData) ? orgsData : [];
        
        return orgArray.map(org => {
            if (!org) return { label: 'Unknown', value: '' };
            
            return {
                label: org.entity?.name || 'Unnamed',
                value: org.entity?.id?.toString() || ''
            };
        });
    } catch (error) {
        console.error('Error formatting organizations:', error);
        return [];
    }
});

// Get organization name for display when preselected
const selectedOrgName = computed(() => {
    if (!organizationId.value) return '';
    
    const org = orgOptions.value.find(o => o.value === organizationId.value);
    return org ? org.label : '';
});

// Step validation
const canProceedToStep2 = computed(() => {
    return eventName.value && organizationId.value;
});

const canProceedToStep3 = computed(() => {
    // Check if duration data is available
    return durationData.value && Array.isArray(durationData.value) && durationData.value.length > 0;
});

const canSubmitForm = computed(() => {
    return scheduleData.value && scheduleData.value.schedule;
});

// Helper function to extract duration data from DOM
function extractDurationDataFromDOM() {
    const extractedData = [];
    const durationElements = document.querySelectorAll('.c-repeater .c-builder');
    
    durationElements.forEach(builder => {
        const titleInput = builder.querySelector('input[name="title"]');
        const durationInput = builder.querySelector('input[name="duration"]');
        
        if (titleInput || durationInput) {
            extractedData.push({
                title: titleInput ? titleInput.value || 'Standard Meeting' : 'Standard Meeting',
                description: '',
                duration: durationInput ? parseInt(durationInput.value) || 30 : 30
            });
        }
    });
    
    return extractedData.length > 0 ? extractedData : null;
}

// Handle location update
const updateLocation = (data) => {
    locationData.value = data;
    console.log('Updated location data:', locationData.value);
};

const nextStep = () => {
    if (currentStep.value === 1 && !canProceedToStep2.value) {
        common.notification('Please enter an event name and select an organization', false);
        return;
    }
    
    if (currentStep.value === 2) {
        // Get duration data from DOM 
        const extractedData = extractDurationDataFromDOM();
        
        if (extractedData) {
            durationData.value = extractedData;
        }
        
        if (!durationData.value || !Array.isArray(durationData.value) || durationData.value.length === 0) {
            common.notification('Please add at least one duration option', false);
            return;
        }
    }
    
    if (currentStep.value < totalSteps) {
        currentStep.value++;
    }
};

const prevStep = () => {
    if (currentStep.value > 1) {
        currentStep.value--;
    }
};

// Method to handle the schedule update from the EditTime component
const updateSchedule = (data) => {
    console.log('Received schedule data:', data);
    scheduleData.value = data;
};

// Method to handle durations update from the DurationOptions component
const updateDurations = (data) => {
    console.log('Received durations data:', data);
    if (data && data.duration) {
        durationData.value = data.duration;
    }
};

// Default values for duration component
function getDurationValues() {
    return {
        duration: durationData.value || [
            {
                title: 'Standard Meeting',
                description: '',
                duration: 30
            }
        ]
    };
}

// Handle input changes
const updateEventName = (event, value) => {
    eventName.value = value;
};

const updateOrganization = (value) => {
    organizationId.value = value;
};

// Method to handle form submission
const handleSubmit = async () => {
    if (!canSubmitForm.value) {
        common.notification('Please set up an availability schedule', false);
        return;
    }
    
    // Extract latest duration data before submitting
    const extractedDurationData = extractDurationDataFromDOM();
    if (extractedDurationData) {
        durationData.value = extractedDurationData;
    }
    
    // Prepare data for API submission
    const apiData = {
        name: eventName.value,
        schedule: {},
        location: locationData.value || ''
    };
    
    // Include durations if available
    if (durationData.value && Array.isArray(durationData.value) && durationData.value.length > 0) {
        apiData.duration = durationData.value;
        console.log('Using duration data for submission:', durationData.value);
    } else {
        apiData.duration = [
            {
                title: 'Standard Meeting',
                description: '',
                duration: 30
            }
        ];
    }
    
    // Map schedule data correctly
    if (scheduleData.value && scheduleData.value.schedule) {
        apiData.schedule = scheduleData.value.schedule;
    }
    
    console.log('Data ready for API submission:', apiData);
    
    try {
        isSubmitting.value = true;
        
        // Call API to create the event
        const response = await api.post(`events?organization_id=${organizationId.value}`, apiData);
        
        if (response && response.success) {
            common.notification('Event type created successfully!', true);
            
            // Call the callback if provided (for popup closing etc.)
            if (props.callback) {
                props.callback(null, apiData, response, true);
            }
            
            // Close popup using i-popup-close class
            document.querySelector('.i-popup-close').click();
        } else {
            common.notification('Failed to create event: ' + (response?.message || 'Unknown error'), false);
        }
    } catch (error) {
        console.error('API error:', error);
        common.notification('Error creating event: ' + (error.message || 'Unknown error'), false);
    } finally {
        isSubmitting.value = false;
    }
};
</script>

<template>
    <PopupView title="Create Event Type" customClass="h-auto event-times">
        <template #content>
            <div class="form-section">
                <!-- Step indicator -->
                <div class="steps-indicator">
                    <div class="step" :class="{ active: currentStep >= 1, completed: currentStep > 1 }">
                        <div class="step-number">1</div>
                        <div class="step-label">Basic Info</div>
                    </div>
                    <div class="step-line" :class="{ active: currentStep > 1 }"></div>
                    <div class="step" :class="{ active: currentStep >= 2, completed: currentStep > 2 }">
                        <div class="step-number">2</div>
                        <div class="step-label">Duration Options</div>
                    </div>
                    <div class="step-line" :class="{ active: currentStep > 2 }"></div>
                    <div class="step" :class="{ active: currentStep >= 3 }">
                        <div class="step-number">3</div>
                        <div class="step-label">Availability</div>
                    </div>
                </div>
                
                <!-- Step content sections - using CSS display instead of v-if -->
                <div class="step-container">
                    <!-- Step 1: Basic Info -->
                    <div class="step-content" :class="{ 'active-step': currentStep === 1 }">
                        <div class="form-group">
                            <InputComponent
                                label="Event Type Name"
                                :value="eventName"
                                placeholder="e.g., Consultation Call"
                                required
                                @onInput="updateEventName"
                            />
                        </div>
                        
                        <!-- Location component -->
                        <div class="form-group">
                            <LocationSelect
                                :initialValue="locationData"
                                @update:value="updateLocation"
                                :callback="updateLocation"
                            />
                        </div>
                        
                        <!-- Show organization selection only if not preselected -->
                        <div class="form-group" v-if="showOrgSelection && !rawProps.endpoint?.includes('organization_id')">
                            <SelectComponent
                                label="Organization"
                                :options="orgOptions"
                                :value="organizationId"
                                placeholder="Select organization"
                                required
                                @change="updateOrganization"
                            />
                        </div>
                    </div>
                    
                    <!-- Step 2: Duration Options -->
                    <div class="step-content" :class="{ 'active-step': currentStep === 2 }">
                        <p class="step-description">Define different duration options that attendees can choose from.</p>
                        
                        <div class="durations-section">
                            <DurationOptions
                                :endpoint="''"
                                :type="'POST'"
                                :callback="(e, data) => updateDurations(data)"
                                :values="getDurationValues"
                                ref="durationOptionsRef"
                            />
                        </div>
                    </div>
                    
                    <!-- Step 3: Availability Schedule -->
                    <div class="step-content" :class="{ 'active-step': currentStep === 3 }">
                        <h3 class="step-title">Availability Schedule</h3>
                        <p class="step-description">Set your weekly availability for this event type.</p>
                        
                        <!-- Add timezone info message -->
                        <div class="timezone-info">
                            <i class="info-icon">info</i>
                            <p>Times are displayed in your local timezone ({{ currentTimezone }}), but stored in UTC for consistency.</p>
                        </div>
                        
                        <div class="schedule-section">
                            <edit-time
                                @update="updateSchedule"
                                ref="editTimeRef"
                            />
                        </div>
                    </div>
                </div>
                
                <!-- Navigation buttons -->
                <div class="form-navigation">
                    <div>
                        <!-- Back button (for steps 2 and 3) -->
                        <Button 
                            v-if="currentStep > 1"
                            type="button" 
                            as="tertiary"
                            label="Back" 
                            @click="prevStep"
                        />
                        <!-- Cancel button (for step 1) -->
                        <div v-else class="c-button tertiary pointer i-popup-close">Cancel</div>
                    </div>
                    
                    <div>
                        <!-- Next button (for steps 1 and 2) -->
                        <Button 
                            v-if="currentStep < totalSteps"
                            type="button" 
                            label="Next" 
                            @click="nextStep"
                        />
                        <!-- Submit button (for step 3) -->
                        <Button 
                            v-else
                            type="button" 
                            label="Create Event" 
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

.form-section {
    margin-bottom: 30px;
}

.step-container {
    position: relative;
}

.step-content {
    display: none;
    margin-bottom: 20px;
}

.step-content.active-step {
    display: block;
}

.step-title {
    margin: 20px 0 15px;
    font-weight: 600;
    font-size: 18px;
}

.step-description {
    margin-bottom: 20px;
    color: var(--text-secondary);
    font-size: 14px;
}

.form-group {
    margin-bottom: 20px;
}

.preselected-org {
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: 15px;
    background-color: var(--background-1);
}

.field-label {
    font-size: 13px;
    font-weight: 600;
    margin-bottom: 5px;
    color: var(--text-secondary);
}

.field-value {
    font-size: 15px;
    font-weight: 500;
    color: var(--text-primary);
}

.schedule-section {
    padding-top: 10px;
}

/* Navigation buttons */
.form-navigation {
    display: flex;
    justify-content: space-between;
    margin-top: 40px;
    border-top: 1px solid var(--border);
    padding-top: 20px;
}

/* Override DurationOptions component styles to fit in this view */
.durations-section :deep(.hide-while-creating-event) {
    display: none!important;
}

.durations-section :deep(.c-repeater) {
    background: transparent;
}
.durations-section :deep(.event-durations .c-repeater > .items > .item form) {
    background: white;
    padding: 15px;
}

.durations-section :deep(.event-durations) {
    padding: 0;
    background: transparent;
}

.durations-section :deep(.l-popup .c-builder) {
    width: 100%;
}

.durations-section :deep(.event-durations .c-repeater) {
    margin-top: 0;
}

.durations-section :deep(.event-durations h3),
.durations-section :deep(.event-durations .actions) {
    display: none;
}

.durations-section :deep(.event-durations p) {
    display: none;
}



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