<template>
    <main-layout @scroll:end="onScrollEnd">
        <template #content>
            <div class="container-lg">
                <HeadingComponent title="Calendar"/>
                
                <!-- Today's Events Cards -->
                <TodayCardsComponent />
                
                <!-- Calendar Component -->
                <CalendarComponent/>
            </div>
        </template>
    </main-layout>
</template>

<script setup>
import { ref } from 'vue';
import { useRoute } from 'vue-router'; 

import MainLayout from '@layouts/main/view.vue'
import HeadingComponent from '@global/heading/view.vue'
import NoticeComponent from '@global/notice/view.vue'

import CalendarComponent from '@user_dashboard/components/calendar/view.vue';
import TodayCardsComponent from '@user_dashboard/components/today-cards/view.vue';

// Handle scroll end
function onScrollEnd() {
    // Handle infinite scroll if needed
    console.log('Scroll end reached');
}
</script>

<style scoped>
.container-lg {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 16px;
}

/* Add some spacing between components */
.container-lg > * + * {
    margin-top: 24px;
}
</style>