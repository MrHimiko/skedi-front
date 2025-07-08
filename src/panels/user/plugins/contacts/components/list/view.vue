<script setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { common } from '@utils/common';
import Notice from '@global/notice/view.vue';
import Button from '@form/button/view.vue';
import MenusComponent from '@global/menus/view.vue';
import { PhEnvelope, PhDotsThree, PhStar, PhCalendarCheck, PhShareNetwork, PhTrash, PhAddressBook } from "@phosphor-icons/vue";

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
    
    if (date < now) {
        return `${meeting.event_name} • ${formatDate(meeting.date)}`;
    } else {
        const options = { 
            month: 'short', 
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        };
        return `${meeting.event_name} • ${date.toLocaleDateString('en-US', options)}`;
    }
}

// Process contacts for table
const processedContacts = computed(() => {
    return props.contacts.map(contactData => {
        const contact = contactData.contact;
        return {
            id: contactData.id,
            name: contact.name || contact.email,
            email: contact.email,
            phone: contact.phone,
            last_meeting: formatMeeting(contactData.last_meeting),
            next_meeting: formatMeeting(contactData.next_meeting),
            raw_last_meeting: contactData.last_meeting,
            raw_next_meeting: contactData.next_meeting,
            is_favorite: contactData.organization_contact?.is_favorite || false
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
    emit('toggleFavorite', contact);
}

function deleteContact(contact) {
    if (confirm(`Are you sure you want to remove ${contact.name} from your contacts?`)) {
        emit('deleteContact', contact);
    }
}

// Get dropdown menus for contact
function getContactMenus(contact) {
    return [
        {
            label: 'Send email',
            icon: 'email',
            action: () => sendEmail(contact)
        },
        {
            label: 'Book meeting',
            icon: 'calendar_month',
            action: () => bookMeeting(contact)
        },
        {
            label: 'Share availability',
            icon: 'share',
            action: () => shareAvailability(contact)
        },
        {
            label: contact.is_favorite ? 'Remove from favorites' : 'Add to favorites',
            icon: 'star',
            action: () => toggleFavorite(contact)
        },
        {
            label: 'Remove',
            icon: 'delete',
            action: () => deleteContact(contact),
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

        <div v-else class="contacts-table-wrapper">
            <table class="contacts-table">
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
                        <td class="contact-info">
                            <div class="contact-name-wrapper">
                                <div class="contact-avatar">
                                    {{ (contact.name || contact.email).charAt(0).toUpperCase() }}
                                </div>
                                <div class="contact-details">
                                    <div class="contact-name">
                                        {{ contact.name || contact.email }}
                                        <PhStar 
                                            v-if="contact.is_favorite" 
                                            :size="16" 
                                            weight="fill"
                                            class="favorite-icon"
                                        />
                                    </div>
                                    <div class="contact-email">{{ contact.email }}</div>
                                </div>
                            </div>
                        </td>
                        <td class="meeting-info">
                            <div v-if="contact.raw_last_meeting" class="meeting-text">
                                {{ contact.last_meeting }}
                            </div>
                            <div v-else class="no-meeting">-</div>
                        </td>
                        <td class="meeting-info">
                            <div v-if="contact.raw_next_meeting" class="meeting-text upcoming">
                                {{ contact.next_meeting }}
                            </div>
                            <div v-else class="no-meeting">-</div>
                        </td>
                        <td class="actions-cell">
                            <!-- Single dropdown menu with all actions -->
                            <div 
                                class="c-button tertiary icon size36"
                                v-dropdown="{ 
                                    component: MenusComponent,
                                    properties: {
                                        menus: getContactMenus(contact)
                                    }
                                }"
                            >
                                <PhDotsThree :size="20" />
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</template>

<style scoped>
.contacts-list {
    background: white;
    border-radius: 8px;
    overflow: hidden;
    min-height: 400px;
}

/* Loading State */
.loading-state {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 60px 20px;
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
    margin: 0 auto 16px;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    to { transform: rotate(360deg); }
}

.loading-content p {
    color: #6B7280;
    font-size: 14px;
}

/* Empty State */
.empty-state {
    padding: 60px 20px;
    text-align: center;
}

.empty-state-content {
    max-width: 450px;
    margin: 0 auto;
}

.empty-icon {
    color: #9CA3AF;
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

/* Table Styles */
.contacts-table-wrapper {
    overflow-x: auto;
}

.contacts-table {
    width: 100%;
    border-collapse: collapse;
}

.contacts-table th {
    text-align: left;
    padding: 16px;
    font-weight: 500;
    color: #6B7280;
    border-bottom: 1px solid #E5E7EB;
    font-size: 14px;
}

.contacts-table td {
    padding: 16px;
    border-bottom: 1px solid #F3F4F6;
}

.contacts-table tbody tr:last-child td {
    border-bottom: none;
}

.contact-info {
    min-width: 250px;
}

.contact-name-wrapper {
    display: flex;
    align-items: center;
    gap: 12px;
}

.contact-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background-color: #E5E7EB;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 500;
    color: #4B5563;
    flex-shrink: 0;
}

.contact-details {
    min-width: 0;
}

.contact-name {
    font-weight: 500;
    color: #111827;
    display: flex;
    align-items: center;
    gap: 6px;
}

.favorite-icon {
    color: #FBBF24;
    flex-shrink: 0;
}

.contact-email {
    font-size: 14px;
    color: #6B7280;
}

.meeting-info {
    min-width: 200px;
}

.meeting-text {
    font-size: 14px;
    color: #6B7280;
}

.meeting-text.upcoming {
    color: #059669;
    font-weight: 500;
}

.no-meeting {
    color: #D1D5DB;
}

.actions-cell {
    width: 50px;
    text-align: center;
}



/* Responsive */
@media (max-width: 768px) {
    .contacts-table {
        font-size: 14px;
    }
    
    .contacts-table th,
    .contacts-table td {
        padding: 12px;
    }
    
    .contact-avatar {
        width: 36px;
        height: 36px;
        font-size: 14px;
    }
}
</style>