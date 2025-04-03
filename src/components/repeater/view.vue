<script setup>
import './style.css';
import {onMounted, onUnmounted, ref} from 'vue';
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
    items.value = items.value.filter((_, index) => index !== indexToRemove);
    
    // Notify parent component of the change
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

// Return a function that provides the current state of the item
// This ensures BuilderComponent always gets up-to-date values
function getItemValues(item) {
    return function() {
        // Find the actual item in our array (in case it's been updated)
        const index = items.value.indexOf(item);
        if (index >= 0) {
            return items.value[index]; 
        }
        return item;
    };
}

function handleBuilderChange(itemIndex, event, newValue) {
    // Ensure we have a valid index
    if (typeof itemIndex === 'number' && itemIndex >= 0 && itemIndex < items.value.length) {
        // Get the current item and create a copy
        const currentItem = items.value[itemIndex];
        const updatedItem = {...currentItem};
        
        // Handle direct DOM events
        if (event && event.target && event.target.name) {
            updatedItem[event.target.name] = event.target.value;
        }
        
        // Update our local state
        const newItems = [...items.value];
        newItems[itemIndex] = updatedItem;
        items.value = newItems;
        
        // Notify parent of the change
        if (props.onChange) {
            props.onChange(updatedItem, event, items.value);
        }
    }
}
</script>

<template>
    <div :class="['c-repeater', as]">
        <div v-auto-animate="{ duration: 150 }" class="items">
            <div v-for="(item, itemIndex) in items" :key="'item-' + itemIndex" class="item">
                <div v-if="heading" :class="['top', toggled.includes(itemIndex) ? 'closed' : '']">
                    <div class="left">
                        <p>{{ label ? label : 'Item'}} Information</p>
                    </div>
                    <div class="right">
                        <div :class="['action', 'toggle', !toggled.includes(itemIndex) ? 'opened' : '']" @click="toggle(itemIndex)">
                            <i>keyboard_arrow_down</i>
                        </div>
                        <i v-if="remove" class="action" @click="() => removeItem(itemIndex)">close</i>
                    </div>
                </div>
                <div class="bottom flex gap-xl" style="flex-wrap: nowrap" v-show="!toggled.includes(itemIndex)">
                    <!-- Key is critical to force re-render when item data changes -->
                    <builder-component 
                        :key="`builder-${itemIndex}-${JSON.stringify(item)}`"
                        :values="getItemValues(item)" 
                        :name="name" 
                        :actions="false" 
                        :tabs="[
                            {
                                title: 'General',
                                components,
                            }
                        ]"
                        @change="(e, v) => handleBuilderChange(itemIndex, e, v)"
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