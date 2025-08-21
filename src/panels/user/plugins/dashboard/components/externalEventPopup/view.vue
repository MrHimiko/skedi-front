<script setup>
import { computed } from 'vue';
import PopupView from '@layouts/popup/view.vue';
import Button from '@form/button/view.vue';
import { PhClock, PhMapPin, PhUsers, PhArrowSquareOut } from "@phosphor-icons/vue";

const props = defineProps({
    event: {
        type: Object,
        required: true
    }
});

// Get source display name
const sourceName = computed(() => {
    const names = {
        'google_calendar': 'Google Calendar',
        'outlook': 'Outlook Calendar',
        'apple_calendar': 'Apple Calendar'
    };
    return names[props.event.source] || 'External Calendar';
});

// Format event time
const timeRange = computed(() => {
    if (props.event.timeRange) return props.event.timeRange;
    
    if (!props.event.start_time) return '';
    
    const start = new Date(props.event.start_time);
    const end = props.event.end_time ? new Date(props.event.end_time) : null;
    
    const formatTime = (date) => {
        const hours = date.getHours();
        const minutes = date.getMinutes();
        const amPm = hours >= 12 ? "PM" : "AM";
        const formattedHours = hours % 12 === 0 ? 12 : hours % 12;
        const formattedMinutes = minutes.toString().padStart(2, '0');
        return `${formattedHours}:${formattedMinutes} ${amPm}`;
    };
    
    return end ? `${formatTime(start)} - ${formatTime(end)}` : formatTime(start);
});

// Open external link
function openExternalLink() {
    if (props.event.html_link) {
        window.open(props.event.html_link, '_blank');
    }
}

// Close popup
function closePopup() {
    document.querySelector('.i-popup-close')?.click();
}
</script>

<template>
    <PopupView title="External Event Details" customClass="external-event-popup">
        <template #content>
            <div class="external-event-details">
                <div class="event-header">
                    <h3>{{ event.title }}</h3>
                    <div class="event-source">
                        <span class="source-badge">{{ sourceName }}</span>
                    </div>
                </div>
                
                <div class="event-info">
                    <div class="info-item">
                        <PhClock :size="16" />
                        <span>{{ timeRange }}</span>
                    </div>
                    
                    <div v-if="event.location" class="info-item">
                        <PhMapPin :size="16" />
                        <span>{{ event.location }}</span>
                    </div>
                    
                    <div v-if="event.attendees" class="info-item">
                        <PhUsers :size="16" />
                        <span>{{ event.attendees }}</span>
                    </div>
                    
                    <div v-if="event.description" class="info-description">
                        <p>{{ event.description }}</p>
                    </div>
                </div>
                
                <div class="event-actions">
                    <Button 
                        v-if="event.html_link"
                        label="View in External Calendar"
                        type="primary"
                        @click="openExternalLink"
                    >
                        <template #icon>
                            <PhArrowSquareOut :size="16" />
                        </template>
                    </Button>
                    <Button 
                        label="Close"
                        type="secondary"
                        @click="closePopup"
                    />
                </div>
            </div>
        </template>
    </PopupView>
</template>

<style scoped>
.external-event-details {
    padding: 20px;
}

.event-header {
    margin-bottom: 20px;
    padding-bottom: 15px;
    border-bottom: 1px solid var(--border);
}

.event-header h3 {
    margin: 0 0 10px 0;
    font-size: 20px;
    font-weight: 600;
}

.source-badge {
    display: inline-block;
    padding: 4px 12px;
    background: var(--brand-orange-light, #fed7aa);
    color: var(--brand-orange, #ea580c);
    border-radius: 12px;
    font-size: 12px;
    font-weight: 500;
}

.event-info {
    margin-bottom: 20px;
}

.info-item {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 12px;
    font-size: 14px;
    color: var(--text-primary);
}

.info-item svg {
    color: var(--text-secondary);
}

.info-description {
    margin-top: 15px;
    padding: 12px;
    background: var(--background-1);
    border-radius: 6px;
}

.info-description p {
    margin: 0;
    font-size: 14px;
    line-height: 1.6;
    color: var(--text-secondary);
}

.event-actions {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
    padding-top: 15px;
    border-top: 1px solid var(--border);
}

.event-actions button {
    display: flex;
    align-items: center;
    gap: 6px;
}
</style>