<!-- src/panels/user/plugins/organizations/components/members/view.vue -->
<script setup>
import { ref, computed, onMounted, watch, markRaw } from 'vue';
import { api } from '@utils/api';
import { common } from '@utils/common';
import { popup } from '@utils/popup';
import { UserStore } from '@stores/user';
import { BillingStore } from '@stores/billing';

import InputComponent from '@form/input/view.vue';
import SelectComponent from '@form/select/view.vue';
import ButtonComponent from '@form/button/view.vue';
import ConfirmComponent from '@floated/confirm/view.vue';
import MenusComponent from '@global/menus/view.vue';
import PurchaseSeatsModal from '@user_shared/components/purchaseSeatsModal/view.vue';
import BillingUpgradeModal from '@user_billing/components/upgrade-modal.vue';

import {
    PhPaperPlaneTilt,
    PhClock,
    PhX,
    PhArrowsClockwise,
    PhDotsThree,
    PhTrash,
    PhCrown,
    PhUser,
    PhWarning,
    PhShoppingCart,
    PhMagnifyingGlass,
    PhEnvelopeSimple
} from "@phosphor-icons/vue";

const props = defineProps({
    organization: {
        type: Object,
        required: true
    },
    organizationId: {
        type: Number,
        required: true
    },
    isAdmin: {
        type: Boolean,
        default: false
    }
});

const emit = defineEmits(['refresh']);

const userStore = UserStore();
const billingStore = BillingStore();

// State
const members = ref([]);
const invitations = ref([]);
const searchQuery = ref('');
const currentUserId = computed(() => userStore.getId());
const isLoading = ref(false);

// Invitation form state
const inviteEmail = ref('');
const inviteRole = ref('member');
const showNoSeatsMessage = ref(false);
const seatInfo = ref({
    total: 1,
    used: 0,
    current_members: 0,
    pending_invitations: 0,
    available: 1
});

// Role options
const roleOptions = [
    { label: 'Member', value: 'member' },
    { label: 'Admin', value: 'admin' }
];

// Filtered items
const filteredItems = computed(() => {
    const query = searchQuery.value.toLowerCase();
    
    const filteredMembers = members.value.filter(member =>
        member.user.name.toLowerCase().includes(query) ||
        member.user.email.toLowerCase().includes(query)
    );
    
    const filteredInvitations = invitations.value.filter(inv =>
        inv.email.toLowerCase().includes(query)
    );
    
    return {
        members: filteredMembers,
        invitations: filteredInvitations
    };
});

// Check if there are other admins
const hasOtherAdmins = computed(() => {
    const otherAdmins = members.value.filter(
        member => member.role === 'admin' && member.user.id !== currentUserId.value
    );
    
    return otherAdmins.length > 0;
});

// Get user initials
function getUserInitials(name) {
    if (!name) return 'U';
    const parts = name.split(' ');
    if (parts.length >= 2) {
        return parts[0][0].toUpperCase() + parts[1][0].toUpperCase();
    }
    return name[0].toUpperCase();
}

// Load members and invitations
async function loadData() {
    try {
        isLoading.value = true;
        
        const promises = [
            api.get(`organizations/${props.organizationId}/members`),
            api.get(`invitations/sent?organization_id=${props.organizationId}`)
        ];
        
        const [membersResponse, invitationsResponse] = await Promise.all(promises);
        
        if (membersResponse.success) {
            // Check if the response has the new structure with seats info
            if (membersResponse.data.members) {
                members.value = membersResponse.data.members || [];
                
                // Update seat info if available
                if (membersResponse.data.seats) {
                    seatInfo.value = membersResponse.data.seats;
                    showNoSeatsMessage.value = seatInfo.value.available <= 0;
                }
            } else {
                // Old structure - just members array
                members.value = membersResponse.data || [];
                // Try to load seats from subscription endpoint as fallback
                await loadSeatInfoFromSubscription();
            }
        }
        
        if (invitationsResponse.success) {
            invitations.value = invitationsResponse.data.filter(inv => inv.status === 'pending') || [];
        }
    } catch (error) {
        console.error('Failed to load data:', error);
    } finally {
        isLoading.value = false;
    }
}

