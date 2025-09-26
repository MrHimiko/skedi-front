<script setup>
    import './style.css'
    import { ref, watch } from 'vue'
    import { form } from '@utils/form'
    import TabsComponent from '@global/tabs/view.vue'
    import Input from '@form/input/view.vue'
    import Textarea from '@form/textarea/view.vue'
    import Select from '@form/select/view.vue'
    import Button from '@form/button/view.vue'
    import Toggle from '@form/toggle/view.vue'
    import Color from '@form/color/view.vue'
    import Date from '@form/date/view.vue'
    import Editor from '@form/editor/view.vue'
    import Options from '@form/options/view.vue'
    import Separator from '@global/separator/view.vue'
    import Holder from '@global/holder/view.vue'
    import Repeater from '@/components/repeater/view.vue'

    const components = {
        Input,
        Textarea,
        Select,
        Button,
        Toggle,
        Options,
        Color,
        Date,
        Editor,
        Separator,
        Repeater,
        Holder
    }

    const props = defineProps({
        values: Function,
        endpoint: String,
        type: String,
        as: String,
        button: String,
        callback: Function,
        survey: {
            type: Boolean
        },
        actions: {
            type: Boolean,
            default: true
        },
        popup: {
            type: Boolean,
            default: false
        },
        tabs: {
            type: Array,
            required: true
        },
        container: {
            type: String,
            default: 'xl'
        }
    })

    const activeTab = ref(0)
    const activeValues = ref(
        JSON.parse(JSON.stringify(typeof props.values === 'function' ? props.values() : {}))
    )

    // Watch for changes in props.values and re-initialize if needed
    watch(() => props.values, () => {
        if (typeof props.values === 'function') {
            const newValues = props.values();
            // Update our local state with the new values
            Object.keys(newValues).forEach(key => {
                activeValues.value[key] = newValues[key];
            });
        }
    }, { deep: true })

    props.tabs.forEach((tab) => {
        tab.components.forEach((component) => {
            if ('properties' in component && 'value' in component.properties && !(component.name in activeValues.value)) {
                activeValues.value[component.name] = component.properties.value
            }
        })
    })

    function changeTab(event, object, index) {
        activeTab.value = index
    }

    function getValue(key) {
        return key in activeValues.value ? activeValues.value[key] : null
    }

    function nextTab() {
        activeTab.value = activeTab.value + 1
    }

    function prevTab() {
        activeTab.value = activeTab.value - 1
    }

    function handleChange(item, event, value) {
        // Handle the Select component's emitted value properly
        if (item.type === 'Select' && value === undefined && typeof event !== 'object') {
            // Select emits value directly as first parameter
            activeValues.value[item.name] = event;
        } else if (event && event.target) {
            // Regular form inputs with event.target
            activeValues.value[item.name] = event.target.value;
        } else {
            // Other components that emit value directly
            activeValues.value[item.name] = value !== undefined ? value : event;
        }
        
        // If we have a callback and we're in a repeater context, call it with all current values
        if (props.callback && !props.actions) {
            props.callback(activeValues.value);
        }
    }
</script>

<template>
    <form
        @submit="event => endpoint ? form.toAPI(event, type, endpoint, callback) : form.getData(event, callback)"
        :class="['c-builder', (tabs.length > 1 ? 'tabs' : ''), as]"
    >
        <div :class="['content']">
            <div class="flex-column container-lg" style="gap: var(--spacing-6xl)" v-if="survey && tabs.length > 1">
                <tabs-component
                    as="steps"
                    :onClick="changeTab"
                    :active="tabs[activeTab]?.title"
                    :tabs="tabs"
                ></tabs-component>
                <div class="text-center">
                    <h1>{{ tabs[activeTab].title }}</h1>
                    <div v-if="tabs[activeTab].description" class="p-md"></div>
                    <p
                        v-if="tabs[activeTab].description"
                        class="text-secondary"
                        style="max-width: 480px; margin: 0 auto"
                    >
                        {{ tabs[activeTab].description }}
                    </p>
                </div>
                <div></div>
            </div>
            <div :class="['content', 'container-' + container]" :style="!actions ? 'padding-bottom: 0' : ''">
                <div v-if="!survey && tabs.length > 1" class="tabs">
                    <tabs-component
                        :onClick="changeTab"
                        as="column"
                        :active="tabs[activeTab]?.title"
                        :tabs="tabs"
                    ></tabs-component>
                </div>
                <div class="components">
                    <div
                        v-for="(tab, tabIndex) in tabs"
                        :key="tabIndex"
                        class="grid gap-5xl grid-12"
                        v-show="activeTab === tabIndex"
                    >
                        <!-- Apply condition via filter() in the v-for loop -->
                        <div
                            v-show="!('hidden' in item) || !item.hidden"
                            v-for="(item, itemIndex) in tab.components.filter(item => !item.condition || item.condition(activeValues))"
                            :key="itemIndex"
                            :style="'grid-column: span ' + (item.width ? item.width : 6)"
                        >
                            <div v-if="item.label || item.description" class="top flex-between">
                                <div class="left">
                                    <label class="text-xs" v-if="item.label">{{ item.label }}</label>
                                    <p class="text-xs text-secondary" v-if="item.description">
                                        {{ item.description }}
                                    </p>
                                </div>
                                <div class="right">
                                    <span class="text-xs text-secondary" v-if="item.required">Required</span>
                                </div>
                            </div>
                            <div v-if="item.type === 'Empty'" class="flex text-bold text-xs" style="height: 100%">
                                {{ item.properties?.title }}
                            </div>
                            <div v-else>
                                <component
                                    :onChange="(...data) => handleChange(item, ...data)"
                                    :as="as === 'form' ? 'bg1' : null"
                                    :is="item.component ? item.component : components[item.type]"
                                    :name="item.name"
                                    :value="'onValue' in item ? item.onValue(getValue(item.name)) : getValue(item.name)"
                                    v-bind="item.properties"
                                    @update:value="(value) => handleChange(item, null, value)"
                                    @change="(value) => handleChange(item, null, value)"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div v-if="!survey && actions" class="actions grid grid-2 gap-2xl">
            <div v-if="popup">
                <div class="c-button tertiary stroke pointer i-dropdown-close i-popup-close" as="stroke">
                    Close
                </div>
            </div>
            <div v-if="endpoint || callback">
                <Button type="submit" label="Save"></Button>
            </div>
        </div>
        <div v-if="survey && actions" class="actions grid grid-2 gap-2xl">
            <div v-if="!activeTab">
                <div class="c-button stroke pointer i-dropdown-close i-popup-close" as="stroke">
                    Close
                </div>
            </div>
            <div v-if="activeTab > 0">
                <div class="c-button stroke pointer" @click="prevTab" as="stroke">Previous</div>
            </div>
            <div v-if="activeTab < (tabs.length - 1)">
                <div class="c-button brand pointer" @click="nextTab">Next</div>
            </div>
            <div v-if="activeTab >= (tabs.length - 1)">
                <Button type="submit" :label="button ? button : 'Save'"></Button>
            </div>
        </div>
    </form>
</template>