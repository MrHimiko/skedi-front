<script setup>
import { ref, onMounted } from 'vue';
import { api } from '@utils/api';
import { common } from '@utils/common';
import { useRouter } from 'vue-router';

import ButtonComponent from '@form/button/view.vue';
import InputComponent from '@form/input/view.vue';
import MenusComponent from '@global/menus/view.vue';
import ConfirmComponent from '@floated/confirm/view.vue';
import { popup } from '@utils/popup';

import { 
    PhPlus, 
    PhMagnifyingGlass, 
    PhLink, 
    PhCode, 
    PhUsers, 
    PhDotsThree,
    PhClock,
    PhCalendar,
    PhMapPin,
    PhTrash
} from "@phosphor-icons/vue";

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

const router = useRouter();

// State
const events = ref([]);
const isLoading = ref(true);
const searchQuery = ref('');
const filteredEvents = ref([]);

// Load organization events
async function loadEvents() {
    try {
        isLoading.value = true;
        
        // Use the correct endpoint with organization_id as query parameter
        const response = await api.get(`events?organization_id=${props.organizationId}`);
        
        if (response.success && response.data) {
            events.value = response.data;
            filterEvents();
        }
    } catch (error) {
        console.error('Failed to load events:', error);
        common.notification('Failed to load events', false);
    } finally {
        isLoading.value = false;
    }
}

// Filter events based on search
function filterEvents() {
    if (!searchQuery.value) {
        filteredEvents.value = events.value;
        return;
    }
    
    const query = searchQuery.value.toLowerCase();
    filteredEvents.value = events.value.filter(event => 
        event.name.toLowerCase().includes(query) ||
        event.description?.toLowerCase().includes(query)
    );
}

// Navigate to create event
function createEvent() {
    router.push(`/events/create?organization_id=${props.organizationId}`);
}

// Navigate to edit event
function editEvent(event) {
    router.push(`/events/${event.id}/edit?organization_id=${props.organizationId}`);
}

// Delete event
function deleteEvent(event) {
    popup.open(
        'delete-event-confirm',
        null,
        ConfirmComponent,
        {
            as: 'red',
            description: `Are you sure you want to delete "${event.name}"?`,
            callback: async () => {
                try {
                    const response = await api.delete(`events/${event.id}?organization_id=${props.organizationId}`);
                    
                    if (response.success) {
                        common.notification('Event deleted successfully', true);
                        popup.close();
                        loadEvents();
                    } else {
                        common.notification('Failed to delete event', false);
                    }
                } catch (error) {
                    console.error('Failed to delete event:', error);
                    common.notification('Failed to delete event', false);
                }
            }
        },
        {
            position: 'center'
        }
    );
}

// Get team color
function getTeamColor(event) {
    if (!event.team_id || !event.team) return '#FFDE0E'; // Default yellow
    return event.team.color || '#FFDE0E';
}

// Copy event link
function copyEventLink(event) {
    const link = `https://skedi.com/${props.organization?.slug || ''}/${event.slug}`;
    navigator.clipboard.writeText(link).then(() => {
        common.notification('Link copied to clipboard', true);
    });
}

// Watch search query
function onSearchChange() {
    filterEvents();
}

onMounted(() => {
    loadEvents();
});
</script>

