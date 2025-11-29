// src/panels/user/plugins/events/composables/useEventActions.js

import { markRaw } from 'vue';
import { useRouter } from 'vue-router';
import { popup } from '@utils/popup';
import { common } from '@utils/common';
import { api } from '@utils/api';

// Import popup components
import EventEditSchedule from '@user_events/components/form/eventEditSchedule.vue';
import EventEditDuration from '@user_events/components/form/eventEditDuration.vue';
import EventEditAssignees from '@user_events/components/form/eventEditAssignees.vue';
import EventEditLocation from '@user_events/components/form/eventEditLocation.vue';
import EventFormSettings from '@user_events/components/form/eventFormSettings.vue';
import EventCreateForm from '@user_events/components/form/eventCreate.vue';
import EventManageTeam from '@user_events/components/form/eventManageTeam.vue';
import ConfirmComponent from '@floated/confirm/view.vue';

/**
 * Composable for event actions (create, edit, delete popups)
 */
export function useEventActions(options = {}) {
    const router = useRouter();
    const { onSuccess } = options;

    // Menu options for event actions
    const eventActionMenus = markRaw([
        { label: 'Preview booking page', icon: 'PhArrowSquareOut' },
        { label: 'View all settings', icon: 'PhGearSix' },
        { label: 'divider' },
        { label: 'Edit duration', icon: 'PhClock' },
        { label: 'Edit availability', icon: 'PhCalendar' },
        { label: 'Edit location', icon: 'PhMapPin' },
        { label: 'Manage hosts', icon: 'PhUsers' },
        { label: 'Manage team', icon: 'PhUsersThree' },
        { label: 'divider' },
        { label: 'Duplicate', icon: 'PhCopy' },
        { label: 'Remove', icon: 'PhTrash', class: 'text-red-500' }
    ]);

    /**
     * Handle event action menu selection
     */
    function handleEventAction(menuLabel, event, org, reloadCallback) {
        const eventId = event.id;
        const orgId = org.id;

        switch (menuLabel) {
            case 'Preview booking page':
                openPreviewPage(event, org);
                break;

            case 'View all settings':
                router.push(`/events/${eventId}`);
                break;

            case 'Edit duration':
                openEditDuration(event, orgId, reloadCallback);
                break;

            case 'Edit availability':
                openEditAvailability(event, orgId, reloadCallback);
                break;

            case 'Edit location':
                openEditLocation(event, orgId, reloadCallback);
                break;

            case 'Manage hosts':
                openManageHosts(event, orgId, reloadCallback);
                break;

            case 'Manage team':
                openManageTeam(event, orgId, reloadCallback);
                break;

            case 'Duplicate':
                duplicateEvent(event, orgId, reloadCallback);
                break;

            case 'Remove':
                openDeleteConfirm(event, orgId, reloadCallback);
                break;

            default:
                console.log('Unknown action:', menuLabel);
        }
    }

    /**
     * Open event preview page in new tab
     */
    function openPreviewPage(event, org) {
        const url = `https://skedi.com/${org.slug}/schedule/${event.slug}`;
        window.open(url, '_blank');
    }

    /**
     * Copy event URL to clipboard
     */
    async function copyEventUrl(event, org) {
        const url = `https://skedi.com/${org.slug}/schedule/${event.slug}`;
        try {
            await navigator.clipboard.writeText(url);
            common.notification('URL copied to clipboard', true);
        } catch (error) {
            console.error('Failed to copy URL:', error);
            common.notification('Failed to copy URL', false);
        }
    }

    /**
     * Open create event popup
     */
    function openCreateEvent(org, reloadCallback) {
        popup.open(
            'create-event',
            null,
            EventCreateForm,
            {
                organizationId: org.id,
                callback: (event, data, response, success) => {
                    if (success) {
                        reloadCallback?.();
                        popup.close();
                        onSuccess?.();
                    }
                }
            },
            {
                position: 'center'
            }
        );
    }

    /**
     * Open edit duration popup
     */
    function openEditDuration(event, orgId, reloadCallback) {
        popup.open(
            'edit-event-duration',
            null,
            EventEditDuration,
            {
                endpoint: `events/${event.id}?organization_id=${orgId}`,
                type: 'PUT',
                callback: (evt, data, response, success) => {
                    if (success) {
                        reloadCallback?.();
                        popup.close();
                        onSuccess?.();
                    }
                },
                values: () => ({
                    duration: event.duration
                }),
                class: 'h-auto',
                title: `Edit Duration for ${event.name}`
            },
            {
                position: 'center'
            }
        );
    }

    /**
     * Open edit availability/schedule popup
     */
    function openEditAvailability(event, orgId, reloadCallback) {
        popup.open(
            'edit-event-schedule',
            null,
            EventEditSchedule,
            {
                eventId: event.id,
                organizationId: orgId,
                values: () => event,
                callback: (evt, data, response, success) => {
                    if (success) {
                        reloadCallback?.();
                        onSuccess?.();
                    }
                }
            },
            {
                position: 'center'
            }
        );
    }

    /**
     * Open edit location popup
     */
    function openEditLocation(event, orgId, reloadCallback) {
        popup.open(
            'edit-event-location',
            null,
            EventEditLocation,
            {
                endpoint: `events/${event.id}?organization_id=${orgId}`,
                type: 'PUT',
                callback: (evt, data, response, success) => {
                    if (success) {
                        reloadCallback?.();
                        popup.close();
                        onSuccess?.();
                    }
                },
                values: () => ({
                    location: event.location
                }),
                class: 'h-auto',
                title: `Edit Location for ${event.name}`
            },
            {
                position: 'center'
            }
        );
    }

    /**
     * Open manage hosts/assignees popup
     */
    function openManageHosts(event, orgId, reloadCallback) {
        popup.open(
            'edit-event-assignees',
            null,
            EventEditAssignees,
            {
                endpoint: `events/${event.id}?organization_id=${orgId}`,
                type: 'PUT',
                callback: (evt, data, response, success) => {
                    if (success) {
                        reloadCallback?.();
                        onSuccess?.();
                    }
                },
                values: () => ({
                    assignees: event.assignees
                }),
                eventId: event.id,
                organizationId: orgId
            },
            {
                position: 'center'
            }
        );
    }

    /**
     * Open manage team popup
     */
    function openManageTeam(event, orgId, reloadCallback) {
        popup.open(
            'manage-event-team',
            null,
            EventManageTeam,
            {
                eventId: event.id,
                organizationId: orgId,
                values: () => event,
                callback: (evt, data, response, success) => {
                    if (success) {
                        reloadCallback?.();
                        onSuccess?.();
                    }
                }
            },
            {
                position: 'center'
            }
        );
    }

    /**
     * Duplicate event
     */
    async function duplicateEvent(event, orgId, reloadCallback) {
        try {
            const response = await api.post(`events/${event.id}/duplicate?organization_id=${orgId}`);
            if (response.success) {
                common.notification('Event duplicated successfully', true);
                reloadCallback?.();
                onSuccess?.();
            } else {
                common.notification('Failed to duplicate event', false);
            }
        } catch (error) {
            console.error('Failed to duplicate event:', error);
            common.notification('Failed to duplicate event', false);
        }
    }

    /**
     * Open delete confirmation popup
     */
    function openDeleteConfirm(event, orgId, reloadCallback) {
        popup.open(
            'remove-event-confirm',
            null,
            ConfirmComponent,
            {
                as: 'red',
                description: `Are you sure you want to remove "${event.name}"?`,
                endpoint: `events/${event.id}?organization_id=${orgId}`,
                type: 'DELETE',
                callback: (evt, data, response, success) => {
                    if (success) {
                        reloadCallback?.();
                        popup.close();
                        onSuccess?.();
                    }
                }
            },
            {
                position: 'center'
            }
        );
    }

    return {
        eventActionMenus,
        handleEventAction,
        openPreviewPage,
        copyEventUrl,
        openCreateEvent,
        openEditDuration,
        openEditAvailability,
        openEditLocation,
        openManageHosts,
        openManageTeam,
        duplicateEvent,
        openDeleteConfirm
    };
}