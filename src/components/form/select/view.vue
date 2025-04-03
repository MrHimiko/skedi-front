<script setup>
import './style.css';
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { fetch } from '@utils/fetch';
import { PhCaretDown } from "@phosphor-icons/vue";
import MenusComponent from '@global/menus/view.vue';

const props = defineProps({
    options: {
        type: Array
    },
    endpoint: {
        type: String
    },
    label: {
        type: String,
    },
    name: {
        type: String,
    },
    required: {
        type: Boolean,
    },
    value: {
        type: [String, Number],
    },
    placeholder: {
        type: String,
    },
    disabled: {
        type: Boolean,
        default: false
    }
});

// Define emits with the value as the first parameter
const emit = defineEmits(['update:value', 'change']);

const refValue = ref(props.value);
const displayValue = ref('');

// Watch for changes in the props.value
watch(() => props.value, (newValue) => {
    refValue.value = newValue;
    updateDisplayValue(newValue);
}, { immediate: true });

// Update the display value based on the current value
function updateDisplayValue(value) {
    if (!value) {
        displayValue.value = '';
        return;
    }

    if (Array.isArray(props.options)) {
        const option = props.options.find(opt => opt.value == value);
        if (option) {
            displayValue.value = option.label;
        }
    }
}

// Handle selecting an item from the dropdown
function handleSelect(event, item) {
    refValue.value = item.value;
    displayValue.value = item.label;
    
    // Emit the value as the first parameter
    emit('update:value', item.value);
    emit('change', item.value);
}

// Load data from endpoint if needed
onMounted(() => {
    if (props.endpoint && props.value) {
        displayValue.value = 'Loading...';
        
        fetch.one(`${props.endpoint}/${props.value}`).then((data) => {
            displayValue.value = data.name || data.title || data.label || props.value;
        }).catch(() => {
            displayValue.value = props.value;
        });
    }
});
</script>

<template>
    <div class="c-input">
        <!-- Label & Required -->
        <div v-if="required || label" class="select-header">
            <label v-if="label">{{ label }}</label>
            <span class="required-indicator" v-if="required">Required</span>
        </div>
        
        <!-- Select Field -->
        <div 
            style="padding:0 25px 0 10px; position: relative; cursor: pointer; min-width: 80px;"
            class="holder"
            v-dropdown="{ 
                component: MenusComponent, 
                properties: { 
                    onClick: handleSelect, 
                    menus: options,
                    endpoint: endpoint 
                }
            }"
            :class="{ disabled }"
        >
            <input 
                type="hidden" 
                :name="name" 
                :value="refValue"
            />
            <div class="display">
                <span v-if="displayValue">{{ displayValue }}</span>
                <span v-else class="placeholder">{{ placeholder }}</span>
            </div>
            <PhCaretDown style="position: absolute; right: 6px; top:50%; transform: translateY(-50%);" class="caret-icon" weight="fill" size="10"/>
        </div>
    </div>
</template>

