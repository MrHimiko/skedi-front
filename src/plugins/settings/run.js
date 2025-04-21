export default class 
{
    constructor(app, router, stores) 
    {
        this.app = app;
        this.router = router;
        this.stores = stores;

        this.routes()
        this.sidebar()
    }

    routes() 
    {
        this.router.addRoute(
        {
            path: '/settings',
            name: 'Settings',
            component: () => import('./pages/settings/view.vue'),
            beforeEnter: (to, from, next) => 
            {
                this.stores.user.isLogged() ? next() : this.router.replace('/account/login?return=' + to.path);
            }
        })

        this.router.addRoute(
        {
            path: '/settings/:tab',
            name: 'Settings - Tab',
            component: () => import('./pages/settings/view.vue'),
            beforeEnter: (to, from, next) => 
            {
                this.stores.user.isLogged() ? next() : this.router.replace('/account/login?return=' + to.path);
            }
        })
    }

    sidebar() 
    {
     
    }
}
