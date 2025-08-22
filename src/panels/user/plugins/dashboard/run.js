import { PhGridNine } from "@phosphor-icons/vue";
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
            path: '/',
            name: 'Dashboard',
            component: () => import('./pages/home/view.vue'),
            beforeEnter: (to, from, next) => 
            {
                next();
                this.stores.user.isLogged() ? next() : this.router.replace('/account/login?return=' + to.fullPath)
            }
        })

    }

    sidebar() 
    {
        this.stores.menu.add('sidebar:top', 'Dashboard', { component: PhGridNine, weight: 'bold' }, '/');
    }
}