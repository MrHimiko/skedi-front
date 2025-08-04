<!-- src/panels/user/plugins/workflows/components/form/workflowCreate.vue -->
<script setup>
import { ref, computed, onMounted } from 'vue';
import BuilderPopupComponent from '@/components/builder/popup/view.vue';
import { UserStore } from '@stores/user';

const props = defineProps({
    callback: {
        type: Function,
        required: true
    }
});

const userStore = UserStore();
const selectedOrganizationId = ref(null);

// Get user organizations
const userOrganizations = computed(() => {
    const orgs = userStore.getOrganizations() || [];
    return orgs.map(org => ({
        label: org.entity?.name || 'Unknown Organization',
        value: org.entity?.id
    }));
});

// Set default organization on mount
onMounted(() => {
    if (userOrganizations.value.length > 0 && !selectedOrganizationId.value) {
        selectedOrganizationId.value = userOrganizations.value[0].value;
    }
});

// Dynamic tabs based on organization count
const tabs = computed(() => {
    const components = [
        {
            label: 'Workflow Name',
            type: 'Input',
            width: 12,
            name: 'name',
            properties: {
                placeholder: 'Enter workflow name',
                required: true,
                autofocus: true
            }
        }
    ];
    
    // Only show organization selector if user has more than one organization
    if (userOrganizations.value.length > 1) {
        components.push({
            label: 'Organization',
            type: 'Select',
            width: 12,
            name: 'organization_id',
            properties: {
                options: userOrganizations.value,
                defaultValue: selectedOrganizationId.value,
                required: true
            }
        });
    }
    
    return [{
        title: 'Create Workflow',
        components
    }];
});

// Add organization_id and default values to the form data
function handleSubmit(data, callback) {
    const formData = {
        ...data,
        // Use form value if available, otherwise use the default
        organization_id: data.organization_id || selectedOrganizationId.value,
        status: 'draft' // Always create as draft
    };
    
    // Call the original callback with modified data
    return callback(formData);
}
</script>

<template>
    <BuilderPopupComponent
        :tabs="tabs"
        endpoint="user/workflows"
        type="post"
        :callback="(response, success) => {
            if (success) {
                callback(response, success);
            }
        }"
        :onSubmit="handleSubmit"
        title="Create New Workflow"
        submitLabel="Create Workflow"
    />
</template>