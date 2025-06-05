export function createEmptyForm() {
    const now = Date.now();
    return {
        id: `form-${now}`,
        name: "Untitled Form",
        fields: [
            {
                name: "system_contact_name",  
                type: "text",
                label: "Your Name",
                order: 1,
                required: true,
                deletable: false,
                placeholder: "Enter your name",
                system_field: true,
                colSpan: 12
            },
            {
                name: "system_contact_email",  
                type: "email",
                label: "Email Address",
                order: 2,
                required: true,
                deletable: false,
                placeholder: "your@email.com",
                system_field: true,
                colSpan: 12
            }
        ],
        layout: {
            type: "standard",
            settings: {
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

export function validateForm(formSchema) {
    if (!formSchema) return false;
    if (!Array.isArray(formSchema.fields)) return false;
    
    // Check for required system fields
    const hasName = formSchema.fields.some(f => f.name === 'system_contact_name');
    const hasEmail = formSchema.fields.some(f => f.name === 'system_contact_email');
    
    if (!hasName || !hasEmail) return false;
    
    // Check max one guest repeater
    const guestRepeaters = formSchema.fields.filter(f => 
        f.type === 'guest_repeater' || f.name === 'system_contact_guests'
    );
    if (guestRepeaters.length > 1) return false;
    
    // Validate each field
    for (const field of formSchema.fields) {
        if (!field.id && !field.name) return false;
        if (!field.type) return false;
    }
    
    return true;
}

export function getAvailableDependencyFields(formSchema, currentFieldId) {
    if (!formSchema || !Array.isArray(formSchema.fields)) return [];
    
    // System fields cannot have conditional logic
    const currentField = formSchema.fields.find(f => 
        (f.id === currentFieldId) || (f.name === currentFieldId)
    );
    if (currentField?.system_field) return [];
    
    const currentFieldIndex = formSchema.fields.findIndex(field => 
        (field.id === currentFieldId) || (field.name === currentFieldId)
    );
    if (currentFieldIndex <= 0) return [];
    
    return formSchema.fields.slice(0, currentFieldIndex)
        .filter(field => {
            // Exclude system fields and certain types
            if (field.system_field) return false;
            return ["input", "text", "select", "radio", "checkbox", "date", "rating"].includes(field.type);
        })
        .map(field => ({
            id: field.id || field.name,
            label: field.label,
            type: field.type
        }));
}

export function getComparisonOperators(fieldType) {
    const commonOperators = [
        { value: "equals", label: "Equals" },
        { value: "not_equals", label: "Not Equals" },
        { value: "is_empty", label: "Is Empty" },
        { value: "is_not_empty", label: "Is Not Empty" }
    ];
    
    switch (fieldType) {
        case "input":
        case "text":
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

// Ensure system fields maintain correct order
export function ensureSystemFieldsOrder(fields) {
    const systemFields = [];
    const regularFields = [];
    
    fields.forEach(field => {
        if (field.system_field) {
            systemFields.push(field);
        } else {
            regularFields.push(field);
        }
    });
    
    // Sort system fields by order
    systemFields.sort((a, b) => (a.order || 0) - (b.order || 0));
    
    // Update order for all fields
    let order = 1;
    systemFields.forEach(field => {
        field.order = order++;
    });
    
    regularFields.forEach(field => {
        if (!field.order) {
            field.order = order++;
        }
    });
    
    return [...systemFields, ...regularFields];
}

// Clean up form data before saving
export function cleanFormData(formData) {
    const cleanedFields = [];
    const seenFieldIds = new Set();
    const seenSystemNames = new Set();
    
    // Track unique fields by both id and name
    const uniqueFieldTypes = new Set(['system_contact_name', 'system_contact_email', 'system_contact_guests']);
    
    formData.fields.forEach(field => {
        // Check for duplicates by ID
        if (field.id && seenFieldIds.has(field.id)) {
            return; // Skip duplicate
        }
        
        // Check for unique field types (system fields and guest repeater)
        const fieldIdentifier = field.name || field.type;
        if (uniqueFieldTypes.has(fieldIdentifier)) {
            if (seenSystemNames.has(fieldIdentifier)) {
                return; // Skip duplicate
            }
            seenSystemNames.add(fieldIdentifier);
        }
        
        // Add to seen IDs
        if (field.id) {
            seenFieldIds.add(field.id);
        }
        
        cleanedFields.push(field);
    });
    
    // Clean up container children references
    cleanedFields.forEach(field => {
        if (field.children && Array.isArray(field.children)) {
            field.children = field.children
                .filter(childId => childId != null)
                .filter(childId => {
                    // Check if referenced field exists
                    return cleanedFields.some(f => 
                        (f.id === childId) || (f.name === childId)
                    );
                })
                .filter((childId, index, array) => array.indexOf(childId) === index); // Remove duplicates
        }
    });
    
    // Ensure system fields are at the beginning
    const systemFields = cleanedFields.filter(f => f.system_field);
    const regularFields = cleanedFields.filter(f => !f.system_field);
    
    systemFields.sort((a, b) => (a.order || 0) - (b.order || 0));
    
    return {
        ...formData,
        fields: [...systemFields, ...regularFields]
    };
}