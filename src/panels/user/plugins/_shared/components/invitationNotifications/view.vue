<script setup>
import { ref, computed, onMounted } from 'vue';
import { api } from '@utils/api';
import { common } from '@utils/common';
import { UserStore } from '@stores/user';

import PopupLayout from '@layouts/popup/view.vue';
import ButtonComponent from '@form/button/view.vue';

import { 
    PhBell,
    PhCheck,
    PhX,
    PhUsers,
    PhBuildings
} from "@phosphor-icons/vue";

const userStore = UserStore();

// State
const invitations = ref([]);
const isLoading = ref(false);

// Computed
const invitationCount = computed(() => {
    return userStore.user?.pending_invitations_count || 0;
});

// Load pending invitations
async function loadInvitations() {
    try {
        isLoading.value = true;
        
        const response = await api.get('invitations/pending');
        
        if (response.success && response.data) {
            invitations.value = response.data;
        }
    } catch (error) {
        console.error('Failed to load invitations:', error);
    } finally {
        isLoading.value = false;
    }
}

// Accept invitation
// Accept invitation
async function acceptInvitation(invitation) {
    try {
        const response = await api.post(`invitations/${invitation.id}/accept`);
        
        if (response.success) {
            common.notification('Invitation accepted successfully', true);
            
            // Remove from list
            invitations.value = invitations.value.filter(inv => inv.id !== invitation.id);
            
            // Refresh user data to update organizations/teams
            const userResponse = await api.get('account/user');
            if (userResponse.success) {
                userStore.setData(userResponse.data);
            }
        } else {
            // Show the actual error message from the backend
            const errorMessage = response.message || 'Failed to accept invitation';
            common.notification(errorMessage, false);
            
            // If user is already a member, remove the invitation from the list
            if (errorMessage.toLowerCase().includes('already')) {
                // Remove from list
                invitations.value = invitations.value.filter(inv => inv.id !== invitation.id);
                
                // Update count in user store
                if (userStore.user && userStore.user.pending_invitations_count > 0) {
                    userStore.user.pending_invitations_count--;
                }
                
                // Refresh user data to ensure we have the latest state
                const userResponse = await api.get('account/user');
                if (userResponse.success) {
                    userStore.setData(userResponse.data);
                }
            }
        }
    } catch (error) {
        console.error('Failed to accept invitation:', error);
        // Check if error response has a message
        const errorMessage = error.response?.data?.message || error.message || 'Failed to accept invitation';
        common.notification(errorMessage, false);
    }
}


// Decline invitation
async function declineInvitation(invitation) {
    try {
        const response = await api.post(`invitations/${invitation.id}/decline`);
        
        if (response.success) {
            common.notification('Invitation declined', true);
            
            // Remove from list
            invitations.value = invitations.value.filter(inv => inv.id !== invitation.id);
            
            // Update count in user store
            if (userStore.user) {
                userStore.user.pending_invitations_count = invitations.value.length;
            }
        } else {
            common.notification('Failed to decline invitation', false);
        }
    } catch (error) {
        console.error('Failed to decline invitation:', error);
        common.notification('Failed to decline invitation', false);
    }
}

// Get icon for invitation type
function getInvitationIcon(invitation) {
    return invitation.team ? PhUsers : PhBuildings;
}

// Get invitation title
function getInvitationTitle(invitation) {
    if (invitation.team) {
        return `${invitation.organization.name} - ${invitation.team.name}`;
    }
    return invitation.organization.name;
}

onMounted(() => {
    loadInvitations();
});
</script>

<template>
    <PopupLayout title="Invitations" customClass="h-auto invitation-notifications">
        <template #content>
            <!-- Loading State -->
            <div v-if="isLoading" class="loading-state">
                <p>Loading invitations...</p>
            </div>
            
            <!-- Invitations List -->
            <div v-else-if="invitations.length > 0" class="invitations-list">
                <div 
                    v-for="invitation in invitations" 
                    :key="invitation.id"
                    class="invitation-card"
                >
                    <div class="invitation-icon">
                        <component :is="getInvitationIcon(invitation)" weight="bold" />
                    </div>
                    
                    <div class="invitation-content">
                        <h4>{{ getInvitationTitle(invitation) }}</h4>
                        <p class="invitation-meta">
                            Invited by {{ invitation.invited_by.name }}
                        </p>

                    </div>
                    
                    <div class="invitation-actions">
                        <ButtonComponent
                            as="primary"
                            size="small"
                            label="Accept"
                            :iconLeft="{ component: PhCheck, weight: 'bold' }"
                            @click="acceptInvitation(invitation)"
                        />
                        <ButtonComponent
                            as="tertiary"
                            size="small"
                            label="Decline"
                            :iconLeft="{ component: PhX, weight: 'bold' }"
                            @click="declineInvitation(invitation)"
                        />
                    </div>
                </div>
            </div>
            
            <!-- Empty State -->
            <div v-else class="empty-state">
                <PhBell size="48" weight="thin" />
                <p>No pending invitations</p>
            </div>
        </template>
    </PopupLayout>
</template>

<style scoped>
.invitation-notifications {
    width:100%;
    max-width: 560px !important;
}

.loading-state {
    text-align: center;
    padding: 40px;
    color: var(--text-secondary);
}

.invitations-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.invitation-card {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 16px;
    background: var(--background-0);
    border: 1px solid var(--border);
    border-radius: 8px;
}

.invitation-icon {
    width: 40px;
    height: 40px;
    border-radius: 8px;
    background: var(--background-2);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-secondary);
    flex-shrink: 0;
}

.invitation-content {
    flex: 1;
}

.invitation-content h4 {
    margin: 0 0 4px 0;
    font-size: 15px;
    font-weight: 600;
    color: var(--text-primary);
}

.invitation-meta {
    margin: 0 0 4px 0;
    font-size: 13px;
    color: var(--text-secondary);
}

.invitation-time {
    margin: 0;
    font-size: 12px;
    color: var(--text-tertiary);
}

.invitation-actions {
    display: flex;
    gap: 8px;
    flex-shrink: 0;
}

.empty-state {
    text-align: center;
    padding: 60px 20px;
    color: var(--text-secondary);
    display: flex;
    justify-content: center;
    flex-direction: column;
    align-items: center;
}

.empty-state svg {
    margin-bottom: 16px;
    opacity: 0.5;
}

.empty-state p {
    margin: 0;
    font-size: 16px;
}
</style>