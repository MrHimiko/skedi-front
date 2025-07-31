<script setup>
import { ref, computed, onMounted, watch } from 'vue';
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
    PhSignOut
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
const email = ref('');
const role = ref('member');
const isLoading = ref(false);
const members = ref([]);
const invitations = ref([]);
const searchQuery = ref('');
const currentUserId = computed(() => userStore.getId());
const isAdmin = ref(false);

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
        const response = await api.get(`organizations/${props.organizationId}/teams/${props.entityId}`);
        if (response.success && response.data) {
            isAdmin.value = response.data.effective_role === 'admin';
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
            members.value = membersResponse.data || [];
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

    console.log("EMAILK", email);

    if (!email.value || !email.value.includes('@')) {
        common.notification('Please enter a valid email address', false);
        return;
    }
    
    try {
        isLoading.value = true;
        
        let endpoint;
        let data = {
            email: email.value,
            role: role.value
        };
        
        if (props.type === 'organization') {
            endpoint = `organizations/${props.entityId}/members/invite`;
        } else {
            endpoint = `organizations/${props.organizationId}/teams/${props.entityId}/members/invite`;
        }
        
        const response = await api.post(endpoint, data);
        
        if (response.success) {
            common.notification('Invitation sent successfully', true);
            email.value = '';
            role.value = 'member';
            loadData();
            
            if (props.callback) {
                props.callback();
            }
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
                        common.notification('Failed to remove member', false);
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
</script>

<template>
    <PopupLayout :title="modalTitle" customClass="h-auto member-modal">
        <template #content>
            
            
            <!-- Invite Form (Admin Only) -->
            <div v-if="isAdmin" class="invite-form">
                <div class="input-group">
                    <InputComponent
                        :value="email"
                        placeholder="Enter email address"
                        type="email"
                        :iconLeft="{ component: PhEnvelopeSimple, weight: 'bold' }"
                        @onInput="(e, value) => email = value"
                    />
                </div>
                <div class="select-group">
                    <SelectComponent
                        :value="role"
                        :options="roleOptions"
                        placeholder="Select role"
                        @change="(value) => role = value"
                    />
                </div>
                <div>
                    <ButtonComponent
                        :iconLeft="{ component: PhPaperPlaneTilt, weight: 'bold' }"
                        label="Invite"
                        :loading="isLoading"
                        @click="sendInvitation"
                    />
                </div>
            </div>
              
            <!-- Loading State -->
            <div v-if="isLoading" class="loading-state">
                <PhArrowsClockwise :size="24" class="spin" />
                <span>Loading members...</span>
            </div>
            
            <!-- Content -->
            <div v-else>
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
                                    <component :is="getStatusIcon(invitation.status)" :size="14" />
                                    <span>{{ invitation.status }}</span>
                                    <span>•</span>
                                    <span>{{ invitation.role }}</span>
                                </div>
                            </div>
                            <div v-if="isAdmin" class="invitation-actions">
                                <ButtonComponent
                                    as="tertiary icon size36"
                                    size="small"
                                    :iconLeft="{ component: PhX, weight: 'bold' }"
                                    @click="deleteInvitation(invitation)"
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
                        >
                            <div class="member-info">
                                <div class="member-avatar">{{ getUserInitials(member.user.name) }}</div>
                                <div class="member-details">
                                    <h4>{{ member.user.name }}</h4>
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
                    <p>No members or pending invitations found.</p>
                </div>

                <!-- Leave Button -->
                <div class="leave-section">
                    <ButtonComponent
                        :iconLeft="{ component: PhSignOut, weight: 'bold' }"
                        :label="`Leave ${type}`"
                        as="tertiary"
                        @click="leaveEntity"
                        v-tooltip="{ 
                            content: !canLeave ? 'You are the only admin. Assign another admin first.' : `Leave this ${type}` 
                        }"
                        :style="{ opacity: !canLeave ? 0.5 : 1 }"
                    />
                </div>


            </div>
        </template>
    </PopupLayout>
</template>

<style scoped>
.member-modal {
    max-width: 600px !important;
}

.leave-section {
    display: flex;
    justify-content: flex-end;
}

.invite-form {
    display: flex;
    gap: 10px;
    background: var(--background-1);
    border-radius: 8px;
    margin-bottom: 20px;
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
    margin-bottom: 30px;
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
}

.member-details h4 {
    margin: 0;
    font-size: 14px;
    font-weight: 500;
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
</style>