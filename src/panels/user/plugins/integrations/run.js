import { PhLink} from "@phosphor-icons/vue";
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
            path: '/integrations',
            name: 'Integrations',
            component: () => import('./pages/home/view.vue'),
            beforeEnter: (to, from, next) => 
            {
                next();
                //this.stores.user.isLogged() ? next() : this.router.replace('/account/login?return=' + to.fullPath)
            }
        })

        this.router.addRoute(
        {
            path: '/oauth/google/callback',
            name: 'google-oauth-callback',
            component: () => import('./pages/google/callback.vue'),
            beforeEnter: (to, from, next) => 
            {
                next();
            }
        })

    }

    sidebar() 
    {
        this.stores.menu.add('sidebar:top', 'Integrations', { component: PhLink, weight: 'bold' }, '/integrations');
    }
}