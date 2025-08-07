<template>
    <div class="members-container">
        <!-- Seat Usage Header -->
        <div class="seat-info-card">
            <div class="seat-info-header">
                <h3>Organization Seats</h3>
                <div class="seat-usage">
                    <span class="seat-count">{{ seats.used }}/{{ seats.total }}</span>
                    <span class="seat-label">seats used</span>
                </div>
            </div>
            
            <div class="seat-details">
                <div class="seat-breakdown">
                    <div class="breakdown-item">
                        <span class="breakdown-label">Current members:</span>
                        <span class="breakdown-value">{{ seats.current_members }}</span>
                    </div>
                    <div class="breakdown-item" v-if="seats.pending_invitations > 0">
                        <span class="breakdown-label">Pending invitations:</span>
                        <span class="breakdown-value">{{ seats.pending_invitations }}</span>
                    </div>
                    <div class="breakdown-item">
                        <span class="breakdown-label">Available seats:</span>
                        <span class="breakdown-value" :class="{ 'text-red': seats.available === 0 }">
                            {{ seats.available }}
                        </span>
                    </div>
                </div>
                
                <div class="seat-actions" v-if="userRole === 'admin'">
                    <button 
                        v-if="seats.needs_seats || seats.available === 0"
                        @click="openPurchaseSeats"
                        class="btn btn-primary"
                    >
                        <i class="fas fa-plus"></i> Buy More Seats
                    </button>
                </div>
            </div>
            
            <div v-if="!compliance.is_compliant" class="compliance-warning">
                <i class="fas fa-exclamation-triangle"></i>
                <span>Your organization has {{ compliance.overage_count }} more members than available seats. 
                      Please purchase {{ compliance.required_additional_seats }} additional seats to remain compliant.</span>
            </div>
        </div>

        <!-- Members List Header -->
        <div class="members-header">
            <h2>Organization Members</h2>
            <div class="header-actions">
                <div v-if="showNoSeatsMessage && userRole === 'admin'" class="no-seats-alert">
                    <div class="alert-content">
                        <i class="fas fa-exclamation-circle"></i>
                        <span>Your organization has reached its seat limit ({{ seats.total }} seats).</span>
                    </div>
                    <button @click="openPurchaseSeats" class="btn btn-primary btn-sm">
                        <i class="fas fa-plus"></i> Buy More Seats
                    </button>
                </div>
                
                <div v-else-if="userRole === 'admin'" class="invite-form">
                    <input
                        v-model="inviteEmail"
                        type="email"
                        placeholder="Enter email to invite"
                        class="invite-input"
                        @keyup.enter="inviteMember"
                    />
                    <button 
                        @click="inviteMember"
                        class="btn btn-primary"
                        :disabled="!inviteEmail || isInviting"
                    >
                        <span v-if="isInviting">
                            <i class="fas fa-spinner fa-spin"></i> Inviting...
                        </span>
                        <span v-else>
                            <i class="fas fa-paper-plane"></i> Send Invite
                        </span>
                    </button>
                </div>
            </div>
        </div>

        <!-- Members List -->
        <div class="members-list">
            <div v-if="loading" class="loading-state">
                <i class="fas fa-spinner fa-spin"></i> Loading members...
            </div>
            
            <div v-else-if="members.length === 0" class="empty-state">
                <i class="fas fa-users"></i>
                <p>No members yet. Start by inviting team members!</p>
            </div>
            
            <div v-else class="members-grid">
                <div v-for="member in members" :key="member.id" class="member-card">
                    <div class="member-info">
                        <div class="member-avatar">
                            {{ getInitials(member.user.name) }}
                        </div>
                        <div class="member-details">
                            <h4>{{ member.user.name }}</h4>
                            <p>{{ member.user.email }}</p>
                            <span class="member-joined">Joined {{ formatDate(member.joined) }}</span>
                        </div>
                    </div>
                    
                    <div class="member-actions">
                        <div class="member-role">
                            <span v-if="member.is_creator" class="role-badge creator">
                                <i class="fas fa-crown"></i> Creator
                            </span>
                            <select 
                                v-else-if="userRole === 'admin' && !member.is_creator"
                                v-model="member.role"
                                @change="updateMemberRole(member, $event.target.value)"
                                class="role-select"
                            >
                                <option value="member">Member</option>
                                <option value="admin">Admin</option>
                            </select>
                            <span v-else class="role-badge" :class="member.role">
                                {{ member.role === 'admin' ? 'Admin' : 'Member' }}
                            </span>
                        </div>
                        
                        <button 
                            v-if="userRole === 'admin' && !member.is_creator && member.user.id !== currentUserId"
                            @click="removeMember(member)"
                            class="btn btn-danger btn-sm"
                            title="Remove member"
                        >
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Purchase Seats Modal -->
        <teleport to="body">
            <div v-if="showPurchaseModal" class="modal-overlay" @click="closePurchaseModal">
                <div class="modal-content" @click.stop>
                    <div class="modal-header">
                        <h3>Purchase Additional Seats</h3>
                        <button @click="closePurchaseModal" class="modal-close">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <div class="modal-body">
                        <div class="purchase-info">
                            <p>Add more seats to your organization to invite additional team members.</p>
                            <div class="price-info">
                                <i class="fas fa-tag"></i>
                                <span>$9 per seat / month</span>
                            </div>
                        </div>
                        
                        <div class="seat-selector">
                            <label>Number of seats to add:</label>
                            <div class="seat-controls">
                                <button @click="decrementSeats" :disabled="seatsToAdd <= 1" class="btn btn-sm">
                                    <i class="fas fa-minus"></i>
                                </button>
                                <input 
                                    v-model.number="seatsToAdd" 
                                    type="number" 
                                    min="1" 
                                    max="100"
                                    class="seat-input"
                                />
                                <button @click="incrementSeats" :disabled="seatsToAdd >= 100" class="btn btn-sm">
                                    <i class="fas fa-plus"></i>
                                </button>
                            </div>
                        </div>
                        
                        <div class="purchase-summary">
                            <div class="summary-item">
                                <span>Additional seats:</span>
                                <span>{{ seatsToAdd }}</span>
                            </div>
                            <div class="summary-item">
                                <span>Price per seat:</span>
                                <span>$9/month</span>
                            </div>
                            <div class="summary-divider"></div>
                            <div class="summary-item total">
                                <span>Total additional cost:</span>
                                <span>${{ seatsToAdd * 9 }}/month</span>
                            </div>
                        </div>
                        
                        <div class="modal-actions">
                            <button @click="closePurchaseModal" class="btn btn-secondary">
                                Cancel
                            </button>
                            <button 
                                @click="purchaseSeats" 
                                class="btn btn-primary"
                                :disabled="isPurchasing"
                            >
                                <span v-if="isPurchasing">
                                    <i class="fas fa-spinner fa-spin"></i> Processing...
                                </span>
                                <span v-else>
                                    <i class="fas fa-credit-card"></i> Purchase Seats
                                </span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </teleport>
    </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue';
