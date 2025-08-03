<script setup>
import { ref, computed, onMounted, watch, markRaw } from 'vue';

import { api } from '@utils/api';
import { common } from '@utils/common';
import { popup } from '@utils/popup';
import { UserStore } from '@stores/user';
import { useRouter } from 'vue-router';

import PopupLayout from '@layouts/popup/view.vue';
import InputComponent from '@form/input/view.vue';
import SelectComponent from '@form/select/view.vue';
import ButtonComponent from '@form/button/view.vue';
import ConfirmComponent from '@floated/confirm/view.vue';
import MenusComponent from '@global/menus/view.vue';

import PurchaseSeatsModal from '@user_shared/components/purchaseSeatsModal/view.vue';
import { 
    PhEnvelopeSimple, 
    PhPaperPlaneTilt,
    PhClock,
    PhCheck,
    PhX,
    PhArrowsClockwise,
    PhDotsThree,
    PhTrash,
    PhCrown,
    PhUser,
    PhSignOut,
    PhShoppingCart,
    PhWarning
} from "@phosphor-icons/vue";

const props = defineProps({
    type: {
        type: String,
        required: true,
        validator: (value) => ['organization', 'team'].includes(value)
    },
    entityId: {
        type: Number,
        required: true
    },
    entityName: {
        type: String,
        required: true
    },
    organizationId: {
        type: Number,
        required: false
    },
    callback: {
        type: Function,
        default: null
    }
});

const userStore = UserStore();
const router = useRouter();

// State
const members = ref([]);
const invitations = ref([]);
const searchQuery = ref('');
const currentUserId = computed(() => userStore.getId());
const isAdmin = ref(false);
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

// Check if current user is admin
onMounted(async () => {
    await checkAdminStatus();
    loadData();
});

async function checkAdminStatus() {
    if (props.type === 'organization') {
        const orgs = userStore.getOrganizations();
        const currentOrg = orgs.find(org => 
            (org.entity?.id || org.id) === props.entityId
        );
        isAdmin.value = currentOrg && currentOrg.role === 'admin';
    } else {
        // For teams, check if user is team admin or org admin
        try {
            const response = await api.get(`organizations/${props.organizationId}/teams/${props.entityId}`);
            if (response.success && response.data) {
                isAdmin.value = response.data.effective_role === 'admin';
            }
        } catch (error) {
            console.error('Failed to check admin status:', error);
        }
    }
}

// Filter members and invitations
const filteredItems = computed(() => {
    const query = searchQuery.value.toLowerCase();
    
    const filteredMembers = members.value.filter(member => 
        member.user.name.toLowerCase().includes(query) ||
        member.user.email.toLowerCase().includes(query)
    );
    
    const filteredInvitations = invitations.value.filter(invitation =>
        invitation.email.toLowerCase().includes(query)
    );
    
    return {
        members: filteredMembers,
        invitations: filteredInvitations
    };
});

// Check if current user can leave
const canLeave = computed(() => {
    if (props.type === 'team') return true; // Always can leave teams
    
    if (!isAdmin.value) return true;
    
    // For organizations, check if there are other admins
    const otherAdmins = members.value.filter(member => 
        member.role === 'admin' && member.user.id !== currentUserId.value
    );
    
    return otherAdmins.length > 0;
});

// Role options
const roleOptions = [
    { label: 'Member', value: 'member' },
    { label: 'Admin', value: 'admin' }
];

// Get modal title
const modalTitle = computed(() => {
    return `${props.entityName} - Members`;
});

