/**
 * Enhanced Platform Integration for InfraNodus
 * 
 * Extends the base platform integration with advanced capabilities:
 * - Real-time synchronization options
 * - Advanced transformation settings
 * - Webhooks for change notifications
 * - Collaborative features
 * - Workflow templates
 */

const { platformIntegration, PlatformIntegration } = require('./platformIntegration');
const request = require('request-promise');
const logger = require('../log/logger');
const EventEmitter = require('events');

class IntegrationEvents extends EventEmitter { }
const integrationEvents = new IntegrationEvents();

class EnhancedIntegration {
    constructor(options = {}) {
        this.platformIntegration = options.platformIntegration || platformIntegration;
        this.events = integrationEvents;
        this.syncIntervals = new Map(); // Store interval IDs for each sync task
        this.webhooks = new Map(); // Store registered webhooks
        this.options = {
            syncIntervalMs: options.syncIntervalMs || 300000, // 5 minutes default
            maxSyncGraphSize: options.maxSyncGraphSize || 1000, // Max nodes for sync
            enableRealTimeSync: options.enableRealTimeSync !== undefined ? options.enableRealTimeSync : false,
            ...options
        };
    }

    /**
     * Start real-time synchronization between InfraNodus and MyMap
     * 
     * @param {string} userId - InfraNodus User ID
     * @param {string} infraContext - InfraNodus context to sync
     * @param {string} myMapId - MyMap ID to sync with
     * @param {string} apiKey - MyMap API key
     * @param {object} options - Sync options
     * @returns {string} - Sync ID that can be used to stop syncing
     */
    startSync(userId, infraContext, myMapId, apiKey, options = {}) {
        const syncId = `${userId}-${infraContext}-${myMapId}`;

        // Stop existing sync if any
        if (this.syncIntervals.has(syncId)) {
            this.stopSync(syncId);
        }

        const syncOptions = {
            direction: options.direction || 'bidirectional', // 'to-mymap', 'to-infranodus', 'bidirectional'
            interval: options.interval || this.options.syncIntervalMs,
            autoResolveConflicts: options.autoResolveConflicts !== undefined ? options.autoResolveConflicts : true,
            includeDeleted: options.includeDeleted !== undefined ? options.includeDeleted : false,
            transformOptions: options.transformOptions || {}
        };

        logger.info(`Starting ${syncOptions.direction} sync between InfraNodus context ${infraContext} and MyMap ${myMapId} for user ${userId}`);

        // Store last sync state to track changes
        const syncState = {
            lastInfraUpdate: new Date().toISOString(),
            lastMyMapUpdate: new Date().toISOString(),
            lastSyncTime: new Date().toISOString(),
            conflicts: []
        };

        // Set up the sync interval
        const intervalId = setInterval(async () => {
            try {
                await this._performSync(userId, infraContext, myMapId, apiKey, syncOptions, syncState);
                syncState.lastSyncTime = new Date().toISOString();

                // Emit sync event
                this.events.emit('sync-completed', {
                    syncId,
                    userId,
                    infraContext,
                    myMapId,
                    timestamp: syncState.lastSyncTime
                });

            } catch (error) {
                logger.error(`Sync error for ${syncId}: ${error.message}`);

                // Emit error event
                this.events.emit('sync-error', {
                    syncId,
                    userId,
                    infraContext,
                    myMapId,
                    error: error.message
                });
            }
        }, syncOptions.interval);

        // Store the interval ID and options for later reference
        this.syncIntervals.set(syncId, {
            intervalId,
            options: syncOptions,
            state: syncState,
            userId,
            infraContext,
            myMapId,
            apiKey
        });

        // Perform initial sync immediately
        setImmediate(async () => {
            try {
                await this._performSync(userId, infraContext, myMapId, apiKey, syncOptions, syncState);
                syncState.lastSyncTime = new Date().toISOString();
            } catch (error) {
                logger.error(`Initial sync error for ${syncId}: ${error.message}`);
            }
        });

        return syncId;
    }

    /**
     * Stop an active synchronization
     * 
     * @param {string} syncId - ID of the sync to stop
     * @returns {boolean} - Whether the sync was successfully stopped
     */
    stopSync(syncId) {
        const syncInfo = this.syncIntervals.get(syncId);

        if (syncInfo) {
            clearInterval(syncInfo.intervalId);
            this.syncIntervals.delete(syncId);
            logger.info(`Stopped sync ${syncId}`);

            // Emit sync-stopped event
            this.events.emit('sync-stopped', {
                syncId,
                userId: syncInfo.userId,
                infraContext: syncInfo.infraContext,
                myMapId: syncInfo.myMapId
            });

            return true;
        }

        return false;
    }

