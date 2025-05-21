<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { api } from '@utils/api';
import { common } from '@utils/common';

import InputComponent from '@form/input/view.vue';
import SelectComponent from '@form/select/view.vue';
import ButtonComponent from '@form/button/view.vue';

const props = defineProps({
    initialValue: {
        type: [String, Object, Array],
        default: ''
    },
    callback: {
        type: Function,
        required: true
    }
});

const emit = defineEmits(['update:value']);

// State variables
const selectedLocationType = ref('link');
const customLocationValue = ref('');
const inPersonAddress = ref('');
const isLoading = ref(true); // Start with loading state
const googleMeetIntegration = ref(null);
const apiCheckComplete = ref(false); // Flag to indicate API check is done

// Basic options without integrations
const baseOptions = [
    { label: 'Web conferencing link', value: 'link' },
    { label: 'In person meeting', value: 'in_person' },
    { label: 'Custom location', value: 'custom' }
];

// Computed options for the location type dropdown
const locationTypeOptions = computed(() => {
    // If API check is not complete, just return the base options
    if (!apiCheckComplete.value) {
        return baseOptions;
    }
    
    const options = [...baseOptions]; // Create a new array
    
    // Add Google Meet option if integration is available
    if (googleMeetIntegration.value) {
        options.splice(1, 0, {
            label: 'Google Meet',
            value: 'google_meet'
        });
    }
    
    return options;
});

// Check for Google Meet integration
async function checkGoogleMeetIntegration() {
    try {
        isLoading.value = true;
        
        // Get all user integrations
        const response = await api.get('user/integrations');
        
        if (response && response.success && Array.isArray(response.data)) {
            console.log('Available integrations from API:', response.data);
            
            // Find Google Meet integration
            const meetIntegration = response.data.find(integration => 
                integration.provider === 'google_meet' && integration.status === 'active'
            );
            
            if (meetIntegration) {
                googleMeetIntegration.value = {
                    id: meetIntegration.id,
                    name: meetIntegration.name,
                    provider: meetIntegration.provider
                };
                
                console.log('Found Google Meet integration:', googleMeetIntegration.value);
            } else {
                console.log('No Google Meet integration found');
            }
        }
    } catch (error) {
        console.error('Error checking for Google Meet integration:', error);
    } finally {
        apiCheckComplete.value = true; // Mark API check as complete
        isLoading.value = false;
        
        // After API check completes, initialize locations that depend on Google Meet
        if (props.initialValue) {
            initializeGoogleMeetLocation();
        }
    }
}

// Handle location type selection change
function handleLocationTypeChange(value) {
    selectedLocationType.value = value;
    updateLocationValue();
}

// Handle custom location input change
function handleCustomLocationChange(event, value) {
    customLocationValue.value = value;
    updateLocationValue();
}

// Handle in-person address change
function handleInPersonAddressChange(event, value) {
    inPersonAddress.value = value;
    updateLocationValue();
}

// Update the location value and emit the change
function updateLocationValue() {
    let locationObject = {};
    
    switch (selectedLocationType.value) {
        case 'google_meet':
            if (googleMeetIntegration.value) {
                locationObject = {
                    type: 'google_meet',
                    integration_id: googleMeetIntegration.value.id
                };
            } else {
                locationObject = {
                    type: 'custom',
                    value: 'Google Meet (integration not found)'
                };
            }
            break;
        case 'link':
            locationObject = {
                type: 'link',
                value: customLocationValue.value
            };
            break;
        case 'in_person':
            locationObject = {
                type: 'in_person',
                address: inPersonAddress.value
            };
            break;
        case 'custom':
            locationObject = {
                type: 'custom',
                value: customLocationValue.value
            };
            break;
        default:
            locationObject = {
                type: 'custom',
                value: ''
            };
    }
    
    // Wrap in array for consistent structure
    const locationArray = [locationObject];
    
    console.log('Updated location array:', locationArray);
    
    // Emit the updated location value
    emit('update:value', locationArray);
    
    // Call the callback with the location array
    if (props.callback) {
        props.callback(locationArray);
    }
}

// Redirect to integrations page
function goToIntegrations() {
    window.location.href = '/integrations';
}

// Initialize Google Meet location after API check
function initializeGoogleMeetLocation() {
    // Get the location from props - could be an array, object, or string
    let locationData = props.initialValue;
    
    // Extract the location object - handle both array and direct object formats
    let locationObj = null;
    
    if (Array.isArray(locationData) && locationData.length > 0) {
        locationObj = locationData[0]; // Use first location in array
    } else if (typeof locationData === 'object' && !Array.isArray(locationData)) {
        locationObj = locationData;
    }
    
    // If we have a Google Meet location and the integration is available, set it
    if (locationObj && locationObj.type === 'google_meet' && googleMeetIntegration.value) {
        console.log('Setting Google Meet as selected location type');
        selectedLocationType.value = 'google_meet';
    }
}

