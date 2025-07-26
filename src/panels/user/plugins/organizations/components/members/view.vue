<script setup>
import { ref, computed, onMounted } from 'vue';
import { api } from '@utils/api';
import { common } from '@utils/common';
import { popup } from '@utils/popup';
import { UserStore } from '@stores/user';
import { useRouter } from 'vue-router';

import ButtonComponent from '@form/button/view.vue';
import InputComponent from '@form/input/view.vue';
import SelectComponent from '@form/select/view.vue';
import ConfirmComponent from '@floated/confirm/view.vue';
import MenusComponent from '@global/menus/view.vue';

import { 
    PhUserPlus, 
    PhEnvelopeSimple, 
    PhDotsThree, 
    PhTrash,
    PhCrown,
    PhUser,
    PhMagnifyingGlass,
    PhPaperPlaneTilt,
    PhSignOut
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
const router = useRouter();

// State
const members = ref([]);
const isLoading = ref(true);
const searchQuery = ref('');
const inviteEmail = ref('');
const isInviting = ref(false);

// Get current user ID
const currentUserId = computed(() => userStore.getId());

// Check if current user can leave
const canLeave = computed(() => {
    if (!props.isAdmin) return true;
    
    // Count other admins
    const otherAdmins = members.value.filter(member => 
        member.role === 'admin' && member.user.id !== currentUserId.value
    );
    
    return otherAdmins.length > 0;
});

// Computed
const filteredMembers = computed(() => {
    if (!searchQuery.value) return members.value;
    
    const query = searchQuery.value.toLowerCase();
    return members.value.filter(member => 
        member.user.name.toLowerCase().includes(query) ||
        member.user.email.toLowerCase().includes(query)
    );
});

// Load organization members
async function loadMembers() {
    try {
        isLoading.value = true;
        const response = await api.get(`organizations/${props.organizationId}/members`);
        
        if (response.success && response.data) {
            members.value = response.data;
        }
    } catch (error) {
        console.error('Failed to load members:', error);
        common.notification('Failed to load members', false);
    } finally {
        isLoading.value = false;
    }
}

// Leave organization
async function leaveOrganization() {
    const warningMessage = !canLeave.value 
        ? 'You are the only admin of this organization. Please assign another admin before leaving.'
        : `Are you sure you want to leave "${props.organization.name}"?`;
    
    if (!canLeave.value) {
        common.notification(warningMessage, false);
        return;
    }
    
    popup.open(
        'leave-organization-confirm',
        null,
        ConfirmComponent,
        {
            as: 'red',
            description: warningMessage,
            callback: async () => {
                try {
                    const response = await api.post(`organizations/${props.organizationId}/leave`);
                    
                    if (response.success) {
                        common.notification('Successfully left the organization', true);
                        popup.close();
                        
                        // Refresh user store and redirect
                        await userStore.init();
                        router.push('/organizations');
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

// Invite member by email
async function inviteMember() {
    if (!inviteEmail.value || !inviteEmail.value.includes('@')) {
        common.notification('Please enter a valid email address', false);
        return;
    }
    
    try {
        isInviting.value = true;
        
        const response = await api.post(`organizations/${props.organizationId}/members/invite`, {
            email: inviteEmail.value,
            role: 'member' // Default role
        });
        
        if (response.success) {
            common.notification('Invitation sent successfully', true);
            inviteEmail.value = '';
            loadMembers();
        } else {
            common.notification(response.message || 'Failed to send invitation', false);
        }
    } catch (error) {
        console.error('Failed to invite member:', error);
        common.notification('Failed to send invitation', false);
    } finally {
        isInviting.value = false;
    }
}

// Update member role
async function updateMemberRole(member, newRole) {
    try {
        const response = await api.put(`organizations/${props.organizationId}/members/${member.id}`, {
            role: newRole
        });
        
        if (response.success) {
            common.notification('Role updated successfully', true);
            loadMembers();
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
    popup.open(
        'remove-member-confirm',
        null,
        ConfirmComponent,
        {
            as: 'red',
            description: `Are you sure you want to remove "${member.user.name}" from this organization?`,
            callback: async () => {
                try {
                    const response = await api.delete(`organizations/${props.organizationId}/members/${member.id}`);
                    
                    if (response.success) {
                        common.notification('Member removed successfully', true);
                        popup.close();
                        loadMembers();
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

// Get user initials
function getUserInitials(name) {
    return name
        .split(' ')
        .map(part => part[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
}

onMounted(() => {
    loadMembers();
});
</script>

<template>
    <div class="org-members">
        <!-- Leave Organization Button -->
        <div class="action-section">
            <ButtonComponent
                :iconLeft="{ component: PhSignOut, weight: 'bold' }"
                label="Leave Organization"
                as="tertiary"
                @click="leaveOrganization"
                v-tooltip="{ 
                    content: !canLeave ? 'You are the only admin. Assign another admin first.' : 'Leave this organization' 
                }"
            />
        </div>
        
        <!-- Invite Section -->
        <div v-if="isAdmin" class="invite-section">
            <h3>Invite New Member</h3>
            <div class="invite-form">
                <InputComponent
                    v-model="inviteEmail"
                    placeholder="Enter email address to invite"
                    type="email"
                    :iconLeft="{ component: PhEnvelopeSimple, weight: 'bold' }"
                    @onInput="(e, value) => inviteEmail = value"
                />
                <div>
                    <ButtonComponent
                        :iconLeft="{ component: PhPaperPlaneTilt, weight: 'bold' }"
                        label="Send Invite"
                        :loading="isInviting"
                        @click="inviteMember"
                    />
                </div>
            </div>
        </div>
        
        <!-- Search Section -->
        <div class="search-section">
            <InputComponent
                v-model="searchQuery"
                placeholder="Search members..."
                :iconLeft="{ component: PhMagnifyingGlass, weight: 'bold' }"
            />
        </div>
        
        <!-- Members List -->
        <div v-if="isLoading" class="loading-state">
            Loading members...
        </div>
        
        <div v-else-if="filteredMembers.length === 0" class="empty-state">
            <p v-if="searchQuery">No members found matching "{{ searchQuery }}"</p>
            <p v-else>No members in this organization yet</p>
        </div>
        
        <div v-else class="members-list">
            <div 
                v-for="member in filteredMembers" 
                :key="member.id"
                class="member-item"
            >
                <div class="member-info">
                    <div class="member-avatar">
                        <span>{{ getUserInitials(member.user.name) }}</span>
                    </div>
                    <div class="member-details">
                        <h4>{{ member.user.name }}</h4>
                        <p>{{ member.user.email }}</p>
                    </div>
                </div>
                
                <div class="member-role">
                    <div v-if="member.role === 'admin'" class="role-badge admin">
                        <PhCrown :size="16" weight="bold" />
                        <span>Admin</span>
                        <span v-if="member.is_creator" class="creator-badge">(Creator)</span>
                    </div>
                    <div v-else class="role-badge member">
                        <PhUser :size="16" weight="bold" />
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
                                        label: 'Remove from Organization',
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
</template>

<style scoped>
.org-members {
    max-width: 800px;
}

/* Action Section */
.action-section {
    margin-bottom: 24px;
    display: flex;
    justify-content: flex-end;
}

/* Invite Section */
.invite-section {
    margin-bottom: 32px;
    padding: 20px;
    background: var(--background-1);
    border-radius: 8px;
    border: 1px solid var(--border);
}

.invite-section h3 {
    margin: 0 0 16px 0;
    font-size: 16px;
    font-weight: 600;
}

.invite-form {
    display: flex;
    gap: 12px;
}

.invite-form .c-input {
    flex: 1;
}

/* Search Section */
.search-section {
    margin-bottom: 24px;
}

/* Loading & Empty States */
.loading-state,
.empty-state {
    text-align: center;
    padding: 40px;
    color: var(--text-secondary);
}

/* Members List */
.members-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.member-item {
    display: flex;
    align-items: center;
    padding: 16px;
    background: var(--background-1);
    border: 1px solid var(--border);
    border-radius: 8px;
    transition: all 0.2s;
}

.member-item:hover {
    border-color: var(--border-hover);
}

/* Member Info */
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
    background: var(--brand-primary);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: 600;
    font-size: 14px;
}

.member-details h4 {
    margin: 0;
    font-size: 15px;
    font-weight: 600;
}

.member-details p {
    margin: 4px 0 0 0;
    font-size: 14px;
    color: var(--text-secondary);
}

/* Member Role */
.member-role {
    margin-right: 16px;
}

.role-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: 20px;
    font-size: 13px;
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

/* Member Actions */
.member-actions {
    display: flex;
    align-items: center;
}
</style>