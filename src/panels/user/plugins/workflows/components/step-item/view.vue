<!-- src/panels/user/plugins/workflows/components/step-item/view.vue -->
<script setup>
import { ref, computed } from 'vue';
import { popup } from '@utils/popup';

// Components
import Button from '@form/button/view.vue';
import MenusComponent from '@global/menus/view.vue';
import StepConfig from '@user_workflows/components/popups/step-config.vue';
import ConditionEditor from '@user_workflows/components/condition-editor/view.vue';

// Icons
import { 
    PhEnvelope,
    PhWebhooksLogo,
    PhClock,
    PhGitBranch,
    PhGearSix,
    PhDotsThreeVertical,
    PhPencil,
    PhTrash,
    PhArrowUp,
    PhArrowDown
} from "@phosphor-icons/vue";

const props = defineProps({
    step: {
        type: Object,
        required: true
    },
    stepNumber: {
        type: Number,
        required: true
    },
    availableActions: {
        type: Array,
        default: () => []
    }
});

const emit = defineEmits(['update', 'delete', 'move-up', 'move-down']);

// State
const isExpanded = ref(false);

// Step icons mapping
const stepIcons = {
    'send_email': PhEnvelope,
    'send_webhook': PhWebhooksLogo,  
    'delay': PhClock,
    'condition': PhGitBranch,
    'default': PhGearSix
};

// Computed
const stepIcon = computed(() => {
    return stepIcons[props.step.type] || stepIcons.default;
});

const stepActionConfig = computed(() => {
    return props.availableActions.find(action => action.id === props.step.type);
});

const stepCategory = computed(() => {
    return stepActionConfig.value?.category || 'unknown';
});

const stepDescription = computed(() => {
    return stepActionConfig.value?.description || '';
});

const isCondition = computed(() => {
    return props.step.type === 'condition';
});

const configSummary = computed(() => {
    if (!props.step.config || Object.keys(props.step.config).length === 0) {
        return 'Not configured';
    }

    const config = props.step.config;
    
    switch (props.step.type) {
        case 'send_email':
            return `To: ${config.to || 'Not set'} | Subject: ${config.subject || 'Not set'}`;
        case 'send_webhook':
            return `${config.method || 'POST'} ${config.url || 'No URL set'}`;
        case 'delay':
            return `Wait ${config.duration || 0} ${config.unit || 'minutes'}`;
        case 'condition':
            return `If ${config.field || 'field'} ${config.operator || 'equals'} ${config.value || 'value'}`;
        default:
            return 'Configured';
    }
});

const hasConfiguration = computed(() => {
    return props.step.config && Object.keys(props.step.config).length > 0;
});

// Step menus
const stepMenus = computed(() => [
    {
        label: 'Edit',
        iconComponent: PhPencil,
        onClick: () => editStep()
    },
    {
        label: 'Move Up',
        iconComponent: PhArrowUp,
        onClick: () => emit('move-up')
    },
    {
        label: 'Move Down', 
        iconComponent: PhArrowDown,
        onClick: () => emit('move-down')
    },
    {
        label: 'Delete',
        iconComponent: PhTrash,
        onClick: () => deleteStep()
    }
]);

// Methods
function editStep() {
    console.log('Edit step clicked');
    console.log('Step:', props.step);
    console.log('Available actions:', props.availableActions);
    console.log('Step action config:', stepActionConfig.value);
    
    if (isCondition.value) {
        // Use inline condition editor
        isExpanded.value = !isExpanded.value;
    } else {
        // Use popup for other steps
        popup.open(
            'step-config',
            null,
            StepConfig,
            {
                step: props.step,
                actionConfig: stepActionConfig.value,
                onSave: async (updatedConfig) => {
                    console.log('onSave called with config:', updatedConfig);
                    
                    const updatedStep = {
                        ...props.step,
                        config: updatedConfig
                    };
                    
                    console.log('Emitting updated step:', updatedStep);
                    emit('update', updatedStep);
                    
                    // The popup closing is handled in the step-config component
                }
            }
        );
    }
}

function deleteStep() {
    if (confirm(`Are you sure you want to delete "${props.step.name}"?`)) {
        emit('delete');
    }
}

function toggleExpanded() {
    isExpanded.value = !isExpanded.value;
}

function onConditionUpdate(updatedConditionConfig) {
    const updatedStep = {
        ...props.step,
        config: updatedConditionConfig
    };
    emit('update', updatedStep);
}
</script>

