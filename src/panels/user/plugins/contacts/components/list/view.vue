<script setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { common } from '@utils/common';
import Notice from '@global/notice/view.vue';
import Button from '@form/button/view.vue';

import MenusComponent from '@global/menus/view.vue';
import { PhEnvelope, PhDotsThree, PhStar, PhCalendarCheck, PhShareNetwork, PhTrash, PhAddressBook } from "@phosphor-icons/vue";
import { popup } from '@utils/popup';
import ConfirmComponent from '@floated/confirm/view.vue';

const props = defineProps({
    contacts: {
        type: Array,
        default: () => []
    },
    isLoading: {
        type: Boolean,
        default: false
    },
    activeTab: {
        type: String,
        default: 'allcontacts'
    },
    isSearching: {
        type: Boolean,
        default: false
    },
    currentView: { 
        type: String,
        default: 'my-contacts'
    }
});

const emit = defineEmits(['reload', 'toggleFavorite', 'deleteContact']);

// Format date for display
function formatDate(dateString) {
    if (!dateString) return '-';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 1) {
        return 'Today';
    } else if (diffDays === 1) {
        return 'Yesterday';
    } else if (diffDays < 7) {
        return `${diffDays} days ago`;
    } else {
        return date.toLocaleDateString();
    }
}

// Format meeting info
function formatMeeting(meeting) {
    if (!meeting) return '-';
    
    const date = new Date(meeting.date);
    const now = new Date();
    
    // Reset time for accurate day comparison
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const nowOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // For meetings today or in the future, show as upcoming
    if (dateOnly >= nowOnly) {
        const options = { 
            month: 'short', 
            day: 'numeric'
        };
        
        if (dateOnly.getTime() === nowOnly.getTime()) {
            // Meeting is today - show as upcoming
            return `${meeting.event_name} • Today`;
        } else {
            // Meeting is in the future
            return `${meeting.event_name} • ${date.toLocaleDateString('en-US', options)}`;
        }
    } else {
        // For past meetings, show relative time
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        let dateStr;
        if (diffDays === 1) {
            dateStr = 'Yesterday';
        } else if (diffDays < 7) {
            dateStr = `${diffDays} days ago`;
        } else {
            dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }
        
        return `${meeting.event_name} • ${dateStr}`;
    }
}

function isFavorite(contactData) {
    // For "My Contacts" view - check host_info
    if (props.currentView === 'my-contacts' && contactData.host_info) {
        return contactData.host_info.is_favorite === true;
    }
    
    // For organization view - check organization_contact
    if (contactData.organization_contact) {
        return contactData.organization_contact.is_favorite === true;
    }
    
    return false;
}

// Process contacts for table
const processedContacts = computed(() => {
    return props.contacts.map(contactData => {
        const contact = contactData.contact;
        return {
            id: contactData.id,
            contact_id: contact.id, // Add the base contact ID
            name: contact.name || contact.email,
            email: contact.email,
            phone: contact.phone,
            last_meeting: formatMeeting(contactData.last_meeting),
            next_meeting: formatMeeting(contactData.next_meeting),
            raw_last_meeting: contactData.last_meeting,
            raw_next_meeting: contactData.next_meeting,
            is_favorite: isFavorite(contactData),
            organization: contactData.organization,
            raw_data: contactData // Keep the original data structure
        };
    });
});

// Get empty state message
function getEmptyTitle() {
    if (props.isSearching) {
        return 'No results found';
    }
    
    if (props.activeTab === 'favorites') {
        return 'No favorites yet';
    }
    
    return 'No contacts yet';
}

function getEmptyMessage() {
    if (props.isSearching) {
        return 'Try adjusting your search terms or filters.';
    }
    
    if (props.activeTab === 'favorites') {
        return 'Add contacts to favorites to see them here.';
    }
    
    return 'Contacts will appear here when someone books a meeting with you.';
}

// Handle contact actions
function sendEmail(contact) {
    window.location.href = `mailto:${contact.email}`;
}

