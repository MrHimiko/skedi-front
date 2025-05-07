import runPluginAccount from '@/plugins/account/run'
import runPluginExtensions from '@/plugins/extensions/run';
import runPluginNotifications from '@/plugins/notifications/run';
import runPluginSearch from '@/plugins/search/run';

function runHooks(...imports) 
{
    return [
        runPluginAccount, 
        runPluginExtensions,
        runPluginNotifications,
        runPluginSearch,
        ...imports
    ];
}

export {
    runHooks
}