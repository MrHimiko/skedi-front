<!-- src/panels/user/plugins/organizations/components/danger-zone/view.vue -->
<script setup>
import { ref } from 'vue';
import { api } from '@utils/api';
import { common } from '@utils/common';
import { popup } from '@utils/popup';

import ButtonComponent from '@form/button/view.vue';
import ConfirmComponent from '@floated/confirm/view.vue';

import { PhTrash, PhWarning } from "@phosphor-icons/vue";

const props = defineProps({
    organization: {
        type: Object,
        required: true
    },
    organizationId: {
        type: Number,
        required: true
    },
    isAdmin: {
        type: Boolean,
        default: false
    }
});

// Delete organization
function deleteOrganization() {
    popup.open(
        'delete-org-confirm',
        null,
        ConfirmComponent,
        {
            as: 'red',
            title: 'Delete Organization',
            description: `Are you sure you want to delete "${props.organization.name}"? This will permanently delete all teams, events, and data within this organization. This action cannot be undone.`,
            confirmLabel: 'Delete Organization',
            callback: async () => {
                try {
                    const response = await api.delete(`organizations/${props.organizationId}`);
                    
                    if (response.success) {
                        common.notification('Organization deleted successfully', true);
                        popup.close();
                        // Redirect to teams page
                        window.location.href = '/teams';
                    } else {
                        common.notification(response.message || 'Failed to delete organization', false);
                    }
                } catch (error) {
                    console.error('Failed to delete organization:', error);
                    common.notification('Failed to delete organization', false);
                }
            }
        },
        {
            position: 'center'
        }
    );
}
</script>

<template>
    <div class="org-danger-zone">
        <div class="danger-header">
            <PhWarning :size="32" weight="fill" class="warning-icon" />
            <div class="header-text">
                <h3>Danger Zone</h3>
                <p>Irreversible and destructive actions</p>
            </div>
        </div>
        
        <div class="danger-content">
            <div class="danger-section">
                <div class="section-info">
                    <h4>Delete this organization</h4>
                    <p>Once you delete an organization, there is no going back. This will permanently delete:</p>
                    <ul>
                        <li>All teams and members</li>
                        <li>All event types</li>
                        <li>All bookings and booking history</li>
                        <li>All contacts and potential leads</li>
                        <li>All organization data and settings</li>
                    </ul>
                    <p class="warning-text">Please be absolutely certain before proceeding.</p>
                </div>
                
                <div v-if="!isAdmin" class="no-permission">
                    <p>Only organization admins can delete the organization.</p>
                </div>
                
                <div v-else class="delete-action">
                    <ButtonComponent
                        as="red"
                        :iconLeft="{ component: PhTrash, weight: 'bold' }"
                        label="Delete Organization"
                        @click="deleteOrganization"
                    />
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.org-danger-zone {
    max-width: 700px;
}

.danger-header {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 24px;
    background: linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(239, 68, 68, 0.05) 100%);
    border: 2px solid rgba(239, 68, 68, 0.3);
    border-radius: 12px;
    margin-bottom: 32px;
}

.warning-icon {
    color: rgb(239, 68, 68);
    flex-shrink: 0;
}

.header-text h3 {
    margin: 0 0 4px 0;
    font-size: 20px;
    font-weight: 600;
    color: rgb(239, 68, 68);
}

.header-text p {
    margin: 0;
    color: var(--text-secondary);
    font-size: 14px;
}

.danger-content {
    background: var(--background-0);
}

.danger-section {
    padding: 24px;
    background: rgba(239, 68, 68, 0.05);
    border: 1px solid rgba(239, 68, 68, 0.2);
    border-radius: 8px;
}

.section-info h4 {
    margin: 0 0 12px 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
}

.section-info p {
    margin: 0 0 12px 0;
    font-size: 14px;
    color: var(--text-secondary);
    line-height: 1.6;
}

.section-info ul {
    margin: 12px 0;
    padding-left: 24px;
}

.section-info ul li {
    margin-bottom: 8px;
    font-size: 14px;
    color: var(--text-secondary);
    line-height: 1.5;
}

.warning-text {
    font-weight: 600;
    color: rgb(239, 68, 68);
    margin-top: 16px;
}

.no-permission {
    margin-top: 20px;
    padding: 16px;
    background: var(--background-2);
    border-radius: 6px;
    text-align: center;
}

.no-permission p {
    margin: 0;
    color: var(--text-secondary);
    font-size: 14px;
}

.delete-action {
    margin-top: 24px;
    padding-top: 24px;
    border-top: 1px solid rgba(239, 68, 68, 0.2);
    display: flex;
    justify-content: flex-end;
}

@media (max-width: 640px) {
    .danger-header {
        flex-direction: column;
        align-items: flex-start;
        text-align: left;
    }
}
</style>