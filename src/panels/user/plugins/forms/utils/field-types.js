import { 
    PhTextT, PhTextbox, PhRadioButton, PhCheckSquare,
    PhListDashes, PhCalendarBlank, PhFile, PhStar, 
    PhMinus, PhSteps, PhFolders, PhUserList
} from "@phosphor-icons/vue";

// Field types that users can add from the sidebar
export const fieldTypes = [
    
    {
        type: "input",
        label: "Text Input",
        icon: { component: PhTextT, weight: "bold" },
        defaultProps: {
            label: "Text Input",
            placeholder: "Enter text...",
            required: false,
            type: "text",
            colSpan: 12
        }
    },
    {
        type: "textarea",
        label: "Text Area",
        icon: { component: PhTextbox, weight: "bold" },
        defaultProps: {
            label: "Text Area",
            placeholder: "Enter long text...",
            required: false,
            rows: 4,
            colSpan: 12
        }
    },
    {
        type: "select",
        label: "Dropdown",
        icon: { component: PhListDashes, weight: "bold" },
        defaultProps: {
            label: "Dropdown",
            placeholder: "Select an option",
            required: false,
            options: [],
            colSpan: 12
        }
    },
    {
        type: "radio",
        label: "Radio Buttons",
        icon: { component: PhRadioButton, weight: "bold" },
        defaultProps: {
            label: "Radio Buttons",
            required: false,
            options: [],
            colSpan: 12
        }
    },
    {
        type: "checkbox",
        label: "Checkboxes",
        icon: { component: PhCheckSquare, weight: "bold" },
        defaultProps: {
            label: "Checkboxes",
            required: false,
            options: [],
            colSpan: 12
        }
    },
    {
        type: "date",
        label: "Date Picker",
        icon: { component: PhCalendarBlank, weight: "bold" },
        defaultProps: {
            label: "Date",
            required: false,
            placeholder: "Select a date",
            colSpan: 12
        }
    },
    {
        type: "file",
        label: "File Upload",
        icon: { component: PhFile, weight: "bold" },
        defaultProps: {
            label: "File Upload",
            acceptedFileTypes: "",
            maxFileSize: 5,
            multiple: false,
            colSpan: 12
        }
    },
    {
        type: "rating",
        label: "Rating",
        icon: { component: PhStar, weight: "bold" },
        defaultProps: {
            label: "Rating",
            maxRating: 5,
            required: false,
            colSpan: 12
        }
    },
    {
        type: "divider",
        label: "Divider",
        icon: { component: PhMinus, weight: "bold" },
        defaultProps: {
            colSpan: 12
        }
    },
    {
        type: "step",
        label: "Form Step",
        icon: { component: PhSteps, weight: "bold" },
        defaultProps: {
            label: "New Step",
            colSpan: 12
        }
    },
    {
        type: "group",
        label: "Field Group",
        icon: { component: PhFolders, weight: "bold" },
        defaultProps: {
            label: "Field Group",
            colSpan: 12
        }
    },
    {
        type: "system_contact_guests",
        label: "Guest List",
        icon: { component: PhUserList, weight: "bold" },
        system: true,
        maxCount: 1,
        defaultProps: {
            name: "system_contact_guests",
            type: "guest_repeater",
            label: "Add Guests",
            required: false,
            deletable: true,
            max_guests: 10,
            system_field: false,
            colSpan: 12
        }
    },
];

// System field types (not shown in sidebar but used internally)
export const systemFieldTypes = [
    {
        type: "system_contact_name",
        label: "Name (Required)",
        icon: { component: PhTextT, weight: "bold" },
        system: true,
        defaultProps: {
            name: "system_contact_name",
            type: "text",
            label: "Your Name",
            placeholder: "Enter your name",
            required: true,
            deletable: false,
            system_field: true,
            colSpan: 12
        }
    },
    {
        type: "system_contact_email",
        label: "Email (Required)",
        icon: { component: PhTextT, weight: "bold" },
        system: true,
        defaultProps: {
            name: "system_contact_email",
            type: "email",
            label: "Email Address",
            placeholder: "your@email.com",
            required: true,
            deletable: false,
            system_field: true,
            colSpan: 12
        }
    }
];

// Get all field types (for internal use)
export const allFieldTypes = [...fieldTypes, ...systemFieldTypes];

export function getFieldType(type) {
    return allFieldTypes.find(fieldType => fieldType.type === type);
}

export function createField(type, order = null) {
    const fieldType = getFieldType(type);
    if (!fieldType) {
        console.error(`Unknown field type: ${type}`);
        return null;
    }
    
    const newField = {
        ...JSON.parse(JSON.stringify(fieldType.defaultProps))
    };
    
    // For system fields, use predefined properties
    if (fieldType.system) {
        if (order !== null) {
            newField.order = order;
        }
        return newField;
    }
    
    // For regular fields
    newField.id = `field-${Date.now()}`;
    newField.type = fieldType.type;
    
    if (fieldType.type === 'step' || fieldType.type === 'group') {
        newField.children = [];
    }
    
    return newField;
}

// Convert label to slug for option values
export function labelToValue(label) {
    return label
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '_')
        .replace(/-+/g, '_')
        .replace(/^_+|_+$/g, '');
}

// Convert text to options array
export function textToOptions(text) {
    if (!text) return [];
    
    return text
        .split('\n')
        .filter(line => line.trim())
        .map((line, index) => {
            const label = line.trim();
            const value = labelToValue(label) || `option_${index + 1}`;
            return { label, value };
        });
}

// Convert options array to text
export function optionsToText(options) {
    if (!options || !Array.isArray(options)) return '';
    return options.map(option => option.label).join('\n');
}