import { api } from '@utils/api';
import { common } from '@utils/common';
import { popup } from '@utils/popup';
import ConfirmComponent from '@floated/confirm/view.vue';

export default {
    props: {
        organizationId: {
            type: Number,
            required: true
        },
        userRole: {
            type: String,
            default: 'member'
        },
        currentUserId: {
            type: Number,
            required: true
        }
    },
    
    setup(props) {
        // State
        const members = ref([]);
        const loading = ref(false);
        const inviteEmail = ref('');
        const isInviting = ref(false);
        const showNoSeatsMessage = ref(false);
        const seats = ref({
            total: 1,
            used: 0,
            current_members: 0,
            pending_invitations: 0,
            available: 1,
            needs_seats: false,
            has_subscription: false
        });
        const compliance = ref({
            is_compliant: true,
            overage_count: 0,
            required_additional_seats: 0
        });
        
        // Purchase modal state
        const showPurchaseModal = ref(false);
        const seatsToAdd = ref(1);
        const isPurchasing = ref(false);

        // Load members and seat info
        async function loadMembers() {
            try {
                loading.value = true;
                
                // Get members with seat info
                const response = await api.get(`organizations/${props.organizationId}/members`);
                
                if (response.success) {
                    members.value = response.data.members || [];
                    if (response.data.seats) {
                        seats.value = response.data.seats;
                    }
                }
                
                // Get compliance info
                const seatResponse = await api.get(`organizations/${props.organizationId}/seats`);
                if (seatResponse.success) {
                    compliance.value = seatResponse.data.compliance || compliance.value;
                }
            } catch (error) {
                console.error('Failed to load members:', error);
                common.notification('Failed to load members', false);
            } finally {
                loading.value = false;
            }
        }

        // Invite member
        async function inviteMember() {
            if (!inviteEmail.value) {
                common.notification('Please enter an email address', false);
                return;
            }
            
            // Check seats availability first
            if (seats.value.available === 0) {
                showNoSeatsMessage.value = true;
                common.notification(`No seats available. Your organization is using all ${seats.value.total} seats.`, false);
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
                    showNoSeatsMessage.value = false;
                    loadMembers();
                } else {
                    if (response.data?.requires_purchase) {
                        // No seats available - show purchase UI
                        showNoSeatsMessage.value = true;
                        common.notification(response.message || 'No seats available', false);
                    } else {
                        common.notification(response.message || 'Failed to send invitation', false);
                    }
                }
            } catch (error) {
                console.error('Failed to invite member:', error);
                common.notification('Failed to send invitation', false);
            } finally {
                isInviting.value = false;
            }
        }

        // Purchase seats
        function openPurchaseSeats() {
            // Calculate recommended seats
            if (compliance.value.required_additional_seats > 0) {
                seatsToAdd.value = compliance.value.required_additional_seats;
            } else {
                seatsToAdd.value = 1;
            }
            showPurchaseModal.value = true;
        }

        function closePurchaseModal() {
            showPurchaseModal.value = false;
            seatsToAdd.value = 1;
            // Reset the no seats message when closing modal
            showNoSeatsMessage.value = false;
        }

        function incrementSeats() {
            if (seatsToAdd.value < 100) {
                seatsToAdd.value++;
            }
        }

        function decrementSeats() {
            if (seatsToAdd.value > 1) {
                seatsToAdd.value--;
            }
        }

        async function purchaseSeats() {
            try {
                isPurchasing.value = true;
                
                const response = await api.post(`organizations/${props.organizationId}/seats`, {
                    seats: seatsToAdd.value
                });
                
                if (response.success) {
                    if (response.data.checkout_url) {
                        // Redirect to Stripe checkout
                        window.location.href = response.data.checkout_url;
                    } else {
                        // Seats added successfully
                        common.notification(`Successfully added ${seatsToAdd.value} seats`, true);
                        closePurchaseModal();
                        loadMembers();
                    }
                } else {
                    common.notification(response.message || 'Failed to purchase seats', false);
                }
            } catch (error) {
                console.error('Failed to purchase seats:', error);
                common.notification('Failed to purchase seats', false);
            } finally {
                isPurchasing.value = false;
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
                    // Revert the change
                    loadMembers();
                }
            } catch (error) {
                console.error('Failed to update role:', error);
                common.notification('Failed to update role', false);
                loadMembers();
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
                    description: `Are you sure you want to remove ${member.user.name} from the organization?`,
                    action: 'Remove',
                    callback: async () => {
                        try {
                            const response = await api.delete(
                                `organizations/${props.organizationId}/members/${member.id}`
                            );
                            
                            if (response.success) {
                                common.notification('Member removed successfully', true);
                                loadMembers();
                            } else {
                                common.notification('Failed to remove member', false);
                            }
                        } catch (error) {
                            console.error('Failed to remove member:', error);
                            common.notification('Failed to remove member', false);
                        }
                    }
                }
            );
        }

        // Utility functions
        function getInitials(name) {
            return name
                .split(' ')
                .map(part => part[0])
                .join('')
                .toUpperCase()
                .slice(0, 2);
        }

        function formatDate(dateString) {
            const date = new Date(dateString);
            const now = new Date();
            const diff = now - date;
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            
            if (days === 0) return 'today';
            if (days === 1) return 'yesterday';
            if (days < 30) return `${days} days ago`;
            if (days < 365) return `${Math.floor(days / 30)} months ago`;
            return `${Math.floor(days / 365)} years ago`;
        }

        onMounted(() => {
            loadMembers();
        });

        return {
            // State
            members,
            loading,
            inviteEmail,
            isInviting,
            showNoSeatsMessage,
            seats,
            compliance,
            showPurchaseModal,
            seatsToAdd,
            isPurchasing,
            
            // Methods
            loadMembers,
            inviteMember,
            updateMemberRole,
            removeMember,
            openPurchaseSeats,
            closePurchaseModal,
            incrementSeats,
            decrementSeats,
            purchaseSeats,
            getInitials,
            formatDate
        };
    }
};
</script>

