// Full path: src/panels/user/plugins/instant-meeting/run.js

import { PhLightning } from "@phosphor-icons/vue";
import { markRaw } from 'vue';
import { popup } from '@utils/popup';
import InstantMeetingModal from './components/modal/view.vue';

export default class {
    constructor(app, router, stores) {
        this.app = app;
        this.router = router;
        this.stores = stores;

        this.sidebar();
    }

    sidebar() {
        // Add instant meeting button to sidebar
        // This will be a special menu item that opens a popup instead of navigating
        this.stores.menu.add(
            'sidebar:top', 
            'Instant Meeting', 
            { component: PhLightning, weight: 'bold' }, 
            null,  // No route - we'll handle click manually
            {
                onClick: () => this.openInstantMeetingModal()
            }
        );
    }

    openInstantMeetingModal() {
        popup.open(
            'instant-meeting',
            null,
            markRaw(InstantMeetingModal),
            {
                callback: (result) => {
                    console.log('Instant meeting created:', result);
                }
            },
            {
                position: 'center'
            }
        );
    }
}