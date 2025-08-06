// src/panels/user/plugins/workflows/services/workflow.js

import { api } from '@utils/api';

export class WorkflowService {
    /**
     * Get all workflows for current user (from all their organizations)
     */
    static async getWorkflows() {
        try {
            const response = await api.get('user/workflows');
            
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
     * Update workflow node
     */
    static async updateNode(nodeId, data) {
        try {
            const response = await api.patch(`user/workflows/nodes/${nodeId}`, data);
            return response;
        } catch (error) {
            console.error('Failed to update node:', error);
            throw error;
        }
    }
    
    /**
     * Test workflow
     */
    static async testWorkflow(workflowId) {
        try {
            const response = await api.post(`user/workflows/${workflowId}/test`);
            return response;
        } catch (error) {
            console.error('Failed to test workflow:', error);
            throw error;
        }
    }
}