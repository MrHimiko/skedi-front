<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '@utils/api';
import { UserStore } from '@stores/user';

// Components
import ButtonComponent from '@form/button/view.vue';

// Icons
import { 
    PhClock, PhMapPin, PhUsers, PhCalendar, PhLink, 
    PhBuildings, PhUsersThree, PhArrowSquareOut, PhCopy, PhGearSix
} from '@phosphor-icons/vue';

const props = defineProps({
    event: {
        type: Object,
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
    return `https://skedi.com/${props.organization.slug}/${props.event.slug}`;
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
    // This would need to be enhanced based on your availability structure
    return props.event.schedule ? 'Availability configured' : 'No availability set';
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

        <!-- Event Details -->
        <div class="section">
            <h3>Event Details</h3>
            <div class="details-grid">
                <div class="detail-item">
                    <div class="detail-icon">
                        <PhClock :size="20" />
                    </div>
                    <div class="detail-content">
                        <span class="detail-label">Duration</span>
                        <span class="detail-value">{{ durationDisplay }}</span>
                    </div>
                </div>

                <div class="detail-item">
                    <div class="detail-icon">
                        <PhMapPin :size="20" />
                    </div>
                    <div class="detail-content">
                        <span class="detail-label">Location</span>
                        <span class="detail-value">{{ locationDisplay }}</span>
                    </div>
                </div>

                <div class="detail-item">
                    <div class="detail-icon">
                        <PhUsers :size="20" />
                    </div>
                    <div class="detail-content">
                        <span class="detail-label">Hosts</span>
                        <span class="detail-value">{{ hostsDisplay }}</span>
                    </div>
                </div>

                <div class="detail-item">
                    <div class="detail-icon">
                        <PhCalendar :size="20" />
                    </div>
                    <div class="detail-content">
                        <span class="detail-label">Availability</span>
                        <span class="detail-value">{{ availabilityDisplay }}</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Organization & Team Management -->
        <div class="section">
            <h3>Organization & Team</h3>
            <div class="org-team-grid">
                <div class="org-team-item">
                    <div class="detail-icon">
                        <PhBuildings :size="20" />
                    </div>
                    <div class="detail-content">
                        <span class="detail-label">Organization</span>
                        <span class="detail-value">{{ organization?.name || 'Loading...' }}</span>
                    </div>
                    <div v-if="multipleOrganizations" class="detail-actions">
                        <ButtonComponent 
                            @click="changeOrganization"
                            as="transparent" 
                            label="Change Organization"
                            :iconLeft="{ component: PhBuildings, weight: 'bold' }"
                        />
                    </div>
                </div>

                <div class="org-team-item">
                    <div class="detail-icon">
                        <PhUsersThree :size="20" />
                    </div>
                    <div class="detail-content">
                        <span class="detail-label">Team</span>
                        <span class="detail-value">{{ team?.name || 'Not assigned to any team' }}</span>
                        <span v-if="!team" class="detail-note">This event is at the organization level</span>
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

/* Details Grid */
.details-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 16px;
}

.detail-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px;
    background: var(--background-1);
    border: 1px solid var(--border);
    border-radius: 8px;
}

.detail-icon {
    color: var(--text-secondary);
    flex-shrink: 0;
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