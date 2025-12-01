import { defineStore } from 'pinia'

export const MenuStore = defineStore('menuStore', 
{
    state: () => 
    ({
        menus: {},
    }),

    actions: 
    {
        get(group)
        {
            if(!(group in this.menus))
            {
                return [];
            }

            return [...this.menus[group]].sort((a, b) => a.order - b.order);
        },

        getSorted(group)
        {
            const menus = this.get(group);
            const sorted = {};

            menus.forEach((menu) => 
            {
                if(!menu.sort || !('sort' in menu))
                {
                    menu.sort = 'main';
                }

                if(!(menu.sort in sorted))
                {
                    sorted[menu.sort] = {
                        name: menu.sort,
                        menus: []
                    }
                }

                sorted[menu.sort].menus.push(menu);
            });

            return sorted;
        },

        /**
         * Add a menu item to a group
         * 
         * @param {string} group - Menu group (e.g., 'sidebar:top', 'sidebar:bottom')
         * @param {string} label - Display label for the menu item
         * @param {string|object} icon - Icon name (string) or component object { component: PhIcon, weight: 'bold' }
         * @param {string|null} link - Route link (set to null if using onClick)
         * @param {number|object} orderOrOptions - Order number OR options object { order, onClick, sort }
         * @param {string|null} sort - Sort group (optional)
         * 
         * @example
         * // Standard menu item with link
         * menu.add('sidebar:top', 'Dashboard', { component: PhGridNine, weight: 'bold' }, '/');
         * 
         * @example
         * // Menu item with onClick handler (no navigation)
         * menu.add('sidebar:top', 'Instant Meeting', { component: PhLightning, weight: 'bold' }, null, {
         *     onClick: () => openInstantMeetingModal()
         * });
         * 
         * @example
         * // Menu item with order
         * menu.add('sidebar:top', 'Settings', 'settings', '/settings', 100);
         */
        add(group, label, icon, link, orderOrOptions = 0, sort = null) 
        {
            if(!(group in this.menus))
            {
                this.menus[group] = [];
            }

            // Handle both old signature (order as number) and new signature (options object)
            let order = 0;
            let onClick = null;
            let options = {};

            if (typeof orderOrOptions === 'object' && orderOrOptions !== null) {
                // New signature: orderOrOptions is an options object
                options = orderOrOptions;
                order = options.order || 0;
                onClick = options.onClick || null;
                sort = options.sort || sort;
            } else {
                // Old signature: orderOrOptions is just the order number
                order = orderOrOptions;
            }

            const menu = {
                label, 
                icon, 
                link, 
                order, 
                sort, 
                onClick,
                children: []
            };

            this.menus[group].push(menu)

            // Return a function for adding children (existing API)
            return (callback) => 
            {
                callback((label, icon, link) => 
                {
                    menu.children.push({label, icon, link});
                });
            }
        },

        /**
         * Remove a menu item by label from a group
         * @param {string} group - Menu group
         * @param {string} label - Label of the menu item to remove
         */
        remove(group, label) 
        {
            if (!(group in this.menus)) {
                return;
            }

            this.menus[group] = this.menus[group].filter(menu => menu.label !== label);
        },

        /**
         * Clear all menus from a group
         * @param {string} group - Menu group to clear
         */
        clear(group) 
        {
            if (group in this.menus) {
                this.menus[group] = [];
            }
        }
    }
})