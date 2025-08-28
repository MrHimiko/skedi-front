<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { common } from '@utils/common';
import { popup } from '@utils/popup';
import { FormsService } from '@user_forms/services/forms';

import MainLayout from '@layouts/main/view.vue';
import HeadingComponent from '@global/heading/view.vue';
import ButtonComponent from '@form/button/view.vue';
import InputComponent from '@form/input/view.vue';
import MenusComponent from '@global/menus/view.vue';
import ConfirmComponent from '@floated/confirm/view.vue';

import { PhPlus, PhPencil, PhTrash, PhCopy, PhCalendar, PhMagnifyingGlass, PhDotsThree, PhFile } from "@phosphor-icons/vue";

const router = useRouter();
const forms = ref([]);
const isLoading = ref(true);
const searchQuery = ref('');

// Load forms from API
const loadForms = async () => {
    try {
        isLoading.value = true;
        const formsData = await FormsService.getForms(false);
        
        // Process forms data
        const processedForms = formsData.map((form) => {
            return {
                ...form,
                organization_name: form.organization?.name || 'Not assigned',
                created_date: new Date(form.created).toLocaleDateString(),
                updated_date: new Date(form.updated).toLocaleDateString(),
                status: form.is_active ? 'Published' : 'Draft',
                events_count: form.events || 0
            };
        });
        
        forms.value = processedForms;
    } catch (error) {
        console.error('Failed to load forms:', error);
        common.notification('Failed to load forms', false);
    } finally {
        isLoading.value = false;
    }
};

onMounted(() => {
    loadForms();
});

// Filter forms based on search
const filteredForms = ref([]);
function filterForms() {
    if (!searchQuery.value) {
        filteredForms.value = forms.value;
        return;
    }
    
    const query = searchQuery.value.toLowerCase();
    filteredForms.value = forms.value.filter(form => 
        form.name.toLowerCase().includes(query) ||
        form.organization_name.toLowerCase().includes(query)
    );
}

// Watch for changes
onMounted(() => {
    loadForms().then(() => {
        filteredForms.value = forms.value;
    });
});

// Update filtered forms when search changes
import { watch } from 'vue';
watch([searchQuery, forms], () => {
    filterForms();
});

// Create a new form
const createForm = () => {
    router.push('/forms/new/edit');
};

// Edit a form
const editForm = (form) => {
    router.push(`/forms/${form.id}/edit`);
};

// Delete a form
const deleteForm = (form) => {
    popup.open(
        'delete-form-confirm',
        null,
        ConfirmComponent,
        {
            as: 'red',
            description: `Are you sure you want to delete "${form.name}"? This action cannot be undone.`,
            callback: async () => {
                try {
                    await FormsService.deleteForm(form.id);
                    common.notification('Form deleted successfully', true);
                    popup.close();
                    await loadForms();
                } catch (error) {
                    console.error('Failed to delete form:', error);
                    common.notification('Failed to delete form', false);
                }
            }
        },
        {
            position: 'center'
        }
    );
};

// Duplicate a form
const duplicateForm = async (form) => {
    try {
        await FormsService.duplicateForm(form.id);
        common.notification('Form duplicated successfully', true);
        await loadForms();
    } catch (error) {
        console.error('Failed to duplicate form:', error);
        common.notification('Failed to duplicate form', false);
    }
};

// Get form menus
function getFormMenus(form) {
    return [
        {
            label: 'Edit',
            iconComponent: PhPencil,
            weight: 'regular',
            onClick: () => editForm(form)
        },
        {
            label: 'Duplicate',
            iconComponent: PhCopy,
            weight: 'regular',
            onClick: () => duplicateForm(form)
        },
        {
            label: 'Delete',
            iconComponent: PhTrash,
            weight: 'regular',
            onClick: () => deleteForm(form),
            class: 'danger'
        }
    ];
}

// Format events display
const formatEventsDisplay = (count) => {
    if (count === 0) return 'No events';
    if (count === 1) return '1 event';
    return `${count} events`;
};
</script>

