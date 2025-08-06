<!-- src/panels/user/plugins/workflows/pages/list/view.vue -->
<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '@utils/api';
import { common } from '@utils/common';
import { popup } from '@utils/popup';
import { UserStore } from '@stores/user';

// Layout & Components
import MainLayout from '@layouts/main/view.vue';
import HeadingComponent from '@global/heading/view.vue';
import Button from '@form/button/view.vue';
import MenusComponent from '@global/menus/view.vue';
import ConfirmComponent from '@floated/confirm/view.vue';

// Workflow Components
import WorkflowCreateForm from '@user_workflows/components/form/workflowCreate.vue';

// Icons
import { 
    PhPlus, 
    PhDotsThree, 
    PhPencil, 
    PhTrash, 
    PhCopy,
    PhPlay,
    PhPause,
    PhGitBranch
} from "@phosphor-icons/vue";

const router = useRouter();
const userStore = UserStore();

// State
const workflows = ref([]);
const isLoading = ref(true);

// Load workflows from all user organizations
async function loadWorkflows() {
    try {
        isLoading.value = true;
        const response = await api.get('user/workflows');
        
        if (response && response.success) {
            workflows.value = response.data.data || [];
        }
    } catch (error) {
        console.error('Error loading workflows:', error);
        common.notification('Failed to load workflows', false);
    } finally {
        isLoading.value = false;
    }
}

// Create workflow
function createWorkflow() {
    popup.open(
        'create-workflow',
        null,
        WorkflowCreateForm,
        {
            callback: (response, success) => {
                if (success && response.data) {
                    router.push(`/workflows/${response.data.id}`);
                }
            }
        }
    );
}

// Edit workflow
function editWorkflow(workflow) {
    router.push(`/workflows/${workflow.id}`);
}

// Duplicate workflow
async function duplicateWorkflow(workflow) {
    try {
        const duplicateData = {
            organization_id: workflow.organization_id,
            name: `${workflow.name} (Copy)`,
            description: workflow.description,
            trigger_type: workflow.trigger_type,
            trigger_config: workflow.trigger_config,
            status: 'draft'
        };
        
        const response = await api.post('user/workflows', duplicateData);
        
        if (response && response.success) {
            common.notification('Workflow duplicated successfully', true);
            loadWorkflows();
        }
    } catch (error) {
        common.notification('Failed to duplicate workflow', false);
    }
}

// Toggle workflow status
async function toggleWorkflowStatus(workflow) {
    const newStatus = workflow.status === 'active' ? 'inactive' : 'active';
    
    try {
        const response = await api.patch(`user/workflows/${workflow.id}`, {
            status: newStatus
        });
        
        if (response && response.success) {
            workflow.status = newStatus;
            common.notification(`Workflow ${newStatus === 'active' ? 'activated' : 'deactivated'}`, true);
        }
    } catch (error) {
        common.notification('Failed to update workflow status', false);
    }
}

// Delete workflow
function deleteWorkflow(workflow) {
    popup.open(
        'delete-workflow',
        null,
        ConfirmComponent,
        {
            as: 'red',
            description: `Are you sure you want to delete "${workflow.name}"? This action cannot be undone.`,
            callback: async (confirmed) => {
                if (confirmed) {
                    try {
                        const response = await api.delete(`user/workflows/${workflow.id}`);
                        
                        if (response && response.success) {
                            common.notification('Workflow deleted successfully', true);
                            loadWorkflows();
                        }
                    } catch (error) {
                        common.notification('Failed to delete workflow', false);
                    }
                }
                popup.close();
            }
        }
    );
}

// Get workflow menus
function getWorkflowMenus(workflow) {
    return [
        {
            label: 'Edit',
            iconComponent: PhPencil,
            onClick: () => editWorkflow(workflow)
        },
        {
            label: 'Duplicate',
            iconComponent: PhCopy,
            onClick: () => duplicateWorkflow(workflow)
        },
        {
            label: workflow.status === 'active' ? 'Deactivate' : 'Activate',
            iconComponent: workflow.status === 'active' ? PhPause : PhPlay,
            onClick: () => toggleWorkflowStatus(workflow)
        },
        {
            label: 'Delete',
            iconComponent: PhTrash,
            onClick: () => deleteWorkflow(workflow),
            as: 'danger'
        }
    ];
}

// Format date
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString();
}

// Get status badge class
function getStatusClass(status) {
    switch (status) {
        case 'active':
            return 'status-active';
        case 'inactive':
            return 'status-inactive';
        case 'draft':
            return 'status-draft';
        default:
            return '';
    }
}

