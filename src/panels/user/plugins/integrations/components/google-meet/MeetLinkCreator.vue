<!-- src/panels/user/plugins/integrations/components/google-meet/MeetLinkCreator.vue -->
<script setup>
import { ref, computed, onMounted } from 'vue';
import { api } from '@utils/api';
import { common } from '@utils/common';
import Button from '@form/button/view.vue';
import GoogleMeetService from '@user_integrations/services/GoogleMeetService';
import IntegrationsManager from '@user_integrations/services/IntegrationsManager';

const props = defineProps({
    bookingId: {
        type: Number,
        default: null
    },
    eventId: {
        type: Number,
        default: null
    },
    title: {
        type: String,
        default: ''
    },
    description: {
        type: String,
        default: ''
    },
    startTime: {
        type: [String, Date],
        default: () => new Date().toISOString()
    },
    endTime: {
        type: [String, Date],
        default: () => new Date(Date.now() + 3600000).toISOString()
    },
    enableRecording: {
        type: Boolean,
        default: false
    },
    allowGuests: {
        type: Boolean, 
        default: true
    }
});

const emit = defineEmits(['created', 'error']);

const isLoading = ref(false);
const meetLink = ref(null);
const error = ref(null);
const integration = ref(null);
const integrationOptions = ref([]);
const selectedIntegrationId = ref(null);

// Fetch connected integrations for Google Meet
async function loadIntegrations() {
    try {
        isLoading.value = true;
        
        // Get all user integrations
        const userIntegrations = await api.get('user/integrations');
        
        if (!userIntegrations.success) {
            throw new Error(userIntegrations.message || 'Failed to fetch integrations');
        }
        
        // Filter for Google Meet integrations
        const meetIntegrations = userIntegrations.data.filter(
            integration => integration.provider === 'google_meet' && integration.status === 'active'
        );
        
        // If no Google Meet integrations, try to use Google Calendar integration as fallback
        if (meetIntegrations.length === 0) {
            const calendarIntegrations = userIntegrations.data.filter(
                integration => integration.provider === 'google_calendar' && integration.status === 'active'
            );
            
            if (calendarIntegrations.length > 0) {
                integrationOptions.value = calendarIntegrations.map(integration => ({
                    id: integration.id,
                    name: integration.name,
                    provider: integration.provider
                }));
                
                // Set the first Google Calendar integration as default
                selectedIntegrationId.value = calendarIntegrations[0].id;
                integration.value = calendarIntegrations[0];
            }
        } else {
            integrationOptions.value = meetIntegrations.map(integration => ({
                id: integration.id,
                name: integration.name,
                provider: integration.provider
            }));
            
            // Set the first Google Meet integration as default
            selectedIntegrationId.value = meetIntegrations[0].id;
            integration.value = meetIntegrations[0];
        }
        
        isLoading.value = false;
    } catch (err) {
        console.error('Error loading integrations:', err);
        error.value = 'Failed to load integrations: ' + (err.message || 'Unknown error');
        isLoading.value = false;
    }
}

// Create a Google Meet link
async function createMeetLink() {
    if (!selectedIntegrationId.value) {
        error.value = 'Please select a Google integration';
        return;
    }
    
    try {
        isLoading.value = true;
        error.value = null;
        
        // Prepare meeting options
        const options = {
            title: props.title || 'Meeting',
            description: props.description || '',
            start_time: typeof props.startTime === 'string' ? props.startTime : props.startTime.toISOString(),
            end_time: typeof props.endTime === 'string' ? props.endTime : props.endTime.toISOString(),
            enable_recording: props.enableRecording,
            is_guest_allowed: props.allowGuests
        };
        
        // Add booking ID if available
        if (props.bookingId) {
            options.booking_id = props.bookingId;
        }
        
        // Add event ID if available
        if (props.eventId) {
            options.event_id = props.eventId;
        }
        
        // Create the Meet link
        const result = await GoogleMeetService.createMeetLink(selectedIntegrationId.value, options);
        
        // Store the result
        meetLink.value = result;
        
        // Emit the created event
        emit('created', result);
        
        // Show success notification
        common.notification('Google Meet link created successfully', true);
        
        isLoading.value = false;
    } catch (err) {
        console.error('Error creating Meet link:', err);
        error.value = 'Failed to create Meet link: ' + (err.message || 'Unknown error');
        emit('error', err);
        isLoading.value = false;
    }
}

// Handle integration selection change
function handleIntegrationChange(event) {
    selectedIntegrationId.value = parseInt(event.target.value);
    
    // Find the selected integration
    integration.value = integrationOptions.value.find(
        option => option.id === selectedIntegrationId.value
    );
}

// Check if Google Meet is connected
const hasMeetIntegration = computed(() => {
    return integrationOptions.value.some(option => option.provider === 'google_meet');
});

