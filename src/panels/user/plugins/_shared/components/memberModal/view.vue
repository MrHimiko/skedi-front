<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { api } from '@utils/api';
import { common } from '@utils/common';

import PopupLayout from '@layouts/popup/view.vue';
import InputComponent from '@form/input/view.vue';
import SelectComponent from '@form/select/view.vue';
import ButtonComponent from '@form/button/view.vue';

import { 
    PhEnvelopeSimple, 
    PhPaperPlaneTilt,
    PhClock,
    PhCheck,
    PhX,
    PhArrowsClockwise
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

// State
const email = ref('');
const role = ref('member');
const isLoading = ref(false);
const members = ref([]);
const invitations = ref([]);
const searchQuery = ref('');

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

// Send invitation
async function sendInvitation() {

    console.log("WTF", email, email.value);

    if (!email.value || !email.value.includes('@')) {
        common.notification('Please enter a valid email address', false);
        return;
    }
    
    try {
        isLoading.value = true;
        
        const data = {
            email: email.value,
            role: role.value,
            organization_id: props.type === 'organization' ? props.entityId : props.organizationId
        };
        
        if (props.type === 'team') {
            data.team_id = props.entityId;
        }
        
        const response = await api.post('invitations/send', data);
        
        if (response.success) {
            common.notification('Invitation sent successfully', true);
            email.value = '';
            role.value = 'member';
            
            // Reload invitations
            loadData();
            
            // Call callback if provided
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

onMounted(() => {
    loadData();
});
</script>

<template>
    <PopupLayout :title="modalTitle" customClass="h-auto member-modal">
        <template #content>
            <!-- Invite Form -->
            <div class="invite-form">
                <div class="input-group">
                    <InputComponent
                        :value="email"
                        placeholder="Enter email address"
                        type="email"
                        :iconLeft="{ component: PhEnvelopeSimple, weight: 'bold' }"
                        @onInput="(event, value) => email = value"
                        @keyup.enter="sendInvitation"
                    />
                </div>
                <div class="select-group">
                    <SelectComponent
                        :value="role"
                        :options="roleOptions"
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
            
            <!-- Search -->
            <div class="search-section" style="display:none">
                <InputComponent
                    v-model="searchQuery"
                    placeholder="Search members and invitations..."
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
                            <component :is="getStatusIcon(invitation.status)" class="status-icon" weight="bold" />
                            <div>
                                <div class="invitation-email">{{ invitation.email }}</div>

                            </div>
                        </div>
                        <div class="invitation-actions">
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
                        <span class="role-badge" :class="member.role">{{ member.role }}</span>
                    </div>
                </div>
            </div>
            
            <!-- Empty State -->
            <div v-if="!isLoading && filteredItems.members.length === 0 && filteredItems.invitations.length === 0" class="empty-state">
                <p>No members or pending invitations found.</p>
            </div>
        </template>
    </PopupLayout>
</template>

<style scoped>
.member-modal {
    max-width: 600px !important;
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

.section {
    margin-bottom: 30px;
}

.section-title {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-secondary);
    margin-bottom: 12px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

/* Invitations */
.invitation-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px;
    background: var(--background-0);
    border: 1px solid var(--border);
    border-radius: 8px;
    margin-bottom: 8px;
}

.invitation-info {
    display: flex;
    align-items: center;
    gap: 12px;
}

.status-icon {
    color: var(--text-secondary);
    width: 16px;
    height: 16px;
}

.invitation-email {
    font-size: 14px;
    font-weight: 500;
    color: var(--text-primary);
}

.invitation-meta {
    font-size: 12px;
    color: var(--text-secondary);
    margin-top: 2px;
}

.invitation-actions {
    display: flex;
    gap: 8px;
}

/* Members */
.member-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px;
    border-bottom: 1px solid var(--border);
}

.member-item:last-child {
    border-bottom: none;
}

.member-info {
    display: flex;
    align-items: center;
    gap: 12px;
}

.member-avatar {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: var(--black);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 14px;
}

.member-details h4 {
    margin: 0;
    font-size: 14px;
    font-weight: 500;
    color: var(--text-primary);
}

.member-details p {
    margin: 2px 0 0 0;
    font-size: 12px;
    color: var(--text-secondary);
}

.role-badge {
    padding: 4px 12px;
    background: var(--background-2);
    color: var(--text-secondary);
    border-radius: 4px;
    font-size: 12px;
    font-weight: 500;
    text-transform: capitalize;
}

.role-badge.admin {
    background: rgb(0 67 255 / 7%);
    color: rgb(0 67 255);
}

.empty-state {
    text-align: center;
    padding: 40px;
    color: var(--text-secondary);
}
</style>