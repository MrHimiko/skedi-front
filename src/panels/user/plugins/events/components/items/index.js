// src/panels/user/plugins/events/components/items/index.js

// Main component
export { default as EventsItems } from './view.vue';

// Sub-components
export { default as EventCard } from './EventCard.vue';
export { default as OrganizationSection } from './OrganizationSection.vue';

// Re-export composables for convenience
export { useEvents } from '@user_events/composables/useEvents.js';
export { useEventActions } from '@user_events/composables/useEventActions.js';