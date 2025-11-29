<!-- 
    FULL PATH: src/panels/user/plugins/events/components/items/EventCard.vue
    
    Single event card component - displays one event with actions
-->
<script setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { common } from '@utils/common';

// Components
import MenusComponent from '@global/menus/view.vue';
import ButtonComponent from '@form/button/view.vue';

// Icons
import { 
    PhDotsThree, PhClock, PhCalendar, PhMapPin, 
    PhUsers, PhCopy, PhArrowSquareOut
} from "@phosphor-icons/vue";

const props = defineProps({
    event: {
        type: Object,
        required: true
    },
    organization: {
        type: Object,
        required: true
    },
    menuItems: {
        type: Array,
        required: true
    }
});

const emit = defineEmits(['menu-select', 'quick-action']);
const router = useRouter();

// Computed
const eventUrl = computed(() => {
    return `https://skedi.com/${props.organization.slug}/schedule/${props.event.slug}`;
});

const durationDisplay = computed(() => {
    if (!props.event.duration || !Array.isArray(props.event.duration)) {
        return '30m';
    }
    if (props.event.duration.length === 1) {
        return `${props.event.duration[0].duration}m`;
    }
    return `${props.event.duration.length} options`;
});

const enabledDaysCount = computed(() => {
    if (!props.event.schedule) return 0;
    return Object.keys(props.event.schedule).filter(
        day => props.event.schedule[day]?.enabled
    ).length;
});

const locationDisplay = computed(() => {
    if (!props.event.location) return 'Not set';
    
    const location = Array.isArray(props.event.location) 
        ? props.event.location[0] 
        : props.event.location;
    
    const locationMap = {
        'google_meet': 'Meet',
        'zoom': 'Zoom',
        'teams': 'Teams',
        'in_person': 'In Person',
        'phone': 'Phone'
    };
    
    return locationMap[location?.type] || 'Online';
});

const assigneesCount = computed(() => {
    return props.event.assignees?.length || 0;
});

const availabilityTooltip = computed(() => {
    if (!props.event.schedule) return 'No schedule set';
    
    const enabledDays = Object.entries(props.event.schedule)
        .filter(([_, config]) => config?.enabled)
        .map(([day, config]) => {
            const dayName = day.charAt(0).toUpperCase() + day.slice(1, 3);
            return `${dayName}: ${config.start_time?.slice(0, 5)} - ${config.end_time?.slice(0, 5)}`;
        });
    
    return enabledDays.length > 0 ? enabledDays.join('\n') : 'No days enabled';
});

// Methods
async function copyEventUrl() {
    try {
        await navigator.clipboard.writeText(eventUrl.value);
        common.notification('URL copied to clipboard', true);
    } catch (error) {
        console.error('Failed to copy URL:', error);
        common.notification('Failed to copy URL', false);
    }
}

function openPreview() {
    window.open(eventUrl.value, '_blank');
}

function onMenuSelect(item) {
    emit('menu-select', item.label, props.event);
}
</script>

<template>
    <div class="event-card">
        <div class="top">
            <!-- Team color indicator -->
            <div 
                class="event-color-marker clickable" 
                :style="{ backgroundColor: event.teamColor || '#000' }"
                @click="emit('quick-action', 'manage-team', event)"
                v-tooltip="{ content: 'Click to manage team' }"
            ></div>
            
            <!-- Event name -->
            <p class="event-name">{{ event.name || 'Unnamed Event' }}</p>
            
            <!-- Event URL -->
            <a 
                :href="eventUrl" 
                target="_blank" 
                class="blue-link"
                @click.stop
            >
                {{ eventUrl }}
            </a>

            <!-- Info badges -->
            <div class="info">
                <!-- Availability -->
                <div 
                    class="info-item clickable"
                    @click.stop="emit('quick-action', 'edit-availability', event)"
                    v-tooltip="{ content: availabilityTooltip, placement: 'top' }"
                >
                    <div class="icon">
                        <PhCalendar weight="bold" />
                    </div>
                    <span class="value">{{ enabledDaysCount }}</span>
                </div>

                <!-- Duration -->
                <div 
                    class="info-item clickable"
                    @click.stop="emit('quick-action', 'edit-duration', event)"
                    v-tooltip="{ content: 'Edit duration' }"
                >
                    <div class="icon">
                        <PhClock weight="bold" />
                    </div>
                    <span class="value">{{ durationDisplay }}</span>
                </div>

                <!-- Location -->
                <div 
                    class="info-item clickable"
                    @click.stop="emit('quick-action', 'edit-location', event)"
                    v-tooltip="{ content: 'Edit location' }"
                >
                    <div class="icon">
                        <PhMapPin weight="bold" />
                    </div>
                    <span class="value">{{ locationDisplay }}</span>
                </div>

                <!-- Hosts -->
                <div 
                    class="info-item clickable"
                    @click.stop="emit('quick-action', 'manage-hosts', event)"
                    v-tooltip="{ content: 'Manage hosts' }"
                >
                    <div class="icon">
                        <PhUsers weight="bold" />
                    </div>
                    <span class="value">{{ assigneesCount }}</span>
                </div>
            </div>
        </div>

        <!-- Actions -->
        <div class="actions">
            <ButtonComponent 
                as="white" 
                icon="PhCopy"
                @click.stop="copyEventUrl"
                v-tooltip="{ content: 'Copy URL' }"
            />
            
            <ButtonComponent 
                as="white" 
                icon="PhArrowSquareOut"
                @click.stop="openPreview"
                v-tooltip="{ content: 'Preview' }"
            />

            <MenusComponent
                :menus="menuItems"
                @onSelect="onMenuSelect"
            >
                <ButtonComponent as="white" icon="PhDotsThree" />
            </MenusComponent>
        </div>
    </div>
</template>



<style scoped>
.event-card {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 16px;
    background: var(--color-bg-primary);
    border: 1px solid var(--color-border);
    border-radius: 8px;
    transition: all 0.2s ease;
}

.event-card:hover {
    border-color: var(--color-border-hover);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.top {
    flex: 1;
    min-width: 0;
}

.event-color-marker {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    margin-bottom: 8px;
    cursor: pointer;
    transition: transform 0.2s;
}

.event-color-marker:hover {
    transform: scale(1.2);
}

.event-name {
    font-weight: 600;
    font-size: 15px;
    color: var(--color-text-primary);
    margin-bottom: 4px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.blue-link {
    font-size: 13px;
    color: var(--color-primary);
    text-decoration: none;
    display: block;
    margin-bottom: 12px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.blue-link:hover {
    text-decoration: underline;
}

.info {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
}

.info-item {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    background: var(--color-bg-secondary);
    border-radius: 4px;
    font-size: 12px;
    color: var(--color-text-secondary);
    cursor: pointer;
    transition: all 0.2s;
}

.info-item:hover {
    background: var(--color-bg-tertiary);
    color: var(--color-text-primary);
}

.info-item .icon {
    display: flex;
    align-items: center;
    font-size: 14px;
}

.info-item .value {
    font-weight: 500;
}

.actions {
    display: flex;
    gap: 4px;
    flex-shrink: 0;
    margin-left: 16px;
}
</style>