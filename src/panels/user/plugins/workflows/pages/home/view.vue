// src/panels/user/plugins/workflows/pages/home/view.vue
<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '@utils/api';
import { popup } from '@utils/popup';
import { UserStore } from '@stores/user';
import { mergeOrganizationsAndTeams } from '@user_shared/utils/js/organization-structure.js';

// Layouts and components
import MainLayout from '@layouts/main/view.vue';
import HeadingComponent from '@global/heading/view.vue';
import ButtonComponent from '@form/button/view.vue';
import MenusComponent from '@global/menus/view.vue';
import SelectComponent from '@form/select/view.vue';
import InputComponent from '@form/input/view.vue';

// Workflow components
import WorkflowCreateForm from '@user_workflows/components/form/workflowCreate.vue';
import ConfirmComponent from '@floated/confirm/view.vue';

// Icons
import { 
    PhPlus, 
    PhFlowArrow, 
    PhDotsThree,
    PhPencil,
    PhTrash,
    PhCopy,
    PhPause,
    PhPlay,
    PhMagnifyingGlass
} from "@phosphor-icons/vue";

const userStore = UserStore();
const router = useRouter();

// State
const workflows = ref([]);
const loading = ref(true);
const searchQuery = ref('');
const selectedOrganization = ref(null);
const organizations = ref([]);

// Computed
const filteredWorkflows = computed(() => {
    let filtered = workflows.value;
    
    if (searchQuery.value) {
        const query = searchQuery.value.toLowerCase();
        filtered = filtered.filter(w => 
            w.name.toLowerCase().includes(query) ||
            w.description?.toLowerCase().includes(query)
        );
    }
    
    if (selectedOrganization.value) {
        filtered = filtered.filter(w => w.organization_id === selectedOrganization.value);
    }
    
    return filtered;
});

const organizationOptions = computed(() => {
    return organizations.value.map(org => ({
        label: org.name,
        value: org.id
    }));
});

// Methods
async function loadWorkflows() {
    try {
        loading.value = true;
        
        const params = {};
        if (selectedOrganization.value) {
            params.organization_id = selectedOrganization.value;
        }
        
        const response = await api.get('user/workflows', params);
        
        if (response.success) {
            workflows.value = response.data.data || [];
        }
    } catch (error) {
        console.error('Failed to load workflows:', error);
    } finally {
        loading.value = false;
    }
}

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
            label: workflow.status === 'active' ? 'Pause' : 'Activate',
            iconComponent: workflow.status === 'active' ? PhPause : PhPlay,
            onClick: () => toggleWorkflowStatus(workflow)
        },
        {
            label: 'Delete',
            iconComponent: PhTrash,
            onClick: () => deleteWorkflow(workflow)
        }
    ];
}

function editWorkflow(workflow) {
    router.push(`/workflows/${workflow.id}`);
}

async function duplicateWorkflow(workflow) {
    try {
        const response = await api.post(`user/workflows/${workflow.id}/duplicate`);
        if (response.success) {
            await loadWorkflows();
        }
    } catch (error) {
        console.error('Failed to duplicate workflow:', error);
    }
}

async function toggleWorkflowStatus(workflow) {
    try {
        const newStatus = workflow.status === 'active' ? 'inactive' : 'active';
        const response = await api.patch(`user/workflows/${workflow.id}`, {
            status: newStatus
        });
        
        if (response.success) {
            workflow.status = newStatus;
        }
    } catch (error) {
        console.error('Failed to update workflow status:', error);
    }
}

async function deleteWorkflow(workflow) {
    // Show confirmation popup
    popup.open(
        'delete-workflow',
        null,
        ConfirmComponent,
        {
            title: 'Delete Workflow',
            message: `Are you sure you want to delete "${workflow.name}"? This action cannot be undone.`,
            confirmText: 'Delete',
            confirmType: 'danger',
            onConfirm: async () => {
                try {
                    const response = await api.delete(`user/workflows/${workflow.id}`);
                    if (response.success) {
                        await loadWorkflows();
                    }
                } catch (error) {
                    console.error('Failed to delete workflow:', error);
                }
            }
        },
        {
            position: 'center'
        }
    );
}

function createWorkflow() {
    popup.open(
        'create-workflow',
        null,
        WorkflowCreateForm,
        {
            organizations: organizations.value,
            callback: (event, data, response, success) => {
                if (success) {
                    router.push(`/workflows/${response.data.id}`);
                }
            }
        },
        {
            position: 'center'
        }
    );
}

function getTriggerLabel(triggerType) {
    const triggerLabels = {
        'booking.created': 'When booking is created',
        'booking.cancelled': 'When booking is cancelled',
        'booking.reminder': 'Before booking starts',
        'event.created': 'When event is created',
        'event.updated': 'When event is updated'
    };
    return triggerLabels[triggerType] || triggerType;
}

