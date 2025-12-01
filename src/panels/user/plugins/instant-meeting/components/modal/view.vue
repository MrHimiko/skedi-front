<!-- Full path: src/panels/user/plugins/instant-meeting/components/modal/view.vue -->
<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { api } from '@utils/api';
import { common } from '@utils/common';
import { UserStore } from '@stores/user';
import { InstantMeetingService } from '../../services/InstantMeetingService.js';

import PopupLayout from '@layouts/popup/view.vue';
import ButtonComponent from '@form/button/view.vue';
import InputComponent from '@form/input/view.vue';

import { 
    PhLightning,
    PhClock,
    PhUsers,
    PhPlus,
    PhX,
    PhWarning,
    PhCheck,
    PhCopy,
    PhArrowSquareOut,
    PhSpinner,
    PhUser,
    PhEnvelope,
    PhVideoCamera,
    PhLink
} from "@phosphor-icons/vue";

const props = defineProps({
    callback: {
        type: Function,
        default: null
    }
});

const userStore = UserStore();

// State
const currentStep = ref('form'); // 'form', 'conflicts', 'success'
const isLoading = ref(false);
const isCheckingAvailability = ref(true);

// Form data
const title = ref('');
const duration = ref(30);
const locationType = ref('google_meet');
const customLink = ref('');

// Participants - simple email list with lookup status
const participants = ref([
    { email: '', type: 'external', isLookingUp: false, userData: null }
]);

// Location options - for now just Google Meet and Custom
const locationOptions = [
    { value: 'google_meet', label: 'Google Meet', icon: 'video' },
    { value: 'custom', label: 'Custom Link', icon: 'link' },
];

// Availability state
const availability = ref(null);
const conflicts = ref([]);
const selectedConflictsToCancel = ref([]);

// Success state
const createdMeeting = ref(null);
const meetingUrl = ref('');
const isCopied = ref(false);

// Debounce timer for email lookup
let lookupTimers = {};

// Computed
const canAddParticipant = computed(() => {
    const lastParticipant = participants.value[participants.value.length - 1];
    return lastParticipant && lastParticipant.email && isValidEmail(lastParticipant.email);
});

const hasValidParticipants = computed(() => {
    // Must have at least one valid participant that is NOT the current user
    return participants.value.some(p => p.email && isValidEmail(p.email) && p.type !== 'self');
});

const availabilityMessage = computed(() => {
    if (!availability.value) return '';
    
    const freeMinutes = availability.value.free_minutes;
    if (freeMinutes >= 240) {
        return "You're free for the next 4+ hours";
    } else if (freeMinutes >= 60) {
        const hours = Math.floor(freeMinutes / 60);
        const mins = freeMinutes % 60;
        return `You're free for ${hours}h ${mins > 0 ? mins + 'm' : ''}`;
    } else {
        return `You're free for ${freeMinutes} minutes`;
    }
});

const hasConflicts = computed(() => {
    if (!availability.value) return false;
    return duration.value > availability.value.free_minutes;
});

const skediConflicts = computed(() => {
    if (!availability.value || !availability.value.conflicts) return [];
    return availability.value.conflicts.filter(c => c.is_skedi_booking);
});

const externalConflicts = computed(() => {
    if (!availability.value || !availability.value.conflicts) return [];
    return availability.value.conflicts.filter(c => !c.is_skedi_booking);
});

// Check availability on mount and when duration changes
onMounted(async () => {
    await checkAvailability();
});

watch(duration, async () => {
    await checkAvailability();
});

