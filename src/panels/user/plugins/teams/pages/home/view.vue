<script setup>
    import { ref, watch } from 'vue';
    import { useRoute } from 'vue-router'; 
    import {  PhPlus } from "@phosphor-icons/vue";

    import MainLayout from '@layouts/main/view.vue'
    import HeadingComponent from '@global/heading/view.vue'
    import itemsComponent from '@user_teams/components/items/view.vue';

    import Button from '@form/button/view.vue';
    import OrganizationCreateForm from '@user_teams/components/form/organizationCreate.vue';

    import { popup } from '@utils/popup';
    import { UserStore } from '@stores/user'
    const userStore = UserStore();

    import { api } from '@utils/api';
    const teamsPage = ref(0); 
    async function reloadData() {
        try {
            const response = await api.get('account/user');
            if (response.success && response.data) {
                userStore.setData(response.data);
                teamsPage.value++;
            }
        } catch (error) {
            console.error("Failed to reload user data:", error);
        }
    }
</script>

<template>
    <main-layout>
        <template #content>
            
            <div class="container-lg" :key="teamsPage">
                
                <HeadingComponent title="Organizations & Teams">
                    <template #right>
                        <Button 
                            as="stroke" :iconLeft="{ component: PhPlus, weight: 'bold' }" label="Create Organization"  
                            v-popup="{
                            component: OrganizationCreateForm,
                                overlay: { position: 'center' },
                                properties: {
                                    endpoint: `organizations`,
                                    type: 'POST',
                                    callback: (event, data, response, success) =>
                                    {
                                        console.log('org created', response);
                                        popup.close();
                                        reloadData();
                                    },
                                    class: 'h-auto',
                                    title: `Create new organization`,
                                }
                            }
                        "/>
                    </template>
                </HeadingComponent>

                <itemsComponent/>

            </div>
        
        </template>
    </main-layout>
</template>