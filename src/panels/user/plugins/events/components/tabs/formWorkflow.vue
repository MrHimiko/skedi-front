<script setup>
import { ref, computed, onMounted } from 'vue';
import { api } from '@utils/api';
import { common } from '@utils/common';
import { useRouter } from 'vue-router';

// Import the actual EventFormSettings component to reuse its logic
import EventFormSettings from '@user_events/components/form/eventFormSettings.vue';

// Components
import ButtonComponent from '@form/button/view.vue';

// Icons
import { PhTable, PhFlowArrow, PhPlus, PhGearSix } from '@phosphor-icons/vue';

const props = defineProps({
    event: {
        type: Object,
        required: true
    },
    eventId: {
        type: [String, Number],
        required: true
    },
    organizationId: {
        type: [String, Number],
        required: true
    }
});

const emit = defineEmits(['refresh']);

// State
const activeSection = ref('form');
const workflows = ref([]);
const routingForms = ref([]);

// Router
const router = useRouter();

// Available sections
const sections = [
    { key: 'form', label: 'Form Settings', icon: PhTable },
    { key: 'workflow', label: 'Workflows', icon: PhFlowArrow },
    { key: 'routing', label: 'Routing Forms', icon: PhTable }
];

// Handle form settings callback (when form is updated)
function handleFormSettingsCallback(event, data, response, success) {
    if (success) {
        emit('refresh');
    }
}

// Load workflows (placeholder)
async function loadWorkflows() {
    try {
        // TODO: Implement when workflows are ready
        workflows.value = [];
    } catch (error) {
        console.error('Failed to load workflows:', error);
        workflows.value = [];
    }
}

// Load routing forms (placeholder)
async function loadRoutingForms() {
    try {
        // TODO: Implement when routing forms are ready
        routingForms.value = [];
    } catch (error) {
        console.error('Failed to load routing forms:', error);
        routingForms.value = [];
    }
}

// Add workflow (placeholder for future implementation)
function addWorkflow() {
    common.notification('Workflow feature coming soon!', false);
}

// Add routing form (placeholder for future implementation)
function addRoutingForm() {
    common.notification('Routing forms feature coming soon!', false);
}

onMounted(() => {
    loadWorkflows();
    loadRoutingForms();
});
</script>

<template>
    <div class="form-workflow">
        <!-- Section Navigation -->
        <div class="section-nav">
            <div class="nav-list">
                <button
                    v-for="section in sections"
                    :key="section.key"
                    @click="activeSection = section.key"
                    :class="['nav-item', { active: activeSection === section.key }]"
                >
                    <component :is="section.icon" :size="20" />
                    <span>{{ section.label }}</span>
                </button>
            </div>
        </div>
        
        <!-- Content Area -->
        <div class="content-area">
            <!-- Form Settings -->
            <div v-if="activeSection === 'form'" class="form-settings-section">
                <div class="section-header">
                    <h3>Booking Form Settings</h3>
                    <p>Customize the booking form that visitors will see when scheduling this event.</p>
                </div>
                
                <!-- Inline EventFormSettings component (no popup) -->
                <div class="inline-form-settings">
                    <EventFormSettings
                        :eventId="eventId"
                        :organizationId="organizationId"
                        :callback="handleFormSettingsCallback"
                    />
                </div>
            </div>
            
            <!-- Workflows -->
            <div v-else-if="activeSection === 'workflow'" class="workflows-section">
                <div class="section-header">
                    <h3>Workflows</h3>
                    <p>Automate actions when bookings are created, updated, or canceled.</p>
                </div>
                
                <div class="workflows-content">
                    <div v-if="workflows.length === 0" class="empty-state">
                        <PhFlowArrow :size="48" />
                        <h4>No workflows configured</h4>
                        <p>Workflows allow you to automate tasks like sending emails, creating tasks, or updating external systems when bookings change.</p>
                        <ButtonComponent @click="addWorkflow" as="primary">
                            <PhPlus :size="16" />
                            Add Workflow
                        </ButtonComponent>
                    </div>
                    
                    <div v-else class="workflows-list">
                        <div v-for="workflow in workflows" :key="workflow.id" class="workflow-item">
                            <div class="workflow-info">
                                <h4>{{ workflow.name }}</h4>
                                <p>{{ workflow.description }}</p>
                            </div>
                            <div class="workflow-actions">
                                <ButtonComponent as="transparent" size="sm">
                                    <PhGearSix :size="16" />
                                    Configure
                                </ButtonComponent>
                            </div>
                        </div>
                        
                        <ButtonComponent @click="addWorkflow" as="transparent">
                            <PhPlus :size="16" />
                            Add Workflow
                        </ButtonComponent>
                    </div>
                </div>
            </div>
            
            <!-- Routing Forms -->
            <div v-else-if="activeSection === 'routing'" class="routing-section">
                <div class="section-header">
                    <h3>Routing Forms</h3>
                    <p>Create conditional forms that route visitors to different event types based on their responses.</p>
                </div>
                
                <div class="routing-content">
                    <div v-if="routingForms.length === 0" class="empty-state">
                        <PhTable :size="48" />
                        <h4>No routing forms configured</h4>
                        <p>Routing forms help direct visitors to the most appropriate event type based on their needs and responses to qualifying questions.</p>
                        <ButtonComponent @click="addRoutingForm" as="primary">
                            <PhPlus :size="16" />
                            Add Routing Form
                        </ButtonComponent>
                    </div>
                    
                    <div v-else class="routing-list">
                        <div v-for="form in routingForms" :key="form.id" class="routing-item">
                            <div class="routing-info">
                                <h4>{{ form.name }}</h4>
                                <p>{{ form.description }}</p>
                            </div>
                            <div class="routing-actions">
                                <ButtonComponent as="transparent" size="sm">
                                    <PhGearSix :size="16" />
                                    Configure
                                </ButtonComponent>
                            </div>
                        </div>
                        
                        <ButtonComponent @click="addRoutingForm" as="transparent">
                            <PhPlus :size="16" />
                            Add Routing Form
                        </ButtonComponent>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.form-workflow {
    display: flex;
    gap: 24px;
}