// Functions
async function checkAvailability() {
    try {
        isCheckingAvailability.value = true;
        availability.value = await InstantMeetingService.checkAvailability(duration.value);
    } catch (error) {
        console.error('Failed to check availability:', error);
    } finally {
        isCheckingAvailability.value = false;
    }
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function addParticipant() {
    participants.value.push({ email: '', type: 'external', isLookingUp: false, userData: null });
}

function removeParticipant(index) {
    if (participants.value.length > 1) {
        // Clear any pending lookup timer
        if (lookupTimers[index]) {
            clearTimeout(lookupTimers[index]);
            delete lookupTimers[index];
        }
        participants.value.splice(index, 1);
    }
}

// Handle email input change with debounced lookup
function onParticipantEmailChange(index, event, value) {
    participants.value[index].email = value;
    participants.value[index].type = 'external';
    participants.value[index].userData = null;
    
    // Check if user is trying to add themselves
    const currentUserEmail = userStore.getEmail()?.toLowerCase();
    if (value && currentUserEmail && value.toLowerCase() === currentUserEmail) {
        participants.value[index].type = 'self';
        participants.value[index].userData = { name: 'You', isSelf: true };
        return; // Don't lookup - it's the current user
    }
    
    // Clear existing timer for this index
    if (lookupTimers[index]) {
        clearTimeout(lookupTimers[index]);
    }
    
    // Debounce lookup
    if (value && isValidEmail(value)) {
        lookupTimers[index] = setTimeout(() => {
            lookupParticipant(index, value);
        }, 500);
    }
}

async function lookupParticipant(index, email) {
    if (!email || !isValidEmail(email)) return;
    
    try {
        participants.value[index].isLookingUp = true;
        const result = await InstantMeetingService.lookupUser(email);
        
        // Make sure the email hasn't changed while we were looking up
        if (participants.value[index]?.email === email) {
            participants.value[index].type = result.type || 'external';
            participants.value[index].userData = result.user || null;
        }
    } catch (error) {
        console.error('Failed to lookup user:', error);
    } finally {
        if (participants.value[index]) {
            participants.value[index].isLookingUp = false;
        }
    }
}

function getParticipantTypeLabel(type) {
    switch (type) {
        case 'team_member': return 'Team Member';
        case 'skedi_user': return 'Skedi User';
        case 'self': return 'You (Host)';
        default: return 'External';
    }
}

function getParticipantTypeClass(type) {
    switch (type) {
        case 'team_member': return 'type-team';
        case 'skedi_user': return 'type-skedi';
        case 'self': return 'type-self';
        default: return 'type-external';
    }
}

async function handleSubmit() {
    if (!title.value.trim()) {
        common.notification('Please enter a meeting title', false);
        return;
    }
    
    if (!hasValidParticipants.value) {
        common.notification('Please add at least one participant', false);
        return;
    }

    // Check if there are conflicts
    if (hasConflicts.value && skediConflicts.value.length > 0) {
        currentStep.value = 'conflicts';
        return;
    }

    await createMeeting();
}

async function createMeeting() {
    try {
        isLoading.value = true;

        // Prepare participants data - only valid emails, exclude self
        const validParticipants = participants.value
            .filter(p => p.email && isValidEmail(p.email) && p.type !== 'self')
            .map(p => ({
                email: p.email,
                name: p.userData?.name || ''
            }));

        const data = {
            title: title.value.trim(),
            duration: duration.value,
            participants: validParticipants,
            location_type: locationType.value,
            custom_link: locationType.value === 'custom' ? customLink.value : null
        };

        const result = await InstantMeetingService.create(data);
        
        createdMeeting.value = result;
        meetingUrl.value = result.meeting_url || '';
        currentStep.value = 'success';

        // Show warning if Google Meet link failed
        if (result.meet_link_error) {
            common.notification(result.meet_link_error, false);
        }

        if (props.callback) {
            props.callback(result);
        }

    } catch (error) {
        console.error('Failed to create meeting:', error);
        common.notification(error.message || 'Failed to create meeting', false);
    } finally {
        isLoading.value = false;
    }
}

async function proceedWithConflicts() {
    // Cancel selected conflicts first
    if (selectedConflictsToCancel.value.length > 0) {
        try {
            await InstantMeetingService.cancelConflicts(selectedConflictsToCancel.value);
        } catch (error) {
            console.error('Failed to cancel conflicts:', error);
            common.notification('Failed to cancel some bookings', false);
        }
    }

    await createMeeting();
}

function toggleConflictSelection(bookingId) {
    const index = selectedConflictsToCancel.value.indexOf(bookingId);
    if (index > -1) {
        selectedConflictsToCancel.value.splice(index, 1);
    } else {
        selectedConflictsToCancel.value.push(bookingId);
    }
}

async function copyMeetingUrl() {
    if (!meetingUrl.value) return;

    try {
        await navigator.clipboard.writeText(meetingUrl.value);
        isCopied.value = true;
        common.notification('Meeting link copied to clipboard', true);
        
        setTimeout(() => {
            isCopied.value = false;
        }, 2000);
    } catch (error) {
        common.notification('Failed to copy link', false);
    }
}

function openMeeting() {
    if (meetingUrl.value) {
        window.open(meetingUrl.value, '_blank');
    }
}

function closePopup() {
    document.querySelector('.i-popup-close')?.click();
}

function formatTime(dateString) {
    return new Date(dateString).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
}

function formatMeetingTime(dateString) {
    if (!dateString) return '';
    return new Date(dateString).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
}
</script>

<template>
    <PopupLayout title="Instant Meeting" customClass="h-auto instant-meeting-modal">
        <template #content>
            <!-- Step 1: Form -->
            <div v-if="currentStep === 'form'" class="form-step">
                <!-- Availability Banner -->
                <div v-if="!isCheckingAvailability" :class="['availability-banner', hasConflicts ? 'has-conflicts' : 'is-free']">
                    <div class="banner-icon">
                        <PhWarning v-if="hasConflicts" weight="bold" :size="20" />
                        <PhCheck v-else weight="bold" :size="20" />
                    </div>
                    <div class="banner-content">
                        <span class="banner-text">{{ availabilityMessage }}</span>
                        <span v-if="hasConflicts && availability?.next_conflict" class="conflict-preview">
                            Next: {{ availability.next_conflict.title }} at {{ formatTime(availability.next_conflict.start_time) }}
                        </span>
                    </div>
                </div>
                <div v-else class="availability-banner loading">
                    <PhSpinner class="spinner" weight="bold" :size="20" />
                    <span>Checking availability...</span>
                </div>

                <!-- Meeting Title (Required) -->
                <div class="form-section">
                    <label class="section-label">Title</label>
                    <InputComponent
                        placeholder="e.g., Quick sync, Demo call..."
                        :value="title"
                        @onInput="(event, value) => title = value"
                    />
                </div>

                <!-- Duration Quick Select -->
                <div class="form-section">
                    <label class="section-label">Duration</label>
                    <div class="duration-buttons">
                        <button 
                            :class="['duration-btn', { active: duration === 15, unavailable: availability && 15 > availability.free_minutes }]"
                            @click="duration = 15"
                        >
                            15 minutes
                            <PhWarning v-if="availability && 15 > availability.free_minutes" class="warning-icon" :size="14" />
                        </button>
                        <button 
                            :class="['duration-btn', { active: duration === 30, unavailable: availability && 30 > availability.free_minutes }]"
                            @click="duration = 30"
                        >
                            30 minutes
                            <PhWarning v-if="availability && 30 > availability.free_minutes" class="warning-icon" :size="14" />
                        </button>
                        <button 
                            :class="['duration-btn', { active: duration === 45, unavailable: availability && 45 > availability.free_minutes }]"
                            @click="duration = 45"
                        >
                            45 minutes
                            <PhWarning v-if="availability && 45 > availability.free_minutes" class="warning-icon" :size="14" />
                        </button>
                        <button 
                            :class="['duration-btn', { active: duration === 60, unavailable: availability && 60 > availability.free_minutes }]"
                            @click="duration = 60"
                        >
                            1 hour
                            <PhWarning v-if="availability && 60 > availability.free_minutes" class="warning-icon" :size="14" />
                        </button>
                    </div>
                </div>

                <!-- Participants - Simple Repeater -->
                <div class="form-section">
                    <label class="section-label">
                        <PhUsers weight="bold" :size="16" />
                        Participants
                    </label>
                    
                    <div class="participants-list">
                        <div 
                            v-for="(participant, index) in participants" 
                            :key="index"
                            class="participant-row"
                        >
                            <div class="participant-input-wrapper">
                                <InputComponent
                                    placeholder="Email address"
                                    :value="participant.email"
                                    @onInput="(event, value) => onParticipantEmailChange(index, event, value)"
                                />
                                
                                <!-- Status indicators -->
                                <div v-if="participant.isLookingUp" class="participant-status">
                                    <PhSpinner class="spinner" :size="16" />
                                </div>
                                <div 
                                    v-else-if="participant.email && isValidEmail(participant.email)" 
                                    :class="['participant-badge', getParticipantTypeClass(participant.type)]"
                                >
                                    {{ getParticipantTypeLabel(participant.type) }}
                                </div>
                            </div>
                            
                            <button 
                                v-if="participants.length > 1"
                                class="remove-btn"
                                @click="removeParticipant(index)"
                            >
                                <PhX weight="bold" :size="18" />
                            </button>
                        </div>
                    </div>
                    
                    <!-- Add Participant Button -->
                    <button 
                        v-if="canAddParticipant"
                        class="add-participant-btn"
                        @click="addParticipant"
                    >
                        <PhPlus weight="bold" :size="16" />
                        Add another participant
                    </button>
                </div>

                <!-- Location -->
                <div class="form-section">
                    <label class="section-label">
                        <PhVideoCamera weight="bold" :size="16" />
                        Location
                    </label>
                    <div class="location-options">
                        <button 
                            v-for="option in locationOptions"
                            :key="option.value"
                            :class="['location-btn', { active: locationType === option.value }]"
                            @click="locationType = option.value"
                        >
                            <PhVideoCamera v-if="option.value === 'google_meet'" weight="bold" :size="18" />
                            <PhLink v-else weight="bold" :size="18" />
                            {{ option.label }}
                        </button>
                    </div>
                    
                    <!-- Custom Link Input -->
                    <div v-if="locationType === 'custom'" class="custom-link-input">
                        <InputComponent
                            placeholder="Enter meeting link (Zoom, Teams, etc.)"
                            :value="customLink"
                            @onInput="(event, value) => customLink = value"
                        />
                    </div>
                </div>

                <!-- Actions -->
                <div class="form-actions">
                    <ButtonComponent
                        label="Cancel"
                        as="tertiary"
                        @click="closePopup"
                    />
                    <ButtonComponent
                        :label="isLoading ? 'Creating...' : 'Create Meeting'"
                        :iconLeft="{ component: PhLightning, weight: 'bold' }"
                        :disabled="!title.trim() || !hasValidParticipants || isLoading"
                        @click="handleSubmit"
                    />
                </div>
            </div>

            <!-- Step 2: Conflicts -->
            <div v-else-if="currentStep === 'conflicts'" class="conflicts-step">
                <div class="conflicts-header">
                    <PhWarning weight="bold" :size="32" class="warning-icon" />
                    <h3>You have conflicting bookings</h3>
                    <p>The selected duration overlaps with existing bookings.</p>
                </div>

                <!-- Skedi Bookings (Can Cancel) -->
                <div v-if="skediConflicts.length > 0" class="conflicts-section">
                    <h4>Skedi Bookings (can be cancelled)</h4>
                    <div class="conflict-list">
                        <div 
                            v-for="conflict in skediConflicts" 
                            :key="conflict.id"
                            :class="['conflict-item', { selected: selectedConflictsToCancel.includes(conflict.id) }]"
                            @click="toggleConflictSelection(conflict.id)"
                        >
                            <input 
                                type="checkbox" 
                                :checked="selectedConflictsToCancel.includes(conflict.id)"
                            />
                            <div class="conflict-info">
                                <span class="conflict-title">{{ conflict.title }}</span>
                                <span class="conflict-time">{{ formatTime(conflict.start_time) }} - {{ formatTime(conflict.end_time) }}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- External Calendar Events (Warning Only) -->
                <div v-if="externalConflicts.length > 0" class="conflicts-section external">
                    <h4>External Calendar Events (cannot be cancelled here)</h4>
                    <div class="conflict-list">
                        <div 
                            v-for="conflict in externalConflicts" 
                            :key="conflict.id"
                            class="conflict-item external"
                        >
                            <PhWarning :size="18" class="external-icon" />
                            <div class="conflict-info">
                                <span class="conflict-title">{{ conflict.title }}</span>
                                <span class="conflict-time">{{ formatTime(conflict.start_time) }} - {{ formatTime(conflict.end_time) }}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="conflicts-actions">
                    <ButtonComponent
                        label="Go Back"
                        as="tertiary"
                        @click="currentStep = 'form'"
                    />
                    <ButtonComponent
                        :label="selectedConflictsToCancel.length > 0 ? 'Cancel Selected & Create' : 'Proceed Anyway'"
                        :iconLeft="{ component: PhLightning, weight: 'bold' }"
                        @click="proceedWithConflicts"
                        :disabled="isLoading"
                    />
                </div>
            </div>

            <!-- Step 3: Success -->
            <div v-else-if="currentStep === 'success'" class="success-step">
                <div class="success-icon">
                    <PhCheck weight="bold" :size="48" />
                </div>
                <h3>Meeting Created!</h3>
                <p>Your instant meeting has been created and participants have been notified.</p>

                <!-- Meeting Details Card -->
                <div class="meeting-info-card">
                    <h4>{{ createdMeeting?.booking?.title || title || 'Instant Meeting' }}</h4>
                    
                    <div class="info-grid">
                        <div class="info-item">
                            <PhClock weight="bold" :size="18" />
                            <div class="info-content">
                                <span class="info-label">Time</span>
                                <span class="info-value">
                                    {{ formatMeetingTime(createdMeeting?.booking?.start_time) }} - 
                                    {{ formatMeetingTime(createdMeeting?.booking?.end_time) }}
                                </span>
                            </div>
                        </div>
                        
                        <div class="info-item">
                            <PhClock weight="bold" :size="18" />
                            <div class="info-content">
                                <span class="info-label">Duration</span>
                                <span class="info-value">{{ duration }} minutes</span>
                            </div>
                        </div>
                        
                        <div class="info-item">
                            <PhUsers weight="bold" :size="18" />
                            <div class="info-content">
                                <span class="info-label">Participants</span>
                                <span class="info-value">{{ createdMeeting?.participants?.length || 0 }} invited</span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Participants List -->
                    <div v-if="createdMeeting?.participants?.length" class="participants-summary">
                        <div 
                            v-for="p in createdMeeting.participants" 
                            :key="p.email"
                            class="participant-chip"
                        >
                            <PhUser :size="14" />
                            {{ p.email }}
                        </div>
                    </div>
                </div>

                <!-- Meeting URL -->
                <div v-if="meetingUrl" class="meeting-url-section">
                    <label>Meeting Link</label>
                    <div class="url-box">
                        <input type="text" :value="meetingUrl" readonly />
                        <button @click="copyMeetingUrl" class="copy-btn">
                            <PhCheck v-if="isCopied" weight="bold" :size="18" />
                            <PhCopy v-else weight="bold" :size="18" />
                        </button>
                    </div>
                </div>
                
                <!-- No Meeting URL Warning -->
                <div v-else-if="locationType === 'google_meet'" class="no-meeting-link-warning">
                    <PhWarning weight="bold" :size="20" />
                    <div>
                        <strong>No meeting link created</strong>
                        <p>Please connect Google Meet in Integrations settings to auto-generate Meet links.</p>
                    </div>
                </div>

                <div class="success-actions">
                    <ButtonComponent
                        label="Done"
                        as="tertiary"
                        @click="closePopup"
                    />
                    <ButtonComponent
                        v-if="meetingUrl"
                        label="Join Meeting"
                        :iconLeft="{ component: PhArrowSquareOut, weight: 'bold' }"
                        @click="openMeeting"
                    />
                </div>
            </div>
        </template>
    </PopupLayout>
</template>

<style scoped>
.instant-meeting-modal {
    max-width: 500px;
    width: 100%;
}

/* Availability Banner */
.availability-banner {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    border-radius: 8px;
    margin-bottom: 24px;
}

.availability-banner.is-free {
    background: #ecfdf5;
    color: #065f46;
}

.availability-banner.has-conflicts {
    background: #fffbeb;
    color: #92400e;
}

.availability-banner.loading {
    background: var(--background-1);
    color: var(--text-secondary);
}

.banner-icon {
    flex-shrink: 0;
}

.banner-content {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.banner-text {
    font-weight: 600;
    font-size: 14px;
}

.conflict-preview {
    font-size: 12px;
    opacity: 0.8;
}

.spinner {
    animation: spin 1s linear infinite;
}

@keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
}

/* Form Sections */
.form-section {
    margin-bottom: 20px;
}

.section-label {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 8px;
}

/* Duration Buttons */
.duration-buttons {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
}

.duration-btn {
    padding: 8px 16px;
    border: 1px solid var(--border);
    background: var(--background-0);
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease;
    display: flex;
    align-items: center;
    gap: 6px;
}

.duration-btn:hover {
    border-color: var(--text-secondary);
}

.duration-btn.active {
    background: var(--black);
    color: white;
    border-color: var(--black);
}

.duration-btn.unavailable {
    color: #92400e;
}

.duration-btn .warning-icon {
    color: #f59e0b;
}

/* Location Options */
.location-options {
    display: flex;
    gap: 8px;
}

.location-btn {
    flex: 1;
    padding: 12px 16px;
    border: 1px solid var(--border);
    background: var(--background-0);
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
}

.location-btn:hover {
    border-color: var(--text-secondary);
}

.location-btn.active {
    background: var(--black);
    color: white;
    border-color: var(--black);
}

.custom-link-input {
    margin-top: 12px;
}

/* Participants List - Simple Repeater */
.participants-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.participant-row {
    display: flex;
    align-items: center;
    gap: 8px;
}

.participant-input-wrapper {
    flex: 1;
    position: relative;
    display: flex;
    align-items: center;
}

.participant-input-wrapper :deep(.c-input) {
    flex: 1;
}

.participant-status {
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
}

.participant-badge {
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 11px;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 4px;
    white-space: nowrap;
}

.participant-badge.type-team {
    background: #dcfce7;
    color: #166534;
}

.participant-badge.type-skedi {
    background: #dbeafe;
    color: #1e40af;
}

.participant-badge.type-external {
    background: #f3f4f6;
    color: #6b7280;
}

.participant-badge.type-self {
    background: #fee2e2;
    color: #dc2626;
}

.remove-btn {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: 1px solid var(--border);
    border-radius: 8px;
    cursor: pointer;
    color: var(--text-secondary);
    transition: all 0.15s ease;
    flex-shrink: 0;
}

.remove-btn:hover {
    background: #fef2f2;
    border-color: #fecaca;
    color: #dc2626;
}

.add-participant-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    background: none;
    border: 1px dashed var(--border);
    border-radius: 8px;
    color: var(--text-secondary);
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    width: 100%;
    justify-content: center;
    margin-top: 8px;
    transition: all 0.15s ease;
}

