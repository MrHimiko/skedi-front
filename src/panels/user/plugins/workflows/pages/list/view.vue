<!-- src/panels/user/plugins/workflows/pages/list/view.vue -->
<script setup>
import { ref, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { common } from '@utils/common';
import { popup } from '@utils/popup';
import { WorkflowService } from '@user_workflows/services/workflow';

import MainLayout from '@layouts/main/view.vue';
import HeadingComponent from '@global/heading/view.vue';
import ButtonComponent from '@form/button/view.vue';
import InputComponent from '@form/input/view.vue';
import MenusComponent from '@global/menus/view.vue';
import ConfirmComponent from '@floated/confirm/view.vue';

import WorkflowCreateForm from '@user_workflows/components/form/workflowCreate.vue';

import { PhPlus, PhPencil, PhTrash, PhCopy, PhFlowArrow, PhMagnifyingGlass, PhDotsThree, PhPlay, PhPause } from "@phosphor-icons/vue";

const router = useRouter();
const workflows = ref([]);
const isLoading = ref(true);
const searchQuery = ref('');

// Load workflows from API
const loadWorkflows = async () => {
    try {
        isLoading.value = true;
        const response = await WorkflowService.getWorkflows();
        
        if (response && response.data) {
            const processedWorkflows = response.data.map((workflow) => {
                return {
                    ...workflow,
                    organization_name: workflow.organization_name || 'Not assigned',
                    created_date: new Date(workflow.created_at).toLocaleDateString(),
                    updated_date: new Date(workflow.updated_at).toLocaleDateString(),
                    status_display: workflow.status.charAt(0).toUpperCase() + workflow.status.slice(1),
                    steps_count: workflow.flow_data?.steps?.length || 0,
                    trigger_display: getTriggerDisplayName(workflow.trigger_type)
                };
            });
            
            workflows.value = processedWorkflows;
        }
    } catch (error) {
        console.error('Failed to load workflows:', error);
        common.notification('Failed to load workflows', false);
    } finally {
        isLoading.value = false;
    }
};

onMounted(() => {
    loadWorkflows();
});

// Filter workflows based on search
const filteredWorkflows = ref([]);
function filterWorkflows() {
    if (!searchQuery.value) {
        filteredWorkflows.value = workflows.value;
        return;
    }
    
    const query = searchQuery.value.toLowerCase();
    filteredWorkflows.value = workflows.value.filter(workflow => 
        workflow.name.toLowerCase().includes(query) ||
        workflow.organization_name.toLowerCase().includes(query)
    );
}

// Update filtered workflows when search changes
onMounted(() => {
    loadWorkflows().then(() => {
        filteredWorkflows.value = workflows.value;
    });
});

watch([searchQuery, workflows], () => {
    filterWorkflows();
});

// Get trigger display name
const getTriggerDisplayName = (triggerType) => {
    const triggers = {
        'booking.created': 'Booking Created',
        'booking.updated': 'Booking Updated',
        'booking.cancelled': 'Booking Cancelled'
    };
    return triggers[triggerType] || triggerType;
};

// Create a new workflow
const createWorkflow = () => {
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
};

// Edit a workflow
const editWorkflow = (workflow) => {
    router.push(`/workflows/${workflow.id}`);
};

// Delete a workflow
const deleteWorkflow = (workflow) => {
    popup.open(
        'delete-workflow-confirm',
        null,
        ConfirmComponent,
        {
            as: 'red',
            description: `Are you sure you want to delete "${workflow.name}"?`,
            type: 'delete',
            endpoint: `user/workflows/${workflow.id}`,
            callback: async (response, success) => {
                if (success) {
                    common.notification('Workflow deleted successfully', true);
                    await loadWorkflows();
                }
                popup.close();
            }
        }
    );
};

// Duplicate a workflow
const duplicateWorkflow = async (workflow) => {
    try {
        const response = await WorkflowService.duplicateWorkflow(workflow.id);
        
        if (response && response.success) {
            common.notification('Workflow duplicated successfully', true);
            await loadWorkflows();
        }
    } catch (error) {
        common.notification('Failed to duplicate workflow', false);
    }
};

// Toggle workflow status
const toggleStatus = async (workflow) => {
    const newStatus = workflow.status === 'active' ? 'inactive' : 'active';
    
    try {
        const response = await WorkflowService.updateWorkflow(workflow.id, {
            status: newStatus
        });
        
        if (response && response.success) {
            workflow.status = newStatus;
            workflow.status_display = newStatus.charAt(0).toUpperCase() + newStatus.slice(1);
            common.notification(`Workflow ${newStatus === 'active' ? 'activated' : 'deactivated'}`, true);
        }
    } catch (error) {
        common.notification('Failed to update workflow status', false);
    }
};

// Get workflow menu
const getWorkflowMenus = (workflow) => {
    return [
        {
            label: 'Edit',
            iconComponent: PhPencil,
            onClick: () => editWorkflow(workflow)
        },
        {
            label: workflow.status === 'active' ? 'Deactivate' : 'Activate',
            iconComponent: workflow.status === 'active' ? PhPause : PhPlay,
            onClick: () => toggleStatus(workflow)
        },
        {
            label: 'Duplicate',
            iconComponent: PhCopy,
            onClick: () => duplicateWorkflow(workflow)
        },
        {
            label: 'Delete',
            iconComponent: PhTrash,
            onClick: () => deleteWorkflow(workflow)
        }
    ];
};

// Get status class
const getStatusClass = (status) => {
    return status.toLowerCase();
};
</script>

<template>
    <MainLayout>
        <template #content>
            <!-- Header -->
            <heading-component 
                title="Workflows" 
                description="Create and manage custom workflows for your events"
            />

            <!-- Search & Create -->
            <div class="controls-section">
                <div class="search-wrapper">
                    <input-component
                        v-model="searchQuery"
                        placeholder="Search workflows..."
                        :iconLeft="{ component: PhMagnifyingGlass }"
                    />
                </div>
                
                <div>
                    <button-component 
                        label="Create Workflow"
                        :iconLeft="{ component: PhPlus, weight: 'bold' }"
                        @click="createWorkflow"
                    />
                </div>
            </div>

            <!-- Loading State -->
            <div v-if="isLoading" class="loading-state">
                <div class="loading-content">
                    <div class="loading-spinner"></div>
                    <p>Loading workflows...</p>
                </div>
            </div>

            <!-- Empty State -->
            <div v-else-if="!filteredWorkflows.length" class="empty-state-wrapper">
                <div class="empty-state">
                    <div class="empty-icon">
                        <PhFlowArrow :size="48" weight="thin" />
                    </div>
                    <h3 class="empty-title">
                        {{ searchQuery ? 'No workflows found' : 'No workflows yet' }}
                    </h3>
                    <p class="empty-description">
                        {{ searchQuery 
                            ? 'Try adjusting your search terms.' 
                            : "You haven't created any workflows yet. Click the 'Create Workflow' button to get started." 
                        }}
                    </p>
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
                            <th>Steps</th>
                            <th>Updated</th>
                            <th width="50"></th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="workflow in filteredWorkflows" :key="workflow.id">
                            <td>
                                <div class="workflow-name-cell" @click="editWorkflow(workflow)">
                                    {{ workflow.name }}
                                </div>
                            </td>
                            <td>
                                <span class="org-name">{{ workflow.organization_name }}</span>
                            </td>
                            <td>
                                <span class="trigger-type">
                                    {{ workflow.trigger_display }}
                                </span>
                            </td>
                            <td>
                                <span 
                                    class="status-badge"
                                    :class="getStatusClass(workflow.status)"
                                >
                                    {{ workflow.status_display }}
                                </span>
                            </td>
                            <td>
                                <div 
                                    class="steps-cell"
                                    :class="{ 'has-steps': workflow.steps_count > 0 }"
                                >
                                    <PhFlowArrow 
                                        :weight="workflow.steps_count > 0 ? 'fill' : 'regular'" 
                                        :size="16" 
                                    />
                                    <span>{{ workflow.steps_count }}</span>
                                </div>
                            </td>
                            <td>
                                <span class="date-text">{{ workflow.updated_date }}</span>
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
    border: 3px solid var(--border);
    border-top-color: var(--primary);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 16px;
}

