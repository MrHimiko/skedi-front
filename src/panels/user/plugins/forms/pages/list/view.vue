<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { common } from '@utils/common';

import MainLayout from '@layouts/main/view.vue';
import HeadingComponent from '@global/heading/view.vue';
import Button from '@form/button/view.vue';
import TableComponent from '@global/table/view.vue';
import Notice from '@global/notice/view.vue';

import { PhPlus, PhPencil, PhTrash, PhCopy } from "@phosphor-icons/vue";

const router = useRouter();
const forms = ref([]);
const isLoading = ref(true);

// Sample table headings and keys
const tableHeadings = ['Name', 'Created', 'Updated', 'Status', 'Actions'];
const tableKeys = ['name', 'created_at', 'updated_at', 'status', 'actions'];

// Load forms from API
onMounted(async () => {
    try {
        isLoading.value = true;
        
        // In production, this would be an API call
        // const response = await api.get('forms');
        // if (response.success) {
        //     forms.value = response.data;
        // }
        
        // For now, use sample data
        setTimeout(() => {
            forms.value = [
                {
                    id: 'form-1',
                    name: 'Contact Form',
                    created_at: '2023-06-15',
                    updated_at: '2023-06-20',
                    status: 'Published'
                },
                {
                    id: 'form-2',
                    name: 'Event Registration',
                    created_at: '2023-07-10',
                    updated_at: '2023-07-12',
                    status: 'Draft'
                }
            ];
            isLoading.value = false;
        }, 500);
    } catch (error) {
        console.error('Failed to load forms:', error);
        isLoading.value = false;
    }
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
const deleteForm = async (id) => {
    if (confirm('Are you sure you want to delete this form?')) {
        try {
            // In production, this would be an API call
            // const response = await api.delete(`forms/${id}`);
            // if (response.success) {
            //     forms.value = forms.value.filter(form => form.id !== id);
            //     common.notification('Form deleted successfully', true);
            // }
            
            // For now, simulate deletion
            forms.value = forms.value.filter(form => form.id !== id);
            common.notification('Form deleted successfully', true);
        } catch (error) {
            console.error('Failed to delete form:', error);
            common.notification('Failed to delete form', false);
        }
    }
};

// Duplicate a form
const duplicateForm = async (id) => {
    try {
        // In production, this would be an API call
        // const response = await api.post(`forms/${id}/duplicate`);
        // if (response.success) {
        //     forms.value.push(response.data);
        //     common.notification('Form duplicated successfully', true);
        // }
        
        // For now, simulate duplication
        const formToDuplicate = forms.value.find(form => form.id === id);
        if (formToDuplicate) {
            const duplicatedForm = {
                ...formToDuplicate,
                id: `form-${Date.now()}`,
                name: `${formToDuplicate.name} (Copy)`,
                created_at: new Date().toLocaleDateString(),
                updated_at: new Date().toLocaleDateString()
            };
            forms.value.push(duplicatedForm);
            common.notification('Form duplicated successfully', true);
        }
    } catch (error) {
        console.error('Failed to duplicate form:', error);
        common.notification('Failed to duplicate form', false);
    }
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
                        <!-- Status column with badge -->
                        <span 
                            v-if="key === 'status'" 
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
                                @click="duplicateForm(row.id)"
                                v-tooltip="{ content: 'Duplicate' }"
                            />
                            <Button 
                                as="tertiary icon" 
                                :iconLeft="{ component: PhTrash, weight: 'bold' }" 
                                @click="deleteForm(row.id)"
                                v-tooltip="{ content: 'Delete' }"
                            />
                        </div>
                        
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
</style>