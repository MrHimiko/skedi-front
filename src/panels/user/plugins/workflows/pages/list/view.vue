<!-- src/panels/user/plugins/workflows/pages/list/view.vue -->
<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '@utils/api';
import { common } from '@utils/common';
import { popup } from '@utils/popup';
import { UserStore } from '@stores/user';

// Layout & Components
import MainLayout from '@layouts/main/view.vue';
import HeadingComponent from '@global/heading/view.vue';
import Button from '@form/button/view.vue';
import TabsComponent from '@global/tabs/view.vue';
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
    PhGitBranch,
    PhClock,
    PhCheck,
    PhWarning
} from "@phosphor-icons/vue";

const router = useRouter();
const userStore = UserStore();

// State
const workflows = ref([]);
const isLoading = ref(true);
const searchQuery = ref('');
const activeTab = ref('all');
const selectedOrganizationId = ref(null);

// Get user organizations
const userOrganizations = computed(() => {
    const orgs = userStore.getOrganizations() || [];
    return orgs.map(org => ({
        label: org.entity?.name || 'Unknown Organization',
        value: org.entity?.id
    }));
});

// Set default organization
if (userOrganizations.value.length > 0) {
    selectedOrganizationId.value = userOrganizations.value[0].value;
}

// Tabs
const tabs = [
    { title: 'All', value: 'all' },
    { title: 'Active', value: 'active' },
    { title: 'Inactive', value: 'inactive' },
    { title: 'Draft', value: 'draft' }
];

// Filtered workflows
const filteredWorkflows = computed(() => {
    let filtered = workflows.value;
    
    // Filter by status
    if (activeTab.value !== 'all') {
        filtered = filtered.filter(w => w.status === activeTab.value);
    }
    
    // Filter by search
    if (searchQuery.value) {
        const query = searchQuery.value.toLowerCase();
        filtered = filtered.filter(w => 
            w.name.toLowerCase().includes(query) ||
            w.description?.toLowerCase().includes(query) ||
            w.trigger_type?.toLowerCase().includes(query)
        );
    }
    
    return filtered;
});

// Workflow stats
const workflowStats = computed(() => {
    return {
        total: workflows.value.length,
        active: workflows.value.filter(w => w.status === 'active').length,
        inactive: workflows.value.filter(w => w.status === 'inactive').length,
        draft: workflows.value.filter(w => w.status === 'draft').length
    };
});

// Load workflows
async function loadWorkflows() {
    try {
        isLoading.value = true;
        const response = await api.get('user/workflows', {
            organization_id: selectedOrganizationId.value
        });
        
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
            endpoint: `user/workflows/${workflow.id}`,
            type: 'delete',
            callback: (response, success) => {
                if (success) {
                    workflows.value = workflows.value.filter(w => w.id !== workflow.id);
                    common.notification('Workflow deleted successfully', true);
                }
            }
        }
    );
}

// Duplicate workflow
async function duplicateWorkflow(workflow) {
    try {
        const response = await api.post('user/workflows', {
            ...workflow,
            name: `${workflow.name} (Copy)`,
            status: 'draft'
        });
        
        if (response && response.success) {
            workflows.value.push(response.data);
            common.notification('Workflow duplicated successfully', true);
        }
    } catch (error) {
        common.notification('Failed to duplicate workflow', false);
    }
}

// Get workflow menus
function getWorkflowMenus(workflow) {
    const menus = [
        {
            label: 'Edit',
            icon: PhPencil,
            action: () => router.push(`/workflows/${workflow.id}`)
        },
        {
            label: workflow.status === 'active' ? 'Deactivate' : 'Activate',
            icon: workflow.status === 'active' ? PhPause : PhPlay,
            action: () => toggleWorkflowStatus(workflow)
        },
        {
            label: 'Duplicate',
            icon: PhCopy,
            action: () => duplicateWorkflow(workflow)
        },
        {
            type: 'divider'
        },
        {
            label: 'Delete',
            icon: PhTrash,
            action: () => deleteWorkflow(workflow),
            className: 'danger'
        }
    ];
    
    return menus;
}

// Get status icon
function getStatusIcon(status) {
    switch (status) {
        case 'active':
            return PhCheck;
        case 'inactive':
            return PhPause;
        case 'draft':
            return PhClock;
        default:
            return PhWarning;
    }
}

// Get status color
function getStatusColor(status) {
    switch (status) {
        case 'active':
            return 'var(--success)';
        case 'inactive':
            return 'var(--warning)';
        case 'draft':
            return 'var(--text-secondary)';
        default:
            return 'var(--text-secondary)';
    }
}

// Handle tab change
function handleTabChange(event, tab) {
    activeTab.value = tab.value;
}

// Lifecycle
onMounted(() => {
    loadWorkflows();
});
</script>

