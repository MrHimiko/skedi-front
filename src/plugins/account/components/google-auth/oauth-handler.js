// Reusable OAuth popup handler for account auth
import { common } from '@utils/common';
import { storage } from '@utils/storage';
import googleProvider from './provider.js';

export class GoogleAccountOAuthHandler {
    constructor() {
        this.authWindow = null;
        this.messageListener = null;
        this.timeoutId = null;
    }

    async startOAuthFlow() {
        try {
            // Get auth URL
            const authUrl = await googleProvider.getOAuthUrl();
            
            // Open popup
            const width = 600;
            const height = 700;
            const left = window.screen.width / 2 - width / 2;
            const top = window.screen.height / 2 - height / 2;
            
            this.authWindow = window.open(
                authUrl,
                'google_account_auth',
                `width=${width},height=${height},left=${left},top=${top}`
            );
            
            if (!this.authWindow) {
                throw new Error('Popup was blocked. Please allow popups for this site.');
            }

            // Setup message listener
            this.setupMessageListener();
            
            // Set timeout
            this.timeoutId = setTimeout(() => {
                this.cleanup();
                throw new Error('Authentication timed out. Please try again.');
            }, 120000);
            
            return new Promise((resolve, reject) => {
                this.resolve = resolve;
                this.reject = reject;
            });
        } catch (error) {
            this.cleanup();
            throw error;
        }
    }

    setupMessageListener() {
        this.messageListener = (event) => {
            // Validate origin
            if (event.origin !== window.location.origin) {
                return;
            }
            
            // Handle OAuth callback
            if (event.data && event.data.type === 'google_oauth_callback') {
                const { code, state } = event.data;
                
                if (code) {
                    this.completeAuthentication(code, state);
                } else {
                    this.reject(new Error('No authorization code received'));
                }
            }
        };
        
        window.addEventListener('message', this.messageListener);
    }

    async completeAuthentication(code, state) {
        try {
            const response = await googleProvider.completeOAuth(code, state);
            
            if (response && response.success) {
                // Store token
                storage.set('token', response.data.token, true);
                
                // Success notification
                const actionType = response.data.type === 'login' ? 'signed in' : 'registered';
                common.notification(`Successfully ${actionType} with Google!`, true);
                
                // Navigate to return URL or homepage
                const url = common.query('return') ?? '/';
                window.location.href = url.startsWith('/') ? url : '/';
                
                this.resolve(response);
            } else {
                this.reject(new Error(response?.message || 'Authentication failed'));
            }
        } catch (error) {
            this.reject(error);
        } finally {
            this.cleanup();
        }
    }

    cleanup() {
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }
        
        if (this.authWindow) {
            try {
                this.authWindow.close();
            } catch (e) {
                // Ignore errors
            }
            this.authWindow = null;
        }
        
        if (this.messageListener) {
            window.removeEventListener('message', this.messageListener);
            this.messageListener = null;
        }
    }
}

export default GoogleAccountOAuthHandler;