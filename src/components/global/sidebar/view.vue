<script setup>
    import './style.css'
    import { ref, computed } from 'vue'
    import { useRoute } from 'vue-router'
    import { storage } from '@utils/storage' 
    import { MenuStore } from '@stores/menu'
    import { UserStore } from '@stores/user'
    import TimezoneSelector from '@global/timezone-selector/view.vue'
    import MenusComponent from '@global/menus/view.vue'
    import { popup } from '@utils/popup';
    import InvitationNotifications from '@user_shared/components/invitationNotifications/view.vue';
    
    import { PhCaretDoubleLeft, PhSignOut, PhUserCircle, PhBell } from "@phosphor-icons/vue";

    
    const menuStore = MenuStore()
    const userStore = UserStore()
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


    // Get invitation count
    const invitationCount = computed(() => {
        const userData = userStore.getData();
        return userData?.pending_invitations_count || 0;
    });

    // Function to open invitations popup
    function openInvitations() {
        popup.open(
            'invitations',
            null,
            InvitationNotifications,
            {},
            {
                position: 'center'
            }
        );
    }
    
    // User profile dropdown options
    const profileMenus = [
        {
            label: 'Profile Settings',
            link: '/account/settings',
            iconComponent: PhUserCircle,
            weight: 'bold'
        },
        {
            label: 'Logout',
            iconComponent: PhSignOut,
            weight: 'bold',
            onClick: () => {
                // Clear token and redirect to login
                storage.remove('token');
                window.location.href = '/account/login';
            }
        }
    ]
    
    // Get user initial for avatar
    const userInitial = ref(userStore.getName() ? userStore.getName().charAt(0).toUpperCase() : 'U');
</script>

<template>
    <div :class="['c-sidebar', minimized, (parent ? 'children' : '')]">
        <div class="left">
            <!-- User Profile Section -->
            <div class="profile-section">
                <div class="profile-top">
                    <div 
                        class="profile-header" 
                        v-dropdown="{ component: MenusComponent, properties: { menus: profileMenus } }"
                    >
                        <div class="profile-avatar">
                            <span>{{ userInitial }}</span>
                        </div>
                        <div class="profile-info" v-if="!minimized">
                            <div class="profile-name ellipsis">{{ userStore.getName() }}</div>
                        </div>
                        <div class="profile-dropdown-icon" v-if="!minimized">
                            <i>expand_more</i>
                        </div>
                    </div>

                    <div style="display: flex; align-items: center; gap: 10px;">
                        <!-- Notification Bell - ONLY show if there are invitations -->
                        <div 
                            class="notification-bell" 
                            @click="openInvitations" 
                            v-if="!minimized && invitationCount > 0"
                        >
                            <PhBell weight="bold" :size="20" />
                            <span class="badge">{{ invitationCount }}</span>
                        </div>
                        
                        <PhCaretDoubleLeft class="action" weight="bold" @click="toggle" />
                    </div>
                </div>
                

                <div class="switcher" style="display: none;">
                    <div class="logo"></div>
                    <div class="name text-tx text-bold"> Divhunt </div>
                </div>


            </div>
            
            <div class="top">
                

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