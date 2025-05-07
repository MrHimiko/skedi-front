<script setup>
    import './style.css';

    import MenusComponent from '@global/menus/view.vue';
    import { UserStore } from '@stores/user';
    
    const userStore = UserStore();

    const menus = [
        {
            label: 'My Account',
            link: '/account/settings',
            icon: 'person'
        },
    ]

    defineProps({
        logo: {
            type: String,
            required: true,
        }
    });
</script>

<template>
    <div class="account-c-dropdown" v-dropdown="{ component: MenusComponent, properties: { menus } }">
        <div class="avatar">
            {{ userStore.getName()[0] }}
            <div class="dot"></div>
        </div>
        <i>expand_more</i>
    </div>
</template>