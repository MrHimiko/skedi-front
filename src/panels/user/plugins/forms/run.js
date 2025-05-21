import { PhChatCenteredText } from "@phosphor-icons/vue";

export default class {
    constructor(app, router, stores) {
        this.app = app;
        this.router = router;
        this.stores = stores;
    
        this.routes();
        this.sidebar();
    }

    routes() {
        this.router.addRoute({
            path: '/forms',
            name: 'Forms',
            component: () => import('./pages/list/view.vue'),
            beforeEnter: (to, from, next) => {
                this.stores.user.isLogged() ? next() : this.router.replace('/account/login?return=' + to.fullPath);
            }
        });

        this.router.addRoute({
            path: '/forms/:id/edit',
            name: 'Edit Form',
            component: () => import('./pages/edit/view.vue'),
            beforeEnter: (to, from, next) => {
                this.stores.user.isLogged() ? next() : this.router.replace('/account/login?return=' + to.fullPath);
            }
        });
    }

    sidebar() {
        this.stores.menu.add('sidebar:top', 'Forms', { component: PhChatCenteredText, weight: 'bold' }, '/forms');
    }
}