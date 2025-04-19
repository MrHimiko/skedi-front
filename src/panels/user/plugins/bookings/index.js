/**
 * Bookings Module Index
 * Export all components and services for easy importing
 */

// Services
export { BookingsService } from './services/bookings';

// Components 
export { default as BookingsList } from './components/list/view.vue';
export { default as BookingDetail } from './components/detail/view.vue';

// Pages
export { default as BookingsPage } from './pages/home/view.vue';

// Plugin
export { default as BookingsPlugin } from './run.js';