import { PhUsers } from "@phosphor-icons/vue";

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
            path: '/potential-leads',
            name: 'PotentialLeads',
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
        this.stores.menu.add('sidebar:top', 'Potential Leads', { component: PhUsers, weight: 'bold' }, '/potential-leads');
    }
}