// Initialize component
onMounted(() => {
    loadIntegrations();
});

// Connect to Google Meet
function connectGoogleMeet() {
    IntegrationsManager.startOAuthFlow('google_meet', (success) => {
        if (success) {
            // Reload integrations after successful connection
            loadIntegrations();
        }
    });
}
</script>

<template>
    <div class="meet-link-creator">
        <div v-if="isLoading" class="loading-state">
            <i class="loading-icon">sync</i>
            <p>Processing...</p>
        </div>
        
        <div v-else-if="meetLink" class="success-state">
            <div class="success-icon">
                <i>check_circle</i>
            </div>
            <h3>Meet Link Created</h3>
            <p>Your Google Meet link has been created successfully.</p>
            
            <div class="meet-link">
                <a :href="meetLink.meet_link" target="_blank" rel="noopener noreferrer">
                    {{ meetLink.meet_link }}
                </a>
                <button class="copy-button" @click="() => navigator.clipboard.writeText(meetLink.meet_link)">
                    <i>content_copy</i>
                </button>
            </div>
            
            <Button label="Create Another" @click="meetLink = null" as="tertiary" />
        </div>
        
        <div v-else class="form-state">
            <div v-if="error" class="error-message">
                {{ error }}
            </div>
            
            <template v-if="integrationOptions.length === 0">
                <div class="no-integrations">
                    <p>No Google Meet or Google Calendar integration connected.</p>
                    <Button label="Connect Google Meet" @click="connectGoogleMeet" />
                </div>
            </template>
            
            <template v-else>
                <div class="form-group">
                    <label for="integration">Select Google Integration</label>
                    <select 
                        id="integration" 
                        v-model="selectedIntegrationId"
                        @change="handleIntegrationChange"
                        class="form-select"
                    >
                        <option 
                            v-for="option in integrationOptions" 
                            :key="option.id" 
                            :value="option.id"
                        >
                            {{ option.name }}
                        </option>
                    </select>
                    
                    <div v-if="!hasMeetIntegration" class="warning-message">
                        <i>info</i>
                        Using Google Calendar for Meet links. For best results, 
                        <a href="#" @click.prevent="connectGoogleMeet">connect Google Meet directly</a>.
                    </div>
                </div>
                
                <div class="actions">
                    <Button label="Create Meet Link" @click="createMeetLink" />
                </div>
            </template>
        </div>
    </div>
</template>

<style scoped>
.meet-link-creator {
    padding: 20px;
    border-radius: 8px;
    background-color: var(--background-0);
    border: 1px solid var(--border);
}

.loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 30px 0;
}

.loading-icon {
    font-size: 40px;
    color: var(--brand-default);
    animation: spin 2s linear infinite;
    margin-bottom: 15px;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

.success-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 20px 0;
}

.success-icon {
    font-size: 40px;
    color: var(--green-default);
    margin-bottom: 15px;
        display: flex;
    align-items: center;
    justify-content: center;
}

.success-state h3 {
    margin-bottom: 10px;
    font-size: 18px;
    font-weight: 600;
}

.success-state p {
    color: var(--text-secondary);
    margin-bottom: 20px;
}

.meet-link {
    display: flex;
    align-items: center;
    background-color: var(--background-1);
    padding: 10px 15px;
    border-radius: 8px;
    margin-bottom: 20px;
    width: 100%;
    max-width: 500px;
}

.meet-link a {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--brand-default);
}

.copy-button {
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    padding: 5px;
    margin-left: 10px;
    border-radius: 4px;
}

.copy-button:hover {
    background-color: var(--background-2);
}

.form-state {
    padding: 10px 0;
}

.form-group {
    margin-bottom: 20px;
}

.form-group label {
    display: block;
    margin-bottom: 8px;
    font-weight: 500;
}

.form-select {
    width: 100%;
    padding: 10px;
    border-radius: 6px;
    border: 1px solid var(--border);
    background-color: var(--background-0);
    color: var(--text-primary);
}

.actions {
    margin-top: 20px;
}

.error-message {
    background-color: rgba(239, 68, 68, 0.1);
    color: var(--red-default);
    padding: 10px 15px;
    border-radius: 6px;
    margin-bottom: 20px;
}

.warning-message {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    background-color: rgba(245, 158, 11, 0.1);
    color: var(--orange-default);
    padding: 10px 15px;
    border-radius: 6px;
    margin-top: 10px;
    font-size: 14px;
}

.warning-message i {
    margin-top: 2px;
}

.warning-message a {
    color: var(--brand-default);
    text-decoration: underline;
}

.no-integrations {
    text-align: center;
    padding: 20px 0;
}

.no-integrations p {
    color: var(--text-secondary);
    margin-bottom: 15px;
}
</style>