// Load members and invitations
async function loadData() {
    try {
        isLoading.value = true;
        
        // Load members based on type
        let membersEndpoint;
        if (props.type === 'organization') {
            membersEndpoint = `organizations/${props.entityId}/members`;
        } else {
            membersEndpoint = `organizations/${props.organizationId}/teams/${props.entityId}/members`;
        }
        
        const [membersResponse, invitationsResponse] = await Promise.all([
            api.get(membersEndpoint),
            api.get(`invitations/sent?${props.type}_id=${props.entityId}`)
        ]);
        
        if (membersResponse.success) {
            // Handle different response structures
            if (props.type === 'organization' && membersResponse.data.members) {
                // New structure with seats info
                members.value = membersResponse.data.members || [];
                
                // Update seat info if available
                if (membersResponse.data.seats) {
                    seatInfo.value = membersResponse.data.seats;
                    
                    // Automatically show no seats message if no seats available
                    if (isAdmin.value && seatInfo.value.available === 0) {
                        showNoSeatsMessage.value = true;
                    }
                }
            } else {
                // Old structure or team endpoint
                members.value = membersResponse.data || [];
            }
        }
        
        if (invitationsResponse.success) {
            invitations.value = invitationsResponse.data.filter(inv => inv.status === 'pending') || [];
        }
    } catch (error) {
        console.error('Failed to load data:', error);
        common.notification('Failed to load members', false);
    } finally {
        isLoading.value = false;
    }
}


const shouldShowInviteForm = computed(() => {
    return isAdmin.value && !showNoSeatsMessage.value;
});

// Leave entity
async function leaveEntity() {
    const entityType = props.type === 'organization' ? 'organization' : 'team';
    const warningMessage = !canLeave.value 
        ? 'You are the only admin. Please assign another admin before leaving.'
        : `Are you sure you want to leave this ${entityType}?`;
    
    if (!canLeave.value) {
        common.notification(warningMessage, false);
        return;
    }
    
    popup.open(
        'leave-entity-confirm',
        null,
        ConfirmComponent,
        {
            as: 'red',
            description: warningMessage,
            callback: async () => {
                try {
                    let response;
                    if (props.type === 'organization') {
                        response = await api.post(`organizations/${props.entityId}/leave`);
                    } else {
                        response = await api.post(`organizations/${props.organizationId}/teams/${props.entityId}/members/leave`);
                    }
                    
                    if (response.success) {
                        common.notification(`Successfully left the ${entityType}`, true);
                        popup.close();
                        popup.close(); // Close the member modal too
                        
                        if (props.type === 'organization') {
                            // Refresh user store and redirect
                            await userStore.init();
                            router.push('/organizations');
                        } else if (props.callback) {
                            props.callback();
                        }
                    } else {
                        common.notification(response.message || `Failed to leave ${entityType}`, false);
                    }
                } catch (error) {
                    console.error(`Failed to leave ${entityType}:`, error);
                    common.notification(`Failed to leave ${entityType}`, false);
                }
            }
        },
        {
            position: 'center'
        }
    );
}

