<!-- src/panels/user/plugins/teams/components/items/view.vue -->
<script setup>
import { ref, computed, onMounted, markRaw } from 'vue';
import { mergeOrganizationsAndTeams } from '@user_shared/utils/js/organization-structure.js';
import { UserStore } from '@stores/user';
import { api } from '@utils/api';
import { popup } from '@utils/popup';
import { common } from '@utils/common';

// Component imports
import ButtonComponent from '@form/button/view.vue';
import MenusComponent from '@global/menus/view.vue';
import TeamList from '@user_teams/components/teamList/view.vue';
import TeamCreateForm from '@user_teams/components/form/teamCreate.vue';
import OrganizationEditForm from '@user_teams/components/form/organizationEdit.vue';
import OrganizationCreateForm from '@user_teams/components/form/organizationCreate.vue';
import ConfirmComponent from '@floated/confirm/view.vue';
import MemberModal from '@user_shared/components/memberModal/view.vue';
import { BillingStore } from '@stores/billing';
import BillingUpgradeModal from '@user_billing/components/upgrade-modal.vue';

const billingStore = BillingStore();

// Icon imports
import { 
    PhGearSix, 
    PhPlus, 
    PhCode, 
    PhLink, 
    PhUsers, 
    PhDotsThree,
    PhTrash,
    PhUserPlus,
    PhSignOut,
    PhWarning,
    PhUsersThree  
} from "@phosphor-icons/vue";

// Styles
import '@user_shared/utils/styles/organization-dropdowns.css';

const userStore = UserStore();

// State
const organizations = ref([]);
const eventsItems = ref(0);
const currentUserId = userStore.getId();

// Check if a specific organization can create teams
function canCreateTeams(organizationId) {
    return billingStore.isProfessional(organizationId);
}

// Check if organization can add members
function canAddMembers(organizationId) {
    return billingStore.canAddMembers(organizationId);
}

// Load data
async function reloadData() {
    try {
        const response = await api.get('account/user');
        if (response.success && response.data) {
            userStore.setData(response.data);
            
            const mergedOrgs = mergeOrganizationsAndTeams();
            
            // Process organizations to ensure proper structure
            organizations.value = mergedOrgs.map(org => {
                // Handle both possible structures
                const entity = org.entity || org;
                
                return {
                    id: entity.id,
                    name: entity.name || 'Unknown',
                    slug: entity.slug || 'unknown',
                    teams: entity.teams || [],
                    users: entity.users || [],
                    role: org.role // Make sure to include the role
                };
            });
            
            eventsItems.value++;
            
            // Load billing data for all organizations
            await billingStore.loadAllOrganizationSubscriptions(organizations.value);
        }
    } catch (error) {
        console.error('Failed to reload data:', error);
    }
}

// Check if user is admin of the organization
function isOrgAdmin(org) {
    // Get the user's organization data from the store
    const userOrgs = userStore.getOrganizations();
    const userOrg = userOrgs.find(o => (o.entity?.id || o.id) === org.id);
    
    // Check if user has admin role for this organization
    return userOrg && userOrg.role === 'admin';
}

// Get organization URL
function getOrgUrl(org) {
    if (!org || !org.slug) return '#';
    return `https://skedi.com/${org.slug}`;
}

// Get menu options for organization based on role
function getOrgMenuOptions(org) {
    const options = [];
    const userOrg = userStore.getOrganizations().find(o => 
        (o.entity?.id || o.id) === org.id
    );
    
    const isAdmin = userOrg && userOrg.role === 'admin';
    
    // Everyone can leave
    options.push({
        label: 'Leave Organization',
        iconComponent: PhSignOut,
        weight: 'bold',
        onClick: () => leaveOrganization(org)
    });
    
    // Only admins can delete
    if (isAdmin) {
        options.push({
            label: 'Delete Organization',
            iconComponent: PhTrash,
            weight: 'bold',
            onClick: () => deleteOrganization(org)
        });
    }
    
    return options;
}

// Leave organization function
async function leaveOrganization(org) {
    popup.open(
        'leave-org-confirm',
        null,
        ConfirmComponent,
        {
            as: 'red',
            description: `Are you sure you want to leave "${org.name}"?`,
            callback: async () => {
                try {
                    const response = await api.post(`organizations/${org.id}/leave`);
                    
                    if (response.success) {
                        common.notification('Successfully left the organization', true);
                        popup.close();
                        await reloadData();
                    } else {
                        common.notification(response.message || 'Failed to leave organization', false);
                    }
                } catch (error) {
                    console.error('Failed to leave organization:', error);
                    common.notification('Failed to leave organization', false);
                }
            }
        },
        {
            position: 'center'
        }
    );
}