function getStatusBadgeClass(status) {
    return {
        'active': 'badge-success',
        'inactive': 'badge-secondary',
        'draft': 'badge-warning'
    }[status] || 'badge-secondary';
}

// Lifecycle
onMounted(() => {
    organizations.value = mergeOrganizationsAndTeams();
    
    // Set first organization as default if available
    if (organizations.value.length > 0 && !selectedOrganization.value) {
        selectedOrganization.value = organizations.value[0].id;
    }
    
    loadWorkflows();
});
</script>

<template>
    <MainLayout>
        <template #content>
            <div class="workflows-page">
                <HeadingComponent title="Workflows" description="Automate your scheduling with powerful workflows">
                    <template #right>
                        <ButtonComponent
                            as="stroke"
                            :iconLeft="{ component: PhPlus, weight: 'bold' }"
                            label="Create Workflow"
                            @click="createWorkflow"
                        />
                    </template>
                </HeadingComponent>
                
                <div class="controls-section">
                    <div class="left-controls">
                        <InputComponent
                            v-model="searchQuery"
                            placeholder="Search workflows..."
                            :iconLeft="{ component: PhMagnifyingGlass }"
                            class="search-box"
                        />
                        
                        <SelectComponent
                            v-model="selectedOrganization"
                            :options="organizationOptions"
                            placeholder="All Organizations"
                            @change="loadWorkflows"
                        />
                    </div>
                </div>
                
                <!-- Loading state -->
                <div v-if="loading" class="loading-state">
                    <div class="loading-content">
                        <div class="loading-spinner"></div>
                        <p>Loading workflows...</p>
                    </div>
                </div>
                
                <!-- Empty state -->
                <div v-else-if="!filteredWorkflows.length" class="empty-state">
                    <div class="empty-state-content">
                        <PhFlowArrow :size="48" weight="thin" />
                        <h3>No workflows yet</h3>
                        <p>Create your first workflow to start automating your scheduling tasks</p>
                        <ButtonComponent
                            :iconLeft="{ component: PhPlus, weight: 'bold' }"
                            label="Create Workflow"
                            @click="createWorkflow"
                        />
                    </div>
                </div>
                
                <!-- Workflows grid -->
                <div v-else class="workflows-grid">
                    <div 
                        v-for="workflow in filteredWorkflows" 
                        :key="workflow.id"
                        class="workflow-card"
                        @click="editWorkflow(workflow)"
                    >
                        <div class="workflow-header">
                            <div class="workflow-info">
                                <h3>{{ workflow.name }}</h3>
                                <p v-if="workflow.description">{{ workflow.description }}</p>
                            </div>
                            <button
                                class="c-button secondary icon"
                                @click.stop
                                v-dropdown="{
                                    component: MenusComponent,
                                    properties: {
                                        menus: getWorkflowMenus(workflow)
                                    }
                                }"
                            >
                                <PhDotsThree :size="20" weight="bold" />
                            </button>
                        </div>
                        
                        <div class="workflow-trigger">
                            <PhFlowArrow :size="16" />
                            <span>{{ getTriggerLabel(workflow.trigger_type) }}</span>
                        </div>
                        
                        <div class="workflow-footer">
                            <span :class="['status-badge', getStatusBadgeClass(workflow.status)]">
                                {{ workflow.status }}
                            </span>
                            <span class="workflow-date">
                                Updated {{ new Date(workflow.updated).toLocaleDateString() }}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </template>
    </MainLayout>
</template>

<style scoped>
.workflows-page {
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
}

.left-controls {
    display: flex;
    gap: 16px;
    flex: 1;
}

.search-box {
    flex: 1;
    max-width: 400px;
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
    margin: 0 auto 16px;
    opacity: 0.5;
}

.empty-state-content h3 {
    font-size: 20px;
    margin-bottom: 8px;
}

.empty-state-content p {
    color: #6B7280;
    margin-bottom: 24px;
}

/* Workflows Grid */
.workflows-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
    gap: 20px;
}

.workflow-card {
    background: white;
    border: 1px solid #E5E7EB;
    border-radius: 12px;
    padding: 20px;
    cursor: pointer;
    transition: all 0.2s;
}

.workflow-card:hover {
    border-color: #3B82F6;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.workflow-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 16px;
}

.workflow-info h3 {
    font-size: 18px;
    font-weight: 600;
    margin-bottom: 4px;
}

.workflow-info p {
    color: #6B7280;
    font-size: 14px;
}

.workflow-trigger {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #6B7280;
    font-size: 14px;
    margin-bottom: 16px;
    padding: 8px 12px;
    background: #F9FAFB;
    border-radius: 6px;
}

.workflow-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.status-badge {
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 500;
}

.badge-success {
    background: #D1FAE5;
    color: #065F46;
}

.badge-secondary {
    background: #F3F4F6;
    color: #4B5563;
}

.badge-warning {
    background: #FEF3C7;
    color: #92400E;
}

.workflow-date {
    color: #9CA3AF;
    font-size: 12px;
}
</style>