<template>
    <div class="org-events">
        <!-- Header -->
        <div class="events-header">
            <h3>Event Types</h3>
            <ButtonComponent
                v-if="isAdmin"
                :iconLeft="{ component: PhPlus, weight: 'bold' }"
                label="Create Event"
                @click="createEvent"
            />
        </div>
        
        <!-- Search -->
        <div class="search-section">
            <InputComponent
                v-model="searchQuery"
                placeholder="Search events..."
                :iconLeft="{ component: PhMagnifyingGlass, weight: 'bold' }"
                @input="onSearchChange"
            />
        </div>
        
        <!-- Events List -->
        <div v-if="isLoading" class="loading-state">
            Loading events...
        </div>
        
        <div v-else-if="filteredEvents.length === 0" class="empty-state">
            <p v-if="searchQuery">No events found matching "{{ searchQuery }}"</p>
            <div v-else>
                <p>No events created yet</p>
                <ButtonComponent
                    v-if="isAdmin"
                    :iconLeft="{ component: PhPlus, weight: 'bold' }"
                    label="Create First Event"
                    @click="createEvent"
                />
            </div>
        </div>
        
        <div v-else class="events-grid">
            <div 
                v-for="event in filteredEvents" 
                :key="event.id"
                class="event-card"
            >
                <div class="event-content">
                    <div class="event-header">
                        <div 
                            class="event-color-marker" 
                            :style="{ backgroundColor: getTeamColor(event) }"
                        ></div>
                        <h4 @click="editEvent(event)" class="event-name">
                            {{ event.name }}
                        </h4>
                    </div>
                    
                    <a 
                        :href="`https://skedi.com/${organization?.slug || ''}/${event.slug}`" 
                        target="_blank"
                        class="event-link"
                    >
                        {{ `skedi.com/${organization?.slug || ''}/${event.slug}` }}
                    </a>
                    
                    <div class="event-info">
                        <div class="info-item">
                            <PhUsers size="16" />
                            <span>{{ event.assignees?.length || 1 }} host{{ event.assignees?.length > 1 ? 's' : '' }}</span>
                        </div>
                        <div v-if="event.duration?.length" class="info-item">
                            <PhClock size="16" />
                            <span>{{ event.duration[0]?.duration || 30 }} min</span>
                        </div>
                    </div>
                </div>
                
                <div v-if="isAdmin" class="event-actions">
                    <ButtonComponent
                        v-tooltip="{ content: 'Copy link' }"
                        as="tertiary icon"
                        :iconLeft="{ component: PhLink, weight: 'bold' }"
                        @click="copyEventLink(event)"
                    />
                    <ButtonComponent
                        v-dropdown="{
                            component: MenusComponent,
                            properties: {
                                menus: [
                                    {
                                        label: 'Edit',
                                        onClick: () => editEvent(event)
                                    },
                                    {
                                        label: 'Delete',
                                        iconComponent: PhTrash,
                                        weight: 'bold',
                                        onClick: () => deleteEvent(event)
                                    }
                                ]
                            }
                        }"
                        v-tooltip="{ content: 'More options' }"
                        as="tertiary icon"
                        :iconLeft="{ component: PhDotsThree, weight: 'bold' }"
                    />
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.org-events {
    min-height: 400px;
}

.events-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
}

.events-header h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
}

.search-section {
    margin-bottom: 24px;
}

.loading-state,
.empty-state {
    text-align: center;
    padding: 60px 20px;
    color: var(--text-secondary);
}

.empty-state p {
    margin-bottom: 16px;
    font-size: 16px;
}

/* Events Grid */
.events-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 16px;
}

.event-card {
    background: var(--background-1);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 20px;
    transition: all 0.2s;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
}

.event-card:hover {
    border-color: var(--border-hover);
}

.event-content {
    flex: 1;
}

.event-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 8px;
}

.event-color-marker {
    width: 40px;
    height: 10px;
    border-radius: 100px;
}

.event-name {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: color 0.2s;
}

.event-name:hover {
    color: var(--brand-primary);
}

.event-link {
    color: var(--text-secondary);
    font-size: 13px;
    text-decoration: none;
    display: block;
    margin-bottom: 12px;
    word-break: break-all;
}

.event-link:hover {
    text-decoration: underline;
}

.event-info {
    display: flex;
    gap: 16px;
}

.info-item {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: var(--text-secondary);
}

.event-actions {
    display: flex;
    gap: 4px;
    opacity: 0;
    transition: opacity 0.2s;
}

.event-card:hover .event-actions {
    opacity: 1;
}

@media (max-width: 768px) {
    .events-grid {
        grid-template-columns: 1fr;
    }
    
    .event-actions {
        opacity: 1;
    }
}
</style>