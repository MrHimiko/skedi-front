<template>
    <div class="date-only-dropdown">
        <VueDatePicker 
            inline 
            auto-apply 
            dark 
            v-model="date" 
            :enable-time-picker="false"
            :format="format"
        />
    </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import VueDatePicker from "@vuepic/vue-datepicker";
import "@vuepic/vue-datepicker/dist/main.css";

const props = defineProps({
    value: {
        type: String,
        default: ''
    },
    onChange: {
        type: Function,
        required: true
    }
});

// Parse date from dd/mm/yyyy format
const parseDate = (dateString) => {
    if (!dateString) return new Date();
    
    const parts = dateString.split('/');
    if (parts.length === 3) {
        const [day, month, year] = parts.map(Number);
        return new Date(year, month - 1, day);
    }
    
    return new Date(dateString);
};

// Format date to dd/mm/yyyy
const formatDate = (date) => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
};

const date = ref(parseDate(props.value));

// Custom format for display
const format = (date) => {
    return formatDate(date);
};

watch(
    () => props.value,
    (newValue) => {
        date.value = parseDate(newValue);
    },
    { immediate: true }
);

watch(date, (newDate) => {
    if(newDate instanceof Date && !isNaN(newDate)) {
        props.onChange(formatDate(newDate));
    }
});
</script>

<style scoped>
.date-only-dropdown {
    background-color: var(--background-0);
    border-radius: var(--radius-md);
    border: 1px solid var(--border);
    width: 100%;
    padding: 10px;
}

/* Hide time picker button if it shows */
.date-only-dropdown :deep(.dp__time_input) {
    display: none !important;
}

.date-only-dropdown :deep(.dp__action_buttons) {
    display: none !important;
}
</style>