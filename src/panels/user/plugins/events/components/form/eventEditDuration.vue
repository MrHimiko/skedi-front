<script setup>
import { ref, onMounted } from 'vue';
import { common } from '@utils/common';
import { api } from '@utils/api';
import BuilderComponent from '@/components/builder/view.vue';
import PopupView from '@layouts/popup/view.vue';

const props = defineProps({
    endpoint: {
        type: String,
        required: true
    },
    type: {
        type: String,
        required: true
    },
    callback: {
        type: Function,
        required: true
    },
    values: {
        type: Function,
        required: true
    }
});

// State management
const isLoading = ref(false);
const formValues = ref({
    duration: [{ title: 'Standard Meeting', description: '', duration: 30 }]
});

// Return current form values for the builder component
function getFormValues() {
    // If we have values from props, use those; otherwise use our default
    try {
        const propsValues = props.values();
        return propsValues || formValues.value;
    } catch (error) {
        return formValues.value;
    }
}

// Define tabs configuration with the repeater component
const tabs = ref([
    {
        title: 'Duration Options',
        components: [
            {
                type: 'Repeater',
                name: 'duration',
                label: 'Duration Option',
                width: 12,
                properties: {
                    components: [
                        {
                            type: 'Input',
                            name: 'title',
                            label: 'Title',
                            width: 8,
                            properties: {
                                placeholder: 'e.g., Quick Call, Full Session'
                            }
                        },
                        {
                            type: 'Input',
                            name: 'duration',
                            label: 'Duration (minutes)',
                            width: 4,
                            properties: {
                                placeholder: '30',
                                type: 'number'
                            }
                        },
                    ]
                }
            }
        ]
    }
]);

// Initialize data on mount
onMounted(() => {
    // No separate data fetching needed here since we get 
    // initial values through the values prop function
    try {
        const initialValues = props.values();
        if (initialValues && initialValues.duration) {
            formValues.value = initialValues;
        }
    } catch (error) {
        console.error('Error loading initial duration values:', error);
    }
});
</script>

<template>
    <PopupView title="Edit Duration Options" customClass="h-auto event-durations">
        <template #content>
            <div v-if="isLoading" class="loading-section">
                <p>Loading data...</p>
            </div>
            
            <div v-else>
                <p class="intro-text text-secondary">Define different duration options that attendees can choose from.</p>
                
                <div class="content">
                    <builder-component 
                        :tabs="tabs"
                        :values="getFormValues"
                        :endpoint="endpoint"
                        :type="type"
                        :callback="callback"
                        as="form"
                    />
                </div>
            </div>
        </template>
    </PopupView>
</template>

<style>
.event-durations {
    border-radius: 12px;
    max-height: 80vh;
    overflow: auto;
    width: 100%;
    max-width: 550px;
}

.intro-text {
    margin-bottom: 20px;
}

.loading-section {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 200px;
    color: var(--text-secondary);
}

/* Fix repeater styles within the popup */
.event-durations .c-repeater {
    margin-top: 10px;
    background: transparent;
}

.event-durations .c-repeater > .items > .item {
    position: relative;
}

.event-durations .c-repeater > .items > .item > .top {
    position: absolute;
    right: 6px;
    top: 6px;
}

.event-durations .c-repeater > .items > .item > .top .toggle {
    display: none!important;
}

.event-durations .c-repeater > .items > .item > .top .left {
    display: none!important;
}

.event-durations .c-repeater > .items > .item > .bottom {
    border-top: none;
    margin-top: 0;
    padding-top: 0;
}

.event-durations .c-repeater {
    padding: 0;
    border: none;
}

.event-durations .c-repeater > .items > .item {
    padding: 0;
    border: none;
}

.event-durations .c-repeater > .items > .item form {
    background: var(--background-0);
    padding: 15px;
    padding-right: 45px;
}

.event-durations .c-builder > .content {
    padding-bottom: 0;
}

.event-durations .c-builder {
    border: none;
    padding: 0;
}
</style>