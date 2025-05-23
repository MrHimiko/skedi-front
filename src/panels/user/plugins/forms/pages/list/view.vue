<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { common } from '@utils/common';
import { FormsService } from '@user_forms/services/forms';

import MainLayout from '@layouts/main/view.vue';
import HeadingComponent from '@global/heading/view.vue';
import Button from '@form/button/view.vue';
import TableComponent from '@global/table/view.vue';
import Notice from '@global/notice/view.vue';

import { PhPlus, PhPencil, PhTrash, PhCopy, PhCalendar } from "@phosphor-icons/vue";

const router = useRouter();
const forms = ref([]);
const isLoading = ref(true);

// Table configuration
const tableHeadings = ['Name', 'Events', 'Created', 'Updated', 'Status', 'Actions'];
const tableKeys = ['name', 'events', 'created_at', 'updated_at', 'status', 'actions'];

// Load forms from API
const loadForms = async () => {
    try {
        isLoading.value = true;
        const formsData = await FormsService.getForms(false); // Don't use cache for initial load
        
        // Process forms data to add computed properties
        const processedForms = formsData.map((form) => {
            return {
                ...form,
                events: form.events_count || 0,
                created_at: new Date(form.created).toLocaleDateString(),
                updated_at: new Date(form.updated).toLocaleDateString(),
                status: form.is_active ? 'Published' : 'Draft'
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

// Create a new form
const createForm = () => {
    router.push('/forms/new/edit');
};

// Edit a form
const editForm = (id) => {
    router.push(`/forms/${id}/edit`);
};

// Delete a form
const deleteForm = async (form) => {
    if (confirm(`Are you sure you want to delete "${form.name}"? This action cannot be undone.`)) {
        try {
            await FormsService.deleteForm(form.id);
            common.notification('Form deleted successfully', true);
            // Reload forms
            await loadForms();
        } catch (error) {
            console.error('Failed to delete form:', error);
            common.notification('Failed to delete form', false);
        }
    }
};

// Duplicate a form
const duplicateForm = async (form) => {
    try {
        await FormsService.duplicateForm(form.id);
        common.notification('Form duplicated successfully', true);
        // Reload forms
        await loadForms();
    } catch (error) {
        console.error('Failed to duplicate form:', error);
        common.notification('Failed to duplicate form', false);
    }
};

// Format events display
const formatEventsDisplay = (form) => {
    if (form.events === 0) {
        return 'No events';
    } else if (form.events === 1) {
        return '1 event';
    } else {
        return `${form.events} events`;
    }
};

// Get events tooltip content
const getEventsTooltip = (form) => {
    if (form.events === 0) {
        return 'No events attached to this form';
    }
    
    return `${form.events} events attached`;
};
</script>

<template>
    <main-layout>
        <template #content>
            <div class="container-lg">
                <HeadingComponent title="Forms">
                    <template #right>
                        <Button 
                            :iconLeft="{ component: PhPlus, weight: 'bold' }" 
                            label="Create Form" 
                            @click="createForm"
                        />
                    </template>
                </HeadingComponent>
                
                <div class="p-xl"></div>
                
                <div v-if="isLoading" class="loading-container flex-center">
                    <p>Loading forms...</p>
                </div>
                
                <div v-else-if="forms.length === 0" class="empty-state">
                    <Notice 
                        description="You haven't created any forms yet. Click the 'Create Form' button to get started." 
                        icon="info"
                        as="suggest"
                    />
                </div>
                
                <TableComponent
                    v-else
                    :headings="tableHeadings"
                    :keys="tableKeys"
                    :values="forms"
                    sticky
                >
                    <template #cell="{ row, key, keyIndex, cell }">
                        <!-- Events column -->
                        <span 
                            v-if="key === 'events'" 
                            class="events-cell"
                            :class="{ 'has-events': row.events > 0 }"
                            v-tooltip="{ content: getEventsTooltip(row) }"
                        >
                            <PhCalendar :weight="row.events > 0 ? 'bold' : 'regular'" size="16" />
                            {{ formatEventsDisplay(row) }}
                        </span>
                        
                        <!-- Status column with badge -->
                        <span 
                            v-else-if="key === 'status'" 
                            class="status-badge"
                            :class="cell.toLowerCase()"
                        >
                            {{ cell }}
                        </span>
                        
                        <!-- Actions column -->
                        <div v-else-if="key === 'actions'" class="actions-cell">
                            <Button 
                                as="tertiary icon" 
                                :iconLeft="{ component: PhPencil, weight: 'bold' }" 
                                @click="editForm(row.id)"
                                v-tooltip="{ content: 'Edit' }"
                            />
                            <Button 
                                as="tertiary icon" 
                                :iconLeft="{ component: PhCopy, weight: 'bold' }" 
                                @click="duplicateForm(row)"
                                v-tooltip="{ content: 'Duplicate' }"
                            />
                            <Button 
                                as="tertiary icon" 
                                :iconLeft="{ component: PhTrash, weight: 'bold' }" 
                                @click="deleteForm(row)"
                                v-tooltip="{ content: 'Delete' }"
                            />
                        </div>
                        
                        <!-- Name column (make clickable) -->
                        <span 
                            v-else-if="key === 'name'" 
                            class="form-name-cell"
                            @click="editForm(row.id)"
                        >
                            {{ cell }}
                        </span>
                        
                        <!-- Default cell content -->
                        <template v-else>
                            {{ cell }}
                        </template>
                    </template>
                </TableComponent>
            </div>
        </template>
    </main-layout>
</template>

<style scoped>
.loading-container {
    min-height: 200px;
}

.empty-state {
    margin-top: 20px;
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

.actions-cell {
    display: flex;
    gap: 4px;
}

.events-cell {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--text-secondary);
    font-size: 13px;
}

.events-cell.has-events {
    color: var(--text-primary);
}

.form-name-cell {
    cursor: pointer;
    color: var(--brand-default);
    font-weight: 500;
}

.form-name-cell:hover {
    text-decoration: underline;
}
</style>