<script setup lang="ts">
    
    import { ref, watch } from 'vue';
    import { useRoute } from 'vue-router'; 

    import MainLayout from '@layouts/main/view.vue'
    import HeadingComponent from '@global/heading/view.vue'
    import NoticeComponent from '@global/notice/view.vue'


    import CalendarComponent from '@user_dashboard/components/calendar/view.vue';
    
    

</script>

<template>
    <main-layout @scroll:end="onScrollEnd">
        <template #content>
            
            <div class="container-lg">
                <HeadingComponent title="Calendar"/>
                <CalendarComponent/>
            </div>
        
        </template>
    </main-layout>
</template>