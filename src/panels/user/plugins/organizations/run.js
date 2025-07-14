export default class {
    constructor(app, router, stores) {
        this.app = app;
        this.router = router;
        this.stores = stores;
        
        this.routes();
    }
    
    routes() {
        // Organization single page route
        this.router.addRoute({
            path: '/organization/:id',
            name: 'OrganizationSingle',
            component: () => import('./pages/single/view.vue'),
            beforeEnter: (to, from, next) => {
                // Check if user is logged in
                if (!this.stores.user.isLogged()) {
                    this.router.replace('/account/login?return=' + to.fullPath);
                    return;
                }
                
                // Check if user has access to this organization
                const orgId = parseInt(to.params.id);
                const userOrgs = this.stores.user.getOrganizations();
                const hasAccess = userOrgs.some(org => 
                    (org.entity?.id || org.id) === orgId
                );
                
                if (!hasAccess) {
                    this.router.replace('/teams');
                    return;
                }
                
                next();
            }
        });
    }
}