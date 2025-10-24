<!-- src/panels/user/plugins/organizations/components/leads-contacts/view.vue -->
<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { api } from '@utils/api';
import { common } from '@utils/common';
import { PotentialLeadsService } from '@user_potential_leads/services/potential-leads';
import { ContactsService } from '@user_contacts/services/contacts';

import TabsComponent from '@global/tabs/view.vue';
import InputComponent from '@form/input/view.vue';
import PotentialLeadsList from '@user_potential_leads/components/list/view.vue';
import ContactsList from '@user_contacts/components/list/view.vue';
import ButtonComponent from '@form/button/view.vue';

import { PhMagnifyingGlass, PhDownload } from "@phosphor-icons/vue";

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

// State
const activeSubTab = ref('leads');
const searchQuery = ref('');
const isLoading = ref(true);

// Leads state
const leads = ref([]);
const leadsPage = ref(1);
const leadsTotal = ref(0);
const leadsPerPage = ref(50);

// Contacts state
const contacts = ref([]);
const contactsPage = ref(1);
const contactsTotal = ref(0);
const contactsPerPage = ref(50);

// Sub-tabs configuration
const subTabs = [
    { key: 'leads', title: 'Potential Leads' },
    { key: 'contacts', title: 'Contacts' }
];

// Computed
const totalLeadsPages = computed(() => Math.ceil(leadsTotal.value / leadsPerPage.value));
const totalContactsPages = computed(() => Math.ceil(contactsTotal.value / contactsPerPage.value));

const displayedLeads = computed(() => {
    return leads.value.map(lead => {
        const email = lead.potential_lead?.email || lead.email || 'No email';
        const name = lead.potential_lead?.name || lead.name || '-';
        const timezone = lead.potential_lead?.timezone || lead.timezone || '-';
        const capturedAt = lead.potential_lead?.captured_at || lead.captured_at || lead.created_at;
        
        return {
            id: lead.id,
            email: email,
            name: name,
            timezone: timezone,
            captured_at: capturedAt,
            raw_data: lead
        };
    });
});

// Load potential leads for this organization
async function loadLeads() {
    try {
        isLoading.value = true;
        
        const filters = {};
        if (searchQuery.value) {
            filters.search = searchQuery.value;
        }
        
        const response = await PotentialLeadsService.getOrganizationLeads(
            props.organizationId,
            filters,
            leadsPage.value,
            leadsPerPage.value
        );
        
        if (response && response.data) {
            leads.value = response.data;
            leadsTotal.value = response.total || 0;
        }
    } catch (error) {
        console.error('Failed to load leads:', error);
        common.notification('Failed to load leads', false);
        leads.value = [];
    } finally {
        isLoading.value = false;
    }
}

// Load contacts for this organization
async function loadContacts() {
    try {
        isLoading.value = true;
        
        const filters = {};
        if (searchQuery.value) {
            filters.search = searchQuery.value;
        }
        
        const response = await ContactsService.getContacts(
            props.organizationId,
            filters,
            contactsPage.value,
            contactsPerPage.value
        );
        
        if (response && response.data) {
            contacts.value = response.data;
            contactsTotal.value = response.total || 0;
        }
    } catch (error) {
        console.error('Failed to load contacts:', error);
        common.notification('Failed to load contacts', false);
        contacts.value = [];
    } finally {
        isLoading.value = false;
    }
}

// Export leads
async function exportLeads() {
    try {
        const filters = {};
        if (searchQuery.value) {
            filters.search = searchQuery.value;
        }
        
        await PotentialLeadsService.exportOrganizationLeads(props.organizationId, filters);
        common.notification('Export started successfully', true);
    } catch (error) {
        console.error('Failed to export leads:', error);
        common.notification('Failed to export leads', false);
    }
}

// Export contacts
async function exportContacts() {
    try {
        const filters = {};
        if (searchQuery.value) {
            filters.search = searchQuery.value;
        }
        
        await ContactsService.exportContacts(props.organizationId, filters);
        common.notification('Export started successfully', true);
    } catch (error) {
        console.error('Failed to export contacts:', error);
        common.notification('Failed to export contacts', false);
    }
}

// Handle sub-tab change
function handleSubTabChange(event, tab) {
    activeSubTab.value = tab.title.toLowerCase().replace('potential ', '').replace('contacts', 'contacts');
    
    if (activeSubTab.value === 'leads') {
        loadLeads();
    } else {
        loadContacts();
    }
}

