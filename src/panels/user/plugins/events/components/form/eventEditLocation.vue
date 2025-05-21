<script setup>
import { ref, onMounted, watch } from 'vue';
import { api } from '@utils/api';
import { common } from '@utils/common';
import PopupView from '@layouts/popup/view.vue';
import LocationSelect from '@user_events/components/form/locationSelect/view.vue';
import Button from '@form/button/view.vue';

const props = defineProps({
    eventId: {
        type: [String, Number],
        required: true
    },
    organizationId: {
        type: [String, Number],
        required: true
    },
    callback: {
        type: Function
    }
});

// State management
const isLoading = ref(true);
const isSubmitting = ref(false);
const eventData = ref(null);
const locationData = ref(null);
const errorMessage = ref('');

// Method to handle the location update from the LocationSelect component
const updateLocation = (data) => {
    locationData.value = data;
};

// Fetch the current event data when the component is mounted
onMounted(async () => {
    try {
        isLoading.value = true;
        errorMessage.value = '';
        
        // Fetch event data
        const response = await api.get(`events/${props.eventId}?organization_id=${props.organizationId}`);
        
        if (response && response.success && response.data) {
            eventData.value = response.data;
            
            // Initialize the location data with the existing location
            locationData.value = response.data.location || '';
            
            console.log('Loaded event data:', eventData.value);
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
    try {
        isSubmitting.value = true;
        
        // Prepare update data
        const updateData = {
            location: locationData.value
        };
        
        console.log('Updating location with data:', updateData);
        
        // Call API to update the event
        const response = await api.put(`events/${props.eventId}?organization_id=${props.organizationId}`, updateData);
        
        if (response && response.success) {
            common.notification('Location updated successfully!', true);
            
            // Call the callback if provided
            if (props.callback) {
                props.callback(null, updateData, response, true);
            }
            
            // Close popup
            document.querySelector('.i-popup-close').click();
        } else {
            common.notification('Failed to update location: ' + (response?.message || 'Unknown error'), false);
        }
    } catch (error) {
        console.error('API error:', error);
        common.notification('Error updating location: ' + (error.message || 'Unknown error'), false);
    } finally {
        isSubmitting.value = false;
    }
};
</script>

<template>
    <PopupView title="Edit Location" customClass="h-auto event-location">
        <template #content>
            <div v-if="isLoading" class="loading-section">
                <p>Loading event data...</p>
            </div>
            
            <div v-else-if="errorMessage" class="error-section">
                <p class="error-message">{{ errorMessage }}</p>
                <Button label="Close" @click="document.querySelector('.i-popup-close').click()" />
            </div>
            
            <div v-else class="form-section">
                <div class="content">
                    <LocationSelect
                        :initialValue="locationData"
                        @update:value="updateLocation"
                        :callback="updateLocation"
                    />
                </div>
                
                <div class="actions grid grid-2 gap-2xl" style="margin-top: 30px;">
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

.content {
    margin-bottom: 20px;
}
</style>