// Send invitation
async function sendInvitation() {
    const emailValue = inviteEmail.value.trim();
    
    if (!emailValue) {
        common.notification('Please enter an email address', false);
        return;
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailValue)) {
        common.notification('Please enter a valid email address', false);
        return;
    }
    
    try {
        isLoading.value = true;
        
        let endpoint;
        if (props.type === 'organization') {
            endpoint = `organizations/${props.entityId}/members/invite`;
        } else {
            endpoint = `organizations/${props.organizationId}/teams/${props.entityId}/members/invite`;
        }
        
        const response = await api.post(endpoint, {
            email: emailValue,
            role: inviteRole.value
        });
        
        if (response.success) {
            common.notification('Invitation sent successfully', true);
            inviteEmail.value = '';
            inviteRole.value = 'member';
            showNoSeatsMessage.value = false;
            loadData();
            
            if (props.callback) {
                props.callback();
            }
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

// Update member role
async function updateMemberRole(member, newRole) {
    try {
        let endpoint;
        if (props.type === 'organization') {
            endpoint = `organizations/${props.entityId}/members/${member.id}`;
        } else {
            endpoint = `organizations/${props.organizationId}/teams/${props.entityId}/members/${member.id}`;
        }
        
        const response = await api.put(endpoint, { role: newRole });
        
        if (response.success) {
            common.notification('Role updated successfully', true);
            loadData();
        } else {
            common.notification('Failed to update role', false);
        }
    } catch (error) {
        console.error('Failed to update role:', error);
        common.notification('Failed to update role', false);
    }
}

// Open purchase seats modal
function openPurchaseSeats() {
    const orgId = props.type === 'organization' ? props.entityId : props.organizationId;
    
    // Close current modal
    popup.close();
    
    // Open purchase seats modal
    popup.open(
        'purchase-seats',
        null,
        PurchaseSeatsModal,
        {
            organizationId: orgId,
            recommendedSeats: Math.max(1, seatInfo.value.used - seatInfo.value.total + 1),
            callback: () => {
                // Reopen member modal after purchase
                popup.open(
                    'members-modal',
                    null,
                    MemberModal,
                    props
                );
            }
        },
        {
            position: 'center'
        }
    );
}

// Remove member
function removeMember(member) {
    const entityType = props.type === 'organization' ? 'organization' : 'team';
    
    popup.open(
        'remove-member-confirm',
        null,
        ConfirmComponent,
        {
            as: 'red',
            description: `Are you sure you want to remove "${member.user.name}" from this ${entityType}?`,
            callback: async () => {
                try {
                    let endpoint;
                    if (props.type === 'organization') {
                        endpoint = `organizations/${props.entityId}/members/${member.id}`;
                    } else {
                        endpoint = `organizations/${props.organizationId}/teams/${props.entityId}/members/${member.id}`;
                    }
                    
                    const response = await api.delete(endpoint);
                    
                    if (response.success) {
                        common.notification('Member removed successfully', true);
                        popup.close();
                        loadData();
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

// Delete invitation
async function deleteInvitation(invitation) {
    try {
        const response = await api.delete(`invitations/${invitation.id}`);
        
        if (response.success) {
            common.notification('Invitation cancelled', true);
            loadData();
        } else {
            common.notification('Failed to cancel invitation', false);
        }
    } catch (error) {
        console.error('Failed to cancel invitation:', error);
        common.notification('Failed to cancel invitation', false);
    }
}

// Get user initials
function getUserInitials(name) {
    return name
        .split(' ')
        .map(part => part[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
}

// Get status icon
function getStatusIcon(status) {
    switch (status) {
        case 'pending':
            return PhClock;
        case 'accepted':
            return PhCheck;
        case 'declined':
            return PhX;
        default:
            return PhClock;
    }
}

// Get status color
function getStatusColor(status) {
    switch (status) {
        case 'pending':
            return 'var(--warning)';
        case 'accepted':
            return 'var(--success)';
        case 'declined':
            return 'var(--danger)';
        default:
            return 'var(--text-secondary)';
    }
}
</script>

<template>
    <PopupLayout :title="modalTitle" customClass="h-auto member-modal">
        <template #content>
            <!-- Invite Form or No Seats Message (Admin Only) -->
            <div v-if="isAdmin" class="invite-section">
                <!-- No Seats Alert - Show immediately if no seats available -->
                <div v-if="seatInfo.available === 0" class="no-seats-alert">
                    <div class="alert-content">
                        <h4>No seats available</h4>
                        <p>Purchase additional seats to invite more members.</p>
                    </div>
                    <div class="alert-actions">
                        <ButtonComponent
                            @click="openPurchaseSeats"
                            as="primary"
                            :iconLeft="{ component: PhShoppingCart, weight: 'bold' }"
                            label="Buy More Seats"
                        />
                    </div>
                </div>
                
                <!-- Invite Form - Only show if seats are available -->
                <div v-else class="invite-form">
                    <div class="input-group">
                        <InputComponent
                            :value="inviteEmail"
                            placeholder="Enter email address"
                            type="email"
                            :iconLeft="{ component: PhEnvelopeSimple, weight: 'bold' }"
                            @onInput="(e, value) => inviteEmail = value"
                            @keyup.enter="sendInvitation"
                        />
                    </div>
                    <div class="select-group">
                        <SelectComponent
                            :value="inviteRole"
                            :options="roleOptions"
                            placeholder="Select role"
                            @change="(value) => inviteRole = value"
                        />
                    </div>
                    <div>
                        <ButtonComponent
                            :iconLeft="{ component: PhPaperPlaneTilt, weight: 'bold' }"
                            label="Invite"
                            :loading="isLoading"
                            @click="sendInvitation"
                            :disabled="!inviteEmail"
                        />
                    </div>
                </div>
            </div>
              
            <!-- Loading State -->
            <div v-if="isLoading && members.length === 0" class="loading-state">
                <PhArrowsClockwise :size="24" class="spin" />
                <span>Loading members...</span>
            </div>
            
            <!-- Content -->
            <div v-else>
                <!-- Search Input -->
                <div v-if="members.length > 5 || invitations.length > 5" class="search-section">
                    <InputComponent
                        :value="searchQuery"
                        placeholder="Search members or invitations..."
                        @onInput="(e, value) => searchQuery = value"
                    />
                </div>
                
                <!-- Pending Invitations -->
                <div v-if="filteredItems.invitations.length > 0" class="section">
                    <h3 class="section-title">PENDING INVITATIONS ({{ filteredItems.invitations.length }})</h3>
                    <div class="invitation-list">
                        <div 
                            v-for="invitation in filteredItems.invitations" 
                            :key="invitation.id"
                            class="invitation-item"
                        >
                            <div class="invitation-info">
                                <div class="invitation-email">{{ invitation.email }}</div>
                                <div class="invitation-meta">
                                    <component 
                                        :is="getStatusIcon(invitation.status)" 
                                        :size="14"
                                        :color="getStatusColor(invitation.status)"
                                    />
                                    <span :style="{ color: getStatusColor(invitation.status) }">
                                        {{ invitation.status }}
                                    </span>
                                    <span>•</span>
                                    <span class="invitation-role">{{ invitation.role }}</span>
                                </div>
                            </div>
                            <div v-if="isAdmin" class="invitation-actions">
                                <ButtonComponent
                                    as="tertiary icon size36"
                                    size="small"
                                    :iconLeft="{ component: PhX, weight: 'bold' }"
                                    @click="deleteInvitation(invitation)"
                                    v-tooltip="{ content: 'Cancel invitation' }"
                                />
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Current Members -->
                <div v-if="filteredItems.members.length > 0" class="section">
                    <h3 class="section-title">CURRENT MEMBERS ({{ filteredItems.members.length }})</h3>
                    <div class="member-list">
                        <div 
                            v-for="member in filteredItems.members" 
                            :key="member.id"
                            class="member-item"
                            :class="{ 'is-current-user': member.user.id === currentUserId }"
                        >
                            <div class="member-info">
                                <div class="member-avatar">{{ getUserInitials(member.user.name) }}</div>
                                <div class="member-details">
                                    <h4>
                                        {{ member.user.name }}
                                        <span v-if="member.user.id === currentUserId" class="you-badge">(You)</span>
                                    </h4>
                                    <p>{{ member.user.email }}</p>
                                </div>
                            </div>
                            <div class="member-role">
                                <div v-if="member.role === 'admin'" class="role-badge admin">
                                    <PhCrown :size="14" weight="bold" />
                                    <span>Admin</span>
                                    <span v-if="member.is_creator" class="creator-badge">(Creator)</span>
                                </div>
                                <div v-else class="role-badge member">
                                    <PhUser :size="14" weight="bold" />
                                    <span>Member</span>
                                </div>
                            </div>
                            <div v-if="isAdmin && member.user.id !== currentUserId && !member.is_creator" class="member-actions">
                                <ButtonComponent
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
                                                    label: 'Remove from ' + props.type,
                                                    iconComponent: PhTrash,
                                                    weight: 'bold',
                                                    onClick: () => removeMember(member)
                                                }
                                            ]
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
                
                <!-- Empty State -->
                <div v-if="!isLoading && filteredItems.members.length === 0 && filteredItems.invitations.length === 0" class="empty-state">
                    <p v-if="searchQuery">No results found for "{{ searchQuery }}"</p>
                    <p v-else>No members or pending invitations found.</p>
                </div>

                <!-- Leave Button -->
                <div v-if="members.length > 0" class="leave-section">
                    <ButtonComponent
                        :iconLeft="{ component: PhSignOut, weight: 'bold' }"
                        :label="`Leave ${props.type}`"
                        as="tertiary"
                        @click="leaveEntity"
                        v-tooltip="{ 
                            content: !canLeave ? 'You are the only admin. Assign another admin first.' : `Leave this ${props.type}` 
                        }"
                        :disabled="!canLeave"
                    />
                </div>
            </div>
        </template>
    </PopupLayout>
</template>

<style scoped>
.member-modal {
    max-width: 600px !important;
    min-width: 500px;
}

.invite-section {
    margin-bottom: 20px;
}

.leave-section {
    display: flex;
    justify-content: flex-end;
    margin-top: 20px;
    padding-top: 20px;
    border-top: 1px solid var(--border);
}

.invite-form {
    display: flex;
    gap: 10px;
    background: var(--background-1);
}

.input-group {
    flex: 1;
}

.select-group {
    width: 120px;
}

.search-section {
    margin-bottom: 20px;
}

.loading-state {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 40px;
    color: var(--text-secondary);
}

.spin {
    animation: spin 1s linear infinite;
}

@keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
}

.section {
    margin-bottom: 25px;
}

.section:last-child {
    margin-bottom: 0;
}

.section-title {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-secondary);
    margin-bottom: 12px;
    letter-spacing: 0.5px;
}

/* Invitation Styles */
.invitation-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.invitation-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px;
    background: var(--background-0);
    border: 1px solid var(--border);
    border-radius: 8px;
    transition: all 0.2s;
}

.invitation-item:hover {
    border-color: var(--border-hover);
}

.invitation-info {
    flex: 1;
}

.invitation-email {
    font-size: 14px;
    font-weight: 500;
    margin-bottom: 4px;
}

.invitation-meta {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: var(--text-secondary);
}

.invitation-role {
    text-transform: capitalize;
}

/* Member Styles */
.member-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.member-item {
    display: flex;
    align-items: center;
    padding: 12px;
    background: var(--background-0);
    border: 1px solid var(--border);
    border-radius: 8px;
    transition: all 0.2s;
}

.member-item:hover {
    border-color: var(--border-hover);
}

.member-item.is-current-user {
    background: var(--background-1);
}

.member-info {
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1;
}

.member-avatar {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: var(--brand-blue);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: 600;
    font-size: 13px;
    flex-shrink: 0;
}

.member-details h4 {
    margin: 0;
    font-size: 14px;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 6px;
}

.you-badge {
    font-size: 11px;
    color: var(--text-secondary);
    font-weight: 400;
}

.member-details p {
    margin: 2px 0 0 0;
    font-size: 13px;
    color: var(--text-secondary);
}

.member-role {
    margin-right: 8px;
}

.role-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    border-radius: 16px;
    font-size: 12px;
    font-weight: 500;
}

.role-badge.admin {
    background: var(--warning-light);
    color: var(--warning);
}

.role-badge.member {
    background: var(--background-2);
    color: var(--text-secondary);
}

.creator-badge {
    font-size: 11px;
    opacity: 0.8;
    margin-left: 4px;
}

.member-actions {
    display: flex;
    align-items: center;
}

.empty-state {
    text-align: center;
    padding: 40px;
    color: var(--text-secondary);
}

/* No Seats Alert */
.no-seats-alert {
background: var(--brand-yellow);
    border-radius: 6px;
    padding: 20px;
    text-align: center;
    display: flex;
    text-align: left;
    gap: 50px;
    align-items: center;
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
}

.no-seats-alert .alert-actions {
    display: flex;
    gap: 10px;
    justify-content: center;
}

/* Responsive */
@media (max-width: 600px) {
    .member-modal {
        min-width: unset;
        width: 90vw;
    }
    
    .invite-form {
        flex-direction: column;
    }
    
    .select-group {
        width: 100%;
    }
}
</style>