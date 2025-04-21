<script setup>
import '@user_shared/utils/styles/organization-dropdowns.css';
import { mergeOrganizationsAndTeams } from '@user_shared/utils/js/organization-structure.js';

import './style.css';
import { ref, onMounted, toRaw, provide } from 'vue';
import { PhGearSix, PhPlus, PhCode, PhLink, PhUsers } from "@phosphor-icons/vue";
import ButtonComponent from '@form/button/view.vue';

import TeamList from '@user_teams/components/teamList/view.vue';
import { UserStore } from '@stores/user';

import TeamCreateForm from '@user_teams/components/form/teamCreate.vue';
import OrganizationEditForm from '@user_teams/components/form/organizationEdit.vue';
import { popup } from '@utils/popup';
import { api } from '@utils/api';

// Create a unique symbol for the reload function
const RELOAD_KEY = Symbol('reloadTeams');

const userStore = UserStore();
const currentUserId = userStore.getId();
const organizations = ref([]);
const eventsItems = ref(0); 

async function reloadData() {
  try {
    const response = await api.get('account/user');
    if (response.success && response.data) {
      userStore.setData(response.data);
      organizations.value = mergeOrganizationsAndTeams();
      eventsItems.value++;
    }
  } catch (error) {
    console.error("Failed to reload user data:", error);
  }
}

// Provide the reload function to all descendant components
provide(RELOAD_KEY, reloadData);

onMounted(() => {
  const rawTeams = toRaw(userStore.getTeams());
  const rawOrgs = toRaw(userStore.getOrganizations());
  
  organizations.value = mergeOrganizationsAndTeams();
  
  if (organizations.value.length === 0) {
    if ((rawTeams && rawTeams.length) || (rawOrgs && rawOrgs.length)) {
      if (rawOrgs && rawOrgs.length) {
        organizations.value = rawOrgs.map(org => {
          const entity = org.entity || {};
          return {
            ...entity,
            id: entity.id,
            name: entity.name || 'Unknown',
            slug: entity.slug || 'unknown',
            teams: [] 
          };
        });
      }
    }
  }
});
</script>

<template>
    <div class="teams-c-items" :key="eventsItems">
        <div v-for="org in organizations" :key="org.id" class="teams-c-item">
            <div class="head">
                <div class="left">
                    <div class="org-name">
                        <div class="logo">
                            <span>{{ org.name ? org.name.charAt(0).toUpperCase() : 'O' }}</span>
                        </div>
                        <p>
                            {{ org.name }}
                            <span>{{ org.teams ? org.teams.length : 0 }}</span>
                        </p>
                    </div>
                </div>

                <div class="right">
                    <a :href="'https://skedi.com/' + org.slug" class="blue-link">
                        {{ 'https://skedi.com/' + org.slug }}
                    </a>
                    <div class="separator"></div>
                    <div class="actions">
                        <button-component v-tooltip="{ content: 'Copy URL' }" as="tertiary icon"
                            :iconLeft="{ component: PhLink, weight: 'bold' }" />
                        <button-component v-tooltip="{ content: 'Embed on a website' }" as="tertiary icon"
                            :iconLeft="{ component: PhCode, weight: 'bold' }" />
                        <button-component 
                            v-popup="{
                                component: OrganizationEditForm,
                                overlay: { position: 'center' },
                                properties: {
                                    endpoint: `organizations/${org.id}`,
                                    type: 'PUT',
                                    callback: (event, data, response, success) =>
                                    {
                                        popup.close();
                                        reloadData();
                                        console.log('org edited', response);
                                    },
                                    class: 'h-auto',
                                    title: `Edit ${org.name}`,
                                    values: () => {return {name: org.name, slug: org.slug} }
                                }
                            }"
                            v-tooltip="{ content: 'Settings' }" as="tertiary icon"
                            :iconLeft="{ component: PhGearSix, weight: 'bold' }" />

                        <div>
                            <div v-popup="{
                                    component: TeamCreateForm,
                                    overlay: { position: 'center' },
                                    properties: {
                                        endpoint: `organizations/${org.id}/teams`,
                                        type: 'POST',
                                        callback: (event, data, response, success) =>
                                        {
                                            popup.close();
                                            reloadData();
                                            console.log(response);
                                        },
                                        class: 'h-auto',
                                        title: `Create new team in ${org.name}`,
                                       
                                    }
                                }">
                                <button-component v-tooltip="{ content: 'Create new team' }" as="tertiary icon"
                                    :iconLeft="{ component: PhPlus, weight: 'bold' }" @click="createTeam(org.id)" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Display organization users -->
            <div class="org-users">
                <div style="display: flex; align-items: center; gap:10px; font-weight: 500;">
                    <PhUsers weight="bold" />
                    <span>{{ org.users.length }} Members:</span>
                </div>

                <ul>
                    <li v-for="user in org.users" :key="user.id">
                        {{ user.name }} ({{ user.effective_role }})
                    </li>
                </ul>
            </div>

            <!-- Pass org users and current user ID down to all teams using the teams array -->
            <TeamList
                v-if="org.teams && org.teams.length"
                :teams="org.teams"
                :orgSlug="org.slug"
                :orgId="org.id"
                :orgUsers="org.users"
                :currentUserId="currentUserId"
                :reloadData="reloadData"
            />
        </div>
    </div>
</template>