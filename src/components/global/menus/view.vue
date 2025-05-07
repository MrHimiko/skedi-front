<script setup>
import './style.css';
import { ref, onMounted, onUnmounted } from 'vue';
import { fetch } from '@utils/fetch';
import { useRouter } from 'vue-router';

const router = useRouter();

const props = defineProps({
    menus: {
        type: Array
    },
    endpoint: {
        type: String
    },
    title: {
        type: String
    },
    onClick: {
        type: Function
    }
});

const refMenus = ref(Array.isArray(props.menus) ? props.menus : []);

onMounted(() => {
    if(!props.endpoint) {
        return;
    }

    refMenus.value.push({label: 'Loading...', value: null});

    fetch.many(props.endpoint, 100, 1, []).then((data) => {
        refMenus.value = [];
        
        data.forEach((item) => {
            refMenus.value.push({label: (item.name ?? item.title), value: item.id});
        });
    });
});

onUnmounted(() => {
    refMenus.value = ref(Array.isArray(props.menus) ? props.menus : []);
});

// Handle menu item click
function handleMenuClick(event, menu, menuIndex) {
    // Close dropdown
    const dropdownClose = document.querySelector('.i-dropdown-close');
    if (dropdownClose) {
        dropdownClose.click();
    }

    // If it has an onClick handler, call it
    if (menu.onClick) {
        menu.onClick(event, menu, menuIndex);
        return;
    }
    
    // If it has a link, navigate to it
    if (menu.link) {
        router.push(menu.link);
    }
    
    // Call the onClick prop if it exists
    if (props.onClick) {
        props.onClick(event, menu, menuIndex);
    }
}
</script>

<template>
    <div class="c-menus scrollbar">

        <h1 v-if="title">{{ title }}</h1>

        <div class="group">
            <div class="menus">
                <div class="i-dropdown-close menu-item"
                    v-for="(menu, menuIndex) in refMenus" 
                    v-popup="menu.popup || null"
                    v-clipboard="menu.clipboard || null"
                    v-print="menu.print || null"
                    @click="(event) => handleMenuClick(event, menu, menuIndex)"
                    :key="menuIndex" 
                >
                    <div class="left">
                        <div>
                            <component 
                                v-if="menu.iconComponent" 
                                :is="menu.iconComponent" 
                                :weight="menu.weight || 'regular'" 
                                class="phosphor-icon"
                            />
                            <i v-else-if="menu.icon">{{ menu.icon }}</i>
                            {{ menu.label }}
                        </div>
                        <p v-if="menu.description">{{ menu.description }}</p>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Bottom slot for custom content -->
        <div class="menu-bottom-slot">
            <slot name="bottom"></slot>
        </div>
    </div>
</template>