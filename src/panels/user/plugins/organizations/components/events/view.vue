<!-- src/panels/user/plugins/organizations/components/events/view.vue -->
<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '@utils/api';
import { common } from '@utils/common';
import { popup } from '@utils/popup';

import ButtonComponent from '@form/button/view.vue';
import EventCreateForm from '@user_events/components/form/eventCreate.vue';
import InputComponent from '@form/input/view.vue';

import { PhPlus, PhMagnifyingGlass, PhClock, PhMapPin, PhUsers, PhLink } from "@phosphor-icons/vue";

import '@user_shared/utils/styles/event-card.css';

const props = defineProps({
    organization: {
        type: Object,
        required: true
    },
    organizationId: {
        type: Number,
        required: true
    },
    isAdmin: {
        type: Boolean,
        default: false
    }
});

const emit = defineEmits(['refresh']);

const router = useRouter();
const events = ref([]);
const isLoading = ref(true);
const searchQuery = ref('');

// Filter events by search
const filteredEvents = computed(() => {
    if (!searchQuery.value) return events.value;
    
    const query = searchQuery.value.toLowerCase();
    return events.value.filter(event => 
        event.name.toLowerCase().includes(query) ||
        event.description?.toLowerCase().includes(query)
    );
});

// Load events for this organization
async function loadEvents() {
    try {
        isLoading.value = true;
        
        // Get all events for this organization
        const response = await api.get(`organizations/${props.organizationId}/events`);
        
        if (response.success && response.data) {
            // Load full event details for each event
            const eventsWithDetails = await Promise.all(
                response.data.map(async (event) => {
                    try {
                        const detailResponse = await api.get(`events/${event.id}?organization_id=${props.organizationId}`);
                        if (detailResponse.success && detailResponse.data) {
                            return detailResponse.data;
                        }
                        return event;
                    } catch (error) {
                        console.error(`Failed to load event ${event.id}:`, error);
                        return event;
                    }
                })
            );
            
            events.value = eventsWithDetails.filter(event => !event.deleted);
        }
    } catch (error) {
        console.error('Failed to load events:', error);
        common.notification('Failed to load events', false);
    } finally {
        isLoading.value = false;
    }
}

// Create new event
function createEvent() {
    popup.open(
        'create-event',
        null,
        EventCreateForm,
        {
            endpoint: `events?organization_id=${props.organizationId}`,
            type: 'POST',
            callback: (event, data, response, success) => {
                if (success) {
                    popup.close();
                    loadEvents();
                    emit('refresh');
                }
            },
            class: 'h-auto',
            title: 'Create New Event',
            values: () => ({
                organization_id: props.organizationId
            })
        },
        {
            position: 'center'
        }
    );
}

// Navigate to event single page
function goToEvent(eventId) {
    router.push(`/events/${eventId}`);
}

// Get event URL
function getEventUrl(event) {
    return `https://skedi.com/${props.organization.slug}/schedule/${event.slug}`;
}

// Copy URL to clipboard
async function copyEventUrl(event, $event) {
    $event.stopPropagation();
    
    try {
        const url = getEventUrl(event);
        await navigator.clipboard.writeText(url);
        common.notification('Event URL copied to clipboard', true);
    } catch (error) {
        console.error('Failed to copy URL:', error);
        common.notification('Failed to copy URL', false);
    }
}

// Get duration display
function getDurationDisplay(event) {
    if (!event.duration || !Array.isArray(event.duration)) {
        return '30 min';
    }
    
    if (event.duration.length === 1) {
        return `${event.duration[0].duration} min`;
    }
    
    return `${event.duration.length} options`;
}

// Get location display
function getLocationDisplay(event) {
    if (!event.location) return 'No location';
    
    const locationType = event.location.type || event.location;
    const locationMap = {
        'google_meet': 'Google Meet',
        'web_conferencing': 'Web conferencing',
        'in_person': event.location.address ? event.location.address : 'In person',
        'custom': event.location.custom || 'Custom'
    };
    
    return locationMap[locationType] || 'Configured';
}

// Get hosts display
function getHostsDisplay(event) {
    const hostCount = event.assignees?.length || 0;
    if (hostCount === 0) return 'No hosts';
    if (hostCount === 1) return '1 host';
    return `${hostCount} hosts`;
}

onMounted(() => {
    loadEvents();
});
</script>

