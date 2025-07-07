/**
 * Contacts Module Index
 * Export all components and services for easy importing
 */

// Services
export { ContactsService } from './services/contacts';

// Components 
export { default as ContactsList } from './components/list/view.vue';

// Pages
export { default as ContactsPage } from './pages/home/view.vue';

// Plugin
export { default as ContactsPlugin } from './run.js';