<template>
    <div class="step-item" :class="{ expanded: isExpanded }">
        <div class="step-card" :class="[stepCategory, { 'has-config': hasConfiguration }]">
            <!-- Step Header -->
            <div class="step-header" @click="toggleExpanded">
                <div class="step-number">{{ stepNumber }}</div>
                
                <div class="step-icon" :class="stepCategory">
                    <component :is="stepIcon" :size="20" weight="bold" />
                </div>
                
                <div class="step-info">
                    <div class="step-meta">
                        <span class="step-type">{{ stepCategory }}</span>
                        <span class="step-status" :class="{ configured: hasConfiguration }">
                            {{ hasConfiguration ? 'Configured' : 'Not configured' }}
                        </span>
                    </div>
                    <div class="step-name">{{ step.name }}</div>
                    <div v-if="stepDescription" class="step-description">{{ stepDescription }}</div>
                    <div class="step-config-summary">{{ configSummary }}</div>
                </div>
                
                <div class="step-actions" @click.stop>
                    <Button
                        as="tertiary icon"
                        :iconLeft="{ component: PhGearSix }"
                        @click="editStep"
                        v-tooltip="{ content: 'Configure' }"
                    />
                    
                    <Button
                        as="tertiary icon"
                        :iconLeft="{ component: PhDotsThreeVertical }"
                        v-dropdown="{
                            component: MenusComponent,
                            properties: { menus: stepMenus }
                        }"
                        v-tooltip="{ content: 'More options' }"
                    />
                </div>
            </div>
            
            <!-- Expanded Content for Conditions -->
            <div v-if="isExpanded && isCondition" class="step-expanded-content">
                <ConditionEditor
                    :step="step"
                    @update="onConditionUpdate"
                />
            </div>
            
            <!-- Configuration Preview for Other Steps -->
            <div v-else-if="isExpanded && hasConfiguration" class="step-expanded-content">
                <div class="config-preview">
                    <h4>Configuration</h4>
                    <div class="config-items">
                        <div v-for="(value, key) in step.config" :key="key" class="config-item">
                            <span class="config-key">{{ key }}:</span>
                            <span class="config-value">{{ value }}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Condition Branches Display -->
        <div v-if="isCondition && step.branches" class="condition-branches">
            <div v-if="step.branches.true && step.branches.true.length" class="branch true-branch">
                <div class="branch-label">✓ TRUE Path</div>
                <div class="branch-steps">
                    <div v-for="(branchStep, index) in step.branches.true" :key="index" class="branch-step">
                        {{ branchStep.name || branchStep.type }}
                    </div>
                </div>
            </div>
            
            <div v-if="step.branches.false && step.branches.false.length" class="branch false-branch">
                <div class="branch-label">✗ FALSE Path</div>
                <div class="branch-steps">
                    <div v-for="(branchStep, index) in step.branches.false" :key="index" class="branch-step">
                        {{ branchStep.name || branchStep.type }}
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.step-item {
    margin-bottom: 16px;
}

.step-card {
    background: var(--background-1);
    border: 2px solid var(--border);
    border-radius: var(--radius-md);
    transition: all 0.2s;
    cursor: pointer;
}

.step-card:hover {
    border-color: var(--border-strong);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.step-card.has-config {
    border-left: 4px solid var(--success);
}

.step-card.expanded {
    border-color: var(--primary);
}

/* Category-based styling */
.step-card.communication {
    border-left-color: var(--blue-default);
}

.step-card.integration {
    border-left-color: var(--purple-default);
}

.step-card.utility {
    border-left-color: var(--orange-default);
}

.step-card.logic {
    border-left-color: var(--pink-default);
}

.step-header {
    display: flex;
    align-items: center;
    padding: 20px;
    gap: 16px;
}

.step-number {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: var(--background-2);
    color: var(--text-secondary);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 14px;
    flex-shrink: 0;
}

.step-icon {
    width: 48px;
    height: 48px;
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--background-2);
    color: var(--text-secondary);
    flex-shrink: 0;
}

.step-icon.communication {
    background: rgba(var(--blue-rgb), 0.1);
    color: var(--blue-default);
}

.step-icon.integration {
    background: rgba(var(--purple-rgb), 0.1);
    color: var(--purple-default);
}

.step-icon.utility {
    background: rgba(var(--orange-rgb), 0.1);
    color: var(--orange-default);
}

.step-icon.logic {
    background: rgba(var(--pink-rgb), 0.1);
    color: var(--pink-default);
}

.step-info {
    flex: 1;
    min-width: 0;
}

.step-meta {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 4px;
}

.step-type {
    font-size: 11px;
    text-transform: uppercase;
    font-weight: 600;
    color: var(--text-secondary);
    background: var(--background-2);
    padding: 2px 8px;
    border-radius: var(--radius-sm);
}

.step-status {
    font-size: 11px;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: var(--radius-sm);
    background: var(--orange-fill);
    color: var(--orange-default);
}

.step-status.configured {
    background: var(--green-fill);
    color: var(--green-default);
}

.step-name {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 4px;
}

.step-description {
    font-size: 13px;
    color: var(--text-secondary);
    margin-bottom: 6px;
}

.step-config-summary {
    font-size: 12px;
    color: var(--text-tertiary);
    font-family: monospace;
    background: var(--background-2);
    padding: 4px 8px;
    border-radius: var(--radius-sm);
    display: inline-block;
}

.step-actions {
    display: flex;
    gap: 4px;
    opacity: 0;
    transition: opacity 0.2s;
}

.step-card:hover .step-actions {
    opacity: 1;
}

/* Expanded Content */
.step-expanded-content {
    border-top: 1px solid var(--border);
    padding: 20px;
    background: var(--background-0);
}

.config-preview h4 {
    margin: 0 0 12px 0;
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
}

.config-items {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.config-item {
    display: flex;
    gap: 12px;
    font-size: 13px;
}

.config-key {
    font-weight: 600;
    color: var(--text-secondary);
    min-width: 100px;
}

.config-value {
    color: var(--text-primary);
    font-family: monospace;
    background: var(--background-2);
    padding: 2px 6px;
    border-radius: var(--radius-sm);
}

/* Condition Branches */
.condition-branches {
    margin-top: 16px;
    display: flex;
    gap: 16px;
}

.branch {
    flex: 1;
    background: var(--background-1);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: 12px;
}

.true-branch {
    border-left: 4px solid var(--success);
}

.false-branch {
    border-left: 4px solid var(--error);
}

.branch-label {
    font-size: 12px;
    font-weight: 600;
    margin-bottom: 8px;
}

.true-branch .branch-label {
    color: var(--success);
}

.false-branch .branch-label {
    color: var(--error);
}

.branch-steps {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.branch-step {
    font-size: 12px;
    color: var(--text-secondary);
    background: var(--background-2);
    padding: 4px 8px;
    border-radius: var(--radius-sm);
}
</style>