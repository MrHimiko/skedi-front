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
            path: '/bookings',
            name: 'Bookings',
            component: () => import('./pages/home/view.vue'),
            beforeEnter: (to, from, next) => 
            {
                // Check if user is logged in
                this.stores.user.isLogged() ? next() : this.router.replace('/account/login?return=' + to.fullPath)
            }
        })
    }

    sidebar() 
    {
        // Add bookings to sidebar menu
        this.stores.menu.add('sidebar:top', 'Bookings', 'calendar_month', '/bookings');
    }
}