<!-- src/panels/user/plugins/survey/components/steps/integrationsStep.vue -->
<script setup>
import { ref, computed, onMounted } from 'vue';
import { api } from '@utils/api';
import { common } from '@utils/common';
import IntegrationProviders from '@user_integrations/providers';

// Components
import ButtonComponent from '@form/button/view.vue';
import IntegrationCard from '@user_integrations/components/marketplace/IntegrationCard.vue';

// Icons
import { PhPlugs, PhCalendar, PhVideoCamera, PhCheckCircle } from "@phosphor-icons/vue";

const emit = defineEmits(['complete']);

// State
const isLoading = ref(true);
const providers = ref([]);
const userIntegrations = ref([]);
const connectedCount = ref(0);

// Filter to only calendar and meeting integrations
const relevantProviders = computed(() => {
    return providers.value.filter(provider => {
        const isCalendar = provider.category === 'calendar' || 
                          provider.id.includes('calendar');
        const isMeeting = provider.category === 'meeting' || 
                         provider.id.includes('meet') ||
                         provider.id.includes('teams') ||
                         provider.id.includes('zoom');
        
        return isCalendar || isMeeting;
    });
});

// Group integrations by type
const calendarIntegrations = computed(() => {
    return relevantProviders.value.filter(provider => 
        provider.category === 'calendar' || provider.id.includes('calendar')
    );
});

const meetingIntegrations = computed(() => {
    return relevantProviders.value.filter(provider => 
        provider.category === 'meeting' || 
        provider.id.includes('meet') ||
        provider.id.includes('teams') ||
        provider.id.includes('zoom')
    );
});

const hasConnectedIntegrations = computed(() => {
    return connectedCount.value > 0;
});

// Fetch integrations data
async function fetchData() {
    try {
        isLoading.value = true;
        
        // Get all available providers
        const allProviders = IntegrationProviders.getAllProviders();
        
        // Fetch user's installed integrations
        const response = await api.get('user/integrations');
        
        if (!response.success) {
            throw new Error(response.message || 'Failed to fetch integrations');
        }
        
        userIntegrations.value = response.data;
        
        // Map provider details and attach installed status
        providers.value = allProviders.map(provider => {
            const isInstalled = userIntegrations.value.some(
                integration => integration.provider === provider.id && integration.status === 'active'
            );
            
            const installedIntegration = userIntegrations.value.find(
                integration => integration.provider === provider.id && integration.status === 'active'
            );
            
            return {
                id: provider.id,
                name: provider.name,
                description: provider.description,
                icon: provider.icon,
                category: provider.category,
                isInstalled: isInstalled,
                entityId: installedIntegration?.id || null,
                integrationDetails: installedIntegration || null
            };
        });
        
        // Count connected integrations
        updateConnectedCount();
        
    } catch (error) {
        console.error('Error fetching integrations:', error);
        common.notification('Failed to load integrations', false);
    } finally {
        isLoading.value = false;
    }
}

// Update connected count
function updateConnectedCount() {
    connectedCount.value = relevantProviders.value.filter(p => p.isInstalled).length;
}

// Handle integration connect/disconnect
function handleIntegrationChange() {
    // Refresh data after integration changes
    fetchData();
}

// Continue to next step
function continueSetup() {
    const connectedIntegrations = relevantProviders.value.filter(p => p.isInstalled);
    
    emit('complete', {
        step: 'integrations',
        data: {
            connected: connectedIntegrations,
            total: relevantProviders.value.length,
            count: connectedCount.value
        }
    });
}

// Skip integrations setup
function skipIntegrations() {
    emit('complete', {
        step: 'integrations',
        data: {
            skipped: true,
            count: 0
        }
    });
}

// Initialize
onMounted(() => {
    fetchData();
});
</script>

