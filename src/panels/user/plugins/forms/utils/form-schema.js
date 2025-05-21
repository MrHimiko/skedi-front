// Utilities for handling form schema

// Create an empty form schema
export function createEmptyForm() {
    return {
        id: `form-${Date.now()}`,
        name: "Untitled Form",
        fields: [],
        layout: {
            type: "standard",
            settings: {
                showProgressBar: true,
                showFieldNumbers: false,
                autoSave: true,
                surveyMode: false
            }
        },
        submission: {
            successMessage: "Thank you for submitting!",
            redirectUrl: null
        }
    };
}

// Validate the form schema
export function validateForm(formSchema) {
    // Basic validation
    if (!formSchema) return false;
    if (!Array.isArray(formSchema.fields)) return false;
    
    // Validate each field
    for (const field of formSchema.fields) {
        if (!field.id || !field.type) return false;
    }
    
    return true;
}

// Get form fields that a specific field can depend on (for conditional logic)
export function getAvailableDependencyFields(formSchema, currentFieldId) {
    if (!formSchema || !Array.isArray(formSchema.fields)) return [];
    
    // A field can only depend on fields that come before it
    const currentFieldIndex = formSchema.fields.findIndex(field => field.id === currentFieldId);
    if (currentFieldIndex <= 0) return [];
    
    // Return fields before the current field
    return formSchema.fields.slice(0, currentFieldIndex)
        .filter(field => {
            // Only certain field types make sense for conditions
            return ["input", "select", "radio", "checkbox", "date", "rating"].includes(field.type);
        })
        .map(field => ({
            id: field.id,
            label: field.label,
            type: field.type
        }));
}

// Get comparison operators for a field type
export function getComparisonOperators(fieldType) {
    const commonOperators = [
        { value: "equals", label: "Equals" },
        { value: "not_equals", label: "Not Equals" },
        { value: "is_empty", label: "Is Empty" },
        { value: "is_not_empty", label: "Is Not Empty" }
    ];
    
    switch (fieldType) {
        case "input":
            return [
                ...commonOperators,
                { value: "contains", label: "Contains" },
                { value: "not_contains", label: "Does Not Contain" },
                { value: "starts_with", label: "Starts With" },
                { value: "ends_with", label: "Ends With" }
            ];
        case "select":
        case "radio":
            return commonOperators;
        case "checkbox":
            return [
                ...commonOperators,
                { value: "contains", label: "Contains" }
            ];
        case "date":
        case "rating":
            return [
                ...commonOperators,
                { value: "greater_than", label: "Greater Than" },
                { value: "less_than", label: "Less Than" }
            ];
        default:
            return commonOperators;
    }
}