.add-participant-btn:hover {
    border-color: var(--text-primary);
    color: var(--text-primary);
    background: var(--background-1);
}

/* Form Actions */
.form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    margin-top: 24px;
    padding-top: 20px;
    border-top: 1px solid var(--border);
}

/* Conflicts Step */
.conflicts-step {
    text-align: center;
}

.conflicts-header {
    margin-bottom: 24px;
}

.conflicts-header .warning-icon {
    color: #f59e0b;
    margin-bottom: 12px;
}

.conflicts-header h3 {
    margin: 0 0 8px 0;
    font-size: 18px;
}

.conflicts-header p {
    margin: 0;
    color: var(--text-secondary);
    font-size: 14px;
}

.conflicts-section {
    text-align: left;
    margin-bottom: 20px;
}

.conflicts-section h4 {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-secondary);
    margin: 0 0 12px 0;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.conflict-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.conflict-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    background: var(--background-1);
    border: 1px solid var(--border);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.15s ease;
}

.conflict-item:hover {
    border-color: var(--text-secondary);
}

.conflict-item.selected {
    background: #fef3c7;
    border-color: #f59e0b;
}

.conflict-item.external {
    cursor: default;
    background: #fef2f2;
    border-color: #fecaca;
}

.conflict-item input[type="checkbox"] {
    width: 18px;
    height: 18px;
    cursor: pointer;
}

