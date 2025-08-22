<script setup>
import { ref, onMounted } from 'vue';
import { popup } from '@utils/popup';

// Import existing popup components (reuse exactly what works)
import EventEditDuration from '@user_events/components/form/eventEditDuration.vue';
import EventEditLocation from '@user_events/components/form/eventEditLocation.vue';
import EventEditAssignees from '@user_events/components/form/eventEditAssignees.vue';
import EventEditSchedule from '@user_events/components/form/eventEditSchedule.vue';

// Components
import ButtonComponent from '@form/button/view.vue';

// Icons
import { PhClock, PhMapPin, PhUsers, PhCalendar } from '@phosphor-icons/vue';

const props = defineProps({
    event: {
        type: Object,
        required: true
    },
    eventId: {
        type: [String, Number],
        required: true
    },
    organizationId: {
        type: [String, Number],
        required: true
    }
});

const emit = defineEmits(['refresh']);

// Get display text for duration
function getDurationDisplay() {
    if (!props.event.duration || !Array.isArray(props.event.duration)) {
        return '30 minutes (default)';
    }
    
    if (props.event.duration.length === 1) {
        return `${props.event.duration[0].duration} minutes`;
    }
    
    return `${props.event.duration.length} duration options`;
}

// Get display text for location
function getLocationDisplay() {
    if (!props.event.location) {
        return 'No location set';
    }
    
    const locationType = props.event.location.type || props.event.location;
    
    switch (locationType) {
        case 'google_meet':
            return 'Google Meet';
        case 'web_conferencing':
            return 'Web conferencing';
        case 'in_person':
            return props.event.location.address ? 
                `In person - ${props.event.location.address}` : 
                'In person meeting';
        case 'custom':
            return props.event.location.custom || 'Custom location';
        default:
            return 'Location configured';
    }
}

// Get display text for hosts
function getHostsDisplay() {
    const hostCount = props.event.assignees?.length || 0;
    
    if (hostCount === 0) {
        return 'No hosts assigned';
    }
    
    if (hostCount === 1) {
        return `1 host assigned`;
    }
    
    return `${hostCount} hosts assigned`;
}

// Get display text for availability
function getAvailabilityDisplay() {
    if (!props.event.schedule || Object.keys(props.event.schedule).length === 0) {
        return 'No availability set';
    }
    
    const schedule = props.event.schedule;
    const enabledDays = Object.keys(schedule).filter(day => 
        schedule[day] && schedule[day].enabled
    );
    
    if (enabledDays.length === 0) {
        return 'No available days';
    }
    
    return `Available ${enabledDays.length} day${enabledDays.length !== 1 ? 's' : ''} per week`;
}

// Open duration settings popup
function editDuration() {
    popup.open(
        'edit-event-duration',
        null,
        EventEditDuration,
        {
            endpoint: `events/${props.eventId}?organization_id=${props.organizationId}`,
            type: 'PUT',
            callback: (event, data, response, success) => {
                if (success) {
                    emit('refresh');
                    popup.close();
                }
            },
            values: () => ({
                duration: props.event.duration || []
            }),
            class: 'h-auto',
            title: `Edit Duration for ${props.event.name}`,
        },
        {
            position: 'center'
        }
    );
}

// Open location settings popup
function editLocation() {
    popup.open(
        'edit-event-location',
        null,
        EventEditLocation,
        {
            eventId: props.eventId,
            organizationId: props.organizationId,
            callback: (event, data, response, success) => {
                if (success) {
                    emit('refresh');
                }
            }
        },
        {
            position: 'center'
        }
    );
}

// Open hosts settings popup
function editHosts() {
    popup.open(
        'edit-event-assignees',
        null,
        EventEditAssignees,
        {
            endpoint: `events/${props.eventId}/assignees?organization_id=${props.organizationId}`,
            type: 'PUT',
            eventId: props.eventId,
            organizationId: props.organizationId,
            callback: (event, data, response, success) => {
                if (success) {
                    emit('refresh');
                }
            },
            class: 'h-auto event-assignees',
            title: `Edit Hosts for ${props.event.name}`,
        },
        {
            position: 'center'
        }
    );
}

