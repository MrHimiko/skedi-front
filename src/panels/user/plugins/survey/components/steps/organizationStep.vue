<!-- src/panels/user/plugins/survey/components/steps/organizationStep.vue -->
<script setup>
import { ref, computed, onMounted } from 'vue';
import { popup } from '@utils/popup';

// Components
import ButtonComponent from '@form/button/view.vue';
import OrganizationEditForm from '@user_teams/components/form/organizationEdit.vue';

// Icons
import { PhBuildings, PhGlobe, PhPencil } from "@phosphor-icons/vue";

const props = defineProps({
    organizations: {
        type: Array,
        default: () => []
    }
});

const emit = defineEmits(['complete']);

// State
const selectedOrganization = ref(null);

// Computed
const hasOrganizations = computed(() => {
    return props.organizations && props.organizations.length > 0;
});

const defaultOrganization = computed(() => {
    return hasOrganizations.value ? props.organizations[0] : null;
});

// Methods
function editOrganization(org) {
    popup.open(
        'edit-organization',
        null,
        OrganizationEditForm,
        {
            organizationId: org.id,
            callback: (event, data, response, success) => {
                if (success) {
                    console.log('Organization updated:', response);
                    // Organization data will be refreshed automatically
                    popup.close();
                }
            },
            class: 'h-auto',
            title: 'Edit Organization'
        }
    );
}

function continueWithOrganization() {
    emit('complete', {
        step: 'organization',
        data: selectedOrganization.value || defaultOrganization.value
    });
}

function getOrganizationUrl(org) {
    if (!org || !org.slug) return '#';
    return `${window.location.protocol}//${org.slug}.${window.location.hostname}`;
}

// Initialize
onMounted(() => {
    if (defaultOrganization.value) {
        selectedOrganization.value = defaultOrganization.value;
    }
});
</script>

<template>
    <div class="organization-step">
        <div class="step-content">
            <!-- Step Header -->
            <div class="step-header">
                <div class="step-icon">
                    <PhBuildings :size="32" weight="duotone" />
                </div>
                <h2>Setup Your Organization</h2>
                <p class="step-description">
                    We've created a default organization for you. You can customize the name and URL slug to match your brand.
                </p>
            </div>

            <!-- Organization Card -->
            <div v-if="defaultOrganization" class="organization-card">
                <div class="org-header">
                    <div class="org-info">

                        <div class="org-details">
                            <h3>{{ defaultOrganization.name || 'Your Organization' }}</h3>
                            <div class="org-url">
                                <PhGlobe :size="16" />
                                <span>{{ getOrganizationUrl(defaultOrganization) }}</span>
                            </div>
                        </div>
                    </div>
                    <div>
                   
                    <ButtonComponent
                        as="secondary"
                        :iconLeft="{ component: PhPencil, weight: 'bold' }"
                        label="Edit"
                        @click="editOrganization(defaultOrganization)"
                    /></div>
                </div>

                <div class="org-features">
                    <h4>What you get with your organization:</h4>
                    <ul>
                        <li>Custom branded booking pages</li>
                        <li>Team member management</li>
                        <li>Shared event types</li>
                        <li>Organization-wide settings</li>
                    </ul>
                </div>
            </div>

            <!-- No Organization State -->
            <div v-else class="no-organization">
                <div class="empty-state">
                    <PhBuildings :size="48" weight="duotone" />
                    <h3>No Organization Found</h3>
                    <p>It looks like you don't have an organization set up yet. This is unusual - please contact support.</p>
                </div>
            </div>

            <!-- Continue Action -->
            <div class="step-actions">
                <div class="action-info">
                    <h4>Ready to continue?</h4>
                    <p>You can always edit your organization details later from the teams page.</p>
                </div>
                <div>
                <ButtonComponent
                    as="primary"
                    label="Continue Setup"
                    :disabled="!defaultOrganization"
                    @click="continueWithOrganization"
                /></div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.organization-step {
    max-width: 600px;
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

/* Organization Card */
.organization-card {
    background: var(--background-0);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 24px;
}

.org-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 24px;
}

.org-info {
    display: flex;
    align-items: center;
    gap: 16px;
}

.org-logo {
    width: 48px;
    height: 48px;
    background: var(--brand-gradient);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    font-weight: 700;
    color: white;
}

.org-details h3 {
    font-size: 20px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 4px 0;
}

.org-url {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--text-secondary);
    font-size: 14px;
}

.org-features h4 {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 12px 0;
}

.org-features ul {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.org-features li {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--text-secondary);
    font-size: 14px;
}

.org-features li::before {
    content: '✓';
    color: var(--brand-default);
    font-weight: 600;
}

/* No Organization State */
.no-organization {
    text-align: center;
    padding: 40px;
}

.empty-state {
    color: var(--text-secondary);
}

.empty-state h3 {
    color: var(--text-primary);
    margin: 16px 0 8px 0;
}

/* Step Actions */
.step-actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 24px;
    background: var(--background-0);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
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
    .organization-step {
        max-width: 100%;
    }
    
    .org-header {
        flex-direction: column;
        gap: 16px;
        align-items: stretch;
    }
    
    .step-actions {
        flex-direction: column;
        gap: 16px;
        align-items: stretch;
        text-align: center;
    }
}
</style>