// Add member to organization
function addOrganizationMember(org) {
    // Remove the canAddMembers check - let the modal handle seat validation
    popup.open(
        'org-members',
        null,
        MemberModal,
        {
            type: 'organization',
            entityId: org.id,
            entityName: org.name,
            organizationId: org.id,
            callback: reloadData
        },
        {
            position: 'center'
        }
    );
}

// Delete organization
function deleteOrganization(org) {
    popup.open(
        'delete-org-confirm',
        null,
        ConfirmComponent,
        {
            as: 'red',
            description: `Are you sure you want to delete "${org.name}"? This will permanently delete all teams and events within this organization.`,
            callback: async () => {
                try {
                    const result = await api.delete(`organizations/${org.id}`);
                    
                    if (result && result.success) {
                        common.notification('Organization deleted successfully', true);
                        popup.close();
                        reloadData();
                    } else {
                        common.notification(result?.message || 'Failed to delete organization', false);
                    }
                } catch (error) {
                    console.error('Error deleting organization:', error);
                    common.notification('Failed to delete organization', false);
                }
            }
        },
        {
            position: 'center'
        }
    );
}

// Handle team creation button click - opens popup programmatically
function handleCreateTeamClick(org) {
    // First check if they can create teams
    if (!canCreateTeams(org.id)) {
        popup.open(
            'billing-upgrade',
            null,
            BillingUpgradeModal,
            {
                organizationId: org.id,
                message: 'Teams feature requires a Professional plan or higher.',
                recommendedPlan: 'professional'
            }
        );
    } else {
        // Open the create team form popup
        popup.open(
            'create-team',
            null,
            TeamCreateForm,
            {
                endpoint: `organizations/${org.id}/teams`,
                type: 'POST',
                callback: (event, data, response, success) => {
                    if (success) {
                        popup.close();
                        reloadData();
                    }
                },
                class: 'h-auto',
                title: `Create new team in ${org.name}`,
            },
            {
                position: 'center'
            }
        );
    }
}

// Open organization settings - this function provides the values to the form
function openOrganizationSettings(org) {
    popup.open(
        'org-settings',
        null,
        OrganizationEditForm,
        {
            endpoint: `organizations/${org.id}`,
            type: 'PUT',
            // Provide the values function that returns current org data
            values: () => {
                return {
                    name: org.name,
                    slug: org.slug
                };
            },
            callback: (event, data, response, success) => {
                if (success) {
                    popup.close();
                    reloadData();
                }
            },
            class: 'h-auto'
        },
        {
            position: 'center'
        }
    );
}

// Get plan badge for organization
function getPlanBadge(orgId) {
    const planLevel = billingStore.getPlanLevel(orgId);
    const plans = ['Free', 'Professional', 'Business', 'Enterprise'];
    return plans[planLevel - 1] || 'Free';
}

// Get plan badge color
function getPlanBadgeColor(orgId) {
    const planLevel = billingStore.getPlanLevel(orgId);
    const colors = ['#6b7280', '#3b82f6', '#8b5cf6', '#10b981'];
    return colors[planLevel - 1] || '#6b7280';
}

onMounted(async () => {
    await reloadData();
});

</script>

