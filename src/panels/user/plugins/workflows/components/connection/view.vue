<!-- src/panels/user/plugins/workflows/components/connection/view.vue -->
<script setup>
import { computed } from 'vue';
import { PhX } from "@phosphor-icons/vue";

const props = defineProps({
    connection: {
        type: Object,
        required: true
    },
    selected: {
        type: Boolean,
        default: false
    }
});

const emit = defineEmits(['click', 'delete']);

// Connection styling
const connectionClass = computed(() => ({
    'workflow-connection': true,
    'selected': props.selected,
    'conditional-true': props.connection.condition_type === 'true',
    'conditional-false': props.connection.condition_type === 'false'
}));

const strokeColor = computed(() => {
    if (props.selected) return 'var(--primary)';
    if (props.connection.condition_type === 'true') return 'var(--success)';
    if (props.connection.condition_type === 'false') return 'var(--danger)';
    return 'var(--border-strong)';
});

// Calculate the midpoint of the path for the delete button
const pathMidpoint = computed(() => {
    if (!props.connection.path) return { x: 0, y: 0 };
    
    // Parse the path to get start and end points
    const pathData = props.connection.path;
    const matches = pathData.match(/M\s*([\d.-]+)\s+([\d.-]+).*\s+([\d.-]+)\s+([\d.-]+)$/);
    
    if (matches) {
        const x1 = parseFloat(matches[1]);
        const y1 = parseFloat(matches[2]);
        const x2 = parseFloat(matches[3]);
        const y2 = parseFloat(matches[4]);
        
        return {
            x: (x1 + x2) / 2,
            y: (y1 + y2) / 2
        };
    }
    
    return { x: 0, y: 0 };
});

function handleClick(e) {
    e.stopPropagation();
    emit('click');
}

function handleDelete(e) {
    e.stopPropagation();
    emit('delete');
}
</script>

<template>
    <g class="connection-group">
        <!-- Invisible wider path for easier clicking -->
        <path
            :d="connection.path"
            class="connection-hitbox"
            @click="handleClick"
        />
        
        <!-- Visible connection path -->
        <path
            :d="connection.path"
            :class="connectionClass"
            :stroke="strokeColor"
            @click="handleClick"
        />
        
        <!-- Delete button (shown on hover or selection) -->
        <g
            v-if="selected"
            class="connection-delete"
            :transform="`translate(${pathMidpoint.x}, ${pathMidpoint.y})`"
        >
            <circle
                r="12"
                fill="var(--background-0)"
                stroke="var(--border)"
                stroke-width="1"
            />
            <foreignObject x="-8" y="-8" width="16" height="16">
                <button
                    class="delete-btn"
                    @click="handleDelete"
                    title="Delete connection"
                >
                    <PhX :size="12" />
                </button>
            </foreignObject>
        </g>
    </g>
</template>

<style scoped>
.connection-group {
    cursor: pointer;
}

.connection-hitbox {
    fill: none;
    stroke: transparent;
    stroke-width: 20;
    pointer-events: stroke;
}

.workflow-connection {
    fill: none;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
    transition: all 0.2s;
    pointer-events: none;
}

.workflow-connection.selected {
    stroke-width: 3;
}

.workflow-connection.conditional-true {
    stroke-dasharray: 5, 5;
}

.workflow-connection.conditional-false {
    stroke-dasharray: 2, 3;
}

.connection-delete {
    pointer-events: all;
    opacity: 0;
    animation: fadeIn 0.2s forwards;
}

@keyframes fadeIn {
    to {
        opacity: 1;
    }
}

.delete-btn {
    width: 16px;
    height: 16px;
    border: none;
    background: var(--background-0);
    color: var(--danger);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: all 0.2s;
}

.delete-btn:hover {
    background: var(--danger);
    color: white;
    transform: scale(1.1);
}
</style>