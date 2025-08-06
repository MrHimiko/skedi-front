// src/panels/user/plugins/workflows/services/workflow.js

import { api } from '@utils/api';

export class WorkflowService {
    /**
     * Get all workflows for current user
     */
    static async getWorkflows(page = 1, limit = 50) {
        try {
            const response = await api.get('user/workflows', { page, limit });
            return response.success ? response.data : { data: [], total: 0 };
        } catch (error) {
            console.error('Failed to fetch workflows:', error);
            return { data: [], total: 0 };
        }
    }
    
    /**
     * Get a single workflow by ID
     */
    static async getWorkflow(id) {
        try {
            const response = await api.get(`user/workflows/${id}`);
            return response.success ? response.data : null;
        } catch (error) {
            console.error('Failed to fetch workflow:', error);
            return null;
        }
    }
    
    /**
     * Create a new workflow
     */
    static async createWorkflow(data) {
        try {
            const response = await api.post('user/workflows', data);
            return response;
        } catch (error) {
            console.error('Failed to create workflow:', error);
            throw error;
        }
    }
    
    /**
     * Update a workflow
     */
    static async updateWorkflow(id, data) {
        try {
            const response = await api.patch(`user/workflows/${id}`, data);
            return response;
        } catch (error) {
            console.error('Failed to update workflow:', error);
            throw error;
        }
    }

    /**
     * Update workflow flow data (steps)
     */
    static async updateFlowData(id, flowData) {
        try {
            const response = await api.patch(`user/workflows/${id}/flow-data`, {
                flow_data: flowData
            });
            return response;
        } catch (error) {
            console.error('Failed to update flow data:', error);
            throw error;
        }
    }
    
    /**
     * Delete a workflow
     */
    static async deleteWorkflow(id) {
        try {
            const response = await api.delete(`user/workflows/${id}`);
            return response;
        } catch (error) {
            console.error('Failed to delete workflow:', error);
            throw error;
        }
    }

    /**
     * Duplicate a workflow
     */
    static async duplicateWorkflow(id, organizationId = null) {
        try {
            const data = organizationId ? { organization_id: organizationId } : {};
            const response = await api.post(`user/workflows/${id}/duplicate`, data);
            return response;
        } catch (error) {
            console.error('Failed to duplicate workflow:', error);
            throw error;
        }
    }
    
    /**
     * Get available triggers
     */
    static async getAvailableTriggers() {
        try {
            const response = await api.get('user/workflows/available-triggers');
            return response.success ? response.data : [];
        } catch (error) {
            console.error('Failed to fetch triggers:', error);
            return [];
        }
    }
    
    /**
     * Get available actions
     */
    static async getAvailableActions() {
        try {
            const response = await api.get('user/workflows/available-actions');
            return response.success ? response.data : [];
        } catch (error) {
            console.error('Failed to fetch actions:', error);
            return [];
        }
    }
    
    /**
     * Test workflow
     */
    static async testWorkflow(id) {
        try {
            const response = await api.post(`user/workflows/${id}/test`);
            return response;
        } catch (error) {
            console.error('Failed to test workflow:', error);
            throw error;
        }
    }

    /**
     * Get default workflow structure
     */
    static getDefaultWorkflow() {
        return {
            trigger: {
                type: '',
                config: {}
            },
            steps: []
        };
    }

    /**
     * Create a new step
     */
    static createStep(type, name, config = {}) {
        return {
            id: 'step_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            type: type,
            name: name,
            config: config
        };
    }

    /**
     * Create a condition step
     */
    static createCondition(name, config = {}, branches = { true: [], false: [] }) {
        return {
            id: 'condition_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            type: 'condition',
            name: name,
            config: config,
            branches: branches
        };
    }
}