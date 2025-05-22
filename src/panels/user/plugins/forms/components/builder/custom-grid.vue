// src/panels/user/plugins/forms/components/builder/custom-grid.vue

<script setup>
    import { ref, computed } from 'vue';
    import { common } from '@utils/common';
    import { popup } from '@utils/popup';
    import Button from '@form/button/view.vue';
    import Notice from '@global/notice/view.vue';
    import FieldSettings from './field-settings.vue';
    import ManageFieldsPopup from './manage-fields-popup.vue';
    import { PhGear, PhTrash, PhCopy, PhArrowUp, PhArrowDown, PhPlus, PhTable } from "@phosphor-icons/vue";
    
    const props = defineProps({
        fields: {
            type: Array,
            required: true
        }
    });
    
    const emit = defineEmits([
        'update-field',
        'delete-field',
        'duplicate-field',
        'move-field',
        'add-field',
        'add-field-to-container',
        'manage-container-fields'
    ]);
    
    // Filter out fields that are inside groups
    const visibleFields = computed(() => {
        // Find all field IDs that are inside a group
        const fieldsInGroups = new Set();
        
        // Collect all field IDs that are inside a group
        props.fields.forEach(field => {
            if ((field.type === 'group' || field.type === 'step') && field.children && Array.isArray(field.children)) {
                field.children.forEach(childId => {
                    fieldsInGroups.add(childId);
                });
            }
        });
        
        // Return only fields that are not inside a group
        return props.fields.filter(field => !fieldsInGroups.has(field.id));
    });
    
    // Get a field by ID
    const getFieldById = (fieldId) => {
        return props.fields.find(f => f.id === fieldId);
    };
    
    // Open field settings popup
    const openFieldSettings = (field, event) => {
        event.stopPropagation();
        
        popup.open(
            'field-settings',
            null,
            FieldSettings,
            {
                field: field,
                formFields: props.fields.filter(f => f.id !== field.id),
                onUpdate: (updatedField) => {
                    emit('update-field', field.id, updatedField);
                    popup.close();
                }
            },
            {
                position: 'center'
            }
        );
    };
    
    // Open manage fields popup
    const openManageFieldsPopup = (container, event) => {
        event.stopPropagation();
        
        const containerType = container.type;
        
        // Get available fields - exclude steps, and for groups, also exclude other groups
        const availableFields = props.fields.filter(field => {
            // Can't add container itself
            if (field.id === container.id) return false;
            
            // Steps can only contain regular fields and groups
            if (containerType === 'step') {
                return field.type !== 'step';
            }
            
            // Groups can only contain regular fields (not steps or other groups)
            if (containerType === 'group') {
                return field.type !== 'step' && field.type !== 'group';
            }
            
            return true;
        });
        
        popup.open(
            'manage-fields',
            null,
            ManageFieldsPopup,
            {
                container: container,
                availableFields: availableFields,
                onSave: (selectedFieldIds) => {
                    emit('manage-container-fields', container.id, selectedFieldIds);
                    popup.close();
                }
            },
            {
                position: 'center'
            }
        );
    };
    
    // Add a field to a container
    const addFieldToContainer = (container, event) => {
        event.stopPropagation();
        emit('add-field-to-container', container.id);
    };
    
    // Delete a field
    const deleteField = (fieldId, event, isInContainer = false) => {
        event.stopPropagation();
        
        if (confirm('Are you sure you want to delete this field?')) {
            emit('delete-field', fieldId);
            common.notification('Field deleted', true);
        }
    };
    
    // Duplicate a field
    const duplicateField = (fieldId, event, isInContainer = false) => {
        event.stopPropagation();
        emit('duplicate-field', fieldId, isInContainer);
        common.notification('Field duplicated', true);
    };
    
    // Move field up or down
    const moveField = (fieldId, direction, containerId = null) => {
        emit('move-field', fieldId, direction, containerId);
    };
    
    // Render a nested container (recursive)
    const renderNestedContainer = (container) => {
        // Render fields inside the container, including groups
        container.children?.forEach(childId => {
            const childField = getFieldById(childId);
            if (childField) {
                // If the child is a group, render its contents too
                if (childField.type === 'group') {
                    renderNestedContainer(childField);
                }
            }
        });
    };
    
    // Get icon component for a field type
    const getFieldIcon = (fieldType) => {
        const icons = {
            input: 'text_fields',
            textarea: 'notes',
            select: 'list',
            radio: 'radio_button_checked',
            checkbox: 'check_box',
            date: 'calendar_month',
            image: 'image',
            video: 'videocam',
            file: 'attach_file',
            rating: 'star',
            divider: 'horizontal_rule',
            step: 'linear_scale',
            group: 'folder'
        };
        
        return icons[fieldType] || 'help_outline';
    };
