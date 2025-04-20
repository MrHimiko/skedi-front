<script setup>
import { ref, computed, onMounted } from 'vue';
import { storage } from '@utils/storage';
import { common } from '@utils/common';
import SelectComponent from '@form/select/view.vue';

// Current timezone state
const currentTimezone = ref('');

// Timezone options list
const timezoneOptions = ref([
    { label: 'UTC', value: 'UTC' },
    { label: 'Europe/London (GMT)', value: 'Europe/London' },
    { label: 'Europe/Paris (CET)', value: 'Europe/Paris' },
    { label: 'Europe/Berlin (CET)', value: 'Europe/Berlin' },
    { label: 'Europe/Budapest (CET)', value: 'Europe/Budapest' },
    { label: 'America/New_York (EST/EDT)', value: 'America/New_York' },
    { label: 'America/Chicago (CST/CDT)', value: 'America/Chicago' },
    { label: 'America/Denver (MST/MDT)', value: 'America/Denver' },
    { label: 'America/Los_Angeles (PST/PDT)', value: 'America/Los_Angeles' },
    { label: 'Asia/Tokyo (JST)', value: 'Asia/Tokyo' },
    { label: 'Asia/Shanghai (CST)', value: 'Asia/Shanghai' },
    { label: 'Australia/Sydney (AEST/AEDT)', value: 'Australia/Sydney' },
    { label: 'Pacific/Auckland (NZST/NZDT)', value: 'Pacific/Auckland' }
]);

// Get the current timezone offset display
const getTimezoneDisplay = () => {
    const offset = new Date().getTimezoneOffset();
    const hours = Math.abs(Math.floor(offset / 60));
    const minutes = Math.abs(offset % 60);
    const sign = offset < 0 ? '+' : '-';
    
    return `UTC${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

// Format for display
const currentTimezoneDisplay = computed(() => {
    // If no timezone is selected, use browser's timezone
    if (!currentTimezone.value) {
        const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        return `${browserTz} (${getTimezoneDisplay()})`;
    }
    
    return `${currentTimezone.value} (${getTimezoneDisplay()})`;
});

// Handler for timezone change
function handleTimezoneChange(value) {
    storage.set('user.timezone', value);
    currentTimezone.value = value;
    
    common.notification('Timezone updated. Refreshing data...', true);
    
    // Refresh the page to apply timezone changes
    setTimeout(() => {
        window.location.reload();
    }, 1500);
}

// Initialize component
onMounted(() => {
    // Get saved timezone or use browser default
    const savedTz = storage.get('user.timezone');
    currentTimezone.value = savedTz || Intl.DateTimeFormat().resolvedOptions().timeZone;
});
</script>

<template>
    <div class="timezone-selector">
        <div class="selector-label">Timezone</div>
        
        <SelectComponent
            :value="currentTimezone"
            :options="timezoneOptions"
            placeholder="Select timezone"
            @change="handleTimezoneChange"
        />
    </div>
</template>

<style>
.timezone-selector {
    padding: 15px;
    border-top: 1px solid var(--border);
}

.selector-label {
    font-size: 12px;
    font-weight: 600;
    margin-bottom: 8px;
    color: var(--text-secondary);
}
</style>