<style scoped>
.members-container {
    padding: 20px;
}

/* Seat Info Card */
.seat-info-card {
    background: #f8f9fa;
    border: 1px solid #e9ecef;
    border-radius: 8px;
    padding: 20px;
    margin-bottom: 30px;
}

.seat-info-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
}

.seat-info-header h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
}

.seat-usage {
    text-align: right;
}

.seat-count {
    font-size: 24px;
    font-weight: 700;
    color: #2c3e50;
}

.seat-label {
    display: block;
    font-size: 12px;
    color: #6c757d;
    margin-top: 4px;
}

.seat-details {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.seat-breakdown {
    display: flex;
    gap: 30px;
}

.breakdown-item {
    display: flex;
    flex-direction: column;
}

.breakdown-label {
    font-size: 12px;
    color: #6c757d;
    margin-bottom: 4px;
}

.breakdown-value {
    font-size: 16px;
    font-weight: 600;
    color: #2c3e50;
}

.breakdown-value.text-red {
    color: #dc3545;
}

.compliance-warning {
    background: #fff3cd;
    border: 1px solid #ffeeba;
    color: #856404;
    padding: 12px;
    border-radius: 4px;
    margin-top: 15px;
    display: flex;
    align-items: center;
    gap: 10px;
}

.compliance-warning i {
    color: #f0ad4e;
}

/* Members Header */
.members-header {
    margin-bottom: 25px;
}

.members-header h2 {
    margin: 0 0 20px 0;
    font-size: 24px;
    font-weight: 600;
}

.header-actions {
    display: flex;
    flex-direction: column;
    gap: 15px;
}

.invite-form {
    display: flex;
    gap: 10px;
}

.invite-input {
    flex: 1;
    padding: 10px 15px;
    border: 1px solid #ced4da;
    border-radius: 4px;
    font-size: 14px;
}

.invite-input:disabled {
    background-color: #e9ecef;
    cursor: not-allowed;
}

.no-seats-alert {
    background: #fff3cd;
    border: 1px solid #ffeeba;
    border-radius: 4px;
    padding: 12px 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 15px;
    width: 100%;
}

.no-seats-alert .alert-content {
    display: flex;
    align-items: center;
    gap: 10px;
    color: #856404;
}

.no-seats-alert .alert-content i {
    color: #f0ad4e;
    font-size: 16px;
}

.no-seats-message {
    background: #f8d7da;
    color: #721c24;
    padding: 10px 15px;
    border-radius: 4px;
    font-size: 14px;
}

.no-seats-message a {
    color: #721c24;
    font-weight: 600;
}

/* Members List */
.members-grid {
    display: grid;
    gap: 15px;
}

.member-card {
    background: white;
    border: 1px solid #e9ecef;
    border-radius: 8px;
    padding: 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.member-info {
    display: flex;
    align-items: center;
    gap: 15px;
}

.member-avatar {
    width: 48px;
    height: 48px;
    background: #007bff;
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 18px;
}

.member-details h4 {
    margin: 0 0 4px 0;
    font-size: 16px;
    font-weight: 600;
}

.member-details p {
    margin: 0 0 4px 0;
    color: #6c757d;
    font-size: 14px;
}

.member-joined {
    font-size: 12px;
    color: #adb5bd;
}

.member-actions {
    display: flex;
    align-items: center;
    gap: 15px;
}

.role-badge {
    padding: 4px 12px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 500;
}

.role-badge.creator {
    background: #ffeaa7;
    color: #d63031;
}

.role-badge.admin {
    background: #e3f2fd;
    color: #1976d2;
}

.role-badge.member {
    background: #f5f5f5;
    color: #616161;
}

.role-select {
    padding: 6px 12px;
    border: 1px solid #ced4da;
    border-radius: 4px;
    font-size: 14px;
    cursor: pointer;
}

/* Modal Styles */
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
}

.modal-content {
    background: white;
    border-radius: 8px;
    width: 90%;
    max-width: 500px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.modal-header {
    padding: 20px;
    border-bottom: 1px solid #e9ecef;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.modal-header h3 {
    margin: 0;
    font-size: 20px;
    font-weight: 600;
}

.modal-close {
    background: none;
    border: none;
    font-size: 24px;
    color: #6c757d;
    cursor: pointer;
    padding: 0;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.modal-body {
    padding: 20px;
}

.purchase-info {
    margin-bottom: 25px;
}

.purchase-info p {
    margin: 0 0 15px 0;
    color: #495057;
}

.price-info {
    background: #e7f3ff;
    padding: 12px 16px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    gap: 10px;
    color: #0066cc;
    font-weight: 500;
}

.seat-selector {
    margin-bottom: 25px;
}

.seat-selector label {
    display: block;
    margin-bottom: 10px;
    font-weight: 500;
}

.seat-controls {
    display: flex;
    align-items: center;
    gap: 10px;
}

.seat-input {
    width: 80px;
    padding: 8px;
    text-align: center;
    border: 1px solid #ced4da;
    border-radius: 4px;
    font-size: 16px;
}

.purchase-summary {
    background: #f8f9fa;
    padding: 15px;
    border-radius: 4px;
    margin-bottom: 25px;
}

.summary-item {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
    font-size: 14px;
}

.summary-divider {
    height: 1px;
    background: #dee2e6;
    margin: 12px 0;
}

.summary-item.total {
    font-weight: 600;
    font-size: 16px;
    margin-bottom: 0;
}

.modal-actions {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
}

/* Button Styles */
.btn {
    padding: 10px 20px;
    border: none;
    border-radius: 4px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    display: inline-flex;
    align-items: center;
    gap: 8px;
}

.btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.btn-primary {
    background: #007bff;
    color: white;
}

.btn-primary:hover:not(:disabled) {
    background: #0056b3;
}

.btn-secondary {
    background: #6c757d;
    color: white;
}

.btn-secondary:hover:not(:disabled) {
    background: #545b62;
}

.btn-danger {
    background: #dc3545;
    color: white;
}

.btn-danger:hover:not(:disabled) {
    background: #c82333;
}

.btn-sm {
    padding: 6px 12px;
    font-size: 12px;
}

/* Loading and Empty States */
.loading-state,
.empty-state {
    text-align: center;
    padding: 60px 20px;
    color: #6c757d;
}

.empty-state i,
.loading-state i {
    font-size: 48px;
    margin-bottom: 20px;
    display: block;
}
</style>