.conflict-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.conflict-title {
    font-weight: 500;
    font-size: 14px;
}

.conflict-time {
    font-size: 12px;
    color: var(--text-secondary);
}

.external-icon {
    color: #dc2626;
}

.conflicts-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    margin-top: 24px;
    padding-top: 20px;
    border-top: 1px solid var(--border);
}

/* Success Step */
.success-step {
    text-align: center;
}

.success-icon {
    width: 80px;
    height: 80px;
    background: #dcfce7;
    color: #16a34a;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 20px;
}

.success-step h3 {
    margin: 0 0 8px 0;
    font-size: 20px;
}

.success-step > p {
    margin: 0 0 24px 0;
    color: var(--text-secondary);
}

.meeting-details {
    display: flex;
    justify-content: center;
    gap: 24px;
    margin-bottom: 24px;
}

.detail-row {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--text-secondary);
    font-size: 14px;
}

.meeting-url-section {
    text-align: left;
    margin-bottom: 24px;
}

.meeting-url-section label {
    display: block;
    font-size: 13px;
    font-weight: 600;
    color: var(--text-secondary);
    margin-bottom: 8px;
}

.url-box {
    display: flex;
    gap: 8px;
}

.url-box input {
    flex: 1;
    padding: 10px 12px;
    border: 1px solid var(--border);
    border-radius: 8px;
    font-size: 13px;
    background: var(--background-0);
    color: var(--text-primary);
}