// Get trigger type display name
function getTriggerDisplayName(triggerType) {
    const triggerMap = {
        'booking.created': 'Booking Created',
        'booking.updated': 'Booking Updated',
        'booking.cancelled': 'Booking Cancelled',
        'booking.reminder': 'Booking Reminder',
        'form.submitted': 'Form Submitted',
        'time.scheduled': 'Scheduled Time'
    };
    
    return triggerMap[triggerType] || triggerType;
}

// Lifecycle
onMounted(() => {
    loadWorkflows();
});
</script>

<template>
    <MainLayout>

        <template #content>

            <HeadingComponent 
                title="Workflows"
                description="Automate your scheduling with powerful workflows"
            />


            <!-- Loading State -->
            <div v-if="isLoading" class="loading-state">
                <div class="loading-content">
                    <div class="loading-spinner"></div>
                    <p>Loading workflows...</p>
                </div>
            </div>
            
            <!-- Empty State -->
            <div v-else-if="!workflows.length" class="empty-state">
                <div class="empty-state-content">
                    <PhGitBranch :size="48" weight="thin" />
                    <h3>No workflows yet</h3>
                    <p>Create your first workflow to start automating your scheduling tasks</p>
                    <Button
                        :iconLeft="{ component: PhPlus, weight: 'bold' }"
                        label="Create Workflow"
                        @click="createWorkflow"
                    />
                </div>
            </div>
            
            <!-- Workflows Table -->
            <div v-else class="common-table-wrapper">
                <table class="common-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Organization</th>
                            <th>Trigger</th>
                            <th>Status</th>
                            <th>Created</th>
                            <th>Updated</th>
                            <th width="50"></th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="workflow in workflows" :key="workflow.id">
                            <td>
                                <div class="workflow-name-cell" @click="editWorkflow(workflow)">
                                    {{ workflow.name }}
                                    <span v-if="workflow.description" class="workflow-description">
                                        {{ workflow.description }}
                                    </span>
                                </div>
                            </td>
                            <td>
                                <span class="org-name">{{ workflow.organization_name }}</span>
                            </td>
                            <td>
                                <span class="trigger-type">
                                    {{ getTriggerDisplayName(workflow.trigger_type) }}
                                </span>
                            </td>
                            <td>
                                <span 
                                    class="status-badge"
                                    :class="getStatusClass(workflow.status)"
                                >
                                    {{ workflow.status }}
                                </span>
                            </td>
                            <td>
                                <span class="date-text">{{ formatDate(workflow.created_at) }}</span>
                            </td>
                            <td>
                                <span class="date-text">{{ formatDate(workflow.updated_at) }}</span>
                            </td>
                            <td class="table-action-cell">
                                <button
                                    class="c-button secondary icon"
                                    v-dropdown="{ 
                                        component: MenusComponent,
                                        properties: {
                                            menus: getWorkflowMenus(workflow)
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
            
        </template>
    </MainLayout>
</template>

<style scoped>
@import '@global/common-table/style.css';

.workflows-page {
    padding: 24px;
    max-width: 1400px;
    margin: 0 auto;
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

.empty-state-content svg {
    color: var(--text-tertiary);
    margin-bottom: 16px;
}

.empty-state-content h3 {
    font-size: 20px;
    font-weight: 600;
    margin-bottom: 8px;
    color: var(--text-primary);
}

.empty-state-content p {
    color: var(--text-secondary);
    margin-bottom: 24px;
}

/* Table Styles */
.workflow-name-cell {
    cursor: pointer;
    color: var(--brand-default);
    font-weight: 500;
}

.workflow-name-cell:hover {
    text-decoration: underline;
}

.workflow-description {
    display: block;
    font-size: 12px;
    color: var(--text-secondary);
    font-weight: 400;
    margin-top: 2px;
}

.org-name {
    color: var(--text-secondary);
    font-size: 14px;
}

.trigger-type {
    font-size: 14px;
    color: var(--text-secondary);
}

.status-badge {
    display: inline-block;
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 500;
    text-transform: capitalize;
}

.status-badge.status-active {
    background-color: var(--green-fill);
    color: var(--green-default);
}

.status-badge.status-inactive {
    background-color: var(--orange-fill);
    color: var(--orange-default);
}

.status-badge.status-draft {
    background-color:var(--background-2);
}

.date-text {
    color: var(--text-secondary);
    font-size: 14px;
}

.table-action-cell {
    text-align: center;
}
</style>