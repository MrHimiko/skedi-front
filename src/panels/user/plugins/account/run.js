import { settingCompany } from './settings/company';

export default class
{
    constructor(app, router, stores)
    {
        this.app = app;
        this.router = router;
        this.stores = stores;


        settingCompany(this.stores);
    }
}