function bookMeeting(contact) {
    common.notification('Quick booking coming soon', true);
}

function shareAvailability(contact) {
    common.notification('Share availability coming soon', true);
}

function toggleFavorite(contact) {
    // Emit the event with the original data structure
    emit('toggleFavorite', contact.raw_data);
}

function deleteContact(contact) {
    popup.open(
        'delete-contact-confirm',
        null,
        ConfirmComponent,
        {
            as: 'red',
            description: `Are you sure you want to remove ${contact.name || contact.email} from your contacts?`,
            callback: () => {
                emit('deleteContact', contact.raw_data);
                popup.close();
            }
        },
        {
            position: 'center'
        }
    );
}

// Get dropdown menus for contact
function getContactMenus(contact) {
    return [
        {
            label: 'Send email',
            iconComponent: PhEnvelope,
            weight: 'regular',
            onClick: () => sendEmail(contact)
        },
        {
            label: 'Book meeting',
            iconComponent: PhCalendarCheck,
            weight: 'regular',
            onClick: () => bookMeeting(contact)
        },
        {
            label: 'Share availability',
            iconComponent: PhShareNetwork,
            weight: 'regular',
            onClick: () => shareAvailability(contact)
        },
        {
            label: contact.is_favorite ? 'Remove from favorites' : 'Add to favorites',
            iconComponent: PhStar,
            weight: contact.is_favorite ? 'fill' : 'regular',
            onClick: () => toggleFavorite(contact)
        },
        {
            label: 'Remove',
            iconComponent: PhTrash,
            weight: 'regular',
            onClick: () => deleteContact(contact),
            class: 'danger'
        }
    ];
}
</script>

<template>
    <div class="contacts-list">
        <div v-if="isLoading" class="loading-state">
            <div class="loading-content">
                <div class="loading-spinner"></div>
                <p>Loading contacts...</p>
            </div>
        </div>

        <div v-else-if="contacts.length === 0" class="empty-state">
            <div class="empty-state-content">
                <div class="empty-icon">
                    <PhAddressBook :size="48" weight="thin" />
                </div>
                <h3 class="empty-title">{{ getEmptyTitle() }}</h3>
                <p class="empty-description">{{ getEmptyMessage() }}</p>
            </div>
        </div>

        <div v-else class="common-table-wrapper">
            <table class="common-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Last meeting</th>
                        <th>Next meeting</th>
                        <th width="50"></th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="contact in processedContacts" :key="contact.id">
                        <td>
                            <div class="table-cell-with-avatar">
                                <div class="table-avatar">
                                    {{ (contact.name || contact.email).charAt(0).toUpperCase() }}
                                </div>
                                <div class="table-cell-details">
                                    <div class="table-cell-title">
                                        {{ contact.name || contact.email }}
                                        <PhStar 
                                            v-if="contact.is_favorite" 
                                            :size="16" 
                                            weight="fill"
                                            class="favorite-icon"
                                        />
                                    </div>
                                    <div class="table-cell-subtitle">{{ contact.email }}</div>
                                </div>
                            </div>
                        </td>
                        <td>
                            <div v-if="contact.raw_last_meeting" class="meeting-text">
                                {{ contact.last_meeting }}
                            </div>
                            <div v-else class="table-no-data">-</div>
                        </td>
                        <td>
                            <div v-if="contact.raw_next_meeting" class="meeting-text upcoming">
                                {{ contact.next_meeting }}
                            </div>
                            <div v-else class="table-no-data">-</div>
                        </td>
                        <td class="table-action-cell">
                            <button
                                class="c-button secondary icon"
                                v-dropdown="{ 
                                    component: MenusComponent,
                                    properties: {
                                        menus: getContactMenus(contact)
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
    </div>
</template>

<style scoped>

@import '@global/common-table/style.css';
/* Component specific styles only */

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

/* Contact specific styles */
.favorite-icon {
    color: #000;
    flex-shrink: 0;
}




</style>