// Handle lead deleted
function handleLeadDeleted(leadId) {
    leads.value = leads.value.filter(lead => lead.id !== leadId);
    leadsTotal.value--;
}

// Handle contact deleted
function handleContactDeleted(contactId) {
    contacts.value = contacts.value.filter(contact => contact.id !== contactId);
    contactsTotal.value--;
}

// Watch for search query changes
let searchTimeout = null;
watch(searchQuery, () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        if (activeSubTab.value === 'leads') {
            leadsPage.value = 1;
            loadLeads();
        } else {
            contactsPage.value = 1;
            loadContacts();
        }
    }, 300);
});

onMounted(() => {
    loadLeads();
});
</script>

<template>
    <div class="org-leads-contacts-tab">
        <div class="tab-header">
            <div class="header-info">
                <h3>Contacts & Leads</h3>
                <p>Manage potential leads and contacts for this organization</p>
            </div>
            <div class="header-actions">
                <div class="search-box">
                    <InputComponent
                        v-model="searchQuery"
                        placeholder="Search..."
                        :iconLeft="{ component: PhMagnifyingGlass }"
                    />
                </div>
                <ButtonComponent
                    v-if="isAdmin"
                    @click="activeSubTab === 'leads' ? exportLeads() : exportContacts()"
                    as="tertiary"
                    :iconLeft="{ component: PhDownload, weight: 'bold' }"
                    label="Export"
                />
            </div>
        </div>
        
        <!-- Sub-tabs -->
        <div class="sub-tabs">
            <TabsComponent
                :tabs="subTabs"
                :active="subTabs.find(t => t.key === activeSubTab)?.title"
                :onClick="handleSubTabChange"
            />
        </div>
        
        <!-- Potential Leads View -->
        <div v-if="activeSubTab === 'leads'" class="leads-view">
            <div v-if="isLoading" class="loading-state">
                <p>Loading leads...</p>
            </div>
            
            <div v-else-if="displayedLeads.length === 0" class="empty-state">
                <p>{{ searchQuery ? 'No leads found' : 'No potential leads yet' }}</p>
            </div>
            
            <div v-else class="list-container">
                <PotentialLeadsList
                    :leads="displayedLeads"
                    :organizationId="organizationId"
                    @deleted="handleLeadDeleted"
                />
                
                <!-- Pagination info -->
                <div v-if="totalLeadsPages > 1" class="pagination-info">
                    <p>
                        Showing {{ (leadsPage - 1) * leadsPerPage + 1 }} - 
                        {{ Math.min(leadsPage * leadsPerPage, leadsTotal) }} of 
                        {{ leadsTotal }} leads
                    </p>
                </div>
            </div>
        </div>
        
        <!-- Contacts View -->
        <div v-if="activeSubTab === 'contacts'" class="contacts-view">
            <div v-if="isLoading" class="loading-state">
                <p>Loading contacts...</p>
            </div>
            
            <div v-else-if="contacts.length === 0" class="empty-state">
                <p>{{ searchQuery ? 'No contacts found' : 'No contacts yet' }}</p>
            </div>
            
            <div v-else class="list-container">
                <ContactsList
                    :contacts="contacts"
                    :organizationId="organizationId"
                    @deleted="handleContactDeleted"
                />
                
                <!-- Pagination info -->
                <div v-if="totalContactsPages > 1" class="pagination-info">
                    <p>
                        Showing {{ (contactsPage - 1) * contactsPerPage + 1 }} - 
                        {{ Math.min(contactsPage * contactsPerPage, contactsTotal) }} of 
                        {{ contactsTotal }} contacts
                    </p>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.org-leads-contacts-tab {
    display: flex;
    flex-direction: column;
    gap: 24px;
}

.tab-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 20px;
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

.header-actions {
    display: flex;
    gap: 12px;
    align-items: center;
}

.search-box {
    width: 250px;
}

.sub-tabs {
    margin-top: -8px;
}

.loading-state,
.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 20px;
    text-align: center;
}

.empty-state p {
    margin: 0;
    color: var(--text-secondary);
    font-size: 16px;
}

.list-container {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.pagination-info {
    text-align: center;
    padding: 16px;
    color: var(--text-secondary);
    font-size: 14px;
}

.pagination-info p {
    margin: 0;
}

@media (max-width: 768px) {
    .tab-header {
        flex-direction: column;
    }
    
    .header-actions {
        width: 100%;
        flex-direction: column;
    }
    
    .search-box {
        width: 100%;
    }
}
</style>