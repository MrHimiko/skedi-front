<script setup>
import { ref, nextTick } from 'vue';
import { PhPencil, PhCheck, PhX } from '@phosphor-icons/vue';

const props = defineProps({
    title: {
        type: String,
        required: true
    },
    isLoading: {
        type: Boolean,
        default: false
    }
});

const emit = defineEmits(['update:title', 'save']);

const isEditing = ref(false);
const editedTitle = ref('');
const inputRef = ref(null);
const isSaving = ref(false);

// Start editing
const startEditing = async () => {
    editedTitle.value = props.title;
    isEditing.value = true;
    
    await nextTick();
    if (inputRef.value) {
        inputRef.value.focus();
        inputRef.value.select();
    }
};

// Save changes
const saveTitle = async () => {
    if (editedTitle.value.trim() === '') {
        editedTitle.value = props.title;
        cancelEditing();
        return;
    }
    
    if (editedTitle.value.trim() === props.title) {
        cancelEditing();
        return;
    }
    
    try {
        isSaving.value = true;
        emit('update:title', editedTitle.value.trim());
        await emit('save', editedTitle.value.trim());
        isEditing.value = false;
    } catch (error) {
        console.error('Error saving title:', error);
        editedTitle.value = props.title;
    } finally {
        isSaving.value = false;
    }
};

// Cancel editing
const cancelEditing = () => {
    editedTitle.value = props.title;
    isEditing.value = false;
};

// Handle key events
const handleKeydown = (event) => {
    if (event.key === 'Enter') {
        event.preventDefault();
        saveTitle();
    } else if (event.key === 'Escape') {
        cancelEditing();
    }
};
</script>

<template>
    <div class="inline-title-editor">
        <!-- Editing Mode -->
        <div v-if="isEditing" class="edit-mode">
            <input
                ref="inputRef"
                v-model="editedTitle"
                class="title-input"
                type="text"
                @keydown="handleKeydown"
                @blur="saveTitle"
                :disabled="isSaving || isLoading"
                maxlength="255"
            />
            
            <div class="edit-actions">
                <button
                    class="action-button save"
                    @click="saveTitle"
                    :disabled="isSaving || isLoading"
                    title="Save (Enter)"
                >
                    <PhCheck :weight="'bold'" size="16" />
                </button>
                
                <button
                    class="action-button cancel"
                    @click="cancelEditing"
                    :disabled="isSaving || isLoading"
                    title="Cancel (Escape)"
                >
                    <PhX :weight="'bold'" size="16" />
                </button>
            </div>
        </div>
        
        <!-- Display Mode -->
        <div v-else class="display-mode" @click="startEditing">
            <h1 class="title-text">{{ title }}</h1>
            
            <div class="edit-trigger">
                <PhPencil 
                    :weight="'bold'" 
                    size="18" 
                    class="edit-icon"
                />
            </div>
        </div>
    </div>
</template>

<style scoped>
.inline-title-editor {
    display: flex;
    align-items: center;
    position: relative;
}

.display-mode {
    display: flex;
    align-items: center;
    gap: 12px;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 6px;
    transition: background-color 0.2s ease;
    position: relative;
}

.display-mode:hover {
    background-color: var(--background-1);
}

.title-text {
    font-size: 28px;
    font-weight: 600;
    margin: 0;
    color: var(--text-primary);
    line-height: 1.2;
}

.edit-trigger {
    opacity: 0;
    transition: opacity 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 6px;
    background-color: var(--background-2);
    color: var(--text-secondary);
}

.display-mode:hover .edit-trigger {
    opacity: 1;
}

.edit-icon {
    transition: color 0.2s ease;
}

.edit-trigger:hover .edit-icon {
    color: var(--brand-default);
}

.edit-mode {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
}

.title-input {
    font-size: 28px;
    font-weight: 600;
    color: var(--text-primary);
    background-color: var(--background-0);
    border: 2px solid var(--brand-default);
    border-radius: 6px;
    padding: 6px 12px;
    outline: none;
    flex: 1;
    min-width: 200px;
    font-family: inherit;
    line-height: 1.2;
}

.title-input:focus {
    border-color: var(--brand-stroke);
    box-shadow: 0 0 0 3px var(--brand-fill);
}

.title-input:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.edit-actions {
    display: flex;
    gap: 4px;
}

.action-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s ease;
    background-color: var(--background-1);
    color: var(--text-secondary);
}

.action-button:hover:not(:disabled) {
    background-color: var(--background-2);
}

.action-button.save {
    color: var(--green-default);
}

.action-button.save:hover:not(:disabled) {
    background-color: var(--green-fill);
    color: var(--green-default);
}

.action-button.cancel {
    color: var(--red-default);
}

.action-button.cancel:hover:not(:disabled) {
    background-color: var(--red-fill);
    color: var(--red-default);
}

.action-button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
}

/* Mobile responsiveness */
@media (max-width: 768px) {
    .title-text {
        font-size: 24px;
    }
    
    .title-input {
        font-size: 24px;
    }
    
    .edit-trigger {
        width: 28px;
        height: 28px;
    }
    
    .action-button {
        width: 28px;
        height: 28px;
    }
}
</style>