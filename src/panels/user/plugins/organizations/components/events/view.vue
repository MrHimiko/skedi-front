<!-- src/panels/user/plugins/organizations/components/events/view.vue -->
<script setup>
import { ref, computed } from 'vue';
import EventsItems from '@user_events/components/items/view.vue';
import { UserStore } from '@stores/user';

const props = defineProps({
    organization: {
        type: Object,
        required: true
    },
    organizationId: {
        type: Number,
        required: true
    },
    isAdmin: {
        type: Boolean,
        default: false
    }
});

const emit = defineEmits(['refresh']);
const userStore = UserStore();

// Get only this organization from the user store
const filteredOrganizations = computed(() => {
    const allOrgs = userStore.getOrganizations();
    
    // Find and return only the current organization
    const currentOrg = allOrgs.find(org => {
        const orgId = org.entity?.id || org.id;
        return orgId === props.organizationId;
    });
    
    return currentOrg ? [currentOrg] : [];
});
</script>

<template>
    <div class="organization-events-wrapper">
        <!-- Reuse the EventsItems component with filtered organizations and hide create org button -->
        <EventsItems 
            :organizations="filteredOrganizations"
            :hideCreateOrganization="true"
            @refresh="emit('refresh')"
        />
    </div>
</template>

<style scoped>
.organization-events-wrapper {
    /* The EventsItems component has all the styling we need */
}
</style>