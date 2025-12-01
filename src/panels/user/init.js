import { initializeApp } from '@/app'
import { runHooks } from '@/hooks'

import RunUser from '@/panels/user/run';

/* User Plugins */
import RunUserShared from '@user_shared/run';
import RunUserAccount from '@user_account/run';
import RunUserDashboard from '@user_dashboard/run';
import RunUserTeams from '@user_teams/run';
import RunUserEvents from '@user_events/run';
import RunUserBookings from '@user_bookings/run';
import RunUserIntegrations from '@user_integrations/run';
import RunUserForms from '@user_forms/run';
import RunUserContacts from '@user_contacts/run';
import RunUserAvailability from '@user_availability/run';
import RunUserPotentialLeads from '@user_potential_leads/run';
import RunUserOrganizations from '@user_organizations/run';
import RunUserBilling from '@user_billing/run';
import RunUserWorkflows from '@user_workflows/run';
import RunUserSurvey from '@user_survey/run';
import InstantMeetingPlugin  from '@user_instant-meeting/run';




/* User Extensions */
import RunUserBuilder from '@user_builder/run';

initializeApp((app, router, stores) => 
{   
    const hooks = [
        RunUser, 
        RunUserShared,
        RunUserEvents,
        RunUserDashboard,
        RunUserAccount,
        RunUserTeams,
        RunUserBookings,
        RunUserIntegrations,
        RunUserForms,
        RunUserContacts,
        RunUserOrganizations,
        RunUserPotentialLeads,
        RunUserBilling,
        RunUserAvailability,
        RunUserWorkflows,
        RunUserSurvey,
        InstantMeetingPlugin
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