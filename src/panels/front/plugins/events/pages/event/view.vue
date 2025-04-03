<script setup>
import { useRoute } from 'vue-router';

const route = useRoute();
const organizationId = route.params.organizationId;
const eventSlug = route.params.eventSlug;
</script>

<template>
    <div class="event-page">
        <h1>Hi from event</h1>
        <p>Organization ID: {{ organizationId }}</p>
        <p>Event Slug: {{ eventSlug }}</p>
    </div>
</template>