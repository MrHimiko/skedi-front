<script setup>
import { computed } from 'vue';
import { common } from '@utils/common';
import { popup } from '@utils/popup';
import MenusComponent from '@global/menus/view.vue';
import ConfirmComponent from '@floated/confirm/view.vue';

import { 
    PhDotsThree, 
    PhEnvelope, 
    PhTrash,
    PhUsers
} from "@phosphor-icons/vue";

// Props
const props = defineProps({
    leads: {
        type: Array,
        default: () => []
    },
    isLoading: {
        type: Boolean,
        default: false
    },
    currentPage: {
        type: Number,
        default: 1
    },
    totalPages: {
        type: Number,
        default: 1
    }
});

// Emits
const emit = defineEmits(['deleteLead', 'pageChange']);

// Computed
const hasLeads = computed(() => props.leads.length > 0);

// Format date to human readable format
function formatDate(dateString) {
    if (!dateString) return '-';
    
    const date = new Date(dateString);
    
    // Format as: Jan 15, 2025 at 2:30 PM
    const options = {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    };
    
    return date.toLocaleDateString('en-US', options).replace(',', ' at').replace(',', '');
}

// Get initials for avatar
function getInitials(name, email) {
    if (name && name !== '-') {
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email ? email[0].toUpperCase() : '?';
}

// Get empty message
function getEmptyMessage() {
    return 'Potential leads will appear here when visitors enter their email in the booking form but don’t complete the booking.';
}

// Handle actions
function sendEmail(lead) {
    window.location.href = `mailto:${lead.email}`;
}

function deleteLead(lead) {
    popup.open(
        'delete-lead-confirm',
        null,
        ConfirmComponent,
        {
            as: 'red',
            description: `Are you sure you want to remove ${lead.email} from potential leads?`,
            callback: () => {
                emit('deleteLead', lead.raw_data);
                popup.close();
            }
        },
        {
            position: 'center'
        }
    );
}

// Get dropdown menus
function getLeadMenus(lead) {
    return [
        {
            label: 'Send email',
            iconComponent: PhEnvelope,
            weight: 'regular',
            onClick: () => sendEmail(lead)
        },
        {
            label: 'Remove lead',
            iconComponent: PhTrash,
            weight: 'regular',
            onClick: () => deleteLead(lead),
            class: 'danger'
        }
    ];
}
</script>

<template>
    <div class="potential-leads-list">
        <div v-if="isLoading" class="loading-state">
            <div class="loading-content">
                <div class="loading-spinner"></div>
                <p>Loading potential leads...</p>
            </div>
        </div>

        <div v-else-if="leads.length === 0" class="empty-state">
            <div class="empty-state-content">
                <div class="empty-icon">
                    <PhUsers :size="48" weight="thin" />
                </div>
                <h3 class="empty-title">No potential leads yet</h3>
                <p class="empty-description">{{ getEmptyMessage() }}</p>
            </div>
        </div>

        <div v-else class="common-table-wrapper">
            <table class="common-table">
                <thead>
                    <tr>
                        <th>Lead</th>
                        <th>Captured (CET)</th>
                        <th>Timezone</th>
                        <th>Organization</th>
                        <th width="50"></th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="lead in leads" :key="lead.id">
                        <td>
                            <div class="table-cell-with-avatar">
                                <div class="table-avatar">
                                    {{ getInitials(lead.name, lead.email) }}
                                </div>
                                <div class="table-cell-details">
                                    <div class="table-cell-title">
                                        {{ lead.email }}
                                    </div>
                                    <div class="table-cell-subtitle" v-if="lead.name !== '-'">
                                        {{ lead.name }}
                                    </div>
                                </div>
                            </div>
                        </td>
                        
                        <td>
                            <div class="captured-text">
                                {{ formatDate(lead.captured_at) }}
                            </div>
                        </td>
                        
                        <td>
                            <div class="timezone-text" v-if="lead.timezone !== '-'">
                                {{ lead.timezone }}
                            </div>
                            <span v-else class="table-no-data">-</span>
                        </td>
                        
                        <td>
                            <span class="org-name">{{ lead.organization_name }}</span>
                        </td>
                        
                        <td class="table-action-cell">
                            <button
                                class="c-button secondary icon"
                                v-dropdown="{ 
                                    component: MenusComponent,
                                    properties: {
                                        menus: getLeadMenus(lead)
                                    }
                                }"
                            >
                                <PhDotsThree :size="20" weight="bold" />
                            </button>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- Pagination would go here if needed -->
        <div v-if="totalPages > 1" class="pagination-wrapper">
            <!-- Your pagination component -->
        </div>
    </div>
</template>

<style scoped>
/* Component specific styles only */
@import '@global/common-table/style.css';
/* Loading State */
.loading-state {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 400px;
}

.loading-content {
    text-align: center;
}

.loading-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid #F3F4F6;
    border-top-color: #3B82F6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 16px;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

/* Empty State */
.empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 400px;
}

.empty-state-content {
    text-align: center;
    max-width: 400px;
}

.empty-icon {
    color: #D1D5DB;
    margin-bottom: 16px;
        display: flex;
    justify-content: center;
}

.empty-title {
    font-size: 18px;
    font-weight: 600;
    color: #111827;
    margin: 0 0 8px 0;
}

.empty-description {
    font-size: 14px;
    color: #6B7280;
    line-height: 1.5;
    margin: 0;
}

/* Lead specific styles */
.captured-text,
.timezone-text,
.org-name {
    font-size: 14px;
    color: #6B7280;
}

.pagination-wrapper {
    margin-top: 20px;
    display: flex;
    justify-content: center;
}
</style>