<template>
    <div class="integrations-step">
        <div class="step-content">
            <!-- Step Header -->
            <div class="step-header">
                <div class="step-icon">
                    <PhPlugs :size="32" weight="duotone" />
                </div>
                <h2>Connect Your Tools</h2>
                <p class="step-description">
                    Connect your calendar and meeting platforms to unlock the full power of automated scheduling.
                </p>
            </div>

            <!-- Benefits Section -->
            <div class="benefits-section">
                <h3>What you'll get:</h3>
                <div class="benefits-grid">
                    <div class="benefit-item">
                        <PhCalendar :size="24" weight="duotone" />
                        <div>
                            <h4>Automatic Availability</h4>
                            <p>We'll check your calendar before allowing bookings</p>
                        </div>
                    </div>
                    <div class="benefit-item">
                        <PhVideoCamera :size="24" weight="duotone" />
                        <div>
                            <h4>Meeting Links</h4>
                            <p>Automatically create video meeting links for bookings</p>
                        </div>
                    </div>
                    <div class="benefit-item">
                        <PhCheckCircle :size="24" weight="duotone" />
                        <div>
                            <h4>Calendar Sync</h4>
                            <p>Bookings appear on your calendar with reminders</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Loading State -->
            <div v-if="isLoading" class="loading-state">
                <p>Loading available integrations...</p>
            </div>

            <!-- Integrations Grid -->
            <div v-else class="integrations-section">
                <!-- Calendar Integrations -->
                <div v-if="calendarIntegrations.length > 0" class="integration-group">
                    <h3>Calendar Integrations</h3>
                    <p class="group-description">Connect your calendar to manage availability</p>
                    <div class="integrations-grid">
                        <IntegrationCard 
                            v-for="provider in calendarIntegrations"
                            :key="provider.id"
                            :integration="provider"
                            @connect="handleIntegrationChange"
                        />
                    </div>
                </div>

                <!-- Meeting Integrations -->
                <div v-if="meetingIntegrations.length > 0" class="integration-group">
                    <h3>Meeting Integrations</h3>
                    <p class="group-description">Connect tools to automatically create meeting links</p>
                    <div class="integrations-grid">
                        <IntegrationCard 
                            v-for="provider in meetingIntegrations"
                            :key="provider.id"
                            :integration="provider"
                            @connect="handleIntegrationChange"
                        />
                    </div>
                </div>

                <!-- Empty State -->
                <div v-if="relevantProviders.length === 0" class="empty-state">
                    <PhPlugs :size="48" weight="duotone" />
                    <h3>No Integrations Available</h3>
                    <p>We'll add more integrations soon. You can continue setting up your events.</p>
                </div>
            </div>

            <!-- Progress Summary -->
            <div v-if="!isLoading" class="progress-summary">
                <div class="summary-content">
                    <div class="summary-info">
                        <h4>
                            <span v-if="hasConnectedIntegrations">
                                Great! You've connected {{ connectedCount }} integration{{ connectedCount !== 1 ? 's' : '' }}
                            </span>
                            <span v-else>
                                No integrations connected yet
                            </span>
                        </h4>
                        <p v-if="hasConnectedIntegrations">
                            Your scheduling platform is now enhanced with these tools.
                        </p>
                        <p v-else>
                            You can always connect integrations later from the integrations page.
                        </p>
                    </div>
                    
                    <div class="summary-actions">
                        <ButtonComponent
                            v-if="!hasConnectedIntegrations"
                            as="tertiary"
                            label="Skip for now"
                            @click="skipIntegrations"
                        />
                        <ButtonComponent
                            as="primary"
                            :label="hasConnectedIntegrations ? 'Continue' : 'Continue without integrations'"
                            @click="continueSetup"
                        />
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.integrations-step {
    max-width: 800px;
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

/* Benefits Section */
.benefits-section {
    background: var(--background-0);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 24px;
}

.benefits-section h3 {
    font-size: 18px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 20px 0;
}

.benefits-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 20px;
}

.benefit-item {
    display: flex;
    align-items: flex-start;
    gap: 12px;
}

.benefit-item > *:first-child {
    color: var(--brand-default);
    margin-top: 2px;
}

.benefit-item h4 {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 4px 0;
}

.benefit-item p {
    font-size: 13px;
    color: var(--text-secondary);
    margin: 0;
    line-height: 1.4;
}

/* Loading State */
.loading-state {
    text-align: center;
    padding: 40px;
    color: var(--text-secondary);
}

/* Integrations Section */
.integration-group {
    margin-bottom: 32px;
}

.integration-group h3 {
    font-size: 18px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 8px 0;
}

.group-description {
    font-size: 14px;
    color: var(--text-secondary);
    margin: 0 0 16px 0;
}

.integrations-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 16px;
}

/* Empty State */
.empty-state {
    text-align: center;
    padding: 40px;
    color: var(--text-secondary);
}

.empty-state h3 {
    color: var(--text-primary);
    margin: 16px 0 8px 0;
}

/* Progress Summary */
.progress-summary {
    background: var(--background-0);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 24px;
}

.summary-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
}

.summary-info h4 {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 4px 0;
}

.summary-info p {
    font-size: 14px;
    color: var(--text-secondary);
    margin: 0;
}

.summary-actions {
    display: flex;
    gap: 12px;
}

/* Responsive */
@media (max-width: 768px) {
    .integrations-step {
        max-width: 100%;
    }
    
    .benefits-grid {
        grid-template-columns: 1fr;
    }
    
    .integrations-grid {
        grid-template-columns: 1fr;
    }
    
    .summary-content {
        flex-direction: column;
        align-items: stretch;
        text-align: center;
    }
    
    .summary-actions {
        justify-content: center;
    }
}
</style>