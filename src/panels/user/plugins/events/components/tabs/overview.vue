<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '@utils/api';
import { UserStore } from '@stores/user';
import { popup } from '@utils/popup';

// Import popup components for editing
import EventEditDuration from '@user_events/components/form/eventEditDuration.vue';
import EventEditLocation from '@user_events/components/form/eventEditLocation.vue';
import EventEditAssignees from '@user_events/components/form/eventEditAssignees.vue';
import EventEditSchedule from '@user_events/components/form/eventEditSchedule.vue';

// Components
import ButtonComponent from '@form/button/view.vue';

// Icons
import { 
    PhClock, PhMapPin, PhUsers, PhCalendar, PhLink, 
    PhBuildings, PhUsersThree, PhArrowSquareOut, PhCopy, PhGearSix, PhPencilSimple
} from '@phosphor-icons/vue';

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
    },
    organization: {
        type: Object,
        default: null
    },
    team: {
        type: Object,
        default: null
    }
});

const emit = defineEmits(['refresh']);

// Router and stores
const router = useRouter();
const userStore = UserStore();

// State
const bookingStats = ref({
    total: 0,
    upcoming: 0,
    past: 0,
    canceled: 0
});
const isLoadingStats = ref(true);
const urlCopied = ref(false);

// Computed
const eventUrl = computed(() => {
    if (!props.event || !props.organization) return '';
    return `https://skedi.com/${props.organization.slug}/schedule/${props.event.slug}`;
});

// Check if user has multiple organizations
const multipleOrganizations = computed(() => {
    const orgs = userStore.getOrganizations();
    return orgs && orgs.length > 1;
});

// Check if current organization has teams
const hasTeams = computed(() => {
    const userTeams = userStore.getTeams();
    return userTeams && userTeams.some(team => 
        team.entity?.organization_id === props.event.organization_id
    );
});

const durationDisplay = computed(() => {
    if (!props.event.duration || !Array.isArray(props.event.duration)) {
        return '30 minutes';
    }
    
    if (props.event.duration.length === 1) {
        return `${props.event.duration[0].duration} minutes`;
    }
    
    return `${props.event.duration.length} duration options`;
});

const locationDisplay = computed(() => {
    if (!props.event.location) return 'No location set';
    
    const locationType = props.event.location.type || props.event.location;
    const locationMap = {
        'google_meet': 'Google Meet',
        'web_conferencing': 'Web conferencing',
        'in_person': props.event.location.address ? 
            `In person - ${props.event.location.address}` : 
            'In person meeting',
        'custom': props.event.location.custom || 'Custom location'
    };
    
    return locationMap[locationType] || 'Location configured';
});

const hostsDisplay = computed(() => {
    const hostCount = props.event.assignees?.length || 0;
    if (hostCount === 0) return 'No hosts assigned';
    if (hostCount === 1) return '1 host assigned';
    return `${hostCount} hosts assigned`;
});

const availabilityDisplay = computed(() => {
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
    
    // Build display text with days + buffer + advance notice
    let displayParts = [];
    
    // Working days
    const daysText = `${enabledDays.length} working day${enabledDays.length !== 1 ? 's' : ''}`;
    displayParts.push(daysText);
    
    // Buffer time
    if (props.event.buffer_time) {
        displayParts.push(`${props.event.buffer_time} min buffer`);
    }
    
    // Advance notice (if available in event data)
    if (props.event.advance_notice) {
        displayParts.push(`${props.event.advance_notice} min advance notice`);
    }
    
    return displayParts.join(' • ');
});

// Load booking statistics
async function loadBookingStats() {
    try {
        isLoadingStats.value = true;
        
        // Use the correct API route with organization prefix
        const response = await api.get(`organizations/${props.event.organization_id}/events/${props.event.id}/bookings/stats`);
        
        if (response.success && response.data) {
            bookingStats.value = response.data;
        }
    } catch (error) {
        console.error('Failed to load booking stats:', error);
        // Set default stats on error
        bookingStats.value = {
            total: 0,
            upcoming: 0,
            past: 0,
            canceled: 0
        };
    } finally {
        isLoadingStats.value = false;
    }
}

// Copy URL to clipboard
async function copyUrl() {
    try {
        await navigator.clipboard.writeText(eventUrl.value);
        urlCopied.value = true;
        
        setTimeout(() => {
            urlCopied.value = false;
        }, 2000);
    } catch (error) {
        console.error('Failed to copy URL:', error);
    }
}

// Open preview
function openPreview() {
    window.open(eventUrl.value, '_blank');
}