// Initialize component with existing location if provided
function initializeFromProps() {
    if (!props.initialValue) return;
    
    try {
        console.log('Initializing from props:', props.initialValue);
        
        // Get the location from props - could be an array, object, or string
        let locationData = props.initialValue;
        
        // Extract the location object - handle both array and direct object formats
        let locationObj = null;
        
        if (Array.isArray(locationData) && locationData.length > 0) {
            console.log('Initializing from array location:', locationData[0]);
            locationObj = locationData[0]; // Use first location in array
        } else if (typeof locationData === 'object' && !Array.isArray(locationData)) {
            console.log('Initializing from object location:', locationData);
            locationObj = locationData;
        } else if (typeof locationData === 'string') {
            console.log('Initializing from string location:', locationData);
            customLocationValue.value = locationData;
            selectedLocationType.value = 'link';
            return; // Early return for string locations
        }
        
        // If we couldn't extract a location object, exit
        if (!locationObj) return;
        
        // For Google Meet locations, we'll handle this after the API check
        if (locationObj.type === 'google_meet') {
            console.log('Found Google Meet location, will initialize after API check');
            // We'll set this type in initializeGoogleMeetLocation after API check
            return;
        }
        
        // For other location types, we can initialize immediately
        if (locationObj.type) {
            console.log('Setting location type to:', locationObj.type);
            selectedLocationType.value = locationObj.type;
            
            switch (locationObj.type) {
                case 'link':
                    customLocationValue.value = locationObj.value || '';
                    break;
                case 'in_person':
                    inPersonAddress.value = locationObj.address || '';
                    break;
                case 'custom':
                    customLocationValue.value = locationObj.value || '';
                    break;
            }
        }
    } catch (error) {
        console.error('Error initializing location component:', error);
    }
}

// Initialize the component
onMounted(async () => {
    console.log('LocationSelect component mounted');
    initializeFromProps(); // First initialize non-Google Meet values
    await checkGoogleMeetIntegration(); // Then check for Google Meet integration
});
</script>

<template>
    <div class="location-select">
        <!-- Location type selector -->
        <div class="location-type-selector">
            <div v-if="isLoading" class="loading-indicator">
                <p>Loading location options...</p>
            </div>
            <SelectComponent
                v-else
                label="Location Type"
                :options="locationTypeOptions"
                :value="selectedLocationType"
                @change="handleLocationTypeChange"
            />
        </div>
        
        <!-- Different input fields based on location type -->
        <div v-if="!isLoading" class="location-input">
            <!-- Link input -->
            <div v-if="selectedLocationType === 'link'" class="location-link-input">
                <InputComponent
                    label="Meeting Link"
                    :value="customLocationValue"
                    placeholder="https://zoom.us/j/123456789"
                    @onInput="handleCustomLocationChange"
                />
            </div>
            
            <!-- Google Meet integration -->
            <div v-else-if="selectedLocationType === 'google_meet'" class="location-integration">
                <div class="integration-info">
                    <p>A Google Meet link will be automatically generated for each booking.</p>
                </div>
            </div>
            
            <!-- In Person -->
            <div v-else-if="selectedLocationType === 'in_person'" class="location-in-person">
                <InputComponent
                    label="Address"
                    :value="inPersonAddress"
                    placeholder="Enter the meeting address"
                    @onInput="handleInPersonAddressChange"
                />
            </div>
            
            <!-- Custom location -->
            <div v-else-if="selectedLocationType === 'custom'" class="location-custom">
                <InputComponent
                    label="Custom Location"
                    :value="customLocationValue"
                    placeholder="Enter custom location details"
                    @onInput="handleCustomLocationChange"
                />
            </div>
        </div>
        
        <!-- Display when Google Meet integration is not available -->
        <div v-if="apiCheckComplete && !googleMeetIntegration && !isLoading" class="integration-notice">
            <p>Want to automatically generate Google Meet links for your bookings?</p>
            <ButtonComponent 
                label="Connect Google Meet" 
                as="secondary" 
                @click="goToIntegrations"
            />
        </div>
    </div>
</template>

<style scoped>
.location-select {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.location-type-selector {
    margin-bottom: 8px;
}

.loading-indicator {
    padding: 8px;
    color: var(--text-secondary);
    font-size: 14px;
}

.integration-info {
    background-color: var(--background-1);
    border-radius: 8px;
    padding: 12px;
}

.integration-info p {
    margin: 0;
    color: var(--text-secondary);
}

.integration-notice {
    margin-top: 16px;
    padding: 16px;
    background-color: var(--background-1);
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.integration-notice p {
    margin: 0;
    color: var(--text-secondary);
}
</style>