// Open availability settings popup
function editAvailability() {
    popup.open(
        'edit-event-schedule',               
        null,                        
        EventEditSchedule,           
        {                           
            eventId: props.eventId,
            organizationId: props.organizationId,
            callback: (event, data, response, success) => {
                if (success) {
                    emit('refresh');
                }
            },
        },
        {                          
            position: 'center'
        }
    );
}
</script>

<template>
    <div class="event-settings">
        <div class="settings-grid">
            <!-- Duration Setting -->
            <div class="setting-card">
                <div class="setting-content">
                    <div class="setting-icon">
                        <PhClock :size="24" />
                    </div>
                    <div class="setting-info">
                        <h4>Duration</h4>
                        <p>{{ getDurationDisplay() }}</p>
                    </div>
                </div>
                <div class="setting-actions">
                    <ButtonComponent 
                        @click="editDuration"
                        as="tertiary" 
                        label="Edit"
                        :iconLeft="{ component: PhClock, weight: 'bold' }"
                    />
                </div>
            </div>

            <!-- Location Setting -->
            <div class="setting-card">
                <div class="setting-content">
                    <div class="setting-icon">
                        <PhMapPin :size="24" />
                    </div>
                    <div class="setting-info">
                        <h4>Location</h4>
                        <p>{{ getLocationDisplay() }}</p>
                    </div>
                </div>
                <div class="setting-actions">
                    <ButtonComponent 
                        @click="editLocation"
                        as="tertiary" 
                        label="Edit"
                        :iconLeft="{ component: PhMapPin, weight: 'bold' }"
                    />
                </div>
            </div>

            <!-- Hosts Setting -->
            <div class="setting-card">
                <div class="setting-content">
                    <div class="setting-icon">
                        <PhUsers :size="24" />
                    </div>
                    <div class="setting-info">
                        <h4>Hosts</h4>
                        <p>{{ getHostsDisplay() }}</p>
                    </div>
                </div>
                <div class="setting-actions">
                    <ButtonComponent 
                        @click="editHosts"
                        as="tertiary" 
                        label="Edit"
                        :iconLeft="{ component: PhUsers, weight: 'bold' }"
                    />
                </div>
            </div>

            <!-- Availability Setting -->
            <div class="setting-card">
                <div class="setting-content">
                    <div class="setting-icon">
                        <PhCalendar :size="24" />
                    </div>
                    <div class="setting-info">
                        <h4>Availability</h4>
                        <p>{{ getAvailabilityDisplay() }}</p>
                    </div>
                </div>
                <div class="setting-actions">
                    <ButtonComponent 
                        @click="editAvailability"
                        as="tertiary" 
                        label="Edit"
                        :iconLeft="{ component: PhCalendar, weight: 'bold' }"
                    />
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.event-settings {
    display: flex;
    flex-direction: column;
    gap: 24px;
}

.settings-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 20px;
}

.setting-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px;
    background: var(--background-1);
    border: 1px solid var(--border);
    border-radius: 8px;
    transition: all 0.2s ease;
}

.setting-card:hover {
    border-color: var(--border-hover);
    background: var(--background-2);
}

.setting-content {
    display: flex;
    align-items: center;
    gap: 16px;
    flex: 1;
}

.setting-icon {
    color: var(--text-secondary);
    flex-shrink: 0;
}

.setting-info {
    flex: 1;
}

.setting-info h4 {
    margin: 0 0 4px 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
}

.setting-info p {
    margin: 0;
    font-size: 14px;
    color: var(--text-secondary);
    line-height: 1.4;
}

.setting-actions {
    flex-shrink: 0;
    margin-left: 16px;
}

@media (max-width: 768px) {
    .settings-grid {
        grid-template-columns: 1fr;
    }
    
    .setting-card {
        flex-direction: column;
        align-items: flex-start;
        gap: 16px;
    }
    
    .setting-actions {
        width: 100%;
        margin-left: 0;
    }
}
</style>