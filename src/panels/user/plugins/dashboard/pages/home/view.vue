
<script setup>
import { ref } from 'vue';
import { useRoute } from 'vue-router'; 

import MainLayout from '@layouts/main/view.vue'
import HeadingComponent from '@global/heading/view.vue'
import NoticeComponent from '@global/notice/view.vue'
import ButtonComponent from '@form/button/view.vue'

import CalendarComponent from '@user_dashboard/components/calendar/view.vue';
import TodayCardsComponent from '@user_dashboard/components/today-cards/view.vue';
import TaskForm from '@user_shared/components/taskForm/view.vue';

// Icons
import { PhPlus } from "@phosphor-icons/vue";


</script>

<template>
    <main-layout @scroll:end="onScrollEnd">
        <template #content>
            <div class="container-lg">
                <HeadingComponent title="Calendar">
                    <template #right>
                        <ButtonComponent
                            label="New Task"
                            :iconLeft="{ component: PhPlus, weight: 'bold' }"
                            type="primary"
                            v-popup="{
                                component: TaskForm,
                                overlay: { position: 'center' },
                                properties: {
                                    callback: handleTaskCreated
                                }
                            }"
                        />
                    </template>
                </HeadingComponent>
                
                <!-- Today's Events Cards -->
                <TodayCardsComponent />
                
                <!-- Calendar Component -->
                <CalendarComponent/>
            </div>
        </template>
    </main-layout>
</template>

