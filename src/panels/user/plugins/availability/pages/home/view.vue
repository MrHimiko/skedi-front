<template>
    <MainLayout>
        <template #content>
            <div class="availability-page">
                <div class="header-section">
                    <HeadingComponent 
                        title="Out of office"
                        description="Let your bookers know when you're OOO."
                    />
                    
                </div>

                <!-- Search and Filter Bar -->
                <div class="toolbar">
                    <div class="search-wrapper">
                        <InputComponent
                            v-model="searchQuery"
                            placeholder="Search"
                            type="search"
                            size="sm"
                            icon="PhMagnifyingGlass"
                        />
                    </div>

                    <div>
                    <ButtonComponent
                        label="Add new OOO"
                        :iconLeft="{ component: PhPlus }"
                        type="primary"
                        size="sm"
                        v-popup="{
                            component: OutOfOfficeForm,
                            overlay: { position: 'center' },
                            properties: {
                                callback: handleAddCallback
                            }
                        }"
                    /></div>
                    
                   
                </div>

                <!-- Out of Office Table -->
                <div class="common-table-wrapper">
                    <table class="common-table" v-if="!loading && filteredEntries.length > 0">
                        <thead>
                            <tr>
                                <th>Out of office ({{ filteredEntries.length }})</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr 
                                v-for="entry in filteredEntries" 
                                :key="entry.id"
                                class="table-row"
                            >
                                <td>
                                    <div class="table-cell-with-avatar">
                                        <div class="table-avatar">
                                            <PhXCircle :size="20" weight="light" />
                                        </div>
                                        <div class="table-cell-details">
                                            <div class="table-cell-title">
                                                {{ formatDateRange(entry.start_time, entry.end_time) }}
                                            </div>
                                            <div class="table-cell-subtitle">
                                                <span>No forwarding</span>
                                                <span v-if="entry.reason !== 'Unspecified'">
                                                    • Reason: {{ entry.reason }}
                                                </span>
                                                <span v-if="entry.notes">
                                                    • Notes: {{ entry.notes }}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td class="table-action-cell">
                                    <button
                                        class="c-button secondary icon"
                                        v-dropdown="{ 
                                            component: MenusComponent,
                                            properties: {
                                                menus: getEntryMenus(entry)
                                            }
                                        }"
                                    >
                                        <PhDotsThree :size="20" weight="bold" />
                                    </button>
                                </td>
                            </tr>
                        </tbody>
                    </table>

                    <!-- Loading State -->
                    <div v-if="loading" class="loading-state">
                        <div class="loading-content">
                            <div class="loading-spinner"></div>
                            <p>Loading...</p>
                        </div>
                    </div>
                    
                    <!-- Empty State -->
                    <div v-else-if="filteredEntries.length === 0" class="empty-state">
                        <div class="empty-state-content">
                            <div class="empty-icon">
                                <PhCalendarBlank :size="48" weight="light" />
                            </div>
                            <h3 class="empty-title">No out of office entries</h3>
                            <p class="empty-description">Set your out of office to let bookers know when you're unavailable</p>
                            <ButtonComponent
                                label="Add Out of Office"
                                :iconLeft="{ component: PhPlus, weight: 'bold' }"
                                type="primary"
                                v-popup="{
                                    component: OutOfOfficeForm,
                                    overlay: { position: 'center' },
                                    properties: {
                                        callback: handleAddCallback
                                    }
                                }"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </template>
    </MainLayout>
</template>

<script setup>
import { ref, computed, onMounted, defineAsyncComponent } from 'vue';
import { api } from '@utils/api';
import { popup } from '@utils/popup';
import { common } from '@utils/common';

// Layout and Components
import MainLayout from '@layouts/main/view.vue';
import HeadingComponent from '@global/heading/view.vue';
import ButtonComponent from '@form/button/view.vue';
import InputComponent from '@form/input/view.vue';
import SelectComponent from '@form/select/view.vue';
import TextareaComponent from '@form/textarea/view.vue';
import OutOfOfficeForm from '@user_availability/components/outOfOfficeForm.vue';
import MenusComponent from '@global/menus/view.vue';
import ConfirmComponent from '@floated/confirm/view.vue';