    /**
     * Get all active syncs
     * 
     * @param {string} userId - Optional filter by user ID
     * @returns {Array} - List of active sync information
     */
    getActiveSyncs(userId = null) {
        const syncs = [];

        for (const [syncId, syncInfo] of this.syncIntervals.entries()) {
            if (!userId || syncInfo.userId === userId) {
                syncs.push({
                    syncId,
                    userId: syncInfo.userId,
                    infraContext: syncInfo.infraContext,
                    myMapId: syncInfo.myMapId,
                    direction: syncInfo.options.direction,
                    lastSyncTime: syncInfo.state.lastSyncTime,
                    conflicts: syncInfo.state.conflicts.length
                });
            }
        }

        return syncs;
    }

    /**
     * Register a webhook to be called when changes are detected
     * 
     * @param {string} userId - User ID
     * @param {string} infraContext - InfraNodus context
     * @param {string} webhookUrl - URL to call when changes detected
     * @param {object} options - Webhook options
     * @returns {string} - Webhook ID
     */
    registerWebhook(userId, infraContext, webhookUrl, options = {}) {
        const webhookId = `webhook-${userId}-${infraContext}-${Date.now()}`;

        this.webhooks.set(webhookId, {
            userId,
            infraContext,
            webhookUrl,
            options: {
                events: options.events || ['export', 'import', 'sync'],
                includeData: options.includeData !== undefined ? options.includeData : false,
                headers: options.headers || {},
                ...options
            }
        });

        logger.info(`Registered webhook ${webhookId} for user ${userId}, context ${infraContext}`);
        return webhookId;
    }

    /**
     * Remove a registered webhook
     * 
     * @param {string} webhookId - ID of the webhook to remove
     * @returns {boolean} - Whether the webhook was successfully removed
     */
    removeWebhook(webhookId) {
        if (this.webhooks.has(webhookId)) {
            this.webhooks.delete(webhookId);
            logger.info(`Removed webhook ${webhookId}`);
            return true;
        }
        return false;
    }

    /**
     * Apply a workflow template to establish integration between platforms
     * 
     * @param {string} templateId - ID of the template to apply
     * @param {string} userId - User ID
     * @param {object} params - Template parameters
     * @returns {Promise} - Result of applying the template
     */
    async applyWorkflowTemplate(templateId, userId, params = {}) {
        const templates = {
            'research': {
                description: 'Research workflow - Text analysis to visual refinement',
                setup: async () => {
                    // Set up research workflow between platforms
                    const { infraContext, myMapId, apiKey } = params;

                    if (!infraContext || !myMapId || !apiKey) {
                        throw new Error('Missing required parameters for research template');
                    }

                    // Export initial data to MyMap
                    const exportResult = await this.platformIntegration.exportToMyMap(
                        await this._getGraphData(userId, infraContext),
                        userId,
                        apiKey
                    );

                    // Set up sync with research-specific options
                    const syncId = this.startSync(userId, infraContext, myMapId, apiKey, {
                        direction: 'bidirectional',
                        interval: 600000, // 10 minutes
                        transformOptions: {
                            preserveLayout: true,
                            includeMetadata: true,
                            preserveNodeTypes: true
                        }
                    });

                    return {
                        syncId,
                        exportResult,
                        templateId: 'research'
                    };
                }
            },
            'content-creation': {
                description: 'Content creation workflow - Visual mapping to text analysis',
                setup: async () => {
                    // Set up content creation workflow
                    const { infraContext, myMapId, apiKey } = params;

                    if (!infraContext || !myMapId || !apiKey) {
                        throw new Error('Missing required parameters for content-creation template');
                    }

                    // Import initial data from MyMap
                    const importResult = await this.platformIntegration.importFromMyMap(
                        myMapId,
                        userId,
                        infraContext,
                        apiKey
                    );

                    // Set up sync with content creation specific options
                    const syncId = this.startSync(userId, infraContext, myMapId, apiKey, {
                        direction: 'to-infranodus', // primarily import from visual to text
                        interval: 300000, // 5 minutes
                        transformOptions: {
                            extractKeywords: true,
                            generateStatements: true,
                            preserveHierarchy: true
                        }
                    });

                    return {
                        syncId,
                        importResult,
                        templateId: 'content-creation'
                    };
                }
            },
            'collaborative': {
                description: 'Collaborative knowledge building across platforms',
                setup: async () => {
                    // Set up collaborative workflow
                    const { infraContext, myMapId, apiKey, collaborators } = params;

                    if (!infraContext || !myMapId || !apiKey || !collaborators) {
                        throw new Error('Missing required parameters for collaborative template');
                    }

                    // Bidirectional sync with collaborative options
                    const syncId = this.startSync(userId, infraContext, myMapId, apiKey, {
                        direction: 'bidirectional',
                        interval: 60000, // 1 minute (more frequent for collaboration)
                        autoResolveConflicts: false, // Manual conflict resolution for collaborative work
                        transformOptions: {
                            preserveAuthorship: true,
                            trackChanges: true,
                            includeComments: true
                        }
                    });

                    // Register webhooks for collaboration events
                    const webhookIds = [];
                    for (const collaborator of collaborators) {
                        if (collaborator.webhookUrl) {
                            const webhookId = this.registerWebhook(userId, infraContext, collaborator.webhookUrl, {
                                events: ['change', 'conflict', 'comment', 'sync'],
                                includeData: true,
                                notifyUser: collaborator.id
                            });
                            webhookIds.push(webhookId);
                        }
                    }

                    return {
                        syncId,
                        webhookIds,
                        templateId: 'collaborative'
                    };
                }
            }
        };

        if (!templates[templateId]) {
            throw new Error(`Unknown workflow template: ${templateId}`);
        }

        logger.info(`Applying workflow template '${templateId}' for user ${userId}`);
        return await templates[templateId].setup();
    }

