<!-- src/panels/user/plugins/survey/components/steps/organizationStep.vue -->
<script setup>
import { ref, computed, onMounted } from 'vue';
import { popup } from '@utils/popup';
import { api } from '@utils/api';
import { UserStore } from '@stores/user';
import { mergeOrganizationsAndTeams } from '@user_shared/utils/js/organization-structure.js';

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

const userStore = UserStore();

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
async function editOrganization(org) {
    popup.open(
        'edit-organization',
        null,
        OrganizationEditForm,
        {
            endpoint: `organizations/${org.id}`,
            type: 'PUT',
            callback: async (event, data, response, success) => {
                if (success) {
                    console.log('Organization updated:', response);
                    
                    // Refresh user data to get updated organization
                    const userResponse = await api.get('account/user');
                    if (userResponse.success && userResponse.data) {
                        userStore.setData(userResponse.data);
                        
                        // Update selected organization with fresh data
                        const updatedOrgs = mergeOrganizationsAndTeams();
                        selectedOrganization.value = updatedOrgs.find(o => o.id === org.id);
                    }
                    
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
    if (!org || !org.slug) return 'skedi.com/your-slug';
    return `skedi.com/${org.slug}`;
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
                <div class="org-info">
                    <div class="org-icon">
                        <PhBuildings :size="24" weight="duotone" />
                    </div>
                    <div class="org-details">
                        <h3>{{ defaultOrganization.name || 'Your Organization' }}</h3>
                        <div class="org-url">
                            <PhGlobe :size="16" />
                            <span>{{ getOrganizationUrl(defaultOrganization) }}</span>
                        </div>
                    </div>
                </div>
                <div class="org-actions">
                    <ButtonComponent
                        as="secondary"
                        :iconLeft="{ component: PhPencil, weight: 'bold' }"
                        label="Edit"
                        @click="editOrganization(defaultOrganization)"
                    />
                </div>
            </div>

            <!-- Info Box -->
            <div class="info-box">
                <h4>What is an organization?</h4>
                <p>
                    Your organization is your booking brand. The URL slug becomes part of your booking page address,
                    making it easy for people to find and book time with you.
                </p>
            </div>

            <!-- Continue Actions -->
            <div class="step-actions">
                <div class="actions-content">
                    <div class="action-info">
                        <h4>Ready to continue?</h4>
                        <p>You can always edit your organization details later from the settings page.</p>
                    </div>
                    <div class="action-buttons">
                        <ButtonComponent
                            as="primary"
                            label="Continue"
                            @click="continueWithOrganization"
                        />
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.organization-step {
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

/* Organization Card */
.organization-card {
    background: var(--background-0);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
}

.org-info {
    display: flex;
    align-items: center;
    gap: 16px;
    flex: 1;
}

.org-icon {
    width: 48px;
    height: 48px;
    background: var(--background-1);
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--brand-default);
}

.org-details h3 {
    font-size: 18px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 8px 0;
}

.org-url {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    color: var(--text-secondary);
}

/* Info Box */
.info-box {
    background: var(--background-0);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 20px;
}

.info-box h4 {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 8px 0;
}

.info-box p {
    font-size: 14px;
    color: var(--text-secondary);
    line-height: 1.4;
    margin: 0;
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

/* Responsive */
@media (max-width: 768px) {
    .organization-step {
        max-width: 100%;
    }
    
    .organization-card {
        flex-direction: column;
        align-items: stretch;
    }
    
    .org-info {
        flex-direction: column;
        text-align: center;
    }
    
    .actions-content {
        flex-direction: column;
        align-items: stretch;
        text-align: center;
    }
    
    .action-buttons {
        display: flex;
        justify-content: center;
    }
}
</style>