/**
 * Platform Integration Utility for InfraNodus
 * 
 * Provides integration capabilities between InfraNodus and other 
 * knowledge mapping platforms like MyMap.ai
 */

const request = require('request-promise');
const logger = require('../log/logger');

class PlatformIntegration {
    constructor(options = {}) {
        this.options = {
            enableMyMap: options.enableMyMap !== undefined ? options.enableMyMap : true,
            myMapApiUrl: options.myMapApiUrl || 'https://api.mymap.ai/v1',
            requestTimeout: options.requestTimeout || 10000,
            ...options
        };

        this.apiKeys = {
            myMapKey: process.env.MYMAP_API_KEY || options.myMapKey
        };
    }

    /**
     * Export InfraNodus graph to MyMap.ai
     * 
     * @param {Object} graphData - The graph data from InfraNodus
     * @param {string} userId - User ID for tracking the export
     * @param {string} apiKey - Optional API key override
     * @returns {Promise} - Promise resolving to the exported MyMap data
     */
    async exportToMyMap(graphData, userId, apiKey = null) {
        if (!this.options.enableMyMap) {
            throw new Error('MyMap integration is disabled');
        }

        const key = apiKey || this.apiKeys.myMapKey;

        if (!key) {
            throw new Error('No MyMap API key provided');
        }

        try {
            logger.info(`Exporting graph to MyMap.ai for user ${userId}`);

            // Transform InfraNodus graph to MyMap format
            const myMapData = this._transformToMyMapFormat(graphData);

            // Send to MyMap API
            const response = await request({
                method: 'POST',
                uri: `${this.options.myMapApiUrl}/import`,
                headers: {
                    'Authorization': `Bearer ${key}`,
                    'Content-Type': 'application/json'
                },
                body: {
                    data: myMapData,
                    metadata: {
                        source: 'infranodus',
                        userId: userId
                    }
                },
                json: true,
                timeout: this.options.requestTimeout
            });

            logger.info(`Successfully exported graph to MyMap.ai: ${response.id || 'ID not provided'}`);
            return response;

        } catch (error) {
            logger.error(`Failed to export to MyMap.ai: ${error.message}`);
            throw error;
        }
    }

    /**
     * Import a graph from MyMap.ai into InfraNodus
     * 
     * @param {string} myMapId - ID of the MyMap graph to import
     * @param {string} userId - InfraNodus user ID
     * @param {string} context - Context to place the imported content
     * @param {string} apiKey - Optional API key override
     * @returns {Promise} - Promise resolving to the imported graph data
     */
    async importFromMyMap(myMapId, userId, context, apiKey = null) {
        if (!this.options.enableMyMap) {
            throw new Error('MyMap integration is disabled');
        }

        const key = apiKey || this.apiKeys.myMapKey;

        if (!key) {
            throw new Error('No MyMap API key provided');
        }

        try {
            logger.info(`Importing graph from MyMap.ai (${myMapId}) for user ${userId}`);

            // Get data from MyMap API
            const response = await request({
                method: 'GET',
                uri: `${this.options.myMapApiUrl}/maps/${myMapId}`,
                headers: {
                    'Authorization': `Bearer ${key}`,
                    'Content-Type': 'application/json'
                },
                json: true,
                timeout: this.options.requestTimeout
            });

            // Transform MyMap format to InfraNodus format
            const infraNodeData = this._transformToInfraNodeFormat(response, context);

            logger.info(`Successfully imported graph from MyMap.ai: ${myMapId}`);
            return infraNodeData;

        } catch (error) {
            logger.error(`Failed to import from MyMap.ai: ${error.message}`);
            throw error;
        }
    }

