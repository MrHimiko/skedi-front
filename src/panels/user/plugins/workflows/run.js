// src/panels/user/plugins/workflows/run.js

import { PhFlowArrow } from "@phosphor-icons/vue";

export default class
{
    constructor(app, router, stores) 
    {
        this.app = app;
        this.router = router;
        this.stores = stores;
    
        this.routes();
        this.sidebar();
    }

    routes()
    {
        this.router.addRoute({
            path: '/workflows',
            name: 'Workflows',
            component: () => import('./pages/list/view.vue'),
            beforeEnter: (to, from, next) => 
            {
                this.stores.user.isLogged() ? next() : this.router.replace('/account/login?return=' + to.fullPath);
            }
        });

        this.router.addRoute({
            path: '/workflows/:id',
            name: 'WorkflowEditor',
            component: () => import('./pages/view/view.vue'),
            beforeEnter: (to, from, next) => {
                this.stores.user.isLogged() ? next() : this.router.replace('/account/login?return=' + to.fullPath);
            }
        });
    }

    sidebar() 
    {
        this.stores.menu.add('sidebar:top', 'Workflows', { component: PhFlowArrow, weight: 'bold' }, '/workflows');
    }
}