<!-- src/panels/user/plugins/survey/components/steps/completeStep.vue -->
<script setup>
import { ref, computed, onMounted } from 'vue';

// Components
import ButtonComponent from '@form/button/view.vue';

// Icons
import { 
    PhCheckCircle, PhLink, PhCalendar, PhBell, PhGearSix, 
    PhQuestion, PhCopy, PhArrowSquareOut, PhCaretDown 
} from "@phosphor-icons/vue";

const props = defineProps({
    organizations: {
        type: Array,
        default: () => []
    }
});

const emit = defineEmits(['complete']);

// State
const linkCopied = ref(false);

// Computed
const defaultOrganization = computed(() => {
    return props.organizations && props.organizations.length > 0 ? props.organizations[0] : null;
});

const bookingUrl = computed(() => {
    if (!defaultOrganization.value || !defaultOrganization.value.slug) {
        return `${window.location.protocol}//${window.location.hostname}/book`;
    }
    return `${window.location.protocol}//${defaultOrganization.value.slug}.${window.location.hostname}`;
});

// Methods
async function copyBookingUrl() {
    try {
        await navigator.clipboard.writeText(bookingUrl.value);
        linkCopied.value = true;
        
        // Reset the copied state after 3 seconds
        setTimeout(() => {
            linkCopied.value = false;
        }, 3000);
    } catch (err) {
        console.error('Failed to copy URL:', err);
    }
}

function openBookingPage() {
    window.open(bookingUrl.value, '_blank');
}

function viewEventSettings() {
    // This would navigate to the events page
    emit('complete', {
        step: 'complete',
        action: 'view_settings'
    });
}

function finishSurvey() {
    emit('complete', {
        step: 'complete',
        action: 'finish'
    });
}

// FAQ data
const faqs = ref([
    {
        question: "How do I add more event types?",
        answer: "Go to the 'Event Types' page in the sidebar and click 'New Event Type'. You can create unlimited event types with different durations, availability, and settings."
    },
    {
        question: "Can I customize my booking page?",
        answer: "Yes! You can customize your organization name, logo, and booking page appearance from the organization settings page."
    },
    {
        question: "How do I manage my availability?",
        answer: "Each event type has its own availability settings. You can set working hours, buffer times, and date ranges for when people can book with you."
    },
    {
        question: "What about team scheduling?",
        answer: "You can invite team members to your organization and create shared event types. Each member can have their own availability and booking settings."
    }
]);

const expandedFaq = ref(null);

function toggleFaq(index) {
    expandedFaq.value = expandedFaq.value === index ? null : index;
}
</script>

<template>
    <div class="complete-step">
        <div class="step-content">
            <!-- Success Header -->
            <div class="success-header">
                <div class="success-icon">
                    <PhCheckCircle :size="48" weight="fill" />
                </div>
                <h2>🎉 You're All Set!</h2>
                <p class="success-description">
                    Your scheduling platform is ready to use. Here's everything you need to know to get started.
                </p>
            </div>

            <!-- Key Information Cards -->
            <div class="info-cards">
                <!-- Booking URL Card -->
                <div class="info-card highlight">
                    <div class="card-header">
                        <PhLink :size="24" weight="duotone" />
                        <h3>Calendar URL</h3>
                    </div>
                    <p class="card-description">
                        On this URL people can schedule an event with you:
                    </p>
                    <div class="url-display">
                        <div class="url-text">{{ bookingUrl }}</div>
                        <div class="url-actions">
                            <ButtonComponent
                                as="secondary"
                                :iconLeft="{ component: PhCopy, weight: 'bold' }"
                                :label="linkCopied ? 'Copied!' : 'Copy'"
                                @click="copyBookingUrl"
                                :disabled="linkCopied"
                            />
                            <ButtonComponent
                                as="tertiary"
                                :iconLeft="{ component: PhArrowSquareOut, weight: 'bold' }"
                                label="Open"
                                @click="openBookingPage"
                            />
                        </div>
                    </div>
                </div>

                <!-- Bookings Management -->
                <div class="info-card">
                    <div class="card-header">
                        <PhCalendar :size="24" weight="duotone" />
                        <h3>Bookings</h3>
                    </div>
                    <p class="card-description">
                        In sidebar on left you can always access your bookings. Here you can view upcoming meetings, reschedule, or cancel bookings as needed.
                    </p>
                    <div class="screenshot-placeholder">
                        <div class="screenshot-box">
                            <PhCalendar :size="32" weight="duotone" />
                            <span>Screenshot will be added</span>
                        </div>
                    </div>
                </div>

                <!-- Notifications -->
                <div class="info-card">
                    <div class="card-header">
                        <PhBell :size="24" weight="duotone" />
                        <h3>Will I get notifications about my meetings?</h3>
                    </div>
                    <p class="card-description">
                        Both you and person who scheduled a meeting with you will get instant email at the time of scheduling a meeting, and you both will get email reminders:
                    </p>
                    <div class="notification-timeline">
                        <div class="timeline-item">
                            <div class="timeline-dot"></div>
                            <div class="timeline-content">
                                <strong>24 hours</strong> before meeting
                            </div>
                        </div>
                        <div class="timeline-item">
                            <div class="timeline-dot"></div>
                            <div class="timeline-content">
                                <strong>1 hour</strong> before meeting
                            </div>
                        </div>
                        <div class="timeline-item">
                            <div class="timeline-dot"></div>
                            <div class="timeline-content">
                                <strong>15 minutes</strong> before meeting
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Event Settings CTA -->
            <div class="settings-cta">
                <div class="cta-content">
                    <div class="cta-info">
                        <h4>View all settings of your event</h4>
                        <p>Adjust availability, durations, questions, and more for your event types.</p>
                    </div>
                    <ButtonComponent
                        as="primary"
                        :iconLeft="{ component: PhGearSix, weight: 'bold' }"
                        label="View Event Settings"
                        @click="viewEventSettings"
                    />
                </div>
            </div>

            <!-- FAQ Section -->
            <div class="faq-section">
                <div class="faq-header">
                    <PhQuestion :size="24" weight="duotone" />
                    <h3>Do you need any more help?</h3>
                </div>
                
                <div class="faq-list">
                    <div 
                        v-for="(faq, index) in faqs" 
                        :key="index"
                        :class="['faq-item', { 'expanded': expandedFaq === index }]"
                        @click="toggleFaq(index)"
                    >
                        <div class="faq-question">
                            <span>{{ faq.question }}</span>
                            <PhCaretDown 
                                :size="16" 
                                :style="{ transform: expandedFaq === index ? 'rotate(180deg)' : 'rotate(0deg)' }"
                            />
                        </div>
                        <div v-if="expandedFaq === index" class="faq-answer">
                            {{ faq.answer }}
                        </div>
                    </div>
                </div>
            </div>

            <!-- Final Actions -->
            <div class="final-actions">
                <div class="actions-content">
                    <div class="action-info">
                        <h4>Ready to start scheduling?</h4>
                        <p>You can always access this information from the help section.</p>
                    </div>
                    <ButtonComponent
                        as="primary"
                        label="Go to Dashboard"
                        @click="finishSurvey"
                    />
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.complete-step {
    max-width: 800px;
    margin: 0 auto;
}

