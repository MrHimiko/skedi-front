<!-- src/other/layouts/main/view.vue -->
<script setup>
    import './style.css'

    import SidebarComponent from '@/components/global/sidebar/view.vue'
    import TopBarComponent from '@/components/global/top-bar/view.vue'

    defineProps(
    {
        loader: 
        {
            type: Boolean
        },
        sidebar: 
        {
            type: Boolean,
            default: true
        },
        onScroll: 
        {
            type: Function
        }
    })

    function handleScroll(event, onScroll) 
    {
        onScroll(event, false);

        const target = event.target
        const scrollTop = target.scrollTop         
        const clientHeight = target.clientHeight  
        const scrollHeight = target.scrollHeight  

        if (scrollTop + clientHeight >= scrollHeight) 
        {
            onScroll(event, true);
        }
    }
</script>

<template>
    <div class="l-main">
        <div class="flex">
            <div>
                <sidebar-component v-if="sidebar" />
            </div>
            <div class="main-content">
                <!-- Top Bar for notifications -->
                <div><top-bar-component /></div>
                
                <div class="scrollable-content scrollbar" @scroll="$event => onScroll ? handleScroll($event, onScroll) : null">
                    <slot v-if="!loader" name="top"></slot>

                    <div v-if="!loader" class="p-4xl content">
                        <div class="left"><slot name="content"></slot></div>
                        <div class="right-20"><slot name="right-20"></slot></div>
                        <div class="right-30"><slot name="right-30"></slot></div>
                        <div class="right-40"><slot name="right-40"></slot></div>
                        <div class="right-50"><slot name="right-50"></slot></div>
                    </div>

                    <div v-if="loader" class="loader">
                        <div></div>
                    </div>

                    <slot v-if="!loader" name="bottom"></slot>
                </div>
            </div>
        </div>
    </div>
</template>