// Fallback: Load seat information from subscription endpoint
async function loadSeatInfoFromSubscription() {
    try {
        const response = await api.get(`billing/organizations/${props.organizationId}/subscription`);
        if (response.success && response.data) {
            // Extract seat info from subscription data
            if (response.data.seats) {
                seatInfo.value = response.data.seats;
            } else {
                // Calculate seats from subscription data
                const subscription = response.data.subscription;
                if (subscription) {
                    seatInfo.value = {
                        total: subscription.seats || 1,
                        used: members.value.length + invitations.value.length,
                        current_members: members.value.length,
                        pending_invitations: invitations.value.length,
                        available: Math.max(0, (subscription.seats || 1) - members.value.length - invitations.value.length)
                    };
                }
            }
            showNoSeatsMessage.value = seatInfo.value.available <= 0;
        }
    } catch (error) {
        console.error('Failed to load seat info:', error);
    }
}

// Send invitation
async function sendInvitation() {
    if (!inviteEmail.value) {
        common.notification('Please enter an email address', false);
        return;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail.value)) {
        common.notification('Please enter a valid email address', false);
        return;
    }
    
    // Check if seats are available
    if (seatInfo.value.available <= 0) {
        showNoSeatsMessage.value = true;
        return;
    }
    
    try {
        isLoading.value = true;
        
        const response = await api.post(`organizations/${props.organizationId}/members/invite`, {
            email: inviteEmail.value,
            role: inviteRole.value
        });
        
        if (response.success) {
            common.notification('Invitation sent successfully', true);
            inviteEmail.value = '';
            inviteRole.value = 'member';
            showNoSeatsMessage.value = false;
            await loadData();
            emit('refresh');
        } else {
            // Check if it's a seat limitation error
            if (response.data?.requires_purchase && response.data?.seats) {
                seatInfo.value = response.data.seats;
                showNoSeatsMessage.value = true;
            }
            common.notification(response.message || 'Failed to send invitation', false);
        }
    } catch (error) {
        console.error('Failed to send invitation:', error);
        common.notification('Failed to send invitation', false);
    } finally {
        isLoading.value = false;
    }
}

// Resend invitation
async function resendInvitation(invitation) {
    try {
        const response = await api.post(`invitations/${invitation.id}/resend`);
        
        if (response.success) {
            common.notification('Invitation resent successfully', true);
        } else {
            common.notification('Failed to resend invitation', false);
        }
    } catch (error) {
        console.error('Failed to resend invitation:', error);
        common.notification('Failed to resend invitation', false);
    }
}

// Delete invitation
async function deleteInvitation(invitation) {
    popup.open(
        'delete-invitation',
        null,
        ConfirmComponent,
        {
            as: 'red',
            description: `Are you sure you want to cancel the invitation to ${invitation.email}?`,
            callback: async () => {
                try {
                    const response = await api.delete(`invitations/${invitation.id}`);
                    
                    if (response.success) {
                        common.notification('Invitation cancelled', true);
                        popup.close();
                        await loadData();
                        emit('refresh');
                    } else {
                        common.notification('Failed to cancel invitation', false);
                    }
                } catch (error) {
                    console.error('Failed to cancel invitation:', error);
                    common.notification('Failed to cancel invitation', false);
                }
            }
        },
        {
            position: 'center'
        }
    );
}

