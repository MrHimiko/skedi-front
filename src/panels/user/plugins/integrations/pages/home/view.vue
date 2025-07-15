<script setup>
import { ref, computed, onMounted } from 'vue';
import { api } from '@utils/api';
import { common } from '@utils/common';
import IntegrationProviders from '@user_integrations/providers';

import MainLayout from '@layouts/main/view.vue';
import HeadingComponent from '@global/heading/view.vue';
import IntegrationCard from '@user_integrations/components/marketplace/IntegrationCard.vue';

// State management
const providers = ref([]);
const isLoading = ref(true);
const userIntegrations = ref([]);

// Fetch both available providers and user's installed integrations
async function fetchData() {
    try {
        isLoading.value = true;
        
        // Get all available providers first
        const allProviders = IntegrationProviders.getAllProviders();
        
        // Then fetch the user's actual integrations from the backend
        const response = await api.get('user/integrations');
        
        if (!response.success) {
            throw new Error(response.message || 'Failed to fetch integrations');
        }
        
        // Store user integrations for reference
        userIntegrations.value = response.data;
        
        // Map provider details and attach installed status
        providers.value = allProviders.map(provider => {
            // Check if this provider is installed by looking at user integrations
            const isInstalled = userIntegrations.value.some(
                integration => integration.provider === provider.id && integration.status === 'active'
            );
            
            // Get the actual integration entity for this provider
            const installedIntegration = userIntegrations.value.find(
                integration => integration.provider === provider.id && integration.status === 'active'
            );
            
            return {
                id: provider.id,
                name: provider.name,
                description: provider.description,
                icon: provider.icon,
                category: provider.category,
                isInstalled: isInstalled,
                entityId: installedIntegration ? installedIntegration.id : null,
                integrationDetails: installedIntegration || null
            };
        });
        
    } catch (error) {
        console.error('Error fetching data:', error);
        common.notification('Failed to load integrations', false);
    } finally {
        isLoading.value = false;
    }
}

// Handle refresh after connect/disconnect
function handleIntegrationChange() {
    fetchData();
}

// Sort integrations - connected first, then unconnected
const sortedProviders = computed(() => {
    return [...providers.value].sort((a, b) => {
        // Connected integrations come first
        if (a.isInstalled && !b.isInstalled) return -1;
        if (!a.isInstalled && b.isInstalled) return 1;
        // Then sort alphabetically by name
        return a.name.localeCompare(b.name);
    });
});

// Initialize component
onMounted(() => {
    fetchData();
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
                    <!-- Loading state -->
                    <div v-if="isLoading" class="loading-state">
                        Loading integrations...
                    </div>
                    
                    <!-- Empty state -->
                    <div v-else-if="sortedProviders.length === 0" class="empty-state">
                        <div class="empty-content">
                            <div class="empty-icon">
                                <i>extension</i>
                            </div>
                            <h3>No integrations available</h3>
                            <p>Check back later for available integrations.</p>
                        </div>
                    </div>
                    
                    <!-- Integrations grid - all in one -->
                    <div v-else class="integrations-grid">
                        <IntegrationCard 
                            v-for="provider in sortedProviders"
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