<template>
    <MainLayout>
        <template #content>
            <div class="forms-page">
                <HeadingComponent 
                    title="Forms"
                    description="Create and manage custom forms for your events"
                />

                <div class="controls-section">
                    <div class="left-controls">
                        <div class="search-box">
                            <InputComponent
                                v-model="searchQuery"
                                placeholder="Search forms..."
                                :iconLeft="{ component: PhMagnifyingGlass }"
                            />
                        </div>
                    </div>
                    
                    <div class="right-controls">
                        <ButtonComponent
                            label="Create Form"
                            :iconLeft="{ component: PhPlus }"
                            @click="createForm"
                        />
                    </div>
                </div>

                <div class="forms-content">
                    <!-- Loading State -->
                    <div v-if="isLoading" class="loading-state">
                        <div class="loading-content">
                            <div class="loading-spinner"></div>
                            <p>Loading forms...</p>
                        </div>
                    </div>

                    <!-- Empty State -->
                    <div v-else-if="filteredForms.length === 0" class="empty-state">
                        <div class="empty-state-content">
                            <div class="empty-icon">
                                <PhFile :size="48" weight="thin" />
                            </div>
                            <h3 class="empty-title">
                                {{ searchQuery ? 'No forms found' : 'No forms yet' }}
                            </h3>
                            <p class="empty-description">
                                {{ searchQuery 
                                    ? 'Try adjusting your search terms.' 
                                    : "You haven't created any forms yet. Click the 'Create Form' button to get started." 
                                }}
                            </p>
                        </div>
                    </div>

                    <!-- Forms Table -->
                    <div v-else class="common-table-wrapper">
                        <table class="common-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Organization</th>
                                    <th>Status</th>
                                    <th>Events</th>
                                    <th>Updated</th>
                                    <th width="50"></th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="form in filteredForms" :key="form.id">
                                    <td>
                                        <div class="form-name-cell" @click="editForm(form)">
                                            {{ form.name }}
                                        </div>
                                    </td>
                                    <td>
                                        <span class="org-name">{{ form.organization_name }}</span>
                                    </td>
                                    <td>
                                        <span 
                                            class="status-badge"
                                            :class="form.status.toLowerCase()"
                                        >
                                            {{ form.status }}
                                        </span>
                                    </td>
                                    <td>
                                        <div 
                                            class="events-cell"
                                            :class="{ 'has-events': form.events_count > 0 }"
                                        >
                                            <PhCalendar 
                                                :weight="form.events_count > 0 ? 'fill' : 'regular'" 
                                                :size="16" 
                                            />
                                            {{ formatEventsDisplay(form.events_count) }}
                                        </div>
                                    </td>
                                    <td>
                                        <span class="updated-date">{{ form.updated_date }}</span>
                                    </td>
                                    <td class="table-action-cell">
                                        <button
                                            class="c-button secondary icon"
                                            v-dropdown="{ 
                                                component: MenusComponent,
                                                properties: {
                                                    menus: getFormMenus(form)
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
            </div>
        </template>
    </MainLayout>
</template>

<style scoped>
@import '@global/common-table/style.css';

.forms-page {
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

.search-box {
    flex: 1;
    max-width: 400px;
}

.right-controls {
    display: flex;
    gap: 12px;
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

/* Form specific styles */
.form-name-cell {
    cursor: pointer;
    color: var(--brand-default);
    font-weight: 500;
}

.form-name-cell:hover {
    text-decoration: underline;
}

.org-name,
.updated-date {
    font-size: 14px;
    color: #6B7280;
}

.status-badge {
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 500;
}

.status-badge.published {
    background-color: var(--green-fill);
    color: var(--green-default);
}

.status-badge.draft {
    background-color: var(--blue-fill);
    color: var(--blue-default);
}

.events-cell {
    display: flex;
    align-items: center;
    gap: 6px;
    color: #9CA3AF;
    font-size: 13px;
}

.events-cell.has-events {
    color: #6B7280;
}

/* Responsive */
@media (max-width: 768px) {
    .controls-section {
        flex-direction: column;
        align-items: stretch;
    }
    
    .left-controls {
        width: 100%;
    }
    
    .search-box {
        max-width: none;
    }
    
    .right-controls {
        justify-content: flex-end;
        width: 100%;
    }
}
</style>