<!-- src/panels/user/plugins/survey/pages/home/view.vue -->
<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { UserStore } from '@stores/user';
import { mergeOrganizationsAndTeams } from '@user_shared/utils/js/organization-structure.js';

// Layout and components
import MainLayout from '@layouts/main/view.vue';
import ButtonComponent from '@form/button/view.vue';

// Survey steps
import SurveyStepOrganization from '@user_survey/components/steps/organizationStep.vue';
import SurveyStepIntegrations from '@user_survey/components/steps/integrationsStep.vue';
import SurveyStepEvent from '@user_survey/components/steps/eventStep.vue';
import SurveyStepComplete from '@user_survey/components/steps/completeStep.vue';

// Icons
import { PhCheckCircle, PhCircle } from "@phosphor-icons/vue";

const router = useRouter();
const userStore = UserStore();

// Survey state
const currentStep = ref(1);
const isCompleting = ref(false);
const createdEventData = ref(null);
// Survey steps configuration
const steps = [
    {
        id: 1,
        title: 'Setup Organization',
        description: 'Customize your organization name and URL'
    },
    {
        id: 2,
        title: 'Connect Tools',
        description: 'Connect calendar and meeting integrations'
    },
    {
        id: 3,
        title: 'Create Event Type',
        description: 'Set up your first bookable event'
    },
    {
        id: 4,
        title: 'You\'re Ready!',
        description: 'Learn how to use your new scheduling platform'
    }
];

// Computed properties
const currentStepData = computed(() => {
    return steps.find(step => step.id === currentStep.value);
});

const isFirstStep = computed(() => currentStep.value === 1);
const isLastStep = computed(() => currentStep.value === steps.length);

// Navigation methods
function nextStep() {
    if (currentStep.value < steps.length) {
        currentStep.value++;
    }
}

function previousStep() {
    if (currentStep.value > 1) {
        currentStep.value--;
    }
}

function skipTutorial() {
    // Redirect to main dashboard
    router.push('/');
}

function finishSurvey() {
    isCompleting.value = true;
    
    // Simulate completion delay
    setTimeout(() => {
        // Mark survey as completed in user preferences or storage
        // localStorage.setItem('survey_completed', 'true');
        
        // Redirect to main dashboard
        router.push('/');
    }, 1000);
}

// Handle step completion
function handleStepComplete(stepData) {
    console.log('Step completed:', stepData);
    
    // Store event data from step 3 for use in step 4
    if (stepData.step === 'event' && stepData.data) {
        if (stepData.data.event) {
            // Store the event data - handle both direct objects and Vue Proxies
            createdEventData.value = stepData.data.eventCreated ? stepData.data.event : null;
            console.log('Stored createdEventData:', createdEventData.value);
        }
    }
    
    // Auto-advance to next step (except on last step)
    if (!isLastStep.value) {
        nextStep();
    }
}
// Get organizations for first step
const organizations = computed(() => {
    return mergeOrganizationsAndTeams();
});

onMounted(() => {
    // You could check if user has already completed survey
    // and redirect them if needed
});
</script>