</script>

<template>
    <div class="custom-grid-container">
        <div v-if="visibleFields.length === 0" class="empty-form-state">
            <Notice 
                description="Your form is empty. Click 'Add Field' to start building your form." 
                icon="info"
                as="suggest"
            />
        </div>
        <div class="form-grid">
            <!-- Fields (only showing those not in groups) -->
            <div 
                v-for="(field, index) in visibleFields" 
                :key="field.id"
                class="field-item"
                :class="{ 'is-container': field.type === 'step' || field.type === 'group' }"
                :style="{ 'grid-column': `span ${field.colSpan || 12}` }"
            >
                <div class="field-content">
                    <div class="field-header">
                        <div class="field-info">
                            <div class="field-icon">
                                <i>{{ getFieldIcon(field.type) }}</i>
                            </div>
                            <div class="field-details">
                                <h3 class="field-label">{{ field.label }}</h3>
                                <p class="field-type">{{ field.type }}</p>
                            </div>
                        </div>
                        <div class="field-actions">
                            <Button 
                                as="tertiary icon" 
                                :iconLeft="{ component: PhGear, weight: 'bold' }" 
                                @click="(e) => openFieldSettings(field, e)"
                                v-tooltip="{ content: 'Settings' }"
                            />
                            <Button 
                                as="tertiary icon" 
                                :iconLeft="{ component: PhCopy, weight: 'bold' }" 
                                @click="(e) => duplicateField(field.id, e)"
                                v-tooltip="{ content: 'Duplicate' }"
                            />
                            <Button 
                                as="tertiary icon" 
                                :iconLeft="{ component: PhTrash, weight: 'bold' }" 
                                @click="(e) => deleteField(field.id, e)"
                                v-tooltip="{ content: 'Delete' }"
                            />
                            <!-- Reordering buttons -->
                            <Button 
                                v-if="index > 0"
                                as="tertiary icon" 
                                :iconLeft="{ component: PhArrowUp, weight: 'bold' }" 
                                @click="() => moveField(field.id, 'up')"
                                v-tooltip="{ content: 'Move Up' }"
                            />
                            <Button 
                                v-if="index < visibleFields.length - 1"
                                as="tertiary icon" 
                                :iconLeft="{ component: PhArrowDown, weight: 'bold' }" 
                                @click="() => moveField(field.id, 'down')"
                                v-tooltip="{ content: 'Move Down' }"
                            />
                            <!-- Container specific buttons -->
                            <Button 
                                v-if="field.type === 'step' || field.type === 'group'"
                                as="tertiary icon" 
                                :iconLeft="{ component: PhTable, weight: 'bold' }" 
                                @click="(e) => openManageFieldsPopup(field, e)"
                                v-tooltip="{ content: 'Manage Fields' }"
                            />
                        </div>
                    </div>
                    <div class="field-meta">
                        <span class="field-width-badge">{{ field.colSpan || 12 }}/12 columns</span>
                        <!-- Conditional logic indicator -->
                        <div 
                            v-if="field.visibility && field.visibility.conditions.length > 0"
                            class="field-logic-indicator"
                        >
                            <i>visibility</i>
                            <span>Has conditions</span>
                        </div>
                    </div>
                    <!-- Container for nested fields (step or group) -->
                    <div v-if="field.type === 'step' || field.type === 'group'" class="nested-container">
                        <div v-if="!field.children || field.children.length === 0" class="empty-container-message">
                            <p>Add fields to this {{ field.type }}</p>
                            <Button 
                                :iconLeft="{ component: PhPlus, weight: 'bold' }" 
                                label="Add Field" 
                                @click="(e) => addFieldToContainer(field, e)"
                            />
                        </div>
                        <!-- Render child fields -->
                        <div v-else class="nested-fields-grid">
                            <!-- Regular fields -->
                            <template v-for="(childId, childIndex) in field.children" :key="childId">
                                <div v-if="getFieldById(childId)" 
                                    class="nested-field-item"
                                    :style="{ 'grid-column': `span ${getFieldById(childId)?.colSpan || 12}` }"
                                >
                                    <div class="nested-field-content">
                                        <div class="nested-field-header">
                                            <div class="nested-field-info">
                                                <div class="nested-field-icon">
                                                    <i>{{ getFieldIcon(getFieldById(childId).type) }}</i>
                                                </div>
                                                <div class="nested-field-details">
                                                    <span class="nested-field-label">{{ getFieldById(childId).label }}</span>
                                                    <span class="nested-field-type">{{ getFieldById(childId).type }}</span>
                                                </div>
                                            </div>
                                            <div class="nested-field-actions">
                                                <Button 
                                                    as="tertiary icon" 
                                                    :iconLeft="{ component: PhGear, weight: 'bold' }" 
                                                    @click="(e) => openFieldSettings(getFieldById(childId), e)"
                                                    v-tooltip="{ content: 'Settings' }"
                                                />
                                                <Button 
                                                    as="tertiary icon" 
                                                    :iconLeft="{ component: PhTrash, weight: 'bold' }" 
                                                    @click="(e) => deleteField(childId, e, true)"
                                                    v-tooltip="{ content: 'Remove' }"
                                                />
                                                
                                                <!-- Reordering buttons -->
                                                <Button 
                                                    v-if="childIndex > 0"
                                                    as="tertiary icon" 
                                                    :iconLeft="{ component: PhArrowUp, weight: 'bold' }" 
                                                    @click="() => moveField(childId, 'up', field.id)"
                                                    v-tooltip="{ content: 'Move Up' }"
                                                />
                                                <Button 
                                                    v-if="childIndex < field.children.length - 1"
                                                    as="tertiary icon" 
                                                    :iconLeft="{ component: PhArrowDown, weight: 'bold' }" 
                                                    @click="() => moveField(childId, 'down', field.id)"
                                                    v-tooltip="{ content: 'Move Down' }"
                                                />
                                            </div>
                                        </div>
                                        
                                        <!-- If this is a group inside a step, render its contents too -->
                                        <div v-if="getFieldById(childId).type === 'group'" class="nested-group-container">
                                            <div v-if="!getFieldById(childId).children || getFieldById(childId).children.length === 0" class="empty-container-message">
                                                <p>Add fields to this group</p>
                                                <Button 
                                                    :iconLeft="{ component: PhPlus, weight: 'bold' }" 
                                                    label="Add Field" 
                                                    @click="(e) => addFieldToContainer(getFieldById(childId), e)"
                                                />
                                            </div>
                                            <div v-else class="nested-fields-grid">
                                                <!-- Group's children -->
                                                <div 
                                                    v-for="(groupChildId, groupChildIndex) in getFieldById(childId).children" 
                                                    :key="groupChildId"
                                                    class="nested-field-item"
                                                    :style="{ 'grid-column': `span ${getFieldById(groupChildId)?.colSpan || 12}` }"
                                                >
                                                    <div v-if="getFieldById(groupChildId)" class="nested-field-content level-2">
                                                        <div class="nested-field-header">
                                                            <div class="nested-field-info">
                                                                <div class="nested-field-icon">
                                                                    <i>{{ getFieldIcon(getFieldById(groupChildId).type) }}</i>
                                                                </div>
                                                                <div class="nested-field-details">
                                                                    <span class="nested-field-label">{{ getFieldById(groupChildId).label }}</span>
                                                                    <span class="nested-field-type">{{ getFieldById(groupChildId).type }}</span>
                                                                </div>
                                                            </div>
                                                            <div class="nested-field-actions">
                                                                <Button 
                                                                    as="tertiary icon" 
                                                                    :iconLeft="{ component: PhGear, weight: 'bold' }" 
                                                                    @click="(e) => openFieldSettings(getFieldById(groupChildId), e)"
                                                                    v-tooltip="{ content: 'Settings' }"
                                                                />
                                                                <Button 
                                                                    as="tertiary icon" 
                                                                    :iconLeft="{ component: PhTrash, weight: 'bold' }" 
                                                                    @click="(e) => deleteField(groupChildId, e, true)"
                                                                    v-tooltip="{ content: 'Remove' }"
                                                                />
                                                                
                                                                <!-- Reordering buttons -->
                                                                <Button 
                                                                    v-if="groupChildIndex > 0"
                                                                    as="tertiary icon" 
                                                                    :iconLeft="{ component: PhArrowUp, weight: 'bold' }" 
                                                                    @click="() => moveField(groupChildId, 'up', getFieldById(childId).id)"
                                                                    v-tooltip="{ content: 'Move Up' }"
                                                                />
                                                                <Button 
                                                                    v-if="groupChildIndex < getFieldById(childId).children.length - 1"
                                                                    as="tertiary icon" 
                                                                    :iconLeft="{ component: PhArrowDown, weight: 'bold' }" 
                                                                    @click="() => moveField(groupChildId, 'down', getFieldById(childId).id)"
                                                                    v-tooltip="{ content: 'Move Down' }"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div v-else class="nested-field-missing">
                                                        Deleted field reference
                                                    </div>
                                                </div>
                                                
                                                <!-- Add field button for group -->
                                                <div class="add-nested-field">
                                                    <Button 
                                                        :iconLeft="{ component: PhPlus, weight: 'bold' }" 
                                                        label="Add Field to Group" 
                                                        @click="(e) => addFieldToContainer(getFieldById(childId), e)"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div v-else class="nested-field-missing">
                                    Deleted field reference
                                </div>
                            </template>
                            
                            <!-- Add field button -->
                            <div class="add-nested-field">
                                <Button 
                                    :iconLeft="{ component: PhPlus, weight: 'bold' }" 
                                    label="Add Field" 
                                    @click="(e) => addFieldToContainer(field, e)"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
    .custom-grid-container {
        width: 100%;
        position: relative;
        padding-bottom: 40px;
    }
    
    .empty-form-state {
        height: 300px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 40px;
    }
    
    /* Implement a proper 12-column grid */
    .form-grid {
        display: grid;
        grid-template-columns: repeat(12, 1fr);
        gap: 16px;
        width: 100%;
        padding: 8px;
        position: relative;
        min-height: 200px;
    }
    
    .field-item {
        transition: all 0.2s;
        min-height: 70px;
        /* Grid column span will be set inline with :style */
    }
    
    .field-content {
        background-color: var(--background-1);
        border: 1px solid var(--border);
        border-radius: var(--radius-md);
        height: 100%;
        padding: 12px;
        position: relative;
        transition: all 0.2s;
    }
    
    .field-item:hover .field-content {
        border-color: var(--brand-stroke);
    }
    
    .field-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 8px;
    }
    
    .field-info {
        display: flex;
        align-items: center;
        gap: 8px;
        overflow: hidden;
    }
    
    .field-icon {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background-color: var(--background-2);
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--brand-default);
        flex-shrink: 0;
    }
    
    .field-icon i {
        font-size: 18px;
    }
    
    .field-details {
        display: flex;
        flex-direction: column;
        overflow: hidden;
    }
    
    .field-label {
        font-weight: 600;
        font-size: 14px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    
    .field-type {
        font-size: 12px;
        color: var(--text-secondary);
        text-transform: capitalize;
    }
    
    .field-actions {
        display: flex;
        gap: 4px;
        flex-shrink: 0;
    }
    
    .field-meta {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-top: 8px;
    }
    
    .field-width-badge {
        background-color: var(--brand-fill);
        color: var(--brand-default);
        font-size: 10px;
        padding: 2px 6px;
        border-radius: 4px;
        font-weight: 600;
    }
    
    .field-logic-indicator {
        background-color: var(--blue-fill);
        color: var(--blue-default);
        font-size: 10px;
        padding: 2px 6px;
        border-radius: 4px;
        display: flex;
        align-items: center;
        gap: 4px;
    }
    
    .field-logic-indicator i {
        font-size: 12px;
    }
    
    /* Container field styles */
    .field-item.is-container .field-content {
        background-color: var(--background-0);
        border: 2px dashed var(--border);
    }
    
    .nested-container {
        min-height: 100px;
        padding: 12px;
        background-color: var(--background-0);
        border-radius: var(--radius-md);
        margin-top: 16px;
        border: 1px solid var(--border);
    }
    
    .nested-group-container {
        min-height: 80px;
        padding: 12px;
        background-color: var(--background-0);
        border-radius: var(--radius-md);
        margin-top: 12px;
        border: 1px solid var(--border);
        border-style: dashed;
    }
    
    .empty-container-message {
        color: var(--text-tertiary);
        text-align: center;
        font-style: italic;
        padding: 20px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
    }
    
    /* Nested fields grid */
    .nested-fields-grid {
        display: grid;
        grid-template-columns: repeat(12, 1fr);
        gap: 12px;
    }
    
    .nested-field-item {
        transition: all 0.2s;
        min-height: 50px;
    }
    
    .nested-field-content {
        background-color: var(--background-1);
        border: 1px solid var(--border);
        border-radius: var(--radius-md);
        padding: 10px;
        height: 100%;
    }
    
    .nested-field-content.level-2 {
        background-color: var(--background-2);
        border-style: dashed;
    }
    
    .nested-field-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
    }
    
    .nested-field-info {
        display: flex;
        align-items: center;
        gap: 8px;
        overflow: hidden;
    }
    
    .nested-field-icon {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background-color: var(--background-2);
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--brand-default);
    }
    
    .nested-field-content.level-2 .nested-field-icon {
        background-color: var(--background-3);
    }
    
    .nested-field-icon i {
        font-size: 14px;
    }
    
    .nested-field-details {
        display: flex;
        flex-direction: column;
        overflow: hidden;
    }
    
    .nested-field-label {
        font-weight: 600;
        font-size: 12px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    
    .nested-field-type {
        font-size: 10px;
        color: var(--text-secondary);
        text-transform: capitalize;
    }
    
    .nested-field-actions {
        display: flex;
        gap: 2px;
    }
    
    .nested-field-missing {
        background-color: var(--red-fill);
        color: var(--red-default);
        padding: 10px;
        border-radius: var(--radius-md);
        font-size: 12px;
        text-align: center;
        grid-column: span 12;
    }
    
    .add-nested-field {
        grid-column: span 12;
        display: flex;
        justify-content: center;
        margin-top: 8px;
    }
    
    /* Media query for small screens */
    @media (max-width: 768px) {
        .form-grid {
            grid-template-columns: 1fr;
        }
        
        .field-item {
            grid-column: 1 !important;
        }
        
        .nested-fields-grid {
            grid-template-columns: 1fr;
        }
        
        .nested-field-item {
            grid-column: 1 !important;
        }
    }
</style>