// Team management functions
function changeOrganization() {
    // TODO: Implement organization change functionality
    console.log('Change organization clicked');
}

function goToTeamSettings() {
    router.push('/teams');
}

function changeTeam() {
    // TODO: Implement team change functionality  
    console.log('Change team clicked');
}

function assignToTeam() {
    // TODO: Implement assign to team functionality
    console.log('Assign to team clicked');
}

// Edit functions matching settings tab
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

onMounted(() => {
    loadBookingStats();
});
</script>

<template>
    <div class="event-overview">
        <!-- Event URL Section -->
        <div class="section">
            <h3>Event URL</h3>
            <div class="url-section">
                <div class="url-display">
                    <PhLink :size="20" />
                    <span>{{ eventUrl }}</span>
                </div>
                <div class="url-actions">
                    <ButtonComponent 
                        @click="copyUrl" 
                        as="tertiary" 
                        :label="urlCopied ? 'Copied!' : 'Copy'"
                        :iconLeft="{ component: PhCopy, weight: 'bold' }"
                    />
                    <ButtonComponent 
                        @click="openPreview" 
                        as="tertiary" 
                        label="Preview"
                        :iconLeft="{ component: PhArrowSquareOut, weight: 'bold' }"
                    />
                </div>
            </div>
        </div>

        <!-- Event Details Section -->
        <div class="section">
            <h3>Event Details</h3>
            <div class="details-grid">
                <!-- Availability Card - First -->
                <div class="detail-card">
                    <div class="detail-card-content">
                        <div class="detail-icon">
                            <PhCalendar :size="24" />
                        </div>
                        <div class="detail-info">
                            <h4>Availability</h4>
                            <p>{{ availabilityDisplay }}</p>
                        </div>
                    </div>
                    <button class="icon-button" @click="editAvailability">
                        <PhPencilSimple :size="16" weight="bold" />
                    </button>
                </div>

                <!-- Duration Card -->
                <div class="detail-card">
                    <div class="detail-card-content">
                        <div class="detail-icon">
                            <PhClock :size="24" />
                        </div>
                        <div class="detail-info">
                            <h4>Duration</h4>
                            <p>{{ durationDisplay }}</p>
                        </div>
                    </div>
                    <button class="icon-button" @click="editDuration">
                        <PhPencilSimple :size="16" weight="bold" />
                    </button>
                </div>

                <!-- Location Card -->
                <div class="detail-card">
                    <div class="detail-card-content">
                        <div class="detail-icon">
                            <PhMapPin :size="24" />
                        </div>
                        <div class="detail-info">
                            <h4>Location</h4>
                            <p>{{ locationDisplay }}</p>
                        </div>
                    </div>
                    <button class="icon-button" @click="editLocation">
                        <PhPencilSimple :size="16" weight="bold" />
                    </button>
                </div>

                <!-- Hosts Card -->
                <div class="detail-card">
                    <div class="detail-card-content">
                        <div class="detail-icon">
                            <PhUsers :size="24" />
                        </div>
                        <div class="detail-info">
                            <h4>Hosts</h4>
                            <p>{{ hostsDisplay }}</p>
                        </div>
                    </div>
                    <button class="icon-button" @click="editHosts">
                        <PhPencilSimple :size="16" weight="bold" />
                    </button>
                </div>
            </div>
        </div>

        <!-- Organization & Team Section -->
        <div class="section">
            <h3>Organization & Team</h3>
            <div class="org-team-grid">
                <!-- Organization -->
                <div class="org-team-item">
                    <div class="detail-icon">
                        <PhBuildings :size="24" />
                    </div>
                    <div class="detail-content">
                        <div class="detail-label">Organization</div>
                        <div class="detail-value">{{ organization?.name || 'No organization' }}</div>
                    </div>
                    <div class="detail-actions" v-if="multipleOrganizations">
                        <ButtonComponent 
                            @click="changeOrganization"
                            as="transparent" 
                            label="Change"
                            :iconLeft="{ component: PhBuildings, weight: 'bold' }"
                        />
                    </div>
                </div>

                <!-- Team -->
                <div class="org-team-item">
                    <div class="detail-icon">
                        <PhUsersThree :size="24" />
                    </div>
                    <div class="detail-content">
                        <div class="detail-label">Team</div>
                        <div class="detail-value">{{ team?.name || 'Not assigned to any team' }}</div>
                        <div v-if="!team" class="detail-note">This event is at the organization level</div>
                    </div>
                    <div class="detail-actions">
                        <ButtonComponent 
                            v-if="!hasTeams"
                            @click="goToTeamSettings"
                            as="transparent" 
                            label="Go to Team Settings"
                            :iconLeft="{ component: PhGearSix, weight: 'bold' }"
                        />
                        <ButtonComponent 
                            v-else-if="team"
                            @click="changeTeam"
                            as="transparent" 
                            label="Change Team"
                            :iconLeft="{ component: PhUsersThree, weight: 'bold' }"
                        />
                        <ButtonComponent 
                            v-else
                            @click="assignToTeam"
                            as="transparent" 
                            label="Assign to Team"
                            :iconLeft="{ component: PhUsersThree, weight: 'bold' }"
                        />
                    </div>
                </div>
            </div>
        </div>

        <!-- Booking Statistics -->
        <div class="section">
            <h3>Booking Statistics</h3>
            <div v-if="isLoadingStats" class="stats-loading">
                Loading statistics...
            </div>
            <div v-else class="stats-grid">
                <div class="stat-item">
                    <div class="stat-number">{{ bookingStats.total }}</div>
                    <div class="stat-label">Total Bookings</div>
                </div>
                <div class="stat-item">
                    <div class="stat-number">{{ bookingStats.upcoming }}</div>
                    <div class="stat-label">Upcoming</div>
                </div>
                <div class="stat-item">
                    <div class="stat-number">{{ bookingStats.past }}</div>
                    <div class="stat-label">Completed</div>
                </div>
                <div class="stat-item">
                    <div class="stat-number">{{ bookingStats.canceled }}</div>
                    <div class="stat-label">Canceled</div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.event-overview {
    display: flex;
    flex-direction: column;
    gap: 32px;
}

