<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { api } from '@utils/api';
import { common } from '@utils/common';
import { UserStore } from '@stores/user';

import MainLayout from '@layouts/main/view.vue';
import HeadingComponent from '@global/heading/view.vue';
import ButtonComponent from '@form/button/view.vue';

import { 
    PhDownload, 
    PhEye, 
    PhReceipt,
    PhCheckCircle,
    PhClock,
    PhXCircle,
    PhBuildings
} from "@phosphor-icons/vue";

// Props (for future organization-specific use)
const props = defineProps({
    organizationId: {
        type: Number,
        default: null
    }
});

// State
const userStore = UserStore();
const invoices = ref([]);
const isLoading = ref(true);
const selectedOrganization = ref('all');

// Get organizations where user is admin
const adminOrganizations = computed(() => {
    const orgs = userStore.getOrganizations() || [];
    return orgs.filter(org => org.role === 'admin');
});

// Filtered invoices based on selected organization
const filteredInvoices = computed(() => {
    if (selectedOrganization.value === 'all') {
        return invoices.value;
    }
    
    // Convert to number for comparison
    const selectedId = parseInt(selectedOrganization.value);
    
    return invoices.value.filter(invoice => 
        invoice.organization?.id === selectedId
    );
});

// Count unique organizations in filtered invoices
const uniqueOrganizationsCount = computed(() => {
    const orgIds = new Set();
    filteredInvoices.value.forEach(invoice => {
        if (invoice.organization?.id) {
            orgIds.add(invoice.organization.id);
        }
    });
    return orgIds.size;
});

// Format currency
function formatCurrency(amount, currency = 'USD') {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency
    }).format(amount);
}

// Format date
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Get status badge class
function getStatusClass(status) {
    const statusMap = {
        'paid': 'status-paid',
        'open': 'status-open',
        'void': 'status-void',
        'uncollectible': 'status-failed',
        'draft': 'status-draft'
    };
    return statusMap[status] || 'status-default';
}

// Get status icon
function getStatusIcon(status) {
    const iconMap = {
        'paid': PhCheckCircle,
        'open': PhClock,
        'void': PhXCircle,
        'uncollectible': PhXCircle,
        'draft': PhClock
    };
    return iconMap[status] || PhClock;
}

// Format status text
function formatStatus(status) {
    return status.charAt(0).toUpperCase() + status.slice(1);
}

// Load invoices
async function loadInvoices() {
    try {
        isLoading.value = true;
        
        let response;
        
        // If organizationId prop is provided, fetch for specific org
        if (props.organizationId) {
            response = await api.get(`billing/organizations/${props.organizationId}/invoices`);
        } else {
            // Otherwise, fetch all invoices from all admin organizations
            response = await api.get('billing/invoices');
        }
        
        if (response && response.success) {
            invoices.value = response.data.invoices || [];
        } else {
            throw new Error(response?.message || 'Failed to load invoices');
        }
    } catch (error) {
        console.error('Error loading invoices:', error);
        common.notification(error.message || 'Failed to load invoices', false);
        invoices.value = [];
    } finally {
        isLoading.value = false;
    }
}

// Download invoice PDF
function downloadInvoice(invoice) {
    if (invoice.invoice_pdf) {
        window.open(invoice.invoice_pdf, '_blank');
    }
}

// View invoice in browser
function viewInvoice(invoice) {
    if (invoice.hosted_invoice_url) {
        window.open(invoice.hosted_invoice_url, '_blank');
    }
}

// Initialize
onMounted(() => {
    loadInvoices();
});

// Watch for changes in selectedOrganization (for debugging)
watch(selectedOrganization, (newVal) => {
    console.log('Selected organization changed to:', newVal);
});
</script>

