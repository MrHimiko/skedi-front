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
                        />
                    </div>
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
                                            <component 
                                                :is="getReasonIcon(entry.reason)" 
                                                :size="20" 
                                                weight="light" 
                                            />
                                        </div>
                                        <div class="table-cell-details">
                                            <div class="table-cell-title">
                                                {{ formatDateRange(entry.start_time, entry.end_time) }}
                                            </div>
                                            <div class="table-cell-subtitle" v-if="entry.reason && entry.reason !== 'Unspecified'">
                                                {{ entry.reason }}
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
import { ref, computed, onMounted, h } from 'vue';
import { api } from '@utils/api';
import { popup } from '@utils/popup';
import { common } from '@utils/common';

// Layout and Components
import MainLayout from '@layouts/main/view.vue';
import HeadingComponent from '@global/heading/view.vue';
import ButtonComponent from '@form/button/view.vue';
import InputComponent from '@form/input/view.vue';
import OutOfOfficeForm from '@user_availability/components/outOfOfficeForm.vue';
import MenusComponent from '@global/menus/view.vue';
import ConfirmComponent from '@floated/confirm/view.vue';


// Add this method
function getReasonIcon(reason) {
    const iconMap = {
        'Vacation': '🏝️',
        'Travel': '✈️',
        'Sick leave': '🤒',
        'Public holiday': '📅'
    };
    
    // For emojis, return a span component
    if (iconMap[reason]) {
        return {
            render() {
                return h('span', { style: 'font-size: 16px;' }, iconMap[reason]);
            }
        };
    }
    
    // Default to PhXCircle for Unspecified or unknown reasons
    return PhXCircle;
}


// Icons
import { 
    PhPlus, 
    PhMagnifyingGlass,
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
        
        return dateRange.includes(query) || reason.includes(query);
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
        minute: '2-digit'
    };
    
    // Same day
    if (start.toDateString() === end.toDateString()) {
        return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} · ${start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} - ${end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
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

function deleteEntry(entry) {
    popup.open(
        'delete-ooo-confirm',
        null,
        ConfirmComponent,
        {
            as: 'red',
            description: `Are you sure you want to delete this out of office entry?`,
            callback: async () => {
                try {
                    const response = await api.delete(`user/out-of-office/${entry.id}`);
                    if (response.success) {
                        common.notification('Out of office deleted', true);
                        popup.close();
                        await loadEntries();
                    } else {
                        common.notification('Failed to delete', false);
                    }
                } catch (error) {
                    common.notification('An error occurred', false);
                }
            }
        },
        {
            position: 'center'
        }
    );
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

.loading-state,
.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 48px;
    color: var(--text-secondary);
}

.empty-state-content {
    text-align: center;
}

.empty-icon {
    margin-bottom: 16px;
        display: flex;
    justify-content: center;
}

.empty-title {
    font-size: 18px;
    font-weight: 600;
    margin-bottom: 8px;
    color: var(--text-primary);
}

.empty-description {
    margin-bottom: 20px;
    color: var(--text-secondary);
}

.loading-content {
    text-align: center;
}

.loading-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid var(--border);
    border-top-color: var(--primary);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 16px;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}
</style>