@keyframes spin {
    to { transform: rotate(360deg); }
}

/* Controls Section */
.controls-section {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    margin-bottom: 24px;
}

.search-wrapper {
    flex: 1;
    max-width: 400px;
}

/* Empty State */
.empty-state-wrapper {
    background: var(--background-0);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 60px 20px;
}

.empty-state {
    text-align: center;
    max-width: 400px;
    margin: 0 auto;
}

.empty-icon {
    color: var(--text-tertiary);
    margin-bottom: 16px;
}

.empty-title {
    font-size: 18px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 8px 0;
}

.empty-description {
    font-size: 14px;
    color: var(--text-secondary);
    margin: 0;
    line-height: 1.5;
}

/* Workflow Name Cell */
.workflow-name-cell {
    font-weight: 500;
    color: var(--text-primary);
    cursor: pointer;
    transition: color 0.2s;
}

.workflow-name-cell:hover {
    color: var(--primary);
}

/* Organization Name */
.org-name {
    color: var(--text-secondary);
    font-size: 14px;
}

/* Trigger Type */
.trigger-type {
    color: var(--text-secondary);
    font-size: 14px;
}

/* Status Badge */
.status-badge {
    display: inline-block;
    padding: 4px 12px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 500;
    text-transform: capitalize;
}

.status-badge.active {
    background: rgba(34, 197, 94, 0.1);
    color: #22c55e;
}

.status-badge.inactive {
    background: rgba(156, 163, 175, 0.1);
    color: #9ca3af;
}

.status-badge.draft {
    background: rgba(251, 191, 36, 0.1);
    color: #fbbf24;
}

/* Steps Cell */
.steps-cell {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--text-tertiary);
}

.steps-cell.has-steps {
    color: var(--primary);
}

.steps-cell span {
    font-size: 14px;
    font-weight: 500;
}

/* Date Text */
.date-text {
    color: var(--text-secondary);
    font-size: 14px;
}

/* Responsive */
@media (max-width: 768px) {
    .controls-section {
        flex-direction: column;
        align-items: stretch;
    }
    
    .search-wrapper {
        max-width: 100%;
    }
}
</style>