<template>
    <MainLayout>
        <template #content>
            <div class="workflows-page">
                <!-- Header -->
                <HeadingComponent 
                    title="Workflows" 
                    description="Automate your business processes with custom workflows"
                >
                    <template #right>
                        <div class="header-actions">
                            <div class="search-container">
                                <input 
                                    v-model="searchQuery" 
                                    type="text"
                                    placeholder="Search workflows..."
                                    class="search-input"
                                />
                            </div>
                            <Button
                                :iconLeft="{ component: PhPlus }"
                                label="Create Workflow"
                                @click="createWorkflow"
                            />
                        </div>
                    </template>
                </HeadingComponent>
                
                <!-- Stats -->
                <div class="workflow-stats">
                    <div class="stat-card">
                        <div class="stat-value">{{ workflowStats.total }}</div>
                        <div class="stat-label">Total Workflows</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value" style="color: var(--success)">{{ workflowStats.active }}</div>
                        <div class="stat-label">Active</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value" style="color: var(--warning)">{{ workflowStats.inactive }}</div>
                        <div class="stat-label">Inactive</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">{{ workflowStats.draft }}</div>
                        <div class="stat-label">Drafts</div>
                    </div>
                </div>
                
                <!-- Tabs -->
                <div class="tabs-container">
                    <TabsComponent
                        :tabs="tabs"
                        :active="activeTab"
                        :onClick="handleTabChange"
                    />
                </div>
                
                <!-- Workflows list -->
                <div class="workflows-container">
                    <!-- Loading state -->
                    <div v-if="isLoading" class="loading-state">
                        <div class="loading-spinner"></div>
                        <p>Loading workflows...</p>
                    </div>
                    
                    <!-- Empty state -->
                    <div v-else-if="filteredWorkflows.length === 0" class="empty-state">
                        <PhGitBranch :size="48" />
                        <h3>No workflows found</h3>
                        <p v-if="searchQuery">Try adjusting your search criteria</p>
                        <p v-else>Create your first workflow to get started</p>
                        <Button
                            v-if="!searchQuery"
                            :iconLeft="{ component: PhPlus }"
                            label="Create Workflow"
                            @click="createWorkflow"
                        />
                    </div>
                    
                    <!-- Workflows grid -->
                    <div v-else class="workflows-grid">
                        <div 
                            v-for="workflow in filteredWorkflows"
                            :key="workflow.id"
                            class="workflow-card"
                            @click="router.push(`/workflows/${workflow.id}`)"
                        >
                            <div class="workflow-header">
                                <div class="workflow-icon">
                                    <PhGitBranch :size="24" />
                                </div>
                                <div class="workflow-actions">
                                    <button
                                        class="menu-trigger"
                                        @click.stop="event => popup.mini(
                                            event, 
                                            null, 
                                            MenusComponent, 
                                            {
                                                menus: getWorkflowMenus(workflow)
                                            }
                                        )"
                                    >
                                        <PhDotsThree :size="20" weight="bold" />
                                    </button>
                                </div>
                            </div>
                            
                            <div class="workflow-content">
                                <h3 class="workflow-name">{{ workflow.name }}</h3>
                                <p class="workflow-description">{{ workflow.description || 'No description' }}</p>
                                
                                <div class="workflow-meta">
                                    <div class="workflow-trigger">
                                        <PhClock :size="14" />
                                        <span>{{ workflow.trigger_type || 'No trigger' }}</span>
                                    </div>
                                    <div class="workflow-status" :style="{ color: getStatusColor(workflow.status) }">
                                        <component :is="getStatusIcon(workflow.status)" :size="14" />
                                        <span>{{ workflow.status }}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </template>
    </MainLayout>
</template>

<style scoped>
.workflows-page {
    padding: 0;
}

.header-actions {
    display: flex;
    gap: 12px;
    align-items: center;
}

.search-container {
    width: 300px;
}

.search-input {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    font-size: 14px;
    background-color: var(--background-1);
    color: var(--text-primary);
}

.search-input:focus {
    outline: none;
    border-color: var(--primary);
}

/* Stats */
.workflow-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
    margin-bottom: 24px;
}

.stat-card {
    background: var(--background-0);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: 20px;
    text-align: center;
}

.stat-value {
    font-size: 32px;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 4px;
}

.stat-label {
    font-size: 14px;
    color: var(--text-secondary);
}

/* Tabs */
.tabs-container {
    margin-bottom: 24px;
}

/* Loading & Empty states */
.loading-state,
.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 400px;
    gap: 16px;
    color: var(--text-secondary);
}

.loading-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid var(--border);
    border-top-color: var(--primary);
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    to { transform: rotate(360deg); }
}

.empty-state h3 {
    color: var(--text-primary);
    margin: 0;
}

/* Workflows grid */
.workflows-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 16px;
}

.workflow-card {
    background: var(--background-0);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: 20px;
    cursor: pointer;
    transition: all 0.2s;
}

.workflow-card:hover {
    border-color: var(--primary);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.workflow-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
}

.workflow-icon {
    width: 48px;
    height: 48px;
    background: var(--primary-light);
    color: var(--primary);
    border-radius: var(--radius-sm);
    display: flex;
    align-items: center;
    justify-content: center;
}

.menu-trigger {
    width: 32px;
    height: 32px;
    border: none;
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;
    border-radius: var(--radius-sm);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
}

.menu-trigger:hover {
    background: var(--background-1);
    color: var(--text-primary);
}

.workflow-content {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.workflow-name {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0;
}

.workflow-description {
    font-size: 14px;
    color: var(--text-secondary);
    margin: 0;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

.workflow-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 12px;
    font-size: 12px;
}

.workflow-trigger,
.workflow-status {
    display: flex;
    align-items: center;
    gap: 4px;
}

.workflow-trigger {
    color: var(--text-secondary);
}

.workflow-status {
    font-weight: 500;
    text-transform: capitalize;
}
</style>