.step-content {
    display: flex;
    flex-direction: column;
    gap: 32px;
}

/* Success Header */
.success-header {
    text-align: center;
}

.success-icon {
    margin-bottom: 16px;
    color: var(--brand-default);
}

.success-header h2 {
    font-size: 28px;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0 0 12px 0;
}

.success-description {
    font-size: 16px;
    color: var(--text-secondary);
    line-height: 1.5;
    margin: 0;
}

/* Info Cards */
.info-cards {
    display: grid;
    gap: 24px;
}

.info-card {
    background: var(--background-0);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 24px;
}

.info-card.highlight {
    border-color: var(--brand-default);
    background: linear-gradient(135deg, var(--brand-default)05, var(--background-0));
}

.card-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
}

.card-header h3 {
    font-size: 18px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0;
}

.card-header > *:first-child {
    color: var(--brand-default);
}

.card-description {
    font-size: 14px;
    color: var(--text-secondary);
    margin: 0 0 16px 0;
    line-height: 1.4;
}

/* URL Display */
.url-display {
    background: var(--background-1);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: 12px;
    display: flex;
    align-items: center;
    gap: 12px;
}

.url-text {
    flex: 1;
    font-family: monospace;
    font-size: 14px;
    color: var(--text-primary);
    word-break: break-all;
}

.url-actions {
    display: flex;
    gap: 8px;
}

/* Screenshot Placeholder */
.screenshot-placeholder {
    margin-top: 8px;
}

.screenshot-box {
    background: var(--background-1);
    border: 2px dashed var(--border);
    border-radius: var(--radius-md);
    padding: 40px 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    color: var(--text-secondary);
    font-style: italic;
}

.screenshot-box > *:first-child {
    opacity: 0.5;
}

/* Notification Timeline */
.notification-timeline {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-top: 8px;
}

.timeline-item {
    display: flex;
    align-items: center;
    gap: 12px;
}

.timeline-dot {
    width: 8px;
    height: 8px;
    background: var(--brand-default);
    border-radius: 50%;
    flex-shrink: 0;
}

.timeline-content {
    font-size: 14px;
    color: var(--text-secondary);
}

.timeline-content strong {
    color: var(--text-primary);
}

/* Settings CTA */
.settings-cta {
    background: var(--background-0);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 24px;
}

.cta-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
}

.cta-info h4 {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 4px 0;
}

.cta-info p {
    font-size: 14px;
    color: var(--text-secondary);
    margin: 0;
}

/* FAQ Section */
.faq-section {
    background: var(--background-0);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 24px;
}

.faq-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 20px;
}

.faq-header h3 {
    font-size: 18px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0;
}

.faq-header > *:first-child {
    color: var(--brand-default);
}

.faq-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.faq-item {
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    overflow: hidden;
    cursor: pointer;
    transition: all 0.2s ease;
}

.faq-item:hover {
    border-color: var(--brand-default);
}

.faq-question {
    padding: 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    font-size: 14px;
    font-weight: 500;
    color: var(--text-primary);
}

.faq-question > *:last-child {
    transition: transform 0.2s ease;
    color: var(--text-secondary);
}

.faq-answer {
    padding: 0 16px 16px 16px;
    font-size: 14px;
    color: var(--text-secondary);
    line-height: 1.4;
    border-top: 1px solid var(--border);
    margin-top: -1px;
    background: var(--background-1);
}

/* Final Actions */
.final-actions {
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

/* Responsive */
@media (max-width: 768px) {
    .complete-step {
        max-width: 100%;
    }
    
    .url-display {
        flex-direction: column;
        align-items: stretch;
    }
    
    .url-actions {
        justify-content: center;
    }
    
    .cta-content,
    .actions-content {
        flex-direction: column;
        align-items: stretch;
        text-align: center;
        gap: 16px;
    }
    
    .faq-question {
        padding: 12px;
    }
    
    .faq-answer {
        padding: 0 12px 12px 12px;
    }
    
    .screenshot-box {
        padding: 30px 15px;
    }
}
</style>