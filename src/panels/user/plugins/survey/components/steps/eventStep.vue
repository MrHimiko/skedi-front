<!-- src/panels/user/plugins/survey/components/steps/eventStep.vue -->
<script setup>
import { ref, computed, onMounted } from 'vue';
import { popup } from '@utils/popup';

// Components
import ButtonComponent from '@form/button/view.vue';
import EventCreateForm from '@user_events/components/form/eventCreate.vue';

// Icons
import { PhCalendarPlus, PhRocketLaunch, PhUsers, PhClock } from "@phosphor-icons/vue";

const props = defineProps({
    organizations: {
        type: Array,
        default: () => []
    }
});

const emit = defineEmits(['complete']);

// State
const eventCreated = ref(false);
const createdEvent = ref(null);

// Computed
const defaultOrganization = computed(() => {
    return props.organizations && props.organizations.length > 0 ? props.organizations[0] : null;
});

// Methods
function createEvent() {
    popup.open(
        'create-first-event',
        null,
        EventCreateForm,
        {
            preselectedOrganizationId: defaultOrganization.value?.id,
            callback: (event, data, response, success) => {
                if (success) {
                    console.log('Event creation response:', response);
                    console.log('Response.data:', response.data);
                    
                    // The event data is in response.data
                    createdEvent.value = response.data;
                    eventCreated.value = true;
                    popup.close();
                    
                    // Auto-advance to next step immediately after event creation
                    continueToCompletion();
                }
            },
            class: 'h-auto',
            title: 'Create Your First Event Type'
        }
    );
}

function continueToCompletion() {
    emit('complete', {
        step: 'event',
        data: {
            eventCreated: eventCreated.value,
            event: createdEvent.value
        }
    });
}

function skipEventCreation() {
    emit('complete', {
        step: 'event',
        data: {
            eventCreated: false,
            skipped: true
        }
    });
}
</script>

<template>
    <div class="event-step">
        <div class="step-content">
            <!-- Step Header -->
            <div class="step-header">
                <div class="step-icon">
                    <PhCalendarPlus :size="32" weight="duotone" />
                </div>
                <h2>Create Your First Event Type</h2>
                <p class="step-description">
                    Event types are templates that define how people can book time with you. Let's create your first one!
                </p>
            </div>

            <!-- Event Creation Guide -->
            <div class="event-guide">
                <h3>What is an Event Type?</h3>
                <div class="guide-grid" style="margin-bottom: 30px;">
                    <div class="guide-item">
                        <PhUsers :size="24" weight="duotone" />
                        <div>
                            <h4>Meeting Template</h4>
                            <p>Define who can attend, duration, and meeting details</p>
                        </div>
                    </div>
                    <div class="guide-item">
                        <PhClock :size="24" weight="duotone" />
                        <div>
                            <h4>Availability</h4>
                            <p>Set when you're available and how far in advance people can book</p>
                        </div>
                    </div>
                    <div class="guide-item">
                        <PhRocketLaunch :size="24" weight="duotone" />
                        <div>
                            <h4>Automation</h4>
                            <p>Automatic confirmations, reminders, and meeting links</p>
                        </div>
                    </div>
                </div>

                <ButtonComponent
                    as="primary"
                    :iconLeft="{ component: PhCalendarPlus, weight: 'bold' }"
                    label="Create Event Type"
                    @click="createEvent"
                />
            </div>


           
        </div>
    </div>
</template>

<style scoped>
.event-step {
    max-width: 700px;
    margin: 0 auto;
}

.step-content {
    display: flex;
    flex-direction: column;
    gap: 32px;
}

/* Step Header */
.step-header {
    text-align: center;
}

.step-icon {
    margin-bottom: 16px;
    color: var(--brand-default);
    display: flex;
    justify-content: center;
}

.step-header h2 {
    font-size: 28px;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0 0 12px 0;
}

.step-description {
    font-size: 16px;
    color: var(--text-secondary);
    line-height: 1.5;
    margin: 0;
}

/* Event Guide */
.event-guide {
    background: var(--background-0);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 24px;
}

.event-guide h3 {
    font-size: 18px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 20px 0;
}

.guide-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 20px;
}

.guide-item {
    display: flex;
    align-items: flex-start;
    gap: 12px;
}

.guide-item > *:first-child {
    color: var(--brand-default);
    margin-top: 2px;
}

.guide-item h4 {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 4px 0;
}

.guide-item p {
    font-size: 13px;
    color: var(--text-secondary);
    margin: 0;
    line-height: 1.4;
}

/* Creation Section */
.creation-section {
    display: flex;
    justify-content: center;
}

.creation-card {
    background: var(--background-0);
    border: 2px dashed var(--border);
    border-radius: var(--radius-lg);
    padding: 40px;
    text-align: center;
    max-width: 400px;
}

.card-content h4 {
    font-size: 18px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 8px 0;
}

.card-content p {
    font-size: 14px;
    color: var(--text-secondary);
    margin: 0 0 24px 0;
    line-height: 1.4;
}

/* Step Actions */
.step-actions {
    background: var(--background-0);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 24px;
}

.actions-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
}

.action-info h4 {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 4px 0;
}

.action-info p {
    font-size: 14px;
    color: var(--text-secondary);
    margin: 0;
}

.action-buttons {
    display: flex;
    gap: 12px;
}

/* Responsive */
@media (max-width: 768px) {
    .event-step {
        max-width: 100%;
    }
    
    .guide-grid {
        grid-template-columns: 1fr;
    }
    
    .creation-card {
        padding: 24px;
        max-width: 100%;
    }
    
    .actions-content {
        flex-direction: column;
        align-items: stretch;
        text-align: center;
    }
    
    .action-buttons {
        justify-content: center;
    }
}
</style>