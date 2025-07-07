<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { ContactsService } from '@user_contacts/services/contacts';
import { common } from '@utils/common';
import { UserStore } from '@stores/user';

import MainLayout from '@layouts/main/view.vue';
import HeadingComponent from '@global/heading/view.vue';
import ContactsList from '@user_contacts/components/list/view.vue';
import ButtonComponent from '@form/button/view.vue';
import InputComponent from '@form/input/view.vue';
import SelectComponent from '@form/select/view.vue';
import TabsComponent from '@global/tabs/view.vue';
import Notice from '@global/notice/view.vue';

import { PhPlus, PhMagnifyingGlass, PhDownload, PhUpload } from "@phosphor-icons/vue";

// State
const contacts = ref([]);
const isLoading = ref(true);
const searchQuery = ref('');
const activeTab = ref('allcontacts');
const selectedOrganization = ref(null);

// User store
const userStore = UserStore();

// Get organizations from store
const organizations = computed(() => {
    const orgs = userStore.getOrganizations();
    return orgs || [];
});

// Organization dropdown options
const organizationOptions = computed(() => {
    return organizations.value.map(org => ({
        label: org.entity?.name || org.name || 'Unknown',
        value: org.entity?.id || org.id
    }));
});

// Tabs configuration - matching your bookings pattern
const tabs = computed(() => [
    { 
        title: 'All contacts', 
        active: activeTab.value === 'allcontacts' 
    },
    { 
        title: 'Favorites', 
        active: activeTab.value === 'favorites' 
    }
]);

// Set initial organization
onMounted(() => {
    if (organizationOptions.value.length > 0) {
        // Set first organization as default
        selectedOrganization.value = organizationOptions.value[0].value;
        loadContacts();
    } else {
        isLoading.value = false;
    }
});

// Watch for organization changes
watch(selectedOrganization, (newOrgId, oldOrgId) => {
    if (newOrgId && newOrgId !== oldOrgId) {
        // Clear search when switching organizations
        searchQuery.value = '';
        loadContacts();
    }
});

// Load contacts
async function loadContacts() {
    if (!selectedOrganization.value) {
        return;
    }

    try {
        isLoading.value = true;
        const response = await ContactsService.getContacts(selectedOrganization.value, {
            search: searchQuery.value,
            useCache: false
        });
        
        // Filter based on active tab
        let filteredContacts = response.data || [];
        
       if (activeTab.value === 'favorites') {
            // Filter only favorites
            filteredContacts = filteredContacts.filter(contact => 
                contact.organization_contact?.is_favorite === true
            );
        }
        
        contacts.value = filteredContacts;
    } catch (error) {
        console.error('Failed to load contacts:', error);
        common.notification('Failed to load contacts', false);
        contacts.value = [];
    } finally {
        isLoading.value = false;
    }
}

// Search contacts with debounce
let searchTimeout = null;
watch(searchQuery, () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        loadContacts();
    }, 300);
});

// Tab change handler
function handleTabChange(event, tab) {
    // Extract key from title
    const tabKey = tab.title.toLowerCase().replace(/\s+/g, '');
    activeTab.value = tabKey;
    loadContacts();
}

// Contact actions from child component
function handleToggleFavorite(contact) {
    // We'll implement the API call to toggle favorite
    ContactsService.toggleFavorite(selectedOrganization.value, contact.id)
        .then(() => {
            common.notification('Updated favorite status', true);
            loadContacts();
        })
        .catch(() => {
            common.notification('Failed to update favorite status', false);
        });
}

// Handle other actions
function handleNewContact() {
    common.notification('Contact creation coming soon', true);
}

function handleImportContacts() {
    common.notification('Import functionality coming soon', true);
}

function handleExportContacts() {
    common.notification('Export functionality coming soon', true);
}
</script>

<template>
    <MainLayout>
        <template #content>
            <div class="contacts-page">
                <HeadingComponent 
                    title="Contacts"
                    description="Manage your contacts and leads in one place"
                />

                <div class="controls-section">
                    <div class="left-controls">
                        <div class="organization-selector" v-if="organizationOptions.length > 1">
                            <SelectComponent
                                v-model="selectedOrganization"
                                :options="organizationOptions"
                                placeholder="Select organization"
                            />
                        </div>
                        
                        <div class="search-box">
                            <InputComponent
                                v-model="searchQuery"
                                placeholder="Search contacts..."
                                :iconLeft="{ component: PhMagnifyingGlass }"
                            />
                        </div>
                    </div>

                    <div class="right-controls">
                        <ButtonComponent
                            label="Import"
                            as="neutral"
                            :iconLeft="{ component: PhUpload }"
                            @click="handleImportContacts"
                        />
                        <ButtonComponent
                            label="Export"
                            as="neutral"
                            :iconLeft="{ component: PhDownload }"
                            @click="handleExportContacts"
                        />
                        <ButtonComponent
                            label="New contact"
                            :iconLeft="{ component: PhPlus }"
                            @click="handleNewContact"
                        />
                    </div>
                </div>

                <TabsComponent 
                    :tabs="tabs"
                    :onClick="handleTabChange"
                />

                <div v-if="organizations.length === 0" class="no-org-notice">
                    <Notice 
                        type="warning" 
                        message="You need to be part of an organization to view contacts."
                    />
                </div>
                
                <ContactsList
                    v-else
                    :contacts="contacts"
                    :isLoading="isLoading"
                    @reload="loadContacts"
                    @toggleFavorite="handleToggleFavorite"
                />
            </div>
        </template>
    </MainLayout>
</template>

<style scoped>
.contacts-page {
    padding: 20px;
}

.controls-section {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
    gap: 16px;
    flex-wrap: wrap;
}

.left-controls {
    display: flex;
    gap: 16px;
    flex: 1;
    align-items: center;
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

.no-org-notice {
    margin-top: 24px;
}

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