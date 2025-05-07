export default class 
{
    constructor(app, router, stores) 
    {
        this.app = app;
        this.router = router;
        this.stores = stores;

        this.router.addRoute({
            path: '/account/login',
            name: 'Account - Login',
            component: () => import('./pages/login/view.vue'),
        });

        this.router.addRoute({
            path: '/account/register',
            name: 'Account - Register',
            component: () => import('./pages/register/view.vue'),
        });

        this.router.addRoute({
            path: '/account/recovery',
            name: 'Account - Forgot Password',
            component: () => import('./pages/recovery/view.vue'),
        });


        this.router.addRoute({
            path: '/account/settings',
            name: 'Account - Settings',
            component: () => import('./pages/settings/view.vue'),
        });

        
    }

}
