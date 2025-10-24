<!-- src/panels/user/plugins/organizations/components/events/view.vue -->
<script setup>
import EventsItems from '@user_events/components/items/view.vue';

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
</script>

<template>
    <div>
        <EventsItems 
            :currentOrgId="organizationId" 
            @refresh="emit('refresh')" 
        />
    </div>
</template>