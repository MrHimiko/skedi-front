<script setup>
    import './style.css'
    import { ref } from 'vue'
    import { useRoute } from 'vue-router'
    import { storage } from '@utils/storage' 
    import { MenuStore } from '@stores/menu'
    import TimezoneSelector from '@global/timezone-selector/view.vue'
    
    import { PhTextOutdent } from "@phosphor-icons/vue";
    
    const menuStore = MenuStore()
    const route = useRoute()

    const minimized = ref(storage.get('sidebar.minimized'))
    const parent = ref(storage.get('sidebar.parent', false))

    if (parent.value) 
    {
        minimized.value = 'minimized'
    }

    function toggle() 
    {
        minimized.value = minimized.value === 'minimized' ? '' : 'minimized'

        if (minimized.value !== 'minimized') 
        {
            parent.value = null   
        }

        storage.set('sidebar', minimized.value)
    }

    function openChildren(menu) 
    {
        if (!menu.children?.length) 
        {
            return
        }   

        if (parent.value === menu) 
        {
            storage.set('sidebar.parent', null, false)

            minimized.value = storage.get('sidebar.minimized')
            parent.value = null
        } 
        else 
        {
            storage.set('sidebar.parent', menu, false)

            minimized.value = 'minimized'
            parent.value = menu
        }
    }


    function isRouteActive(menuLink) {
        if (!menuLink || menuLink === '/') {
            return route.path === '/'
        }
        return route.path.startsWith(menuLink)
    }
</script>

<template>
    <div :class="['c-sidebar', minimized, (parent ? 'children' : '')]">
        <div class="left">
            <div class="top">
                <div class="switcher">
                    <div v-if="!minimized" class="name text-tx text-bold">
                        <div class="logo"></div>
                    </div>

                    <PhTextOutdent class="action" weight="bold" @click="toggle" />
                </div>

                <div v-if="!minimized" class="separator">
                    <p>Main menu</p>
                </div>

                <div class="menus">
                    <div @click="openChildren(menu)" v-for="(menu, index) in menuStore.get('sidebar:top')" :key="index">
                        <router-link 
                            :to="menu.link" 
                            :class="{ 'active': isRouteActive(menu.link) }" 
                            :key="minimized" 
                            v-tooltip="minimized ? {content: menu.label, options: { placement: 'right' }} : null"
                        >
                            <div>
                                <!-- Support both component-based and string-based icons -->
                                <component 
                                    v-if="typeof menu.icon === 'object' && menu.icon.component" 
                                    :is="menu.icon.component" 
                                    :weight="menu.icon.weight || 'bold'" 
                                    class="phosphor-icon"
                                />
                                <i v-else-if="menu.icon">{{ menu.icon }}</i>
                                <span class="ellipsis ellipsis-1" v-if="!minimized"> {{ menu.label }} </span>
                            </div>
                        </router-link>
                    </div>
                </div>
            </div>

            <div class="bottom">
                <div v-if="!minimized" class="separator">
                    <p>Others</p>
                </div>

                <div class="menus">
                    <div v-for="(menu, index) in menuStore.get('sidebar:bottom')" :key="index">
                        <router-link 
                            :to="menu.link" 
                            :class="{ 'active': isRouteActive(menu.link) }" 
                            :key="minimized" 
                            v-tooltip="minimized ? { content: menu.label, options: { placement: 'right' }} : null"
                        >
                            <div>
                                <!-- Support both component-based and string-based icons -->
                                <component 
                                    v-if="typeof menu.icon === 'object' && menu.icon.component" 
                                    :is="menu.icon.component" 
                                    :weight="menu.icon.weight || 'bold'" 
                                    class="phosphor-icon"
                                />
                                <i v-else-if="menu.icon">{{ menu.icon }}</i>
                                <span class="ellipsis ellipsis-1" v-if="!minimized"> {{ menu.label }} </span>
                            </div>
                        </router-link>
                    </div>
                </div>

                <div class="sidebar-footer">
                    <timezone-selector />
                </div>
            </div>
        </div>   
    </div>
</template>