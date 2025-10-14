<script setup>
import './style.css';
import {onMounted, onUnmounted, ref, computed} from 'vue';
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
    minItems: {
        type: Number,
        default: 0
    },
});

const items = ref([]);
const toggled = ref([]);

// Computed property to check if we can remove items
const canRemoveItems = computed(() => {
    return props.remove && items.value.length > props.minItems;
});

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
    // Don't allow removal if we're at minimum
    if (items.value.length <= props.minItems) {
        return;
    }
    
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
function getItemValues(itemIndex) {
    return function() {
        if (itemIndex >= 0 && itemIndex < items.value.length) {
            return items.value[itemIndex] || {};
        }
        return {};
    };
}

function handleBuilderChange(itemIndex, event, newValue) {
    // Ensure we have a valid index
    if (typeof itemIndex === 'number' && itemIndex >= 0 && itemIndex < items.value.length) {
        // Get the field name from the event
        let fieldName = null;
        let fieldValue = null;
        
        // Handle different event types
        if (event && event.target && event.target.name) {
            // Regular form input event
            fieldName = event.target.name;
            fieldValue = event.target.value;
        } else if (event && typeof event === 'string') {
            // Direct value from select or other components (event is the value)
            // We need to figure out which field this is for
            // This happens when select emits just the value
            // We'll handle this case by looking at the last focused field
            // For now, we can't determine the field name from this
            return;
        }
        
        // Update only the specific field that changed
        if (fieldName) {
            // Create a new item object preserving all existing values
            const updatedItem = {...(items.value[itemIndex] || {})};
            updatedItem[fieldName] = fieldValue;
            
            // Update our local state
            items.value[itemIndex] = updatedItem;
            
            // Notify parent of the change
            if (props.onChange) {
                props.onChange(updatedItem, event, items.value);
            }
        }
    }
}

// New function to handle callback from Builder component
function handleBuilderCallback(itemIndex, formData) {
    if (typeof itemIndex === 'number' && itemIndex >= 0 && itemIndex < items.value.length) {
        // Update the entire item with the form data
        items.value[itemIndex] = {...formData};
        
        // Notify parent of the change
        if (props.onChange) {
            props.onChange(items.value[itemIndex], null, items.value);
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
                        <i v-if="canRemoveItems" class="action" @click="() => removeItem(itemIndex)">close</i>
                    </div>
                </div>
                <div class="bottom flex gap-xl" style="flex-wrap: nowrap" v-show="!toggled.includes(itemIndex)">
                    <!-- Use only index as key to prevent re-renders when item data changes -->
                    <builder-component 
                        :key="`builder-${itemIndex}`"
                        :values="getItemValues(itemIndex)" 
                        :name="name" 
                        :actions="false" 
                        :tabs="[
                            {
                                title: 'General',
                                components,
                            }
                        ]"
                        :callback="(formData) => handleBuilderCallback(itemIndex, formData)"
                        @change="(e, v) => handleBuilderChange(itemIndex, e, v)"
                    ></builder-component>
                    <div v-if="!heading && canRemoveItems">
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