.section-nav {
    flex-shrink: 0;
    width: 200px;
}

.nav-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 16px;
    background: var(--background-1);
    border: 1px solid var(--border);
    border-radius: 8px;
}

.nav-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    background: transparent;
    border: none;
    border-radius: 6px;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.2s ease;
    text-align: left;
    font-size: 14px;
    font-weight: 500;
}

.nav-item:hover {
    background: var(--background-2);
    color: var(--text-primary);
}

.nav-item.active {
    background: var(--black);
    color: white;
}

.content-area {
    flex: 1;
}

.section-header {
    margin-bottom: 24px;
}

.section-header h3 {
    margin: 0 0 8px 0;
    font-size: 20px;
    font-weight: 600;
    color: var(--text-primary);
}

.section-header p {
    margin: 0;
    color: var(--text-secondary);
    font-size: 14px;
}

.inline-form-settings {
    background: var(--background-1);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 20px;
}

.loading-state {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 60px;
    color: var(--text-secondary);
}

.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px;
    text-align: center;
    color: var(--text-secondary);
    background: var(--background-1);
    border: 1px solid var(--border);
    border-radius: 8px;
}

.empty-state h4 {
    margin: 16px 0 8px 0;
    color: var(--text-primary);
    font-size: 18px;
    font-weight: 600;
}

.empty-state p {
    margin: 0 0 24px 0;
    max-width: 400px;
    line-height: 1.5;
}

.workflows-list,
.routing-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 24px;
    background: var(--background-1);
    border: 1px solid var(--border);
    border-radius: 8px;
}

.workflow-item,
.routing-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px;
    background: var(--background-0);
    border: 1px solid var(--border);
    border-radius: 6px;
}

.workflow-info h4,
.routing-info h4 {
    margin: 0 0 4px 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
}

.workflow-info p,
.routing-info p {
    margin: 0;
    font-size: 14px;
    color: var(--text-secondary);
}

@media (max-width: 768px) {
    .form-workflow {
        flex-direction: column;
    }
    
    .section-nav {
        width: 100%;
    }
    
    .nav-list {
        flex-direction: row;
        overflow-x: auto;
        gap: 8px;
    }
    
    .nav-item {
        flex-shrink: 0;
        white-space: nowrap;
    }
    
    .workflow-item,
    .routing-item {
        flex-direction: column;
        align-items: flex-start;
        gap: 12px;
    }
    
    .workflow-actions,
    .routing-actions {
        align-self: stretch;
    }
}


.inline-form-settings .l-popup > .top {
    display:none!important;
}

.inline-form-settings .l-popup {
    border: none;
    width: 100%;
    max-width: 100%;
    background: white;
}

</style>