    /**
     * Transform InfraNodus graph data to MyMap format
     * 
     * @private
     * @param {Object} graphData - InfraNodus graph data
     * @returns {Object} - Data in MyMap format
     */
    _transformToMyMapFormat(graphData) {
        // Create MyMap-compatible structure
        const myMapData = {
            nodes: [],
            edges: [],
            metadata: {
                title: graphData.contextName || 'InfraNodus Graph',
                description: `Exported from InfraNodus on ${new Date().toISOString()}`
            }
        };

        // Convert nodes
        if (graphData.nodes && Array.isArray(graphData.nodes)) {
            myMapData.nodes = graphData.nodes.map(node => ({
                id: node.id || node.uid || `infranodus-${Math.random().toString(36).substring(2, 15)}`,
                label: node.name || node.label,
                type: node.type || 'concept',
                properties: {
                    weight: node.weight || 1,
                    community: node.community || 0,
                    betweenness: node.betweenness || 0,
                    relevance: node.relevance || 0,
                    originId: node.id || node.uid,
                    origin: 'infranodus'
                }
            }));
        }

        // Convert edges
        if (graphData.edges && Array.isArray(graphData.edges)) {
            myMapData.edges = graphData.edges.map(edge => ({
                source: edge.source,
                target: edge.target,
                weight: edge.weight || 1,
                properties: {
                    statement: edge.statement || '',
                    context: edge.context || graphData.contextName,
                    originId: edge.id,
                    origin: 'infranodus'
                }
            }));
        }

        return myMapData;
    }

    /**
     * Transform MyMap data to InfraNodus format
     * 
     * @private
     * @param {Object} myMapData - MyMap graph data
     * @param {string} context - Context to use for the import
     * @returns {Object} - Data in InfraNodus format
     */
    _transformToInfraNodeFormat(myMapData, context) {
        // Create InfraNodus-compatible structure
        const infraNodeData = {
            nodes: [],
            statements: [],
            contextName: context || 'mymap-import'
        };

        // Map for quick node reference
        const nodeMap = {};

        // Convert nodes
        if (myMapData.nodes && Array.isArray(myMapData.nodes)) {
            infraNodeData.nodes = myMapData.nodes.map(node => {
                const infraNode = {
                    id: node.id,
                    name: node.label,
                    type: this._mapNodeType(node.type),
                    weight: node.properties?.weight || 1,
                    community: node.properties?.community || 0
                };

                // Store in map for edge creation
                nodeMap[node.id] = infraNode;

                return infraNode;
            });
        }

        // Convert edges to statements
        if (myMapData.edges && Array.isArray(myMapData.edges)) {
            myMapData.edges.forEach(edge => {
                // Get source and target node names
                const sourceNode = nodeMap[edge.source];
                const targetNode = nodeMap[edge.target];

                if (sourceNode && targetNode) {
                    // Create a statement from edge
                    const statement = {
                        source: sourceNode.name,
                        target: targetNode.name,
                        statement: edge.properties?.statement || `${sourceNode.name} ${targetNode.name}`,
                        context: context || 'mymap-import',
                        weight: edge.weight || 1
                    };

                    infraNodeData.statements.push(statement);
                }
            });
        }

        return infraNodeData;
    }

    /**
     * Map MyMap node types to InfraNodus node types
     * 
     * @private
     * @param {string} myMapType - MyMap node type
     * @returns {string} - InfraNodus node type
     */
    _mapNodeType(myMapType) {
        const typeMap = {
            'concept': 'concept',
            'person': 'person',
            'place': 'place',
            'organization': 'organization',
            'resource': 'resource',
            'note': 'note',
            'question': 'question',
            'insight': 'insight'
        };

        return typeMap[myMapType] || 'concept';
    }

    /**
     * Get available MyMap maps for a user
     * 
     * @param {string} userId - InfraNodus user ID
     * @param {string} apiKey - Optional API key override
     * @returns {Promise} - Promise resolving to list of available maps
     */
    async getMyMapList(userId, apiKey = null) {
        if (!this.options.enableMyMap) {
            throw new Error('MyMap integration is disabled');
        }

        const key = apiKey || this.apiKeys.myMapKey;

        if (!key) {
            throw new Error('No MyMap API key provided');
        }

        try {
            const response = await request({
                method: 'GET',
                uri: `${this.options.myMapApiUrl}/maps`,
                headers: {
                    'Authorization': `Bearer ${key}`,
                    'Content-Type': 'application/json'
                },
                json: true,
                timeout: this.options.requestTimeout
            });

            return response;

        } catch (error) {
            logger.error(`Failed to get MyMap list: ${error.message}`);
            throw error;
        }
    }
}

// Export singleton instance with default options
const platformIntegration = new PlatformIntegration();

// Also export the class if custom instances are needed
module.exports = {
    platformIntegration,
    PlatformIntegration
};
