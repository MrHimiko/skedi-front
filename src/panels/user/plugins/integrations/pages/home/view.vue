// src/panels/user/plugins/integrations/pages/home/view.vue
<script setup>
    import { ref, computed, onMounted } from 'vue';
    import { common } from '@utils/common';
    import IntegrationProviders from '@user_integrations/providers';
    
    import MainLayout from '@layouts/main/view.vue';
    import HeadingComponent from '@global/heading/view.vue';
    import IntegrationCard from '@user_integrations/components/marketplace/IntegrationCard.vue';
    import Button from '@form/button/view.vue';
    
    // State management
    const providers = ref([]);
    const isLoading = ref(true);
    const activeTab = ref('installed');
    
    // Fetch available integrations
    async function fetchProviders() {
        try {
            isLoading.value = true;
            
            // Get all providers
            const allProviders = IntegrationProviders.getAllProviders();
            
            // Convert provider instances to integration format
            providers.value = allProviders.map(provider => ({
                id: provider.id,
                name: provider.name,
                description: provider.description,
                icon: provider.icon,
                category: provider.category,
                isInstalled: provider.isConnected()
            }));
            
        } catch (error) {
            console.error('Error fetching providers:', error);
            common.notification('Failed to load integrations', false);
        } finally {
            isLoading.value = false;
        }
    }
    
    // Handle refresh after connect/disconnect
    function handleIntegrationChange() {
        fetchProviders();
    }
    
    // Filter integrations based on active tab
    const filteredProviders = computed(() => {
        if (activeTab.value === 'installed') {
            return providers.value.filter(provider => provider.isInstalled);
        }
        return providers.value;
    });
    
    // Initialize component
    onMounted(() => {
        fetchProviders();
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
                            Installed ({{ providers.filter(p => p.isInstalled).length }})
                        </div>
                    </div>
                    
                    <!-- Loading state -->
                    <div v-if="isLoading" class="loading-state">
                        Loading integrations...
                    </div>
                    
                    <!-- Empty state -->
                    <div v-else-if="filteredProviders.length === 0" class="empty-state">
                        <div class="empty-content">
                            <div class="empty-icon">
                                <i>extension</i>
                            </div>
                            <h3>No integrations found</h3>
                            <p v-if="activeTab === 'installed'">
                                You haven't connected any integrations yet. Browse available integrations to get started.
                            </p>
                            <Button 
                                v-if="activeTab === 'installed'"
                                label="Browse Integrations"
                                @click="activeTab = 'browse'"
                            />
                        </div>
                    </div>
                    
                    <!-- Integrations grid -->
                    <div v-else class="integrations-grid">
                        <IntegrationCard 
                            v-for="provider in filteredProviders"
                            :key="provider.id"
                            :integration="provider"
                            @connect="handleIntegrationChange"
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

.empty-state {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 80px 0;
}

.empty-content {
    text-align: center;
    max-width: 400px;
}

.empty-icon {
    font-size: 48px;
    color: var(--text-tertiary);
    margin-bottom: 20px;
}

.empty-content h3 {
    margin-bottom: 10px;
    font-weight: 600;
}

.empty-content p {
    color: var(--text-secondary);
    margin-bottom: 20px;
}

.integrations-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 20px;
}
</style>