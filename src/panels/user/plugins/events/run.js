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
            path: '/events',
            name: 'Event types',
            component: () => import('./pages/home/view.vue'),
            beforeEnter: (to, from, next) => 
            {
                next();
                //this.stores.user.isLogged() ? next() : this.router.replace('/account/login?return=' + to.fullPath)
            }
        })

    }

    sidebar() 
    {
        this.stores.menu.add('sidebar:top', 'Event Types', { component: PhLink, weight: 'bold' }, '/events');
    }
}