<template>
    <main-layout>
        <template #content>
            <heading-component 
                title="Billing & Invoices" 
                description="View and download invoices from all your organizations"
            />

            <div class="p-xl"></div>

            <!-- Organization Filter (only show if not organization-specific) -->
            <div v-if="!organizationId && adminOrganizations.length > 1" class="controls-section">
                <div class="filter-group">
                    <label class="filter-label">Organization</label>
                    <select v-model="selectedOrganization" class="organization-select">
                        <option value="all">All Organizations</option>
                        <option 
                            v-for="org in adminOrganizations" 
                            :key="org.entity?.id"
                            :value="org.entity?.id"
                        >
                            {{ org.entity?.name || 'Unknown' }}
                        </option>
                    </select>
                </div>
            </div>

            <!-- Loading State -->
            <div v-if="isLoading" class="loading-state">
                <div class="loading-content">
                    <div class="loading-spinner"></div>
                    <p>Loading invoices...</p>
                </div>
            </div>

            <!-- Empty State -->
            <div v-else-if="filteredInvoices.length === 0" class="empty-state">
                <div class="empty-state-content">
                    <div class="empty-icon">
                        <PhReceipt :size="64" weight="light" />
                    </div>
                    <h3 class="empty-title">No invoices yet</h3>
                    <p class="empty-description">
                        Invoices will appear here once you subscribe to a plan or make payments.
                    </p>
                </div>
            </div>

            <!-- Invoices Table -->
            <div v-else class="invoices-container">
                <div class="table-wrapper">
                    <table class="invoices-table">
                        <thead>
                            <tr>
                                <th v-if="!organizationId">Organization</th>
                                <th>Invoice</th>
                                <th>Date</th>
                                <th>Amount</th>
                                <th>Status</th>
                                <th>Period</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="invoice in filteredInvoices" :key="invoice.id">
                                <!-- Organization (only in global view) -->
                                <td v-if="!organizationId">
                                    <div class="organization-cell">
                                        <PhBuildings :size="16" />
                                        <span>{{ invoice.organization?.name || 'Unknown' }}</span>
                                    </div>
                                </td>

                                <!-- Invoice Number -->
                                <td>
                                    <div class="invoice-number">
                                        <PhReceipt :size="18" />
                                        <span>{{ invoice.number || invoice.id }}</span>
                                    </div>
                                </td>

                                <!-- Date -->
                                <td>
                                    <span class="invoice-date">{{ formatDate(invoice.created) }}</span>
                                </td>

                                <!-- Amount -->
                                <td>
                                    <span class="invoice-amount">
                                        {{ formatCurrency(invoice.amount, invoice.currency) }}
                                    </span>
                                </td>

                                <!-- Status -->
                                <td>
                                    <div class="status-badge" :class="getStatusClass(invoice.status)">
                                        <component :is="getStatusIcon(invoice.status)" :size="16" />
                                        <span>{{ formatStatus(invoice.status) }}</span>
                                    </div>
                                </td>

                                <!-- Period -->
                                <td>
                                    <span class="period-text">
                                        {{ formatDate(invoice.period_start) }} - {{ formatDate(invoice.period_end) }}
                                    </span>
                                </td>

                                <!-- Actions -->
                                <td>
                                    <div class="action-buttons">
                                        <button-component
                                            v-if="invoice.hosted_invoice_url"
                                            label="View"
                                            as="tertiary"
                                            size="small"
                                            @click="viewInvoice(invoice)"
                                        >
                                            <template #iconLeft>
                                                <PhEye :size="16" />
                                            </template>
                                        </button-component>

                                        <button-component
                                            v-if="invoice.invoice_pdf"
                                            label="Download"
                                            as="secondary"
                                            size="small"
                                            @click="downloadInvoice(invoice)"
                                        >
                                            <template #iconLeft>
                                                <PhDownload :size="16" />
                                            </template>
                                        </button-component>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- Summary Footer -->
                <div class="invoices-footer">
                    <p class="footer-text">
                        Showing {{ filteredInvoices.length }} invoice{{ filteredInvoices.length !== 1 ? 's' : '' }}
                        <span v-if="!organizationId && selectedOrganization === 'all' && uniqueOrganizationsCount > 0">
                            from {{ uniqueOrganizationsCount }} organization{{ uniqueOrganizationsCount !== 1 ? 's' : '' }}
                        </span>
                    </p>
                </div>
            </div>
        </template>
    </main-layout>
</template>

<style scoped>
@import '@global/common-table/style.css';

/* Controls Section */
.controls-section {
    margin-bottom: 24px;
}

.filter-group {
    max-width: 300px;
}

.filter-label {
    display: block;
    font-size: 14px;
    font-weight: 500;
    color: var(--text-secondary);
    margin-bottom: 8px;
}

/* Native Select Styling */
.organization-select {
    width: 100%;
    padding: 10px 12px;
    font-size: 14px;
    color: var(--text-primary);
    background-color: var(--background-0);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all 0.2s ease;
}

.organization-select:hover {
    border-color: var(--border-hover, #94a3b8);
}

.organization-select:focus {
    outline: none;
    border-color: var(--primary, #3b82f6);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

/* Container */
.invoices-container {
    background: var(--background-0);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    overflow: hidden;
}

/* Table */
.table-wrapper {
    overflow-x: auto;
}

.invoices-table {
    width: 100%;
    border-collapse: collapse;
}

.invoices-table thead {
    background: var(--background-1);
}

.invoices-table th {
    padding: 16px;
    text-align: left;
    font-size: 12px;
    font-weight: 600;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border-bottom: 1px solid var(--border);
}

.invoices-table td {
    padding: 16px;
    border-bottom: 1px solid var(--border);
    font-size: 14px;
    color: var(--text-primary);
}

.invoices-table tbody tr:last-child td {
    border-bottom: none;
}

.invoices-table tbody tr:hover {
    background: var(--background-1);
}

/* Organization Cell */
.organization-cell {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 500;
}

.organization-cell svg {
    color: var(--text-secondary);
}

/* Invoice Number */
.invoice-number {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 500;
}

.invoice-number svg {
    color: var(--text-secondary);
}

/* Date */
.invoice-date {
    color: var(--text-secondary);
}

/* Amount */
.invoice-amount {
    font-weight: 600;
    font-size: 15px;
}

/* Status Badge */
.status-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: var(--radius-sm);
    font-size: 13px;
    font-weight: 500;
}

.status-paid {
    background: #D1FAE5;
    color: #065F46;
}

.status-open {
    background: #FEF3C7;
    color: #92400E;
}

.status-void,
.status-failed {
    background: #FEE2E2;
    color: #991B1B;
}

.status-draft {
    background: #E5E7EB;
    color: #374151;
}

.status-default {
    background: var(--background-2);
    color: var(--text-secondary);
}

/* Period */
.period-text {
    font-size: 13px;
    color: var(--text-secondary);
}

/* Action Buttons */
.action-buttons {
    display: flex;
    gap: 8px;
}

/* Footer */
.invoices-footer {
    padding: 16px;
    border-top: 1px solid var(--border);
    background: var(--background-1);
}

.footer-text {
    margin: 0;
    font-size: 14px;
    color: var(--text-secondary);
}

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
    margin-bottom: 24px;
    display: flex;
    justify-content: center;
}

.empty-title {
    font-size: 20px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 8px 0;
}

.empty-description {
    font-size: 14px;
    color: var(--text-secondary);
    line-height: 1.5;
    margin: 0;
}

/* Responsive */
@media (max-width: 768px) {
    .invoices-table th,
    .invoices-table td {
        padding: 12px 8px;
        font-size: 13px;
    }

    .action-buttons {
        flex-direction: column;
    }

    .period-text {
        font-size: 12px;
    }
}
</style>