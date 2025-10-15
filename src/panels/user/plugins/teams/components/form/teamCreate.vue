<script setup>
    import BuilderPopupComponent from '@/components/builder/popup/view.vue';

    defineProps({
        values: Function,
        endpoint: String,
        type: String,
        callback: Function,
    });

    const tabs = [ 
        {
            name: 'Name',
            components: [
                {
                    label: "Name",
                    type: 'Input',
                    width: 6,
                    name: 'name',
                    properties: {
                        placeholder: 'Team name'
                    }
                },
                {
                    label: "Color",
                    type: 'Color',
                    width: 6,
                    name: 'color',
                    properties: {
                        placeholder: 'Team color',
                        value: '#000000'
                    }
                }
            ]
        }
    ]
</script>

<template>
    <BuilderPopupComponent :endpoint="endpoint" :type="type" :callback="callback" :values="values" :tabs="tabs"></BuilderPopupComponent>
</template>