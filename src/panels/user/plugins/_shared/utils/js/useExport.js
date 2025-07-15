import { ref } from 'vue';
import { common } from '@utils/common';

export function useExport() {
    const isExporting = ref(false);
    
    async function exportData(url, filename = 'export.csv') {
        if (isExporting.value) return;
        
        try {
            isExporting.value = true;
            
            // Create a temporary anchor element for download
            const link = document.createElement('a');
            link.href = `/api/${url}`;
            link.download = filename;
            
            // Add auth token to the request
            const token = localStorage.getItem('token');
            if (token) {
                link.href += (link.href.includes('?') ? '&' : '?') + `token=${token}`;
            }
            
            // Trigger download
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            common.notification('Export started successfully', true);
        } catch (error) {
            console.error('Export failed:', error);
            common.notification('Failed to export data', false);
        } finally {
            isExporting.value = false;
        }
    }
    
    return {
        exportData,
        isExporting
    };
}