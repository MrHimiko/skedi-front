<script setup>
import { ref } from 'vue';
import MainLayout from '@layouts/main/view.vue';
import HeadingComponent from '@global/heading/view.vue';
import TabsComponent from '@global/tabs/view.vue';
import { UserStore } from '@stores/user';
import ButtonComponent from '@form/button/view.vue';
import InputComponent from '@form/input/view.vue';
import { common } from '@utils/common';
import { api } from '@utils/api';
import ConfirmComponent from '@floated/confirm/view.vue';
import { popup } from '@utils/popup';

// Get user data from store
const userStore = UserStore();
const userData = ref(userStore.getData());

// Active tab management
const activeTab = ref('profile');

// Tabs configuration
const tabs = [
  { title: 'Profile', icon: 'person', active: true },
  { title: 'Security', icon: 'lock' },
  { title: 'Notifications', icon: 'notifications' }
];

// Handle tab change
function handleTabChange(event, tab) {
  activeTab.value = tab.title.toLowerCase().replace(/\s+/g, '-');
}

// Form data for user updates
const formData = ref({
  name: userData.value.name || ''
});

// Update user information
async function updateUserInfo() {
  try {
    const response = await api.put('account/user', {
      name: formData.value.name
    });

    if (response && response.success) {
      // Update store with new data
      userStore.setData({
        ...userData.value,
        name: formData.value.name
      });
      
      // Refresh local data
      userData.value = userStore.getData();
      
      // Show success notification
      common.notification('Profile updated successfully', true);
    } else {
      common.notification('Failed to update profile', false);
    }
  } catch (error) {
    console.error('Error updating user:', error);
    common.notification('An error occurred while updating your profile', false);
  }
}

// Handle account deletion confirmation
function confirmDeleteAccount() {
  popup.open(
    'delete-account-confirm',
    null,
    ConfirmComponent,
    {
      as: 'red',
      description: 'Are you sure you want to delete your account? This action cannot be undone.',
      endpoint: 'account/user',
      type: 'DELETE',
      callback: (event, data, response, success) => {
        if (success) {
          common.notification('Your account has been deleted', true);
          // Redirect to login after deletion
          setTimeout(() => {
            window.location.href = '/account/login';
          }, 1500);
        } else {
          common.notification('Failed to delete account', false);
        }
      }
    }
  );
}
</script>

<template>
  <MainLayout>
    <template #content>
      <div class="container-lg">
        <!-- Page Header -->
        <HeadingComponent 
          title="Account Settings" 
          description="Manage your account preferences and personal information"
        />
        
        <!-- Main Content Area -->
        <div class="account-settings">
          <!-- Tabs Navigation -->
          <div class="tabs-wrapper">
            <TabsComponent 
              :tabs="tabs" 
              :active="activeTab" 
              :onClick="handleTabChange"
            />
          </div>
          
          <!-- Content Panels -->
          <div class="settings-panels">
            <!-- Basic Information Panel -->
            <div v-if="activeTab === 'profile'" class="panel basic-info-panel">
              <div class="panel-content">
                <div class="avatar-section">
                  <div class="avatar-placeholder">
                    <span v-if="userData.name">{{ userData.name.charAt(0) }}</span>
                    <span v-else>U</span>
                  </div>
                  <div class="avatar-info">
                    <h3>Profile photo</h3>
                    <p class="text-secondary">This will be displayed on your profile</p>
                    <!-- Avatar upload will be implemented later -->
                  </div>
                </div>
                
                <div class="form-section">
                  <form @submit.prevent="updateUserInfo">
                    <div class="form-row">
                      <div class="form-column">
                        <InputComponent 
                          label="Name" 
                          name="name" 
                          v-model="formData.name"
                          :value="formData.name"
                          placeholder="Enter your name"
                        />
                      </div>
                      <div class="form-column">
                        <InputComponent 
                          label="Email Address" 
                          name="email" 
                          :value="userData.email"
                          disabled
                        />
                      </div>
                    </div>
                    
                    <div class="form-actions">
                        <div>
                            <ButtonComponent 
                                label="Update Profile" 
                                type="submit"
                            />
                        </div>
                      
                    </div>
                  </form>
                </div>
                
                <div class="danger-zone">
                  <div class="danger-action">
                    <div class="danger-info">
                      <h4>Delete Account</h4>
                      <p>Once you delete your account, there is no going back. Please be certain.</p>
                    </div>
                    <div>
                        <ButtonComponent 
                            label="Delete Account" 
                            as="red"
                            @click="confirmDeleteAccount"
                        />
                    </div>
                    
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Password & Security Panel (placeholder for future) -->
            <div v-if="activeTab === 'security'" class="panel">
              <div class="panel-content">
                <h3>Password & Security</h3>
                <p class="text-secondary">This section will be implemented in a future update.</p>
              </div>
            </div>
            
            <!-- Notifications Panel (placeholder for future) -->
            <div v-if="activeTab === 'notifications'" class="panel">
              <div class="panel-content">
                <h3>Notifications</h3>
                <p class="text-secondary">This section will be implemented in a future update.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </MainLayout>
</template>

<style>
.account-settings {
  margin-top: 30px;
}

.tabs-wrapper {
  margin-bottom: 30px;
}

.panel {
  background-color: var(--background-0);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.panel-content {
  padding: var(--spacing-4xl);
}

.avatar-section {
  display: flex;
  align-items: center;
  gap: var(--spacing-xl);
  margin-bottom: var(--spacing-4xl);
}

.avatar-placeholder {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background-color: var(--background-2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  font-weight: 600;
  color: var(--text-secondary);
}

.avatar-info h3 {
  margin: 0;
  margin-bottom: var(--spacing-sm);
  font-size: 16px;
  font-weight: 600;
}

.form-row {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 32px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 50px;
}

.danger-zone {
  margin-top: var(--spacing-5xl);
  border-top: 1px solid var(--border);
  padding-top: var(--spacing-3xl);
}

.danger-title {
  color: var(--red-default);
  font-size: 16px;
  font-weight: 600;
  margin-bottom: var(--spacing-xl);
}

.danger-action {
  background-color: var(--red-fill);
  border: 1px solid var(--red-stroke);
  border-radius: var(--radius-md);
  padding: var(--spacing-xl);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.danger-info h4 {
  margin: 0;
  color: var(--red-default);
  font-weight: 600;
  margin-bottom: var(--spacing-xs);
  font-size:16px;
}

.danger-info p {
  margin: 0;
  font-size: 13px;
  font-weight: 500;
  color: var(--black)
}

@media (max-width: 768px) {
  .form-row {
    grid-template-columns: 1fr;
  }
  
  .danger-action {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-xl);
  }
}
</style>