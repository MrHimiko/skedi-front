export default class {
    constructor(app, router, stores) {
        this.app = app;
        this.router = router;
        this.stores = stores;
        
        // Add billing success route
        router.addRoute({
            path: '/billing/success',
            name: 'BillingSuccess',
            component: () => import('./pages/success.vue')
        });


         router.addRoute({
            path: '/billing',
            name: 'Billing',
            component: () => import('./pages/home.vue')
        });

    }
}