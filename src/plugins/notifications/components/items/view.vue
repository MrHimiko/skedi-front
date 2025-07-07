<script setup>
    import { ref, onMounted, onUnmounted } from 'vue'
    import { getLogDates } from './logic'
    import { fetch } from '@utils/fetch'

    import SeparatorComponent from '@global/separator/view.vue'


    const props = defineProps({
        endpoint: {
            type: String,
            required: true
        },
        as: String
    });

    const refLogs = ref([]);

    onMounted(() => 
    {
        fetch.many(props.endpoint).then((data) => 
        {
            refLogs.value = data;
        })
    });

    onUnmounted(() => 
    {
        refLogs.value = [];
    });
</script>

<template>
    <div class="activity-c-logs">
        <div v-if="refLogs" v-for="(entry, entryIndex) in getLogDates(refLogs)" :key="entryIndex">
            <div v-if="entryIndex !== 0" class="p-xl"></div>
            <separator-component as="left" :title="entry.date"/>
            <div class="p-xl"></div>

            <div class="grid gap-3xl" v-auto-animate="{ duration: 150 }">
                <log-component 
                    :as="as"
                    v-for="(log, logIndex) in entry.logs" :key="logIndex" 
                    :user="log.user" 
                    :resource="log.resource.name" 
                    :type="log.type"
                    :action="log.action"
                    :time="log.time"
                    :changes="log.changes"
                ></log-component>
            </div>
        </div>
    </div>
</template>