    /**
     * Get advanced export options
     * 
     * @returns {object} - Available export options and settings
     */
    getExportOptions() {
        return {
            preserveLayout: {
                description: 'Maintain the visual layout from InfraNodus',
                type: 'boolean',
                default: true
            },
            includeMetadata: {
                description: 'Include additional metadata with nodes and edges',
                type: 'boolean',
                default: true
            },
            nodeFilters: {
                description: 'Filter nodes based on criteria',
                type: 'object',
                properties: {
                    minWeight: {
                        description: 'Minimum node weight to include',
                        type: 'number',
                        default: 0
                    },
                    communities: {
                        description: 'Include only specific communities',
                        type: 'array',
                        default: []
                    },
                    nodeTypes: {
                        description: 'Include only specific node types',
                        type: 'array',
                        default: []
                    }
                }
            },
            edgeFilters: {
                description: 'Filter edges based on criteria',
                type: 'object',
                properties: {
                    minWeight: {
                        description: 'Minimum edge weight to include',
                        type: 'number',
                        default: 0
                    }
                }
            },
            transformations: {
                description: 'Apply transformations to the graph',
                type: 'object',
                properties: {
                    simplify: {
                        description: 'Simplify the graph by merging similar nodes',
                        type: 'boolean',
                        default: false
                    },
                    normalize: {
                        description: 'Normalize node/edge weights',
                        type: 'boolean',
                        default: false
                    }
                }
            }
        };
    }

    /**
     * Get available workflow templates
     * 
     * @returns {object} - Available templates and their descriptions
     */
    getWorkflowTemplates() {
        return {
            'research': {
                name: 'Research Workflow',
                description: 'Optimized for research projects: text analysis to visual refinement',
                parameters: ['infraContext', 'myMapId', 'apiKey']
            },
            'content-creation': {
                name: 'Content Creation',
                description: 'Designed for content creators: visual mapping to text analysis',
                parameters: ['infraContext', 'myMapId', 'apiKey']
            },
            'collaborative': {
                name: 'Collaborative Knowledge Building',
                description: 'Real-time collaboration across platforms with change tracking',
                parameters: ['infraContext', 'myMapId', 'apiKey', 'collaborators']
            }
        };
    }