<template>
    <MainLayout>
        <template #content>
            <div class="survey-container">
                <!-- Survey Header -->
                <div class="survey-header">
                    <div class="container-lg">
                        <div class="survey-title">
                            <h1>Welcome to Your Scheduling Platform</h1>
                            <p class="survey-subtitle">Let's get you set up in just a few steps</p>
                        </div>
                        
                        <!-- Steps Progress -->
                        <div class="steps-progress">
                            <div 
                                v-for="step in steps" 
                                :key="step.id"
                                :class="[
                                    'step-indicator',
                                    {
                                        'active': step.id === currentStep,
                                        'completed': step.id < currentStep
                                    }
                                ]"
                            >
                                <div class="step-circle">
                                    <PhCheckCircle 
                                        v-if="step.id < currentStep" 
                                        :size="20" 
                                        weight="fill" 
                                    />
                                    <PhCircle 
                                        v-else 
                                        :size="20" 
                                        :weight="step.id === currentStep ? 'fill' : 'regular'" 
                                    />
                                </div>
                                <div class="step-info">
                                    <div class="step-title">{{ step.title }}</div>
                                    <div class="step-description">{{ step.description }}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Survey Content -->
                <div class="survey-content">
                    <div class="container-lg">
                        <!-- Step 1: Organization Setup -->
                        <SurveyStepOrganization
                            v-if="currentStep === 1"
                            :organizations="organizations"
                            @complete="handleStepComplete"
                        />

                        <!-- Step 2: Integrations -->
                        <SurveyStepIntegrations
                            v-if="currentStep === 2"
                            @complete="handleStepComplete"
                        />

                        <!-- Step 3: Event Creation -->
                        <SurveyStepEvent
                            v-if="currentStep === 3"
                            :organizations="organizations"
                            @complete="handleStepComplete"
                        />

                        <!-- Step 4: Completion -->
                        <SurveyStepComplete
                            v-if="currentStep === 4"
                            :organizations="organizations"
                            :createdEvent="createdEventData"
                            @complete="handleStepComplete"
                        />
                    </div>
                </div>

                <!-- Survey Footer -->
                <div class="survey-footer">
                    <div class="container-lg">
                        <div class="footer-actions">
                            <div class="left-actions">
                                <ButtonComponent
                                    as="tertiary"
                                    label="Skip Tutorial"
                                    @click="skipTutorial"
                                />
                            </div>
                            
                            <div class="right-actions">
                                <ButtonComponent
                                    v-if="!isFirstStep && !isLastStep"
                                    as="secondary"
                                    label="Previous"
                                    @click="previousStep"
                                />
                                
                                <ButtonComponent
                                    v-if="!isLastStep && currentStep !== 3"
                                    as="primary"
                                    label="Next"
                                    @click="nextStep"
                                />
                                                                
                                <ButtonComponent
                                    v-if="isLastStep"
                                    as="primary"
                                    label="Finish"
                                    :loading="isCompleting"
                                    @click="finishSurvey"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </template>
    </MainLayout>
</template>

<style scoped>
.survey-container {
    display: flex;
    flex-direction: column;
    background-color: var(--background-1);
}

/* Header */
.survey-header {
    background-color: var(--background-0);
    border-bottom: 1px solid var(--border);
    padding-bottom: 30px;
}

.survey-title {
    text-align: center;
    margin-bottom: 30px;
}

.survey-title h1 {
    font-size: 24px;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0 0 8px 0;
}

.survey-subtitle {
    font-size: 16px;
    color: var(--text-secondary);
    margin: 0;
}

/* Steps Progress */
.steps-progress {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 20px;
    max-width: 800px;
    margin: 0 auto;
}

.step-indicator {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    position: relative;
}

.step-indicator:not(:last-child)::after {
    content: '';
    position: absolute;
    top: 10px;
    left: 70%;
    right: -50%;
    height: 2px;
    background-color: var(--border);
    z-index: 0;
}

.step-indicator.completed:not(:last-child)::after {
    background-color: var(--brand-default);
}

.step-circle {
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 12px;
    z-index: 1;
    background-color: var(--background-0);
    border-radius: 50%;
    position: relative;
}

.step-indicator.completed .step-circle {
    color: var(--brand-default);
}

.step-indicator.active .step-circle {
    color: var(--brand-default);
}

.step-info {
    max-width: 150px;
}

.step-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 4px;
}

.step-indicator.active .step-title {
    color: var(--brand-default);
}

.step-description {
    font-size: 12px;
    color: var(--text-secondary);
    line-height: 1.3;
    display: none;
}

/* Content */
.survey-content {
    flex: 1;
    padding: 40px;
    overflow-y: auto;
}


/* Footer */
.survey-footer {
    background-color: var(--background-0);
    border-top: 1px solid var(--border);
    padding: 24px 0;
}

.footer-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.right-actions {
    display: flex;
    gap: 12px;
}

/* Responsive */
@media (max-width: 768px) {
    .steps-progress {
        grid-template-columns: 1fr;
        gap: 16px;
    }
    
    .step-indicator {
        flex-direction: row;
        text-align: left;
    }
    
    .step-indicator:not(:last-child)::after {
        display: none;
    }
    
    .step-circle {
        margin-right: 12px;
        margin-bottom: 0;
    }
    
    .step-info {
        max-width: none;
    }
    
    .footer-actions {
        flex-direction: column;
        gap: 16px;
    }
    
    .right-actions {
        order: 1;
        width: 100%;
        justify-content: center;
    }
    
    .left-actions {
        order: 2;
    }
}
</style>