.copy-btn {
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--background-0);
    cursor: pointer;
    transition: all 0.15s ease;
}

.copy-btn:hover {
    background: var(--background-1);
}

.no-meeting-link-warning {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 16px;
    background: #fffbeb;
    border: 1px solid #fcd34d;
    border-radius: 8px;
    margin-bottom: 24px;
    text-align: left;
    color: #92400e;
}

.no-meeting-link-warning strong {
    display: block;
    margin-bottom: 4px;
    font-size: 14px;
}

.no-meeting-link-warning p {
    margin: 0;
    font-size: 13px;
    opacity: 0.9;
}

.success-actions {
    display: flex;
    justify-content: center;
    gap: 12px;
}

/* Meeting Info Card */
.meeting-info-card {
    background: var(--background-0);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 20px;
    margin-bottom: 20px;
    text-align: left;
}

.meeting-info-card h4 {
    margin: 0 0 16px 0;
    font-size: 16px;
    font-weight: 600;
}

.info-grid {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.info-item {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    color: var(--text-secondary);
}

.info-content {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.info-label {
    font-size: 12px;
    color: var(--text-tertiary);
}

.info-value {
    font-size: 14px;
    color: var(--text-primary);
    font-weight: 500;
}

.participants-summary {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid var(--border);
}

.participant-chip {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    background: var(--background-1);
    border: 1px solid var(--border);
    border-radius: 20px;
    font-size: 13px;
}

/* Self participant type */
.participant-type-badge.type-self {
    background: #fee2e2;
    color: #dc2626;
}
</style>