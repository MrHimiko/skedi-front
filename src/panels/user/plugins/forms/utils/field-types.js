// Field types definitions for the form builder

// Icons for field types
import { 
    PhTextT, PhTextbox, PhRadioButton, PhCheckSquare,
    PhTextColumns, PhListDashes, PhCalendarBlank, 
    PhImage, PhVideo, PhFile, PhStar, PhCursor, PhMinus, PhSteps, PhFolders
} from "@phosphor-icons/vue";

// Field types configuration
export const fieldTypes = [
    {
        type: "input",
        label: "Text Input",
        icon: { component: PhTextT, weight: "bold" },
        defaultProps: {
            label: "Text Input",
            placeholder: "Enter text...",
            required: false,
            type: "text"
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
            rows: 4
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
            options: [
                { label: "Option 1", value: "option_1" },
                { label: "Option 2", value: "option_2" }
            ]
        }
    },
    {
        type: "radio",
        label: "Radio Buttons",
        icon: { component: PhRadioButton, weight: "bold" },
        defaultProps: {
            label: "Radio Buttons",
            required: false,
            options: [
                { label: "Option 1", value: "option_1" },
                { label: "Option 2", value: "option_2" }
            ]
        }
    },
    {
        type: "checkbox",
        label: "Checkboxes",
        icon: { component: PhCheckSquare, weight: "bold" },
        defaultProps: {
            label: "Checkboxes",
            required: false,
            options: [
                { label: "Option 1", value: "option_1" },
                { label: "Option 2", value: "option_2" }
            ]
        }
    },
    {
        type: "date",
        label: "Date Picker",
        icon: { component: PhCalendarBlank, weight: "bold" },
        defaultProps: {
            label: "Date",
            required: false,
            placeholder: "Select a date"
        }
    },
    {
        type: "image",
        label: "Image",
        icon: { component: PhImage, weight: "bold" },
        defaultProps: {
            label: "Image",
            alt: "Image",
            src: ""
        }
    },
    {
        type: "video",
        label: "Video",
        icon: { component: PhVideo, weight: "bold" },
        defaultProps: {
            label: "Video",
            src: "",
            thumbnail: "",
            autoplay: false
        }
    },
    {
        type: "file",
        label: "File Upload",
        icon: { component: PhFile, weight: "bold" },
        defaultProps: {
            label: "File Upload",
            acceptedFileTypes: "",
            maxFileSize: 5, // MB
            multiple: false
        }
    },
    {
        type: "rating",
        label: "Rating",
        icon: { component: PhStar, weight: "bold" },
        defaultProps: {
            label: "Rating",
            maxRating: 5,
            required: false
        }
    },
    {
        type: "divider",
        label: "Divider",
        icon: { component: PhMinus, weight: "bold" },
        defaultProps: {
            style: "solid"
        }
    },
    {
        type: "step",
        label: "Form Step",
        icon: { component: PhSteps, weight: "bold" },
        defaultProps: {
            label: "New Step",
            description: "Enter step description here"
        }
    },
    {
        type: "group",
        label: "Field Group",
        icon: { component: PhFolders, weight: "bold" },
        defaultProps: {
            label: "Field Group",
            description: "Group related fields together"
        }
    }
    
];

// Get a field type by type name
export function getFieldType(type) {
    return fieldTypes.find(fieldType => fieldType.type === type);
}

export function createField(type) {
    const fieldType = getFieldType(type);
    if (!fieldType) {
      console.error(`Unknown field type: ${type}`);
      return null;
    }
    
    let defaultColSpan = 12;

    const newField = {
      id: `field-${Date.now()}`,
      type: fieldType.type,
      ...JSON.parse(JSON.stringify(fieldType.defaultProps)),
      colSpan: defaultColSpan
    };
    
    if (fieldType.type === 'step' || fieldType.type === 'group') {
      newField.children = [];
    }
    
    return newField;
  }