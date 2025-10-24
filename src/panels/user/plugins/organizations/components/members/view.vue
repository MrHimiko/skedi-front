<!-- src/panels/user/plugins/organizations/components/members/view.vue -->
<script setup>
import { ref, computed, onMounted, watch } from 'vue';
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
    PhShoppingCart
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
            members.value = membersResponse.data || [];
        }
        
        if (invitationsResponse.success) {
            invitations.value = invitationsResponse.data || [];
        }
        
        // Load seat information
        await loadSeatInfo();
    } catch (error) {
        console.error('Failed to load data:', error);
    } finally {
        isLoading.value = false;
    }
}

// Load seat information
async function loadSeatInfo() {
    try {
        const response = await api.get(`billing/organizations/${props.organizationId}/seats`);
        if (response.success && response.data) {
            seatInfo.value = response.data;
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
    
    // Check if seats are available
    if (seatInfo.value.available <= 0) {
        showNoSeatsMessage.value = true;
        return;
    }
    
    try {
        isLoading.value = true;
        
        const response = await api.post('invitations', {
            email: inviteEmail.value,
            role: inviteRole.value,
            organization_id: props.organizationId
        });
        
        if (response.success) {
            common.notification('Invitation sent successfully', true);
            inviteEmail.value = '';
            inviteRole.value = 'member';
            await loadData();
            emit('refresh');
        } else {
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
            common.notification(response.message || 'Failed to resend invitation', false);
        }
    } catch (error) {
        console.error('Failed to resend invitation:', error);
        common.notification('Failed to resend invitation', false);
    }
}

// Cancel invitation
async function cancelInvitation(invitation) {
    popup.open(
        'cancel-invitation',
        null,
        ConfirmComponent,
        {
            as: 'red',
            description: `Are you sure you want to cancel the invitation for ${invitation.email}?`,
            callback: async () => {
                try {
                    const response = await api.delete(`invitations/${invitation.id}`);
                    
                    if (response.success) {
                        common.notification('Invitation cancelled', true);
                        popup.close();
                        await loadData();
                    } else {
                        common.notification(response.message || 'Failed to cancel invitation', false);
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
                    @onInput="(e, value) => inviteEmail = value"
                />
                <div class="select-group">
                    <SelectComponent
                        :value="inviteRole"
                        :options="roleOptions"
                        @onChange="(value) => inviteRole = value"
                    />
                </div>
                <ButtonComponent
                    as="primary"
                    :iconLeft="{ component: PhPaperPlaneTilt, weight: 'bold' }"
                    label="Send Invite"
                    @click="sendInvitation"
                    :disabled="!inviteEmail || isLoading"
                />
            </div>
        </div>
        
        <!-- Search -->
        <div class="search-section">
            <InputComponent
                :value="searchQuery"
                placeholder="Search members..."
                @onInput="(e, value) => searchQuery = value"
            />
        </div>
        
        <!-- Members List -->
        <div v-if="filteredItems.members.length > 0" class="section">
            <h4 class="section-title">MEMBERS ({{ filteredItems.members.length }})</h4>
            <div class="member-list">
                <div 
                    v-for="member in filteredItems.members" 
                    :key="member.id"
                    class="member-item"
                >
                    <div class="member-info">
                        <div class="member-avatar">
                            {{ getUserInitials(member.user.name) }}
                        </div>
                        <div class="member-details">
                            <h5>
                                {{ member.user.name }}
                                <span v-if="member.user.id === currentUserId" class="creator-badge">(You)</span>
                            </h5>
                            <p>{{ member.user.email }}</p>
                        </div>
                    </div>
                    <div class="member-actions">
                        <span class="role-badge" :class="member.role">
                            {{ member.role }}
                        </span>
                        <ButtonComponent
                            v-if="isAdmin && member.user.id !== currentUserId"
                            v-dropdown="{
                                component: MenusComponent,
                                properties: {
                                    menus: [
                                        {
                                            label: member.role === 'admin' ? 'Make Member' : 'Make Admin',
                                            iconComponent: member.role === 'admin' ? PhUser : PhCrown,
                                            weight: 'bold',
                                            onClick: () => updateMemberRole(member, member.role === 'admin' ? 'member' : 'admin')
                                        },
                                        {
                                            label: 'Remove from organization',
                                            iconComponent: PhTrash,
                                            weight: 'bold',
                                            onClick: () => removeMember(member)
                                        }
                                    ]
                                }
                            }"
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
                <div 
                    v-for="invitation in filteredItems.invitations" 
                    :key="invitation.id"
                    class="member-item invitation-item"
                >
                    <div class="member-info">
                        <div class="member-avatar pending">
                            <PhClock :size="20" weight="bold" />
                        </div>
                        <div class="member-details">
                            <h5>{{ invitation.email }}</h5>
                            <p class="invitation-status">Invitation pending</p>
                        </div>
                    </div>
                    <div class="member-actions">
                        <span class="role-badge" :class="invitation.role">
                            {{ invitation.role }}
                        </span>
                        <ButtonComponent
                            v-if="isAdmin"
                            as="tertiary icon"
                            :iconLeft="{ component: PhArrowsClockwise, weight: 'bold' }"
                            @click="resendInvitation(invitation)"
                            v-tooltip="{ content: 'Resend invitation' }"
                        />
                        <ButtonComponent
                            v-if="isAdmin"
                            as="tertiary icon"
                            :iconLeft="{ component: PhX, weight: 'bold' }"
                            @click="cancelInvitation(invitation)"
                            v-tooltip="{ content: 'Cancel invitation' }"
                        />
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Empty State -->
        <div v-if="!isLoading && filteredItems.members.length === 0 && filteredItems.invitations.length === 0" class="empty-state">
            <p v-if="searchQuery">No members or invitations found matching "{{ searchQuery }}"</p>
            <p v-else>No members yet</p>
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
    margin-bottom: 8px;
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
    border-radius: 8px;
    padding: 20px;
    display: flex;
    align-items: center;
    gap: 16px;
}

.alert-content h4 {
    margin: 0 0 8px 0;
    font-size: 16px;
}

.alert-content p {
    margin: 0 0 4px 0;
    font-size: 13px;
}

.alert-content .seat-breakdown {
    font-weight: 500;
}

.alert-actions {
    display: flex;
    gap: 10px;
    margin-left: auto;
}

/* Invite Section */
.invite-section {
    background: var(--background-1);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 20px;
}

.section-title {
    margin: 0 0 16px 0;
    font-size: 12px;
    font-weight: 600;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.invite-form {
    display: flex;
    gap: 12px;
    align-items: flex-end;
}

.select-group {
    width: 160px;
}

/* Search Section */
.search-section {
    max-width: 400px;
}

/* Section */
.section {
    background: var(--background-1);
    border: 1px solid var(--border);
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
    justify-content: space-between;
    align-items: center;
    padding: 12px;
    background: var(--background-0);
    border: 1px solid var(--border);
    border-radius: 6px;
}

.member-item.invitation-item {
    background: var(--background-1);
}

.member-info {
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1;
}

.member-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: var(--brand-gradient);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 14px;
    flex-shrink: 0;
}

.member-avatar.pending {
    background: var(--background-3);
    color: var(--text-secondary);
}

.member-details {
    flex: 1;
    min-width: 0;
}

.member-details h5 {
    margin: 0 0 4px 0;
    font-size: 15px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 8px;
}

.member-details p {
    margin: 0;
    font-size: 13px;
    color: var(--text-secondary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.invitation-status {
    font-style: italic;
}

.creator-badge {
    font-size: 11px;
    opacity: 0.7;
    font-weight: 400;
}

.member-actions {
    display: flex;
    align-items: center;
    gap: 8px;
}

.role-badge {
    display: flex;
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

/* Empty State */
.empty-state {
    text-align: center;
    padding: 40px 20px;
    color: var(--text-secondary);
}

.empty-state p {
    margin: 0;
    font-size: 16px;
}

@media (max-width: 768px) {
    .invite-form {
        flex-direction: column;
        align-items: stretch;
    }
    
    .select-group {
        width: 100%;
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
}
</style>