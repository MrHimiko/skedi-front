export const locationIcons = {
    google_meet: {
        name: 'Google Meet',
        icon: 'https://upload.wikimedia.org/wikipedia/commons/9/9b/Google_Meet_icon_%282020%29.svg',
        showMeetingLink: true
    },
    zoom: {
        name: 'Zoom',
        icon: 'https://upload.wikimedia.org/wikipedia/commons/1/11/Zoom_Logo_2022.svg', 
        showMeetingLink: true
    },
    teams: {
        name: 'Microsoft Teams',
        icon: 'https://upload.wikimedia.org/wikipedia/commons/c/c9/Microsoft_Office_Teams_%282018%E2%80%93present%29.svg',
        showMeetingLink: true
    },
    in_person: {
        name: 'In Person',
        icon: 'https://cdn-icons-png.flaticon.com/512/684/684908.png',
        showMeetingLink: false
    },
    phone: {
        name: 'Phone Call',
        icon: 'https://cdn-icons-png.flaticon.com/512/724/724664.png',
        showMeetingLink: false
    },
    custom: {
        name: 'Custom Location',
        icon: 'https://cdn-icons-png.flaticon.com/512/684/684908.png',
        showMeetingLink: false
    }
};

export function getLocationIcon(type) {
    return locationIcons[type] || locationIcons.custom;
}