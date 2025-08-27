<script setup>
import { ref, onMounted } from 'vue';
import { common } from '@utils/common';
import { api } from '@utils/api';
import BuilderComponent from '@/components/builder/view.vue';
import PopupView from '@layouts/popup/view.vue';

const props = defineProps({
    eventId: {
        type: [String, Number],
        required: true
    },
    organizationId: {
        type: [String, Number],
        required: true
    },
    callback: {
        type: Function
    }
});

// State management
const isLoadingData = ref(true);

// Initial form values
const formValues = ref({
    availabilityType: 'one_host_available',
    acceptanceRequired: 'false',
    assignees: [{ user_id: '', role: 'admin' }]
});

// Return current form values for the builder component
function getFormValues() {
    return formValues.value;
}

// Define tabs configuration with the repeater component
const tabs = ref([
    {
        title: 'Event Hosts',
        components: [
            {
                type: 'Repeater',
                name: 'assignees',
                label: 'Event Hosts',
                width: 12,
                properties: {
                    components: [
                        {
                            type: 'Select',
                            name: 'user_id',
                            label: 'Person',
                            required: true,
                            width: 8,
                            properties: {
                                placeholder: 'Select a person',
                                options: [] 
                            }
                        },
                        {
                            type: 'Select',
                            name: 'role',
                            label: 'Role',
                            required: true,
                            width: 4,
                            properties: {
                                placeholder: 'Select role',
                                options: [
                                    { label: 'Admin', value: 'admin' },
                                    { label: 'Host', value: 'host' },
                                    { label: 'Member', value: 'member' },
                                    { label: 'Creator', value: 'creator' }
                                ]
                            }
                        }
                    ]
                }
            },
            {
                type: 'Select',
                name: 'availabilityType',
                label: 'Availability Requirement',
                width: 6,
                properties: {
                    placeholder: 'Select availability type',
                    options: [
                        { label: 'Only one host needs to be available', value: 'one_host_available' },
                        { label: 'All hosts must be available', value: 'all_hosts_available' }
                    ]
                }
            },
            {
                type: 'Select',
                name: 'acceptanceRequired',
                label: 'Meeting Acceptance',
                width: 6,
                properties: {
                    placeholder: 'Select acceptance requirement',
                    options: [
                        { label: 'Auto-accept meetings', value: 'false' },
                        { label: 'Hosts must accept meetings', value: 'true' }
                    ]
                }
            },
        ]
    }
]);

// Fetch event data including settings and assignees
async function fetchEventData() {
    try {
        const response = await api.get(`events/${props.eventId}?organization_id=${props.organizationId}`);

        if (response?.success) {
            // Extract event settings
            const settings = {
                availabilityType: response.data.availabilityType || 'one_host_available',
                acceptanceRequired: String(response.data.acceptanceRequired) || 'false'
            };
            
            // Extract assignees if available
            const assignees = response.data.assignees?.map(item => ({
                user_id: item.user.id.toString(),
                role: item.role,
                name: item.name,
            })) || null;
            
            return { settings, assignees };
        }
    } catch (error) {
        console.error('Failed to fetch event data:', error);
    }
    return { settings: null, assignees: null };
}

// Fetch people options for the select dropdown
async function fetchPeopleOptions() {
    try {
        const response = await api.get(`events/${props.eventId}/people?organization_id=${props.organizationId}`);
        if (response?.success && Array.isArray(response.data)) {
            const peopleOptions = response.data.map(item => ({
                label: item.user.name,
                value: item.user.id.toString()
            }));
            
            // Update options in the Select component
            tabs.value[0].components[0].properties.components[0].properties.options = peopleOptions;
            return true;
        }
    } catch (error) {
        console.error('Failed to fetch people options:', error);
    }
    return false;
}

// Load all required data and update form values
async function loadData() {
    try {
        isLoadingData.value = true;
        
        // Fetch data from multiple endpoints in parallel
        const [eventData] = await Promise.all([
            fetchEventData(),
            fetchPeopleOptions()
        ]);
        
        // Update form values with fetched data
        formValues.value = {
            availabilityType: eventData.settings?.availabilityType || 'one_host_available',
            acceptanceRequired: String(eventData.settings?.acceptanceRequired) || 'false',
            assignees: eventData.assignees || [{ user_id: '', role: 'admin' }]
        };
    } catch (error) {
        console.error('Failed to load data:', error);
        common.notification('Failed to load data', false);
    } finally {
        isLoadingData.value = false;
    }
}

onMounted(() => {
    loadData();
});
</script>

<template>
    <PopupView title="Event Assignees" customClass="h-auto event-assignees">
        <template #content>
            <div v-if="isLoadingData" class="loading-section">
                <p>Loading data...</p>
            </div>
            
            <div v-else>
                
                <div class="content">
                    <builder-component 
                        :tabs="tabs"
                        :values="getFormValues"
                        :endpoint="`events/${eventId}/assignees?organization_id=${organizationId}`"
                        :type="'POST'"
                        as="form"
                        :popup="true"
                    />
                </div>
            </div>
        </template>
    </PopupView>
</template>

<style>
.event-assignees {
    border-radius: 12px;
    max-height: 80vh;
    overflow: auto;
    width: 100%;
    max-width: 600px;
}

.loading-container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 200px;
    color: var(--text-secondary);
}

.event-assignees .c-repeater {
    margin-top: 10px;
    background: transparent;
}

.event-assignees .c-repeater > .items > .item {
    position: relative;
}
.event-assignees .c-repeater > .items {
    background: transparent;
}

.event-assignees .c-repeater > .items > .item > .top {
    position: absolute;
    right: 6px;
    top: 16px;
}

.event-assignees .c-repeater > .items > .item > .top .toggle {
    display: none!important;
}

.event-assignees .c-repeater > .items > .item > .top .left {
    display: none!important;
}

.event-assignees .c-repeater > .items > .item > .bottom {
    border-top: none;
    margin-top: 0;
    padding-top: 0;
}

.event-assignees .c-repeater {
    padding: 0;
    border: none;
}

.event-assignees .c-repeater > .items > .item {
    padding: 0;
    border: none;
}

.event-assignees .c-repeater > .items > .item form {
    background: var(--background-0);
    padding: 15px;
    padding-right: 45px;
}

.event-assignees .c-builder > .content {
    padding-bottom: 0;
}

.event-assignees .actions {
    display: flex;
    gap: 10px;
}

.event-assignees   .c-repeater  .content > div > .components > div > div > .top {
    display:none;
}

.event-assignees  .c-builder {
    border:none;
    padding:0;
}
</style>