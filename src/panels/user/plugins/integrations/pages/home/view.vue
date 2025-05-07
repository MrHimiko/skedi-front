<!-- src/panels/user/plugins/integrations/pages/home/view.vue -->
<script setup>
    import { ref, onMounted } from 'vue';
    import { api } from '@utils/api';
    import { common } from '@utils/common';
    
    import MainLayout from '@layouts/main/view.vue';
    import HeadingComponent from '@global/heading/view.vue';
    import IntegrationCard from '@user_integrations/components/marketplace/IntegrationCard.vue';
    import Button from '@form/button/view.vue';
    
    // State management
    const integrations = ref([]);
    const userIntegrations = ref([]);
    const isLoading = ref(true);
    const activeTab = ref('installed');
    
    // Sample integrations data (replace with API call later)
    const sampleIntegrations = [
        {
            id: 'google_meet',
            name: 'Google Meet',
            description: 'Google Meet is Google\'s web-based video conferencing platform, designed to compete with major conferencing platforms.',
            icon: 'google_meet',
            category: 'conferencing',
            isInstalled: false
        },
        // Add more integrations as needed
    ];
    
    // Fetch available integrations
    async function fetchIntegrations() {
        try {
            isLoading.value = true;
            
            // For now, use sample data
            integrations.value = sampleIntegrations;
            
            // In the future, use API:
            // const response = await api.get('user/integrations/providers');
            // if (response.success && response.data) {
            //     integrations.value = response.data;
            // }
            
            // Check which ones are installed
            await fetchUserIntegrations();
            
        } catch (error) {
            console.error('Error fetching integrations:', error);
            common.notification('Failed to load integrations', false);
        } finally {
            isLoading.value = false;
        }
    }
    
    // Fetch user's installed integrations
    async function fetchUserIntegrations() {
        try {
            // For now, mark first item as installed
            sampleIntegrations[0].isInstalled = true;
            
            // In the future, use API:
            // const response = await api.get('user/integrations');
            // if (response.success && response.data) {
            //     userIntegrations.value = response.data;
            //     
            //     // Mark installed integrations
            //     integrations.value.forEach(integration => {
            //         integration.isInstalled = userIntegrations.value.some(
            //             ui => ui.provider === integration.id
            //         );
            //     });
            // }
        } catch (error) {
            console.error('Error fetching user integrations:', error);
        }
    }
    
    // Filter integrations based on active tab
    const filteredIntegrations = computed(() => {
        if (activeTab.value === 'installed') {
            return integrations.value.filter(integration => integration.isInstalled);
        }
        return integrations.value;
    });
    
    // Initialize component
    onMounted(() => {
        fetchIntegrations();
    });
</script>

<template>
    <main-layout>
        <template #content>
            <div class="container-lg">
                <HeadingComponent title="Integrations & Apps">
                    <!-- Add any header actions here -->
                </HeadingComponent>
                
                <div class="integrations-container">
                    <!-- Tabs -->
                    <div class="tab-container">
                        <div 
                            :class="['tab', { active: activeTab === 'browse' }]"
                            @click="activeTab = 'browse'"
                        >
                            Browse
                        </div>
                        <div 
                            :class="['tab', { active: activeTab === 'installed' }]"
                            @click="activeTab = 'installed'"
                        >
                            Installed ({{ integrations.filter(i => i.isInstalled).length }})
                        </div>
                    </div>
                    
                    <!-- Loading state -->
                    <div v-if="isLoading" class="loading-state">
                        Loading integrations...
                    </div>
                    
                    <!-- Integrations grid -->
                    <div v-else class="integrations-grid">
                        <IntegrationCard 
                            v-for="integration in filteredIntegrations"
                            :key="integration.id"
                            :integration="integration"
                            @connect="fetchUserIntegrations"
                        />
                    </div>
                </div>
            </div>
        </template>
    </main-layout>
</template>

<style scoped>
.integrations-container {
    margin-top: 20px;
}

.tab-container {
    display: flex;
    gap: 10px;
    margin-bottom: 20px;
    border-bottom: 1px solid var(--border);
}

.tab {
    padding: 10px 15px;
    cursor: pointer;
    border-radius: 5px 5px 0 0;
    font-weight: 500;
}

.tab.active {
    border-bottom: 2px solid var(--brand-default);
    color: var(--brand-default);
}

.loading-state {
    display: flex;
    justify-content: center;
    padding: 50px;
    color: var(--text-secondary);
}

.integrations-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 20px;
}
</style>