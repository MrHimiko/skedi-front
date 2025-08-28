// Google OAuth provider specifically for account authentication
import { api } from '@utils/api';

export class GoogleAccountProvider {
    constructor() {
        this.name = 'Google';
    }

    async getOAuthUrl() {
        try {
            console.log('Getting OAuth URL for Google Account auth...');
            
            const response = await api.get('account/google/auth');
            
            if (response.success && response.data && response.data.auth_url) {
                console.log('OAuth URL received successfully');
                return response.data.auth_url;
            }
            
            throw new Error(response?.message || 'Failed to get authentication URL');
        } catch (error) {
            console.error('Error getting OAuth URL:', error);
            throw error;
        }
    }

    async completeOAuth(code, state) {
        try {
            console.log('Completing Google account OAuth...');
            
            const response = await api.post('account/google/callback', { 
                code,
                state
            });
            
            if (!response || !response.success) {
                throw new Error(response?.message || 'Authentication failed');
            }
            
            return response;
        } catch (error) {
            console.error('Error completing OAuth:', error);
            throw error;
        }
    }
}

export default new GoogleAccountProvider();