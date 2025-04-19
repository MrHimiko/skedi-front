import { initializeApp } from '@/app'
import { runHooks } from '@/hooks'

import RunUser from '@/panels/user/run';

/* User Plugins */
import RunUserShared from '@user_shared/run';
import RunUserActivity from '@user_activity/run';
import RunUserAccount from '@user_account/run';
import RunUserDashboard from '@user_dashboard/run';
import RunUserTeams from '@user_teams/run';
import RunUserEvents from '@user_events/run';
import RunUserBookings from '@user_bookings/run';


/* User Extensions */
import RunUserBuilder from '@user_builder/run';

initializeApp((app, router, stores) => 
{   
    const hooks = [
        RunUser, 
        RunUserShared,
        RunUserEvents,
        RunUserDashboard,
        RunUserActivity, 
        RunUserAccount,
        RunUserTeams,
        RunUserBookings
    ];

    if(stores.extension.has(1))
    {
        hooks.push(RunUserBuilder);
    }

    runHooks(...hooks).forEach((hook) => 
    {
        new hook(app, router, stores, 'user')
    })
});