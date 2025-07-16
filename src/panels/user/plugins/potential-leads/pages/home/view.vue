<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { PotentialLeadsService } from '@user_potential_leads/services/potential-leads';
import { common } from '@utils/common';
import { UserStore } from '@stores/user';

import MainLayout from '@layouts/main/view.vue';
import HeadingComponent from '@global/heading/view.vue';
import PotentialLeadsList from '@user_potential_leads/components/list/view.vue';
import ButtonComponent from '@form/button/view.vue';
import InputComponent from '@form/input/view.vue';
import SelectComponent from '@form/select/view.vue';

import { PhMagnifyingGlass, PhDownload } from "@phosphor-icons/vue";

// State
const leads = ref([]);
const isLoading = ref(true);
const searchQuery = ref('');
const selectedOrganization = ref('my-leads');

// Pagination
const currentPage = ref(1);
const totalCount = ref(0);
const perPage = ref(50);

// User store
const userStore = UserStore();
const currentUserId = userStore.getId();

// Get organizations from store
const organizations = computed(() => {
    const orgs = userStore.getOrganizations();
    return orgs || [];
});

// Check if user is admin/owner of organization
function isUserAdminOfOrg(orgId) {
    const userOrg = organizations.value.find(org => 
        (org.entity?.id || org.id) === orgId
    );
    
    if (!userOrg) return false;
    
    return ['admin', 'owner', 'creator'].includes(userOrg.role?.toLowerCase());
}

// Organization dropdown options
const organizationOptions = computed(() => {
    const options = [
        {
            label: 'My Leads',
            value: 'my-leads'
        }
    ];
    
    organizations.value.forEach(org => {
        const orgId = org.entity?.id || org.id;
        const orgName = org.entity?.name || org.name || 'Unknown';
        const isAdmin = isUserAdminOfOrg(orgId);
        
        options.push({
            label: isAdmin ? orgName : `${orgName} (View Only)`,
            value: orgId,
            disabled: !isAdmin
        });
    });
    
    return options;
});

// Computed properties
const totalPages = computed(() => Math.ceil(totalCount.value / perPage.value));

const displayedLeads = computed(() => {
    return leads.value.map(lead => {
        // Handle nested structure from backend
        const email = lead.potential_lead?.email || lead.email || 'No email';
        const name = lead.potential_lead?.name || lead.name || '-';
        const timezone = lead.potential_lead?.timezone || lead.timezone || '-';
        const capturedAt = lead.potential_lead?.captured_at || lead.captured_at || lead.created_at;
        const organizationName = lead.organization?.name || lead.organization_name || '-';
        
        return {
            id: lead.id,
            email: email,
            name: name,
            timezone: timezone,
            captured_at: capturedAt,
            organization_name: organizationName,
            raw_data: lead
        };
    });
});

// Watchers
watch(selectedOrganization, () => {
    currentPage.value = 1;
    loadLeads();
});

watch(searchQuery, () => {
    currentPage.value = 1;
    loadLeads();
});

// Load leads
async function loadLeads() {
    isLoading.value = true;
    
    try {
        const filters = {
            search: searchQuery.value
        };
        
        let result;
        if (selectedOrganization.value === 'my-leads') {
            result = await PotentialLeadsService.getMyLeads(filters, currentPage.value, perPage.value);
        } else {
            result = await PotentialLeadsService.getOrganizationLeads(
                selectedOrganization.value, 
                filters, 
                currentPage.value, 
                perPage.value
            );
        }
        
        leads.value = result.data || [];
        totalCount.value = result.count || 0;
        
    } catch (error) {
        console.error('Failed to load leads:', error);
        common.notification('Failed to load potential leads', false);
        leads.value = [];
        totalCount.value = 0;
    } finally {
        isLoading.value = false;
    }
}

// Actions
async function handleDeleteLead(lead) {
    try {
        if (selectedOrganization.value === 'my-leads') {
            const leadId = lead.potential_lead?.id || lead.id;
            await PotentialLeadsService.deleteMyLead(leadId);
        } else {
            await PotentialLeadsService.deleteLead(selectedOrganization.value, lead.id);
        }
        
        common.notification('Lead removed successfully', true);
        await loadLeads();
    } catch (error) {
        console.error('Failed to delete lead:', error);
        common.notification('Failed to remove lead', false);
    }
}

async function handleExportLeads() {
    try {
        const filters = searchQuery.value ? { search: searchQuery.value } : {};
        
        if (selectedOrganization.value === 'my-leads') {
            await PotentialLeadsService.exportMyLeads(filters);
        } else {
            await PotentialLeadsService.exportOrganizationLeads(selectedOrganization.value, filters);
        }
        
        common.notification('Export started', true);
    } catch (error) {
        console.error('Export failed:', error);
        common.notification('Failed to export leads', false);
    }
}

// Pagination
function handlePageChange(page) {
    currentPage.value = page;
    loadLeads();
}

// Initialize
onMounted(() => {
    loadLeads();
});
</script>

<template>
    <MainLayout>
        <template #content>
            <div class="potential-leads-page">
                <HeadingComponent 
                    title="Potential Leads"
                    description="Track visitors who showed interest in booking"
                />

                <div class="controls-section">
                    <div class="left-controls">
                        <div class="organization-selector">
                            <SelectComponent
                                :value="selectedOrganization"
                                :options="organizationOptions"
                                placeholder="Select view"
                                @change="(value) => selectedOrganization = value"
                            />
                        </div>
                        
                        <div class="search-box" style="display:none">
                            <InputComponent
                                v-model="searchQuery"
                                placeholder="Search by email or name..."
                                :iconLeft="{ component: PhMagnifyingGlass }"
                            />
                        </div>
                    </div>
                    
                    <div class="right-controls">
                        <ButtonComponent
                            label="Export"
                            as="secondary"
                            :iconLeft="{ component: PhDownload }"
                            @click="handleExportLeads"
                        />
                    </div>
                </div>

                <div class="leads-content">
                    <PotentialLeadsList
                        :leads="displayedLeads"
                        :isLoading="isLoading"
                        :currentPage="currentPage"
                        :totalPages="totalPages"
                        @deleteLead="handleDeleteLead"
                        @pageChange="handlePageChange"
                    />
                </div>
            </div>
        </template>
    </MainLayout>
</template>

<style scoped>
.potential-leads-page {
    padding: 24px;
    max-width: 1400px;
    margin: 0 auto;
}

.controls-section {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    margin-bottom: 24px;
    flex-wrap: wrap;
}

.left-controls {
    display: flex;
    gap: 16px;
    flex: 1;
    min-width: 0;
}

.organization-selector {
    width: 250px;
}

.search-box {
    flex: 1;
    max-width: 400px;
}

.right-controls {
    display: flex;
    gap: 12px;
}



/* Responsive */
@media (max-width: 768px) {
    .controls-section {
        flex-direction: column;
        align-items: stretch;
    }
    
    .left-controls {
        flex-direction: column;
        width: 100%;
    }
    
    .organization-selector,
    .search-box {
        width: 100%;
        max-width: none;
    }
    
    .right-controls {
        justify-content: flex-end;
        width: 100%;
    }
}
</style>