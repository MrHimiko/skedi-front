<template>
    <div class="routing-tab">
        <!-- Header Section -->
        <div class="tab-header">
            <h3>Routing Configuration</h3>
            <p class="tab-description">
                Automatically distribute bookings to the right team member using AI-powered routing
            </p>
        </div>

        <!-- Main Content -->
        <EventRoutingConfig
            :event-id="eventId"
            :organization-id="organizationId"
            :assignees="assignees"
        />
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { api } from '@utils/api';
import EventRoutingConfig from '../routing/EventRoutingConfig.vue';

const props = defineProps({
    event: {
        type: Object,
        required: true
    },
    organizationId: {
        type: Number,
        required: true
    }
});

// Computed
const eventId = computed(() => props.event?.id);
const assignees = ref([]);

// Load assignees
onMounted(async () => {
    try {
        const response = await api.get(`events/${eventId.value}/assignees?organization_id=${props.organizationId}`);
        if (response.success && response.data) {
            assignees.value = response.data;
        }
    } catch (error) {
        console.error('Failed to load assignees:', error);
    }
});
</script>

<style scoped>
.routing-tab {
    padding: 24px;
    background: var(--bg-primary);
    min-height: 400px;
}

.tab-header {
    margin-bottom: 32px;
    padding-bottom: 20px;
    border-bottom: 1px solid var(--border);
}

.tab-header h3 {
    margin: 0 0 8px 0;
    color: var(--text-primary);
    font-size: 20px;
    font-weight: 600;
}

.tab-description {
    margin: 0;
    color: var(--text-secondary);
    font-size: 14px;
}
</style>