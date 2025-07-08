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
const selectedOrganization = ref('my-contacts'); // Default to "My Contacts"

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
    
    // Check the role field directly on the userOrg object
    // Based on your user_organizations table structure
    return ['admin', 'owner', 'creator'].includes(userOrg.role?.toLowerCase());
}

// Organization dropdown options
const organizationOptions = computed(() => {
    // Start with "My Contacts" option
    const options = [
        {
            label: 'My Contacts',
            value: 'my-contacts'
        }
    ];
    
    // Add organization options
    organizations.value.forEach(org => {
        const orgId = org.entity?.id || org.id;
        const orgName = org.entity?.name || org.name || 'Unknown';
        const isAdmin = isUserAdminOfOrg(orgId);
        
        options.push({
            label: isAdmin ? `${orgName} (admin)` : orgName,
            value: orgId
        });
    });
    
    return options;
});

// Tabs configuration
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
    // Default is already "my-contacts"
    loadContacts();
});

// Watch for organization changes
watch(selectedOrganization, (newOrgId, oldOrgId) => {
    if (newOrgId !== oldOrgId) {
        // Clear search when switching
        searchQuery.value = '';
        loadContacts();
    }
});


function handleOrganizationChange(value) {
    console.log('Organization changed to:', value);
    selectedOrganization.value = value;
    // The watcher will trigger loadContacts()
}


// Load contacts
// Load contacts
async function loadContacts() {
    try {
        isLoading.value = true;
        
        if (selectedOrganization.value === 'my-contacts') {
            // For "My Contacts", we need to fetch contacts differently
            // For now, let's just get from the first organization and filter
            if (organizations.value.length > 0) {
                const firstOrgId = organizations.value[0].entity?.id || organizations.value[0].id;
                const response = await ContactsService.getContacts(firstOrgId, {
                    search: searchQuery.value,
                    useCache: false
                });
                
                // We would need backend support to properly filter host contacts
                // For now, just show all contacts from first org
                contacts.value = response.data || [];
            } else {
                contacts.value = [];
            }
        } else {
            // Load organization contacts normally
            const response = await ContactsService.getContacts(selectedOrganization.value, {
                search: searchQuery.value,
                useCache: false
            });
            
            contacts.value = response.data || [];
        }
        
        // Filter based on active tab
        if (activeTab.value === 'favorites') {
            contacts.value = contacts.value.filter(contact => 
                contact.organization_contact?.is_favorite === true
            );
        }
        
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
    const tabKey = tab.title.toLowerCase().replace(/\s+/g, '');
    activeTab.value = tabKey;
    loadContacts();
}

// Contact actions
function handleToggleFavorite(contact) {
    if (selectedOrganization.value === 'my-contacts') {
        // Toggle favorite on host_contact
        ContactsService.toggleHostFavorite(contact.id)
            .then(() => {
                common.notification('Updated favorite status', true);
                loadContacts();
            })
            .catch(() => {
                common.notification('Failed to update favorite status', false);
            });
    } else {
        // Toggle favorite on organization_contact
        ContactsService.toggleFavorite(selectedOrganization.value, contact.id)
            .then(() => {
                common.notification('Updated favorite status', true);
                loadContacts();
            })
            .catch(() => {
                common.notification('Failed to update favorite status', false);
            });
    }
}

function handleDeleteContact(contact) {
    ContactsService.deleteContact(selectedOrganization.value, contact.id)
        .then(() => {
            common.notification('Contact removed successfully', true);
            loadContacts();
        })
        .catch(() => {
            common.notification('Failed to remove contact', false);
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
                        <div class="organization-selector">
                            <SelectComponent
                                :value="selectedOrganization"
                                :options="organizationOptions"
                                placeholder="Select view"
                                @change="handleOrganizationChange"
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
                
                <ContactsList
                    :contacts="contacts"
                    :isLoading="isLoading"
                    :activeTab="activeTab"
                    :isSearching="!!searchQuery"
                    @reload="loadContacts"
                    @toggleFavorite="handleToggleFavorite"
                    @deleteContact="handleDeleteContact"
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
    width: 300px;
}

.search-box {
    flex: 1;
    max-width: 400px;
}

.right-controls {
    display: flex;
    gap: 12px;
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