<template>
    <div class="org-events-tab">
        <div class="events-header">
            <div class="header-info">
                <h3>Events</h3>
                <p>All event types in this organization</p>
            </div>
            <div class="header-actions">
                <div class="search-box">
                    <InputComponent
                        v-model="searchQuery"
                        placeholder="Search events..."
                        :iconLeft="{ component: PhMagnifyingGlass }"
                    />
                </div>
                <ButtonComponent
                    v-if="isAdmin"
                    @click="createEvent"
                    as="primary"
                    :iconLeft="{ component: PhPlus, weight: 'bold' }"
                    label="Create Event"
                />
            </div>
        </div>
        
        <div v-if="isLoading" class="loading-state">
            <p>Loading events...</p>
        </div>
        
        <div v-else-if="filteredEvents.length === 0" class="empty-state">
            <p>{{ searchQuery ? 'No events found' : 'No events created yet' }}</p>
            <ButtonComponent
                v-if="isAdmin && !searchQuery"
                @click="createEvent"
                as="primary"
                :iconLeft="{ component: PhPlus, weight: 'bold' }"
                label="Create First Event"
            />
        </div>
        
        <div v-else class="events-grid">
            <div 
                v-for="event in filteredEvents" 
                :key="event.id"
                class="event-card"
                @click="goToEvent(event.id)"
            >
                <div class="event-card-header">
                    <h4 class="event-title">{{ event.name }}</h4>
                    <ButtonComponent
                        @click="copyEventUrl(event, $event)"
                        as="tertiary icon"
                        :iconLeft="{ component: PhLink, weight: 'bold' }"
                        v-tooltip="{ content: 'Copy URL' }"
                    />
                </div>
                
                <p v-if="event.description" class="event-description">
                    {{ event.description }}
                </p>
                
                <div class="event-meta">
                    <div class="meta-item">
                        <PhClock :size="16" weight="bold" />
                        <span>{{ getDurationDisplay(event) }}</span>
                    </div>
                    <div class="meta-item">
                        <PhMapPin :size="16" weight="bold" />
                        <span>{{ getLocationDisplay(event) }}</span>
                    </div>
                    <div class="meta-item">
                        <PhUsers :size="16" weight="bold" />
                        <span>{{ getHostsDisplay(event) }}</span>
                    </div>
                </div>
                
                <div class="event-url">
                    <a 
                        :href="getEventUrl(event)" 
                        target="_blank" 
                        @click.stop
                        class="url-link"
                    >
                        {{ props.organization.slug }}/{{ event.slug }}
                    </a>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.org-events-tab {
    display: flex;
    flex-direction: column;
    gap: 24px;
}

.events-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 20px;
}

.header-info h3 {
    margin: 0 0 8px 0;
    font-size: 20px;
    font-weight: 600;
}

.header-info p {
    margin: 0;
    color: var(--text-secondary);
    font-size: 14px;
}

.header-actions {
    display: flex;
    gap: 12px;
    align-items: center;
}

.search-box {
    width: 250px;
}

.loading-state,
.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 20px;
    text-align: center;
}

.empty-state p {
    margin: 0 0 20px 0;
    color: var(--text-secondary);
    font-size: 16px;
}

.events-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 20px;
}

.event-card {
    background: var(--background-0);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 20px;
    cursor: pointer;
    transition: all 0.2s;
}

.event-card:hover {
    border-color: var(--brand-primary);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.event-card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 12px;
    gap: 12px;
}

.event-title {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    flex: 1;
}

.event-description {
    margin: 0 0 16px 0;
    color: var(--text-secondary);
    font-size: 14px;
    line-height: 1.5;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

.event-meta {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 12px;
}

.meta-item {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--text-secondary);
    font-size: 14px;
}

.meta-item svg {
    color: var(--text-secondary);
    flex-shrink: 0;
}

.event-url {
    padding-top: 12px;
    border-top: 1px solid var(--border);
}

.url-link {
    color: var(--brand-blue);
    text-decoration: none;
    font-size: 13px;
    font-weight: 500;
    font-family: monospace;
}

.url-link:hover {
    text-decoration: underline;
}

@media (max-width: 768px) {
    .events-header {
        flex-direction: column;
    }
    
    .header-actions {
        width: 100%;
        flex-direction: column;
    }
    
    .search-box {
        width: 100%;
    }
    
    .events-grid {
        grid-template-columns: 1fr;
    }
}
</style>