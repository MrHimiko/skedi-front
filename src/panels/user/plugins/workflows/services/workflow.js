// src/panels/user/plugins/workflows/services/workflow.js

import { api } from '@utils/api';

export class WorkflowService {
    /**
     * Get all workflows for an organization
     */
    static async getWorkflows(organizationId) {
        try {
            const response = await api.get('user/workflows', {
                organization_id: organizationId
            });
            
            return response.success ? response.data : [];
        } catch (error) {
            console.error('Failed to fetch workflows:', error);
            return [];
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
     * Add a node to a workflow
     */
    static async addNode(workflowId, nodeData) {
        try {
            const response = await api.post(`user/workflows/${workflowId}/nodes`, nodeData);
            return response;
        } catch (error) {
            console.error('Failed to add node:', error);
            throw error;
        }
    }
    
    /**
     * Update a node
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
     * Delete a node
     */
    static async deleteNode(nodeId) {
        try {
            const response = await api.delete(`user/workflows/nodes/${nodeId}`);
            return response;
        } catch (error) {
            console.error('Failed to delete node:', error);
            throw error;
        }
    }
    
    /**
     * Create a connection between nodes
     */
    static async createConnection(workflowId, connectionData) {
        try {
            const response = await api.post(`user/workflows/${workflowId}/connections`, connectionData);
            return response;
        } catch (error) {
            console.error('Failed to create connection:', error);
            throw error;
        }
    }
    
    /**
     * Delete a connection
     */
    static async deleteConnection(connectionId) {
        try {
            const response = await api.delete(`user/workflows/connections/${connectionId}`);
            return response;
        } catch (error) {
            console.error('Failed to delete connection:', error);
            throw error;
        }
    }
    
    /**
     * Test a workflow
     */
    static async testWorkflow(workflowId, testData = {}) {
        try {
            const response = await api.post(`user/workflows/${workflowId}/test`, testData);
            return response;
        } catch (error) {
            console.error('Failed to test workflow:', error);
            throw error;
        }
    }
}