// Get menu options for member
function getMemberMenuOptions(member) {
    const options = [];
    
    // Only show role toggle if user is admin and not looking at themselves
    if (props.isAdmin && member.user.id !== currentUserId.value) {
        options.push({
            label: member.role === 'admin' ? 'Make Member' : 'Make Admin',
            iconComponent: member.role === 'admin' ? PhUser : PhCrown,
            weight: 'bold',
            onClick: () => updateMemberRole(member, member.role === 'admin' ? 'member' : 'admin')
        });
    }
    
    // Only show remove if user is admin and either:
    // - Not looking at themselves, OR
    // - There are other admins (can't remove last admin)
    if (props.isAdmin && (member.user.id !== currentUserId.value || hasOtherAdmins.value)) {
        options.push({
            label: 'Remove from organization',
            iconComponent: PhTrash,
            weight: 'bold',
            onClick: () => removeMember(member)
        });
    }
    
    return options;
}

// Update member role
async function updateMemberRole(member, newRole) {
    // Prevent last admin from demoting themselves
    if (member.role === 'admin' && member.user.id === currentUserId.value && !hasOtherAdmins.value) {
        common.notification('Cannot demote the last admin', false);
        return;
    }
    
    try {
        const response = await api.put(`organizations/${props.organizationId}/members/${member.id}`, {
            role: newRole
        });
        
        if (response.success) {
            common.notification('Member role updated', true);
            await loadData();
            emit('refresh');
        } else {
            common.notification(response.message || 'Failed to update role', false);
        }
    } catch (error) {
        console.error('Failed to update role:', error);
        common.notification('Failed to update role', false);
    }
}

// Remove member
async function removeMember(member) {
    popup.open(
        'remove-member',
        null,
        ConfirmComponent,
        {
            as: 'red',
            description: `Are you sure you want to remove ${member.user.name} from this organization?`,
            callback: async () => {
                try {
                    const response = await api.delete(`organizations/${props.organizationId}/members/${member.id}`);
                    
                    if (response.success) {
                        common.notification('Member removed', true);
                        popup.close();
                        await loadData();
                        emit('refresh');
                    } else {
                        common.notification(response.message || 'Failed to remove member', false);
                    }
                } catch (error) {
                    console.error('Failed to remove member:', error);
                    common.notification('Failed to remove member', false);
                }
            }
        },
        {
            position: 'center'
        }
    );
}

// Purchase more seats
function purchaseSeats() {
    popup.open(
        'purchase-seats',
        null,
        PurchaseSeatsModal,
        {
            organizationId: props.organizationId,
            callback: async () => {
                await loadData();
                emit('refresh');
            }
        },
        {
            position: 'center'
        }
    );
}

// Upgrade plan
function upgradePlan() {
    popup.open(
        'billing-upgrade',
        null,
        BillingUpgradeModal,
        {
            organizationId: props.organizationId,
            message: 'Upgrade your plan to add more members',
            recommendedPlan: 'business'
        },
        {
            position: 'center'
        }
    );
}

onMounted(() => {
    loadData();
});
</script>