<template>
    <div class="teams-c-items" :key="eventsItems">
        <div v-for="org in organizations" :key="org.id" class="teams-c-item">
            <div class="head">
                <div class="left">
                    <div class="org-name">
                        <div class="logo">
                            <span>{{ org.name ? org.name.charAt(0).toUpperCase() : 'O' }}</span>
                        </div>
                        <div>
                            <p>
                                <a :href="getOrgUrl(org)" target="_blank" class="org-name-link">
                                    {{ org.name }}
                                </a>
                                <span v-if="isOrgAdmin(org)" class="admin">ADMIN</span>
                                <span class="plan-badge" :style="{ backgroundColor: getPlanBadgeColor(org.id) + '20', color: getPlanBadgeColor(org.id) }">
                                    {{ getPlanBadge(org.id) }}
                                </span>
                            </p>
                            <a :href="getOrgUrl(org)" target="_blank" class="org-url">
                                {{ getOrgUrl(org) }}
                            </a>
                        </div>
                    </div>
                </div>

                <div class="right" >
                    <div class="member-badge" v-if="org.users && org.users.length > 0">
                        <PhUsers weight="bold" :size="16" />
                        {{ org.users.length }} member{{ org.users.length !== 1 ? 's' : '' }}
                    </div>

                    <div class="actions">
                        <!-- Add Member button - only for admins -->
                        <ButtonComponent
                            @click="addOrganizationMember(org)"
                            v-tooltip="{ content: 'Add member to organization' }" 
                            as="tertiary icon"
                            v-if="isOrgAdmin(org)"
                            :iconLeft="{ component: PhUserPlus, weight: 'bold' }" 
                        />

                        <!-- Organization settings button - only for admins -->
                        <ButtonComponent
                            v-if="isOrgAdmin(org)"
                            @click="openOrganizationSettings(org)"
                            v-tooltip="{ content: 'Organization settings' }" 
                            as="tertiary icon"
                            :iconLeft="{ component: PhGearSix, weight: 'bold' }" 
                        />
                        
                        <!-- Create team button - ALWAYS visible for admins -->
                        <ButtonComponent
                            v-if="isOrgAdmin(org)"
                            v-tooltip="{ content: 'Create new team' }" 
                            as="tertiary icon"
                            :iconLeft="{ component: PhPlus, weight: 'bold' }" 
                            @click="handleCreateTeamClick(org)" 
                        />
                        
                        <ButtonComponent
                            v-if="getOrgMenuOptions(org).length > 0"
                            v-dropdown="{
                                component: MenusComponent,
                                properties: {
                                    menus: getOrgMenuOptions(org)
                                }
                            }"
                            v-tooltip="{ content: 'More options' }"
                            as="tertiary icon"
                            :iconLeft="{ component: PhDotsThree, weight: 'bold' }"
                        />
                    </div>
                </div>
            </div>

            <!-- Display organization users -->
            <div class="org-users" v-if="org.users && org.users.length > 0">
                <div style="display: flex; align-items: center; gap:10px; font-weight: 500;">
                    <PhUsers weight="bold" />
                    <span>{{ org.users.length }} Member{{ org.users.length !== 1 ? 's' : '' }}</span>
                </div>

                <ul>
                    <li v-for="user in org.users" :key="user.id">
                        {{ user.name }} ({{ user.effective_role || user.role || 'member' }})
                    </li>
                </ul>
            </div>

            <!-- Show empty state if no teams -->
            <div v-if="(!org.teams || org.teams.length === 0) && isOrgAdmin(org)" class="no-teams-box">
                <PhUsersThree weight="duotone" :size="48" class="no-teams-icon" />
                <h3>No teams yet</h3>
                <p>Teams help you organize members and manage permissions</p>
                <div>
                <ButtonComponent
                    v-if="canCreateTeams(org.id)"
                    label="Create your first team"
                    as="primary"
                    :iconLeft="{ component: PhPlus, weight: 'bold' }"
                    @click="handleCreateTeamClick(org)"
                />
                <ButtonComponent
                    v-else
                    label="Upgrade plan to create teams"
                    as="primary"
                    :iconLeft="{ component: PhPlus, weight: 'bold' }"
                    @click="() => popup.open('billing-upgrade', null, BillingUpgradeModal, {
                        organizationId: org.id,
                        message: 'Unlock teams and more features',
                        recommendedPlan: 'professional'
                    })"
                /></div>
            </div>

            <TeamList
                v-if="org.teams && org.teams.length"
                :teams="org.teams"
                :orgSlug="org.slug"
                :orgId="org.id"
                :orgUsers="org.users || []"
                :currentUserId="currentUserId"
                :reloadData="reloadData"
                :canCreateSubTeams="canCreateTeams(org.id)"
                :isOrgAdmin="isOrgAdmin(org)"
            />

            <!-- Show upgrade notice only for organizations on free plan and only for admins -->
            <div v-if="!canCreateTeams(org.id) && isOrgAdmin(org) && org.teams && org.teams.length > 0" class="upgrade-notice">
                <div class="upgrade-box">
                    <PhWarning weight="bold" class="warning-icon" />
                    <span>Creating new teams is not available on your current plan</span>
                    <div>
                        <ButtonComponent
                            label="Upgrade Plan"
                            as="primary mini"
                            @click="() => popup.open('billing-upgrade', null, BillingUpgradeModal, {
                                organizationId: org.id,
                                message: 'Unlock teams and more features',
                                recommendedPlan: 'professional'
                            })"
                        />
                    </div>
                </div>
            </div>


        </div>

        <!-- Create Organization Button -->
        <div class="create-org-section" style="margin-top: 20px;">
            <ButtonComponent
                v-popup="{
                    component: OrganizationCreateForm,
                    overlay: { position: 'center' },
                    properties: {
                        endpoint: 'organizations',
                        type: 'POST',
                        callback: (event, data, response, success) => {
                            console.log('org created', response);
                            popup.close();
                            reloadData();
                        },
                        class: 'h-auto',
                        title: 'Create new organization',
                    }
                }"
                as="primary"
                :iconLeft="{ component: PhPlus, weight: 'bold' }"
                label="Create Organization"
            />
        </div>
    </div>