    /**
     * Perform synchronization between platforms
     * 
     * @private
     * @param {string} userId - User ID
     * @param {string} infraContext - InfraNodus context
     * @param {string} myMapId - MyMap ID
     * @param {string} apiKey - MyMap API key
     * @param {object} syncOptions - Sync options
     * @param {object} syncState - Current sync state
     */
    async _performSync(userId, infraContext, myMapId, apiKey, syncOptions, syncState) {
        logger.info(`Performing ${syncOptions.direction} sync for ${userId}: ${infraContext} ↔ ${myMapId}`);

        // Track changes and conflicts
        const changes = {
            toInfraNodus: [],
            toMyMap: [],
            conflicts: []
        };

        // Bidirectional or to-mymap: Export from InfraNodus to MyMap
        if (syncOptions.direction === 'bidirectional' || syncOptions.direction === 'to-mymap') {
            // Get changes from InfraNodus since last sync
            const infraGraph = await this._getGraphData(userId, infraContext, {
                sinceTimestamp: syncState.lastInfraUpdate
            });

            if (infraGraph.nodes.length > 0 || infraGraph.edges.length > 0) {
                // Export changes to MyMap
                await this.platformIntegration.exportToMyMap(
                    infraGraph,
                    userId,
                    apiKey
                );

                changes.toMyMap = infraGraph.nodes.length + infraGraph.edges.length;
                syncState.lastInfraUpdate = new Date().toISOString();
            }
        }

        // Bidirectional or to-infranodus: Import from MyMap to InfraNodus
        if (syncOptions.direction === 'bidirectional' || syncOptions.direction === 'to-infranodus') {
            // Get changes from MyMap since last sync
            const myMapChanges = await this._getMyMapChanges(
                myMapId,
                apiKey,
                syncState.lastMyMapUpdate
            );

            if (myMapChanges.nodes.length > 0 || myMapChanges.edges.length > 0) {
                // Transform and import to InfraNodus
                const importData = await this.platformIntegration.importFromMyMap(
                    myMapId,
                    userId,
                    infraContext,
                    apiKey
                );

                changes.toInfraNodus = importData.nodes.length + importData.statements.length;
                syncState.lastMyMapUpdate = new Date().toISOString();
            }
        }

        // If there were conflicts and auto-resolve is disabled, store them
        if (changes.conflicts.length > 0 && !syncOptions.autoResolveConflicts) {
            syncState.conflicts = [...syncState.conflicts, ...changes.conflicts];
        }

        return changes;
    }

    /**
     * Get graph data from InfraNodus
     * 
     * @private
     * @param {string} userId - User ID
     * @param {string} context - Context to get graph from
     * @param {object} options - Options for retrieving graph
     * @returns {Promise<Object>} - Graph data
     */
    async _getGraphData(userId, context, options = {}) {
        // This is a simplified implementation - the actual implementation would
        // use the Entry model to get the graph data
        // For now, we'll assume it's implemented elsewhere

        // Placeholder implementation - would be integrated with Entry model
        return {
            nodes: [],
            edges: [],
            contextName: context
        };
    }

    /**
     * Get changes from MyMap since a specific time
     * 
     * @private
     * @param {string} myMapId - MyMap ID
     * @param {string} apiKey - API key
     * @param {string} sinceTimestamp - Only get changes since this timestamp
     * @returns {Promise<Object>} - Changes data
     */
    async _getMyMapChanges(myMapId, apiKey, sinceTimestamp) {
        // This would make an API call to MyMap to get changes
        // For now, return a placeholder
        return {
            nodes: [],
            edges: []
        };
    }

    /**
     * Send webhook notification
     * 
     * @private
     * @param {string} webhookId - ID of webhook to call
     * @param {string} event - Event name
     * @param {object} data - Event data
     */
    async _sendWebhookNotification(webhookId, event, data) {
        const webhook = this.webhooks.get(webhookId);

        if (!webhook) {
            return;
        }

        try {
            // Only include webhook events that are registered
            if (!webhook.options.events.includes(event)) {
                return;
            }

            // Prepare payload
            const payload = {
                event,
                timestamp: new Date().toISOString(),
                userId: webhook.userId,
                infraContext: webhook.infraContext,
                ...data
            };

            // Only include full data if configured
            if (!webhook.options.includeData) {
                delete payload.data;
            }

            // Send webhook request
            await request({
                method: 'POST',
                uri: webhook.webhookUrl,
                headers: {
                    'Content-Type': 'application/json',
                    ...webhook.options.headers
                },
                body: payload,
                json: true,
                timeout: 10000 // 10s timeout
            });

            logger.debug(`Webhook ${webhookId} sent for event ${event}`);

        } catch (error) {
            logger.error(`Failed to send webhook ${webhookId}: ${error.message}`);
        }
    }
}

// Export singleton instance with default options
const enhancedIntegration = new EnhancedIntegration();

// Export events for listening from other parts of the application
const events = integrationEvents;

module.exports = {
    enhancedIntegration,
    EnhancedIntegration,
    events
};