// Icons
import { 
    PhPlus, 
    PhMagnifyingGlass, 
    PhFaders, 
    PhCaretDown,
    PhCalendarBlank,
    PhXCircle,
    PhPencil,
    PhTrash,
    PhDotsThree
} from "@phosphor-icons/vue";

// State
const entries = ref([]);
const loading = ref(false);
const searchQuery = ref('');

// Computed

const filteredEntries = computed(() => {
    if (!searchQuery.value) return entries.value;
    
    const query = searchQuery.value.toLowerCase();
    return entries.value.filter(entry => {
        const dateRange = formatDateRange(entry.start_time, entry.end_time).toLowerCase();
        const reason = entry.reason?.toLowerCase() || '';
        const notes = entry.notes?.toLowerCase() || '';
        
        return dateRange.includes(query) || reason.includes(query) || notes.includes(query);
    });
});

// Methods
async function loadEntries() {
    loading.value = true;
    try {
        const response = await api.get('user/out-of-office');
        if (response.success) {
            entries.value = response.data || [];
        }
    } catch (error) {
        common.notification('Failed to load out of office entries', false);
    } finally {
        loading.value = false;
    }
}

function handleAddCallback() {
    loadEntries();
}

function formatDateRange(startTime, endTime) {
    // Ensure we're parsing UTC strings as UTC, then converting to local
    const start = new Date(startTime + (startTime.endsWith('Z') ? '' : 'Z'));
    const end = new Date(endTime + (endTime.endsWith('Z') ? '' : 'Z'));
    
    const formatOptions = {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    };
    
    // Same day
    if (start.toDateString() === end.toDateString()) {
        return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} · ${start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })} - ${end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
    }
    
    // Different days
    return `${start.toLocaleDateString('en-US', formatOptions)} - ${end.toLocaleDateString('en-US', formatOptions)}`;
}

// Get menu options for entry
function getEntryMenus(entry) {
    return [
        {
            label: 'Edit',
            iconComponent: PhPencil,
            onClick: () => {
                popup.open(
                    'edit-ooo',
                    null,
                    OutOfOfficeForm,
                    {
                        entry: entry,
                        callback: handleAddCallback
                    },
                    { position: 'center' }
                );
            }
        },
        {
            label: 'Delete',
            iconComponent: PhTrash,
            onClick: () => deleteEntry(entry)
        }
    ];
}

async function deleteEntry(entry) {
    const confirmed = await popup.confirm(
        'Delete out of office entry?',
        'This action cannot be undone.'
    );
    
    if (confirmed) {
        try {
            const response = await api.delete(`user/out-of-office/${entry.id}`);
            if (response.success) {
                common.notification('Out of office deleted', true);
                await loadEntries();
            } else {
                common.notification('Failed to delete', false);
            }
        } catch (error) {
            common.notification('An error occurred', false);
        }
    }
}

// Lifecycle
onMounted(() => {
    loadEntries();
});
</script>

<style scoped>

@import '@global/common-table/style.css';

.availability-page {
    padding: 24px;
    max-width: 1200px;
    margin: 0 auto;
}


.toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
    gap: 16px;
}

.search-wrapper {
    flex: 1;
    max-width: 320px;
}

.filter-actions {
    display: flex;
    gap: 8px;
}

.ooo-list {
    background: var(--background-1);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    overflow: hidden;
}

.list-header {
    padding: 16px;
    border-bottom: 1px solid var(--border);
    font-weight: 600;
    color: var(--text-secondary);
}

.loading-state,
.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 48px;
    color: var(--text-secondary);
}

.empty-state p {
    margin-top: 16px;
}

.entries-list {
    /* No padding needed */
}

.ooo-entry {
    display: flex;
    align-items: center;
    padding: 16px;
    border-bottom: 1px solid var(--border);
    gap: 16px;
}

.ooo-entry:last-child {
    border-bottom: none;
}

.ooo-entry:hover {
    background: var(--background-hover);
}

.entry-icon {
    color: var(--text-secondary);
}

.entry-content {
    flex: 1;
}

.entry-dates {
    font-weight: 500;
    margin-bottom: 4px;
}

.entry-details {
    display: flex;
    gap: 12px;
    font-size: 14px;
    color: var(--text-secondary);
}

.no-forwarding {
    display: inline-flex;
    align-items: center;
}

.entry-notes {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.entry-actions {
    display: flex;
    gap: 4px;
}
</style>