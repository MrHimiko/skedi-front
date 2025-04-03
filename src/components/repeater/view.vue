<script setup>
import './style.css';
import {onMounted, onUnmounted, ref} from 'vue';
import ButtonComponent from '@form/button/view.vue';
import BuilderComponent from '@/components/builder/view.vue';

const props = defineProps({
    components: {
        type: Array,
        required: true,
    },
    label: {
        type: String,
    },
    as: {
        type: String,
    },
    name: {
        type: String
    },
    value: {
        type: [Array, Object]
    },
    onChange: {
        type: Function
    },
    add: {
        type: Boolean,
        default: true
    },
    remove: {
        type: Boolean,
        default: true
    },
    close: {
        type: Boolean,
        default: true
    },
    heading: {
        type: Boolean,
        default: true
    },
});

const items = ref([]);
const toggled = ref([]);

onMounted(() => {
    // Initialize items from props
    if(Array.isArray(props.value)) {
        // Create a deep copy to avoid reference issues
        items.value = JSON.parse(JSON.stringify(props.value));
    }
    else if(props.value && typeof props.value === 'object') {
        items.value = Object.values(JSON.parse(JSON.stringify(props.value)));
    }
});

onUnmounted(() => {
    items.value = [];
});

function addItem() {
    items.value.push({});
    
    // Notify parent of change
    if (props.onChange) {
        props.onChange(null, null, items.value);
    }
}

function removeItem(indexToRemove) {
    console.log('Removing item at index:', indexToRemove);
    console.log('Before remove:', JSON.stringify(items.value));
    
    // Create a new array without the item at indexToRemove
    const newItems = items.value.filter((_, index) => index !== indexToRemove);
    items.value = newItems;
    
    console.log('After remove:', JSON.stringify(items.value));
    
    // Also remove from toggled array if present
    toggled.value = toggled.value.filter(index => index !== indexToRemove);
    
    // Adjust toggled indices that are above the removed index
    toggled.value = toggled.value.map(index => index > indexToRemove ? index - 1 : index);
    
    // Notify parent of change
    if (props.onChange) {
        props.onChange(null, null, items.value);
    }
}

function toggle(index) {
    if (toggled.value.includes(index)) {
        toggled.value = toggled.value.filter(i => i !== index);
    }
    else {
        toggled.value.push(index);
    }
}

// Function to get item values for builder
function getItemValues(item) {
    return () => item;
}

// Handle builder component changes
function handleBuilderChange(item, event, value) {
    console.log('Builder change:', item, value);
    
    // Update the item with the new value
    if (props.onChange) {
        props.onChange(item, event, items.value);
    }
}
</script>

<template>
    <div :class="['c-repeater', as]">
        <div v-auto-animate="{ duration: 150 }" class="items">
            <div v-for="(item, itemIndex) in items" :key="'item-' + itemIndex" class="item">
                <div v-if="heading" :class="['top', toggled.includes(itemIndex) ? 'closed' : '']">
                    <div class="left">
                        <!-- <i class="action i-sortable-handle">drag_indicator</i> -->
                        <p>{{ label ? label : 'Item'}} Information</p>
                    </div>
                    <div class="right">
                        <div :class="['action', 'toggle', !toggled.includes(itemIndex) ? 'opened' : '']" @click="toggle(itemIndex)">
                            <i>keyboard_arrow_down</i>
                        </div>
                        <i class="action" @click="() => removeItem(itemIndex)">close</i>
                    </div>
                </div>
                <div class="bottom flex gap-xl" style="flex-wrap: nowrap" v-show="!toggled.includes(itemIndex)">
                    <builder-component 
                        :values="getItemValues(item)" 
                        :name="name" 
                        :actions="false" 
                        :tabs="[
                            {
                                title: 'General',
                                components,
                            }
                        ]"
                        @change="(e, v) => handleBuilderChange(item, e, v)"
                    ></builder-component>
                    <div v-if="!heading && remove">
                        <i class="action" @click="() => removeItem(itemIndex)">close</i>
                    </div>
                </div>
            </div>
        </div>
        <div v-if="add" class="flex-end">
            <div class="c-button tertiary" @click="addItem">{{'Add ' + (label ? label : 'Item')}}</div>
        </div>
    </div>
</template>