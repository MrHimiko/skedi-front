// src/panels/front/init.js
import { initializeApp } from '@/app'
import { runHooks } from '@/hooks'

import RunFront from '@/panels/front/run';
import RunFrontEvents from '@/panels/front/plugins/events/run';

initializeApp((app, router, stores) => {   
    const hooks = [
        RunFront,
        RunFrontEvents
    ];

    runHooks(...hooks).forEach((hook) => {
        new hook(app, router, stores, 'front')
    });
});