<template>
    <div class="org-members-tab">
        <div class="members-header">
            <div class="header-info">
                <h3>Members</h3>
                <p>Manage members and invitations for this organization</p>
            </div>
        </div>
        
        <!-- No Seats Alert -->
        <div v-if="showNoSeatsMessage && isAdmin" class="no-seats-alert">
            <PhWarning :size="24" weight="bold" />
            <div class="alert-content">
                <h4>No Available Seats</h4>
                <p>You've used all available seats in your plan.</p>
                <p class="seat-breakdown">
                    {{ seatInfo.current_members }} members + {{ seatInfo.pending_invitations }} pending = {{ seatInfo.used }}/{{ seatInfo.total }} seats used
                </p>
            </div>
            <div class="alert-actions">
                <ButtonComponent
                    as="secondary"
                    label="Purchase More Seats"
                    :iconLeft="{ component: PhShoppingCart, weight: 'bold' }"
                    @click="purchaseSeats"
                />
            </div>
        </div>
        
        <!-- Invite Form -->
        <div v-if="isAdmin" class="invite-section">
            <h4 class="section-title">INVITE NEW MEMBER</h4>
            <div class="invite-form">
                <InputComponent
                    :value="inviteEmail"
                    type="email"
                    placeholder="Enter email address"
                    :iconLeft="{ component: PhEnvelopeSimple, weight: 'regular' }"
                    @onInput="(e, value) => inviteEmail = value"
                />
                <div class="select-group">
                    <SelectComponent
                        :value="inviteRole"
                        :options="roleOptions"
                        @onChange="(value) => inviteRole = value"
                    />
                    <ButtonComponent
                        as="primary"
                        label="Send Invite"
                        :iconLeft="{ component: PhPaperPlaneTilt, weight: 'bold' }"
                        @click="sendInvitation"
                        :disabled="!inviteEmail"
                        :loading="isLoading"
                    />
                </div>
            </div>
        </div>
        
        <!-- Search -->
        <div class="search-section">
            <InputComponent
                :value="searchQuery"
                placeholder="Search members..."
                :iconLeft="{ component: PhMagnifyingGlass, weight: 'regular' }"
                @onInput="(e, value) => searchQuery = value"
            />
        </div>
        
        <!-- Loading State -->
        <div v-if="isLoading && members.length === 0" class="loading-state">
            <p>Loading members...</p>
        </div>
        
        <!-- Members List -->
        <div v-else class="members-content">
            <!-- Current Members -->
            <div v-if="filteredItems.members.length > 0" class="section">
                <h4 class="section-title">MEMBERS ({{ filteredItems.members.length }})</h4>
                <div class="member-list">
                    <div v-for="member in filteredItems.members" :key="member.id" class="member-item">
                        <div class="member-info">
                            <div class="member-avatar">
                                {{ getUserInitials(member.user.name) }}
                            </div>
                            <div class="member-details">
                                <h4>
                                    {{ member.user.name }}
                                    <span v-if="member.user.id === currentUserId" class="creator-badge">(You)</span>
                                </h4>
                                <p>{{ member.user.email }}</p>
                            </div>
                        </div>
                        <div class="member-actions">
                            <span class="role-badge" :class="member.role">{{ member.role }}</span>
                            <ButtonComponent
                                v-if="isAdmin && getMemberMenuOptions(member).length > 0"
                                v-dropdown="{
                                    component: MenusComponent,
                                    properties: {
                                        menus: getMemberMenuOptions(member)
                                    }
                                }"
                                v-tooltip="{ content: 'More options' }"
                                as="tertiary icon"
                                :iconLeft="{ component: PhDotsThree, weight: 'bold' }"
                            />
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Pending Invitations -->
            <div v-if="filteredItems.invitations.length > 0" class="section">
                <h4 class="section-title">PENDING INVITATIONS ({{ filteredItems.invitations.length }})</h4>
                <div class="member-list">
                    <div v-for="invitation in filteredItems.invitations" :key="invitation.id" class="member-item invitation-item">
                        <div class="member-info">
                            <div class="member-avatar invitation">
                                <PhClock :size="20" weight="bold" />
                            </div>
                            <div class="member-details">
                                <h4>{{ invitation.email }}</h4>
                                <p>Invited {{ new Date(invitation.created_at).toLocaleDateString() }}</p>
                            </div>
                        </div>
                        <div class="member-actions">
                            <span class="role-badge" :class="invitation.role">{{ invitation.role }}</span>
                            <ButtonComponent
                                v-if="isAdmin"
                                v-tooltip="{ content: 'Resend invitation' }"
                                as="tertiary icon"
                                :iconLeft="{ component: PhArrowsClockwise, weight: 'bold' }"
                                @click="resendInvitation(invitation)"
                            />
                            <ButtonComponent
                                v-if="isAdmin"
                                v-tooltip="{ content: 'Cancel invitation' }"
                                as="tertiary icon"
                                :iconLeft="{ component: PhX, weight: 'bold' }"
                                @click="deleteInvitation(invitation)"
                            />
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Empty State -->
            <div v-if="filteredItems.members.length === 0 && filteredItems.invitations.length === 0" class="empty-state">
                <p v-if="searchQuery">No members or invitations found matching "{{ searchQuery }}"</p>
                <p v-else>No members or invitations yet</p>
            </div>
        </div>
    </div>
