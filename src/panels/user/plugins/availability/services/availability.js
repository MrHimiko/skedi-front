import { api } from '@utils/api';

export class AvailabilityService {
    /**
     * Get all out of office entries for the current user
     */
    static async getOutOfOfficeEntries() {
        try {
            return await api.get('user/out-of-office');
        } catch (error) {
            console.error('Error fetching out of office entries:', error);
            throw error;
        }
    }

    /**
     * Create a new out of office entry
     */
    static async createOutOfOffice(data) {
        try {
            return await api.post('user/out-of-office', data);
        } catch (error) {
            console.error('Error creating out of office entry:', error);
            throw error;
        }
    }

    /**
     * Update an existing out of office entry
     */
    static async updateOutOfOffice(id, data) {
        try {
            return await api.put(`user/out-of-office/${id}`, data);
        } catch (error) {
            console.error('Error updating out of office entry:', error);
            throw error;
        }
    }

    /**
     * Delete an out of office entry
     */
    static async deleteOutOfOffice(id) {
        try {
            return await api.delete(`user/out-of-office/${id}`);
        } catch (error) {
            console.error('Error deleting out of office entry:', error);
            throw error;
        }
    }
}