</template>

<style scoped>
.teams-c-items {
    display: flex;
    flex-direction: column;
}

.teams-c-item {
    background: var(--background-0);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 20px;
    margin-bottom: 20px;
}

.head {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.org-name {
    display: flex;
    align-items: center;
    gap: 12px;
}

.org-name .logo {
    width: 40px;
    height: 40px;
    background: var(--brand-gradient);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: 600;
    font-size: 18px;
}

.org-name .logo span {
    width: 26px;
    height: 26px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    font-weight: 700;
    background-color: var(--brand-yellow);
    color: #776D2B;
    line-height: 1;
    border-radius: 8px;
}

.org-name p {
    margin: 0 0 4px 0;
    font-size: 18px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 8px;
}

.org-name p span.admin {
    font-size: 12px;
    background: rgba(59, 130, 246, 0.1);
    color: rgb(59, 130, 246);
    padding: 2px 8px;
    border-radius: 4px;
    font-weight: 500;
    text-transform: uppercase;
}

.org-name p span.plan-badge {
    font-size: 11px;
    padding: 2px 8px;
    border-radius: 4px;
    font-weight: 600;
    text-transform: uppercase;
}

.org-url {
    color: var(--brand-blue);
    font-size: 14px;
    text-decoration: none;
    font-weight: 500;
}

.org-url:hover {
    text-decoration: underline;
}

.right {
    display: flex;
    align-items: center;
    gap: 20px;
}

.actions {
    display: flex;
    gap: 8px;
}

.member-badge {
    font-size: 14px;
    color: var(--text-secondary);
    padding: 4px 12px;
    background: var(--background-1);
    border: 1px solid var(--border);
    border-radius: 6px;
    display: flex;
    align-items: center;
    gap: 6px;
}

.org-users {
    margin-top: 20px;
    padding: 15px;
    background-color: var(--background-0);
    border-radius: var(--radius-md);
}

.org-users ul {
    list-style: none;
    padding: 0;
    margin-top: 10px;
}

.org-users li {
    padding: 5px 0;
    color: var(--text-secondary);
}

.org-name-link {
    color: var(--text-primary);
    text-decoration: none;
    font-weight: 600;
    transition: color 0.2s;
}

.org-name-link:hover {
    color: var(--brand-primary);
}

.create-org-section {
    text-align: center;
    padding: 20px;
}

.upgrade-notice {
    margin: 20px 0;
}

.upgrade-box {
    background: var(--brand-yellow);
    border-radius: 8px;
    padding: 16px;
    display: flex;
    align-items: center;
    gap: 12px;
    font-weight: 500;
}

.warning-icon {
    color: var(--warning);
    font-size: 20px;
}

.upgrade-box span {
    flex: 1;
    color: var(--text-primary);
}

/* No teams empty state */
.no-teams-box {
    margin: 30px 0;
    padding: 40px;
    background: var(--background-1);
    border: 2px dashed var(--border);
    border-radius: 12px;
    text-align: center;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
}

.no-teams-icon {
    color: var(--text-secondary);
    margin-bottom: 16px;
}

.no-teams-box h3 {
    margin: 0 0 8px 0;
    font-size: 20px;
    font-weight: 600;
    color: var(--text-primary);
}

.no-teams-box p {
    margin: 0 0 24px 0;
    color: var(--text-secondary);
    font-size: 14px;
}
</style>