.section {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.section h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: var(--text-primary);
}

/* URL Section */
.url-section {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px;
    background: var(--background-1);
    border: 1px solid var(--border);
    border-radius: 8px;
    gap: 16px;
}

.url-display {
    display: flex;
    align-items: center;
    gap: 12px;
    color: var(--primary);
    font-family: monospace;
    font-size: 14px;
    flex: 1;
}

.url-actions {
    display: flex;
    gap: 8px;
}

/* Details Grid - Matching settings tab design */
.details-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 16px;
}

.detail-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px;
    background: var(--background-1);
    border: 1px solid var(--border);
    border-radius: 8px;
    transition: all 0.2s ease;
}

.detail-card:hover {
    border-color: var(--border-hover);
    background: var(--background-2);
}

.detail-card-content {
    display: flex;
    align-items: center;
    gap: 16px;
    flex: 1;
}

.detail-icon {
    color: var(--text-secondary);
    flex-shrink: 0;
}

.detail-info {
    flex: 1;
}

.detail-info h4 {
    margin: 0 0 4px 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
}

.detail-info p {
    margin: 0;
    font-size: 14px;
    color: var(--text-secondary);
    line-height: 1.4;
}

.icon-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: none;
    background: transparent;
    border-radius: 6px;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.2s ease;
    flex-shrink: 0;
}

.icon-button:hover {
    background: var(--background-3);
    color: var(--text-primary);
}

/* Organization & Team Grid */
.org-team-grid {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.org-team-item {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 16px;
    background: var(--background-1);
    border: 1px solid var(--border);
    border-radius: 8px;
}

.detail-content {
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1;
}

.detail-label {
    font-size: 12px;
    color: var(--text-secondary);
    font-weight: 500;
}

.detail-value {
    font-size: 14px;
    color: var(--text-primary);
    font-weight: 500;
}

.detail-note {
    font-size: 12px;
    color: var(--text-tertiary);
    font-style: italic;
}

.detail-actions {
    flex-shrink: 0;
    margin-left: 16px;
}

/* Statistics */
.stats-loading {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 40px;
    color: var(--text-secondary);
}

.stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 16px;
}

.stat-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 20px;
    background: var(--background-1);
    border: 1px solid var(--border);
    border-radius: 8px;
    text-align: center;
}

.stat-number {
    font-size: 24px;
    font-weight: 700;
    color: var(--primary);
    margin-bottom: 4px;
}

.stat-label {
    font-size: 12px;
    color: var(--text-secondary);
    font-weight: 500;
}

@media (max-width: 768px) {
    .url-section {
        flex-direction: column;
        align-items: flex-start;
        gap: 12px;
    }
    
    .url-actions {
        width: 100%;
        justify-content: flex-end;
    }
    
    .details-grid {
        grid-template-columns: 1fr;
    }
    
    .stats-grid {
        grid-template-columns: repeat(2, 1fr);
    }
}
</style>