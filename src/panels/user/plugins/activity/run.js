
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

    routes(router) 
    {
        this.router.addRoute(
        {
            path: '/activity/logs',
            name: 'Logs',
            component: () => import('./pages/logs/view.vue'),
            beforeEnter: (to, from, next) => 
            {
                this.stores.user.isLogged() ? next() : this.router.replace('/account/login?return=' + to.fullPath)
            }
        })
    }

    sidebar() 
    {
       
    }
}