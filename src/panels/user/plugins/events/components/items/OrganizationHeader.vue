<!-- 
    FULL PATH: src/panels/user/plugins/events/components/items/OrganizationHeader.vue
    
    Organization section header with team filters and actions
-->
<script setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { BillingStore } from '@stores/billing';

// Components
import MenusComponent from '@global/menus/view.vue';
import ButtonComponent from '@form/button/view.vue';

// Icons
import { 
    PhCaretDown, PhCaretUp, PhPlus, PhGearSix, PhCheck
} from "@phosphor-icons/vue";

const props = defineProps({
    organization: {
        type: Object,
        required: true
    },
    isExpanded: {
        type: Boolean,
        default: true
    },
    selectedTeams: {
        type: Array,
        default: () => []
    },
    isCurrentOrg: {
        type: Boolean,
        default: false
    }
});

const emit = defineEmits([
    'toggle-expand', 
    'toggle-team-filter', 
    'create-event'
]);

const router = useRouter();
const billingStore = BillingStore();

// Computed
const planBadge = computed(() => {
    if (!billingStore.subscriptions[props.organization.id]) {
        billingStore.loadSubscription(props.organization.id);
        return 'Loading...';
    }
    const planLevel = billingStore.getPlanLevel(props.organization.id);
    const plans = ['Free', 'Professional', 'Business', 'Enterprise'];
    return plans[planLevel - 1] || 'Free';
});

const planBadgeColor = computed(() => {
    const planLevel = billingStore.getPlanLevel(props.organization.id);
    const colors = ['#6b7280', '#3b82f6', '#8b5cf6', '#10b981'];
    return colors[planLevel - 1] || '#6b7280';
});

const topLevelTeams = computed(() => {
    if (!props.organization.teams) return [];
    return props.organization.teams.filter(team => !team.parent_team_id);
});

const visibleTeams = computed(() => topLevelTeams.value.slice(0, 6));
const overflowTeams = computed(() => topLevelTeams.value.slice(6));

const orgInitial = computed(() => {
    return props.organization.name?.charAt(0).toUpperCase() || '?';
});

// Methods
function handleOrgSettings() {
    router.push(`/organizations/${props.organization.id}`);
}

function isTeamSelected(teamId) {
    return props.selectedTeams.includes(teamId);
}
</script>

<template>
    <div class="head">
        <div class="left">
            <!-- Expand/collapse toggle -->
            <button 
                @click="emit('toggle-expand', organization.id)"
                class="org-toggle"
                :aria-expanded="isExpanded"
            >
                <component 
                    :is="isExpanded ? PhCaretDown : PhCaretUp" 
                    size="16" 
                    weight="bold"
                />
            </button>
            
            <!-- Organization logo/initial -->
            <div class="logo">
                <span>{{ orgInitial }}</span>
            </div>

            <!-- Organization name -->
            <div class="org-name">
                <h3>{{ organization.name }}</h3>
                
                <!-- Plan badge -->
                <button 
                    class="plan-badge"
                    :style="{ backgroundColor: planBadgeColor + '20', color: planBadgeColor }"
                    @click="emit('plan-click', organization)"
                >
                    {{ planBadge }}
                </button>
            </div>
        </div>

        <div class="right">
            <!-- Team filters -->
            <div class="team-filters" v-if="topLevelTeams.length > 0">
                <button
                    v-for="team in visibleTeams"
                    :key="team.id"
                    :class="['team-filter-btn', { active: isTeamSelected(team.id) }]"
                    @click="emit('toggle-team-filter', organization.id, team.id)"
                >
                    <span 
                        class="team-dot" 
                        :style="{ backgroundColor: team.color || '#6c5ce7' }"
                    ></span>
                    {{ team.name }}
                    <PhCheck v-if="isTeamSelected(team.id)" size="12" weight="bold" />
                </button>

                <!-- Overflow teams dropdown -->
                <MenusComponent
                    v-if="overflowTeams.length > 0"
                    :menus="overflowTeams.map(t => ({ 
                        label: t.name, 
                        value: t.id
                    }))"
                    @onSelect="(item) => emit('toggle-team-filter', organization.id, item.value)"
                >
                    <button class="team-filter-btn overflow">
                        +{{ overflowTeams.length }} more
                    </button>
                </MenusComponent>
            </div>

            <!-- Actions -->
            <div class="actions">
                <ButtonComponent
                    as="primary"
                    icon="PhPlus"
                    label="New Event"
                    @click="emit('create-event', organization)"
                />

                <ButtonComponent
                    as="white"
                    icon="PhGearSix"
                    @click="handleOrgSettings"
                    v-tooltip="{ content: 'Organization settings' }"
                />
            </div>
        </div>
    </div>
</template>

<style scoped>
.org-section-header {
    margin-bottom: 16px;
}

.org-section-header.current-org {
    background: var(--color-primary-subtle);
    border-radius: 8px;
    padding: 12px;
    margin: -12px -12px 16px -12px;
}

.head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;
}

.left {
    display: flex;
    align-items: center;
    gap: 12px;
}

.org-toggle {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border: none;
    background: var(--color-bg-secondary);
    border-radius: 6px;
    cursor: pointer;
    color: var(--color-text-secondary);
    transition: all 0.2s;
}

.org-toggle:hover {
    background: var(--color-bg-tertiary);
    color: var(--color-text-primary);
}

.logo {
    width: 36px;
    height: 36px;
    border-radius: 8px;
    background: var(--color-primary);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 16px;
}

.org-info {
    display: flex;
    align-items: center;
    gap: 8px;
}

.org-name-text {
    font-size: 16px;
    font-weight: 600;
    color: var(--color-text-primary);
    margin: 0;
}

.plan-badge {
    font-size: 11px;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 4px;
    border: none;
    cursor: pointer;
    transition: opacity 0.2s;
}

.plan-badge:hover {
    opacity: 0.8;
}

.right {
    display: flex;
    align-items: center;
    gap: 16px;
}

.team-filters {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
}

.team-filter-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    font-size: 12px;
    font-weight: 500;
    background: var(--color-bg-secondary);
    border: 2px solid transparent;
    border-radius: 6px;
    cursor: pointer;
    color: var(--color-text-secondary);
    transition: all 0.2s;
}

.team-filter-btn:hover {
    background: var(--color-bg-tertiary);
    color: var(--color-text-primary);
}

.team-filter-btn.active {
    background: var(--team-color, #6c5ce7);
    background-opacity: 0.1;
    color: var(--color-text-primary);
}

.team-filter-btn.overflow {
    color: var(--color-primary);
}

.team-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
}

.actions {
    display: flex;
    gap: 8px;
}
</style>