</template>

<style scoped>
.org-members-tab {
    display: flex;
    flex-direction: column;
    gap: 24px;
}

.members-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
}

.header-info h3 {
    margin: 0 0 8px 0;
    font-size: 20px;
    font-weight: 600;
}

.header-info p {
    margin: 0;
    color: var(--text-secondary);
    font-size: 14px;
}

/* No Seats Alert */
.no-seats-alert {
    background: var(--brand-yellow);
    border-radius: 6px;
    padding: 20px;
    display: flex;
    align-items: center;
    gap: 20px;
}

.no-seats-alert .alert-content {
    flex: 1;
}

.no-seats-alert .alert-content h4 {
    margin: 0 0 8px 0;
    font-size: 16px;
}

.no-seats-alert .alert-content p {
    margin: 0;
    font-size: 13px;
}

.no-seats-alert .alert-content .seat-breakdown {
    font-weight: 500;
    margin-top: 4px;
}

.no-seats-alert .alert-actions {
    display: flex;
    gap: 10px;
}

/* Invite Section */
.invite-section {
    background: var(--background-1);
    border-radius: 8px;
    padding: 20px;
}

.section-title {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-secondary);
    margin: 0 0 16px 0;
    letter-spacing: 0.5px;
}

.invite-form {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.select-group {
    display: flex;
    gap: 12px;
}

/* Search Section */
.search-section {
    background: var(--background-1);
    border-radius: 8px;
    padding: 16px;
}

/* Members Content */
.members-content {
    display: flex;
    flex-direction: column;
    gap: 32px;
}

.section {
    background: var(--background-1);
    border-radius: 8px;
    padding: 20px;
}

/* Member List */
.member-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.member-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px;
    background: var(--background-0);
    border: 1px solid var(--border);
    border-radius: 8px;
    transition: all 0.2s ease;
}

.member-item:hover {
    border-color: var(--border-hover);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.member-info {
    display: flex;
    align-items: center;
    gap: 12px;
}

.member-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: var(--brand-yellow);
    color: var(--black);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 14px;
}

.member-avatar.invitation {
    background: var(--background-2);
    color: var(--text-secondary);
}

.member-details h4 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 8px;
}

.member-details p {
    margin: 4px 0 0 0;
    font-size: 13px;
    color: var(--text-secondary);
}

.creator-badge {
    font-size: 11px;
    opacity: 0.8;
    font-weight: 400;
}

.member-actions {
    display: flex;
    align-items: center;
    gap: 8px;
}

.role-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    border-radius: 16px;
    font-size: 12px;
    font-weight: 500;
    text-transform: capitalize;
}

.role-badge.admin {
    background: var(--warning-light);
    color: var(--warning);
}

.role-badge.member {
    background: var(--background-2);
    color: var(--text-secondary);
}

/* Loading/Empty States */
.loading-state,
.empty-state {
    padding: 60px 20px;
    text-align: center;
}

.empty-state p {
    margin: 0;
    color: var(--text-secondary);
    font-size: 14px;
}

.org-members-tab:has(.no-seats-alert) .invite-section {display:none}


/* Responsive */
@media (max-width: 768px) {
    .select-group {
        flex-direction: column;
    }
    
    .member-item {
        flex-direction: column;
        align-items: flex-start;
        gap: 12px;
    }
    
    .member-actions {
        width: 100%;
        justify-content: flex-end;
    }
    
    .no-seats-alert {
        flex-direction: column;
        text-align: center;
    }
}
</style>