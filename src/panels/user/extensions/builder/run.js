import { settingDomain } from './settings/domain';

export default class
{
    constructor(app, router, stores)
    {
        this.app = app;
        this.router = router;
        this.stores = stores;

        settingDomain(this.stores);
    }
}