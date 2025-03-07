/**
 * MomentumEngine - Track and accelerate knowledge graph growth momentum
 * 
 * This system identifies high-growth areas of knowledge graphs and
 * helps users maintain unstoppable momentum in their thinking and
 * knowledge development.
 */

const logger = require('../log/logger');
const EventEmitter = require('events');
const { knowledgeExpansion } = require('./knowledgeExpansion');

class MomentumEngine {
    constructor(options = {}) {
        this.options = {
            momentumThreshold: options.momentumThreshold || 0.7, // Threshold to identify high-momentum areas
            decayRate: options.decayRate || 0.05, // Natural decay rate of momentum per day
            accelerationFactor: options.accelerationFactor || 1.5, // Multiplier for growth when accelerating
            momentumWindowDays: options.momentumWindowDays || 7, // Days to assess momentum
            updateIntervalHours: options.updateIntervalHours || 24, // How often to update momentum metrics
            ...options
        };

        this.events = new EventEmitter();
        this.userMomentum = new Map(); // Track momentum per user
        this.contextMomentum = new Map(); // Track momentum per context
        this.nodeMomentum = new Map(); // Track momentum per node
        this.momentumReinforcements = new Map(); // Track active reinforcement jobs
        this.expansionSubscriptions = new Map(); // Track subscriptions to KnowledgeExpansion events
    }

    /**
     * Initialize momentum tracking for a user or context
     * 
     * @param {string} userId - User ID
     * @param {string} contextName - Optional context name (if null, tracks user's overall momentum)
     * @returns {object} - Initial momentum state
     */
    initializeMomentum(userId, contextName = null) {
        const key = this._createKey(userId, contextName);
        const existingMomentum = this._getMomentumState(key);

        if (existingMomentum) {
            return existingMomentum;
        }

        const now = new Date();
        const newMomentum = {
            userId,
            contextName,
            currentMomentum: 0,
            momentumHistory: [],
            growthSpikes: [],
            lastActivity: now,
            createdAt: now,
            updatedAt: now,
            predictionModel: null,
            insights: [],
            accelerationStrategies: []
        };

        if (contextName) {
            this.contextMomentum.set(key, newMomentum);
        } else {
            this.userMomentum.set(userId, newMomentum);
        }

        logger.info(`Initialized momentum tracking for ${contextName ? `context ${contextName}` : `user ${userId}`}`);
        return newMomentum;
    }

    /**
     * Record activity that contributes to momentum
     * 
     * @param {string} userId - User ID
     * @param {string} contextName - Context name
     * @param {string} activityType - Type of activity (node, edge, insight, etc.)
     * @param {object} data - Activity data
     * @returns {object} - Updated momentum state
     */
    recordActivity(userId, contextName, activityType, data = {}) {
        const contextKey = this._createKey(userId, contextName);
        const userKey = userId;

        // Get or initialize momentum states
        const contextMomentumState = this._getMomentumState(contextKey) ||
            this.initializeMomentum(userId, contextName);
        const userMomentumState = this._getMomentumState(userKey) ||
            this.initializeMomentum(userId);

        const now = new Date();
        const activity = {
            type: activityType,
            timestamp: now,
            data: this._sanitizeActivityData(data),
            impact: this._calculateActivityImpact(activityType, data)
        };

        // Update context momentum
        contextMomentumState.currentMomentum += activity.impact;
        contextMomentumState.momentumHistory.push({
            timestamp: now,
            momentum: contextMomentumState.currentMomentum,
            activity: {
                type: activityType,
                impact: activity.impact
            }
        });
        contextMomentumState.lastActivity = now;
        contextMomentumState.updatedAt = now;

        // Update user momentum (with reduced impact)
        userMomentumState.currentMomentum += activity.impact * 0.5; // Less impact on overall user momentum
        userMomentumState.momentumHistory.push({
            timestamp: now,
            momentum: userMomentumState.currentMomentum,
            activity: {
                type: activityType,
                impact: activity.impact * 0.5,
                context: contextName
            }
        });
        userMomentumState.lastActivity = now;
        userMomentumState.updatedAt = now;

        // If node activity, update node momentum
        if (activityType === 'node' && data.nodeId) {
            this._updateNodeMomentum(data.nodeId, activity.impact);
        }

        // Check if we've hit momentum threshold and should trigger acceleration
        if (contextMomentumState.currentMomentum > this.options.momentumThreshold &&
            !this.momentumReinforcements.has(contextKey)) {
            this._triggerMomentumAcceleration(userId, contextName, contextMomentumState.currentMomentum);
        }

        // Clean up old history entries
        this._pruneOldMomentumHistory(contextMomentumState);
        this._pruneOldMomentumHistory(userMomentumState);

        // Save updates
        this.contextMomentum.set(contextKey, contextMomentumState);
        this.userMomentum.set(userKey, userMomentumState);

        // Emit events
        this.events.emit('momentumChanged', {
            userId,
            contextName,
            momentum: contextMomentumState.currentMomentum,
            activityType
        });

        return contextMomentumState;
    }

    /**
     * Get a user's current momentum
     * 
     * @param {string} userId - User ID
     * @param {string} contextName - Optional context name
     * @returns {object} - Current momentum state
     */
    getMomentum(userId, contextName = null) {
        const key = this._createKey(userId, contextName);
        const momentumState = this._getMomentumState(key);

        if (!momentumState) {
            return null;
        }

        // Apply natural decay based on time since last update
        const decayedState = this._applyMomentumDecay(momentumState);

        // Store the decayed state
        if (contextName) {
            this.contextMomentum.set(key, decayedState);
        } else {
            this.userMomentum.set(userId, decayedState);
        }

        return decayedState;
    }

    /**
     * Get hot spots with the highest momentum in a context or for a user
     * 
     * @param {string} userId - User ID
     * @param {string} contextName - Optional context name
     * @param {number} limit - Maximum number of hot spots to return
     * @returns {Array} - List of high-momentum areas
     */
    getHotSpots(userId, contextName = null, limit = 5) {
        // Gather hotspots based on node momentum
        const hotspots = [];

        // If a specific context is provided, get only nodes from that context
        if (contextName) {
            const contextNodes = Array.from(this.nodeMomentum.entries())
                .filter(([nodeId, data]) => data.contextName === contextName && data.userId === userId)
                .sort((a, b) => b[1].momentum - a[1].momentum)
                .slice(0, limit)
                .map(([nodeId, data]) => ({
                    nodeId,
                    momentum: data.momentum,
                    name: data.name || nodeId,
                    lastActive: data.lastActivity,
                    growthRate: data.growthRate || 0
                }));

            hotspots.push(...contextNodes);
        } else {
            // Get user's top nodes across all contexts
            const userNodes = Array.from(this.nodeMomentum.entries())
                .filter(([nodeId, data]) => data.userId === userId)
                .sort((a, b) => b[1].momentum - a[1].momentum)
                .slice(0, limit)
                .map(([nodeId, data]) => ({
                    nodeId,
                    contextName: data.contextName,
                    momentum: data.momentum,
                    name: data.name || nodeId,
                    lastActive: data.lastActivity,
                    growthRate: data.growthRate || 0
                }));

            hotspots.push(...userNodes);

            // Also add hot contexts
            const hotContexts = Array.from(this.contextMomentum.entries())
                .filter(([key, data]) => data.userId === userId)
                .sort((a, b) => b[1].currentMomentum - a[1].currentMomentum)
                .slice(0, Math.floor(limit / 2))
                .map(([key, data]) => ({
                    type: 'context',
                    contextName: data.contextName,
                    momentum: data.currentMomentum,
                    lastActive: data.lastActivity,
                    growthRate: this._calculateGrowthRate(data.momentumHistory)
                }));

            hotspots.push(...hotContexts);
        }

        return hotspots.sort((a, b) => b.momentum - a.momentum).slice(0, limit);
    }

    /**
     * Get momentum acceleration strategies for a context
     * 
     * @param {string} userId - User ID
     * @param {string} contextName - Context name
     * @returns {Array} - List of recommended acceleration strategies
     */
    getAccelerationStrategies(userId, contextName) {
        const momentum = this.getMomentum(userId, contextName);
        if (!momentum || momentum.currentMomentum < 0.2) {
            return [{
                type: 'expansion',
                description: 'Start building momentum by expanding your graph with more concepts',
                action: 'add_nodes',
                priority: 'high'
            }];
        }

        // Analyze current momentum state to generate strategies
        const strategies = [];

        // Check for stagnation in high-momentum contexts
        if (momentum.currentMomentum > 0.7 && this._calculateGrowthRate(momentum.momentumHistory) < 0.1) {
            strategies.push({
                type: 'divergence',
                description: 'Break through stagnation by exploring less-connected areas of your graph',
                action: 'explore_periphery',
                priority: 'high'
            });
        }

        // Check for good growth that could be accelerated
        if (momentum.currentMomentum > 0.4 && this._calculateGrowthRate(momentum.momentumHistory) > 0.2) {
            strategies.push({
                type: 'acceleration',
                description: 'Your graph has good momentum! Use AI expansion to accelerate even faster',
                action: 'ai_expansion',
                priority: 'medium'
            });
        }

        // Check for extremely high momentum that could benefit from structure
        if (momentum.currentMomentum > 0.9) {
            strategies.push({
                type: 'consolidation',
                description: 'Identify emerging patterns in your rapidly growing graph',
                action: 'find_patterns',
                priority: 'medium'
            });
        }

        // Add collaboration strategy if momentum is good enough to benefit from it
        if (momentum.currentMomentum > 0.5) {
            strategies.push({
                type: 'collaboration',
                description: 'Invite collaborators to accelerate knowledge growth',
                action: 'invite_collaborators',
                priority: 'medium'
            });
        }

        // Always provide a reinforcement strategy
        strategies.push({
            type: 'reinforcement',
            description: 'Strengthen existing connections to maintain momentum',
            action: 'reinforce_connections',
            priority: 'low'
        });

        return strategies;
    }

    /**
     * Start automatic momentum acceleration
     * 
     * @param {string} userId - User ID
     * @param {string} contextName - Context name
     * @param {Array} strategies - Strategies to use for acceleration
     * @returns {string} - Acceleration job ID
     */
    startAcceleration(userId, contextName, strategies = ['ai_expansion', 'reinforcement']) {
        const momentumState = this.getMomentum(userId, contextName);
        if (!momentumState) {
            throw new Error(`No momentum data for ${contextName}`);
        }

        const jobId = `momentum-${userId}-${contextName}-${Date.now()}`;

        // Create acceleration job
        const accelerationJob = {
            jobId,
            userId,
            contextName,
            startMomentum: momentumState.currentMomentum,
            currentMomentum: momentumState.currentMomentum,
            strategies,
            status: 'starting',
            phase: 'preparation',
            startTime: new Date(),
            lastUpdate: new Date(),
            results: {
                nodesAdded: 0,
                edgesAdded: 0,
                insightsGenerated: 0
            }
        };

        this.momentumReinforcements.set(jobId, accelerationJob);

        // Start the acceleration process asynchronously
        this._executeAccelerationJob(jobId).catch(error => {
            logger.error(`Error in momentum acceleration job ${jobId}: ${error.message}`);
            const job = this.momentumReinforcements.get(jobId);
            if (job) {
                job.status = 'failed';
                job.error = error.message;
                job.lastUpdate = new Date();
            }
        });

        return jobId;
    }

    /**
     * Get status of an acceleration job
     * 
     * @param {string} jobId - Acceleration job ID
     * @returns {object} - Job status
     */
    getAccelerationStatus(jobId) {
        const job = this.momentumReinforcements.get(jobId);
        if (!job) {
            throw new Error(`Acceleration job not found: ${jobId}`);
        }

        return {
            jobId: job.jobId,
            userId: job.userId,
            contextName: job.contextName,
            status: job.status,
            phase: job.phase,
            startMomentum: job.startMomentum,
            currentMomentum: job.currentMomentum,
            progress: job.progress || 0,
            results: job.results,
            startTime: job.startTime,
            lastUpdate: job.lastUpdate,
            error: job.error
        };
    }

    /**
     * Stop an acceleration job
     * 
     * @param {string} jobId - Acceleration job ID
     * @returns {boolean} - Whether the job was successfully stopped
     */
    stopAcceleration(jobId) {
        const job = this.momentumReinforcements.get(jobId);
        if (!job) {
            return false;
        }

        if (job.status === 'completed' || job.status === 'failed') {
            return false;
        }

        job.status = 'stopping';
        job.lastUpdate = new Date();

        // Actual cancellation will happen in the job execution loop
        return true;
    }

    /**
     * Subscribe to KnowledgeExpansion events
     * 
     * @private
     */
    _subscribeToExpansionEvents() {
        if (this.expansionSubscribed) {
            return;
        }

        // Listen for expansion progress to update momentum
        knowledgeExpansion.events.on('expansionProgress', (data) => {
            const { jobId, generatedNodes, generatedConnections } = data;

            // Find the acceleration job associated with this expansion
            const accelerationJob = Array.from(this.momentumReinforcements.values())
                .find(job => job.expansionJobId === jobId);

            if (accelerationJob) {
                // Record the generated nodes and connections
                accelerationJob.results.nodesAdded = generatedNodes;
                accelerationJob.results.edgesAdded = generatedConnections;

                // Update momentum based on new nodes and connections
                const momentum = this.getMomentum(accelerationJob.userId, accelerationJob.contextName);
                if (momentum) {
                    // Increase momentum based on AI-generated content (with lower impact per item)
                    const nodeImpact = 0.05; // Lower than manual node creation
                    const newNodesMomentum = (generatedNodes - (accelerationJob.lastNodeCount || 0)) * nodeImpact;

                    const edgeImpact = 0.03; // Lower than manual edge creation
                    const newEdgesMomentum = (generatedConnections - (accelerationJob.lastEdgeCount || 0)) * edgeImpact;

                    if (newNodesMomentum > 0 || newEdgesMomentum > 0) {
                        this.recordActivity(
                            accelerationJob.userId,
                            accelerationJob.contextName,
                            'ai_expansion',
                            {
                                expansionJobId: jobId,
                                nodesAdded: generatedNodes - (accelerationJob.lastNodeCount || 0),
                                edgesAdded: generatedConnections - (accelerationJob.lastEdgeCount || 0)
                            }
                        );
                    }

                    // Update the job
                    accelerationJob.lastNodeCount = generatedNodes;
                    accelerationJob.lastEdgeCount = generatedConnections;
                    accelerationJob.lastUpdate = new Date();
                }
            }
        });

        // Listen for expansion completion
        knowledgeExpansion.events.on('expansionCompleted', (data) => {
            const { jobId, results } = data;

            // Find the acceleration job associated with this expansion
            const accelerationJob = Array.from(this.momentumReinforcements.values())
                .find(job => job.expansionJobId === jobId);

            if (accelerationJob) {
                // Move to the next phase
                accelerationJob.phase = 'reinforcement';
                accelerationJob.lastUpdate = new Date();

                // Move forward with the acceleration job
                this._continueAccelerationJob(accelerationJob.jobId);
            }
        });

        this.expansionSubscribed = true;
    }

    /**
     * Calculate impact score for different activity types
     * 
     * @private
     * @param {string} activityType - Type of activity
     * @param {object} data - Activity data
     * @returns {number} - Impact score
     */
    _calculateActivityImpact(activityType, data) {
        // Different activities have different impacts on momentum
        const baseImpacts = {
            'node': 0.1,
            'edge': 0.15,
            'statement': 0.2,
            'insight': 0.25,
            'import': 0.1,
            'export': 0.05,
            'share': 0.2,
            'ai_expansion': 0.02, // Per node/edge, applied in bulk
            'collaborative_edit': 0.12,
            'comment': 0.08
        };

        const impact = baseImpacts[activityType] || 0.1;

        // Apply modifiers based on data
        let modifiedImpact = impact;

        // More complex nodes/edges have more impact
        if (data.complexity && ['node', 'edge', 'statement'].includes(activityType)) {
            modifiedImpact *= (1 + data.complexity * 0.5); // Up to 50% more impact for complex items
        }

        // Connecting previously unconnected clusters has high impact
        if (data.bridgesFactor && activityType === 'edge') {
            modifiedImpact *= (1 + data.bridgesFactor);
        }

        return modifiedImpact;
    }

    /**
     * Create a key for storing momentum data
     * 
     * @private
     * @param {string} userId - User ID
     * @param {string} contextName - Optional context name
     * @returns {string} - Storage key
     */
    _createKey(userId, contextName) {
        return contextName ? `${userId}:${contextName}` : userId;
    }

    /**
     * Get momentum state by key
     * 
     * @private
     * @param {string} key - Storage key
     * @returns {object|null} - Momentum state or null if not found
     */
    _getMomentumState(key) {
        if (this.userMomentum.has(key)) {
            return this.userMomentum.get(key);
        }

        if (this.contextMomentum.has(key)) {
            return this.contextMomentum.get(key);
        }

        return null;
    }

    /**
     * Update momentum for a specific node
     * 
     * @private
     * @param {string} nodeId - Node ID
     * @param {number} impact - Activity impact to add
     */
    _updateNodeMomentum(nodeId, impact) {
        let nodeMomentumData = this.nodeMomentum.get(nodeId);

        if (!nodeMomentumData) {
            // Initialize node momentum
            nodeMomentumData = {
                nodeId,
                momentum: 0,
                momentumHistory: [],
                lastActivity: new Date(),
                createdAt: new Date()
            };
        }

        // Update momentum
        nodeMomentumData.momentum += impact;
        nodeMomentumData.momentumHistory.push({
            timestamp: new Date(),
            momentum: nodeMomentumData.momentum,
            impact
        });

        // Update timestamps
        nodeMomentumData.lastActivity = new Date();

        // Calculate growth rate
        nodeMomentumData.growthRate = this._calculateGrowthRate(nodeMomentumData.momentumHistory);

        // Store updated data
        this.nodeMomentum.set(nodeId, nodeMomentumData);
    }

    /**
     * Apply natural decay to momentum based on time since last activity
     * 
     * @private
     * @param {object} momentumState - Momentum state to update
     * @returns {object} - Updated momentum state with decay applied
     */
    _applyMomentumDecay(momentumState) {
        const now = new Date();
        const daysSinceLastActivity = (now - new Date(momentumState.lastActivity)) / (1000 * 60 * 60 * 24);

        // Apply decay
        if (daysSinceLastActivity > 0) {
            // Daily compounding decay
            const decayFactor = Math.pow(1 - this.options.decayRate, daysSinceLastActivity);
            momentumState.currentMomentum *= decayFactor;

            // Add a decay point in history
            momentumState.momentumHistory.push({
                timestamp: now,
                momentum: momentumState.currentMomentum,
                decay: true
            });

            momentumState.updatedAt = now;
        }

        return momentumState;
    }

    /**
     * Calculate growth rate from momentum history
     * 
     * @private
     * @param {Array} history - Momentum history entries
     * @returns {number} - Growth rate (-1 to 1, where positive values indicate growth)
     */
    _calculateGrowthRate(history) {
        if (!history || history.length < 2) {
            return 0;
        }

        // Get history within window period
        const now = new Date();
        const windowStartTime = new Date(now - this.options.momentumWindowDays * 24 * 60 * 60 * 1000);

        const relevantHistory = history.filter(entry => new Date(entry.timestamp) >= windowStartTime)
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        if (relevantHistory.length < 2) {
            return 0;
        }

        // Calculate rate of change
        const firstEntry = relevantHistory[0];
        const lastEntry = relevantHistory[relevantHistory.length - 1];

        const momentumChange = lastEntry.momentum - firstEntry.momentum;
        const timeSpanDays = (new Date(lastEntry.timestamp) - new Date(firstEntry.timestamp)) / (1000 * 60 * 60 * 24);

        // Normalize by time and initial momentum to get daily percentage change
        const rateOfChange = timeSpanDays > 0 ?
            (momentumChange / (timeSpanDays * Math.max(0.1, firstEntry.momentum))) : 0;

        // Clamp between -1 and 1
        return Math.max(-1, Math.min(1, rateOfChange));
    }

    /**
     * Prune old momentum history entries
     * 
     * @private
     * @param {object} momentumState - Momentum state to update
     * @returns {object} - Updated momentum state
     */
    _pruneOldMomentumHistory(momentumState) {
        if (!momentumState.momentumHistory) {
            return momentumState;
        }

        // Keep recent history + key history points
        const now = new Date();
        const keepAfterTime = new Date(now - this.options.momentumWindowDays * 2 * 24 * 60 * 60 * 1000);

        const recentHistory = momentumState.momentumHistory.filter(entry =>
            new Date(entry.timestamp) >= keepAfterTime
        );

        // Also keep some distributed samples from older history
        const olderHistory = momentumState.momentumHistory.filter(entry =>
            new Date(entry.timestamp) < keepAfterTime
        );

        // Keep major growth spikes and one entry per previous window
        const keyOldEntries = [];
        if (olderHistory.length > 0) {
            // Add first and last entries
            keyOldEntries.push(olderHistory[0]);
            keyOldEntries.push(olderHistory[olderHistory.length - 1]);

            // Find significant growth spikes
            const growthSpikes = olderHistory.filter((entry, i, arr) => {
                if (i === 0 || i === arr.length - 1) return false;
                const prev = arr[i - 1];
                const next = arr[i + 1];
                const growth = entry.momentum - prev.momentum;
                const growthRate = growth / prev.momentum;
                return growthRate > 0.2; // 20% growth spike
            });

            keyOldEntries.push(...growthSpikes);

            // Sample one entry per previous window
            const prevWindowSizeMs = this.options.momentumWindowDays * 24 * 60 * 60 * 1000;
            let currentWindowStart = keepAfterTime.getTime() - prevWindowSizeMs;

            while (currentWindowStart > olderHistory[0].timestamp) {
                const windowEntries = olderHistory.filter(entry => {
                    const time = new Date(entry.timestamp).getTime();
                    return time >= currentWindowStart && time < (currentWindowStart + prevWindowSizeMs);
                });

                if (windowEntries.length > 0) {
                    // Take the middle entry from this window
                    const midEntry = windowEntries[Math.floor(windowEntries.length / 2)];
                    keyOldEntries.push(midEntry);
                }

                currentWindowStart -= prevWindowSizeMs;
            }
        }

        // Combine recent history with key older entries, removing duplicates
        const seenTimestamps = new Set();
        const combinedHistory = [];

        const addUniqueEntry = (entry) => {
            const timestamp = new Date(entry.timestamp).getTime();
            if (!seenTimestamps.has(timestamp)) {
                seenTimestamps.add(timestamp);
                combinedHistory.push(entry);
            }
        };

        recentHistory.forEach(addUniqueEntry);
        keyOldEntries.forEach(addUniqueEntry);

        // Sort by timestamp
        combinedHistory.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        // Update momentum state
        momentumState.momentumHistory = combinedHistory;
        return momentumState;
    }

    /**
     * Clean up activity data to prevent storing unnecessary info
     * 
     * @private
     * @param {object} data - Activity data to clean
     * @returns {object} - Cleaned data
     */
    _sanitizeActivityData(data) {
        // Create a shallow copy
        const cleanData = { ...data };

        // Remove any large objects or sensitive information
        delete cleanData.fullContent;
        delete cleanData.rawResponse;
        delete cleanData.token;
        delete cleanData.auth;

        return cleanData;
    }

    /**
     * Trigger momentum acceleration when threshold is reached
     * 
     * @private
     * @param {string} userId - User ID
     * @param {string} contextName - Context name
     * @param {number} currentMomentum - Current momentum value
     */
    _triggerMomentumAcceleration(userId, contextName, currentMomentum) {
        logger.info(`Triggering momentum acceleration for ${userId}:${contextName} (momentum: ${currentMomentum})`);

        // Determine optimal acceleration strategies based on current state
        const recommendedStrategies = this.getAccelerationStrategies(userId, contextName)
            .filter(strategy => strategy.priority === 'high')
            .map(strategy => strategy.action);

        // Start acceleration job
        const jobId = this.startAcceleration(userId, contextName, recommendedStrategies);

        // Emit event
        this.events.emit('momentumAccelerationTriggered', {
            userId,
            contextName,
            momentum: currentMomentum,
            jobId
        });
    }

    /**
     * Execute an acceleration job
     * 
     * @private
     * @param {string} jobId - Acceleration job ID
     */
    async _executeAccelerationJob(jobId) {
        const job = this.momentumReinforcements.get(jobId);
        if (!job) {
            throw new Error(`Acceleration job not found: ${jobId}`);
        }

        try {
            // Execute each strategy in sequence
            for (const strategy of job.strategies) {
                if (job.status === 'stopping') {
                    job.status = 'stopped';
                    job.lastUpdate = new Date();
                    return;
                }

                job.phase = strategy;
                job.lastUpdate = new Date();

                switch (strategy) {
                    case 'ai_expansion':
                        await this._executeAIExpansion(job);
                        break;
                    case 'reinforcement':
                        await this._executeReinforcement(job);
                        break;
                    default:
                        throw new Error(`Unknown acceleration strategy: ${strategy}`);
                }
            }

            job.status = 'completed';
            job.lastUpdate = new Date();
        } catch (error) {
            job.status = 'failed';
            job.error = error.message;
            job.lastUpdate = new Date();
            throw error;
        }
    }

    /**
     * Execute AI expansion strategy
     * 
     * @private
     * @param {object} job - Acceleration job
     */
    async _executeAIExpansion(job) {
        // Simulate AI expansion process
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Update job results
        job.results.nodesAdded += 10;
        job.results.edgesAdded += 5;
        job.results.insightsGenerated += 2;

        // Update momentum
        this.recordActivity(job.userId, job.contextName, 'ai_expansion', {
            nodesAdded: 10,
            edgesAdded: 5,
            insightsGenerated: 2
        });

        job.lastUpdate = new Date();
    }

    /**
     * Execute reinforcement strategy
     * 
     * @private
     * @param {object} job - Acceleration job
     */
    async _executeReinforcement(job) {
        // Simulate reinforcement process
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Update job results
        job.results.nodesAdded += 5;
        job.results.edgesAdded += 10;
        job.results.insightsGenerated += 1;

        // Update momentum
        this.recordActivity(job.userId, job.contextName, 'reinforcement', {
            nodesAdded: 5,
            edgesAdded: 10,
            insightsGenerated: 1
        });

        job.lastUpdate = new Date();
    }

    /**
     * Continue an acceleration job after a phase is completed
     * 
     * @private
     * @param {string} jobId - Acceleration job ID
     */
    _continueAccelerationJob(jobId) {
        const job = this.momentumReinforcements.get(jobId);
        if (!job) {
            throw new Error(`Acceleration job not found: ${jobId}`);
        }

        // Move to the next strategy
        const nextStrategyIndex = job.strategies.indexOf(job.phase) + 1;
        if (nextStrategyIndex < job.strategies.length) {
            job.phase = job.strategies[nextStrategyIndex];
            job.lastUpdate = new Date();

            // Continue the job asynchronously
            this._executeAccelerationJob(jobId).catch(error => {
                logger.error(`Error in momentum acceleration job ${jobId}: ${error.message}`);
                job.status = 'failed';
                job.error = error.message;
                job.lastUpdate = new Date();
            });
        } else {
            job.status = 'completed';
            job.lastUpdate = new Date();
        }
    }

    /**
     * Configure adaptive thresholds based on user activity
     * 
     * @param {object} options - Configuration options
     * @returns {object} - Updated options
     */
    configureAdaptiveThresholds(options = {}) {
        // Analyze current activity patterns across users
        const activityLevels = this._analyzeActivityLevels();

        // Adjust thresholds based on overall activity
        if (activityLevels.averageActivitiesPerDay > 100) {
            // High activity environment - more demanding thresholds
            this.options.momentumThreshold = 0.75;
            this.options.decayRate = 0.08;
        } else if (activityLevels.averageActivitiesPerDay < 10) {
            // Low activity environment - more lenient thresholds
            this.options.momentumThreshold = 0.6;
            this.options.decayRate = 0.03;
        }

        // Adjust window size based on activity frequency
        if (activityLevels.averageDaysBetweenActivities > 3) {
            // Infrequent activity pattern - use longer window
            this.options.momentumWindowDays = 14;
        } else if (activityLevels.averageDaysBetweenActivities < 0.5) {
            // Very frequent activity pattern - use shorter window
            this.options.momentumWindowDays = 3;
        }

        // Apply any explicit options
        Object.assign(this.options, options);

        logger.info(`Configured adaptive momentum thresholds: threshold=${this.options.momentumThreshold}, decay=${this.options.decayRate}, window=${this.options.momentumWindowDays}`);

        return this.options;
    }

    /**
     * Analyze user activity levels
     * 
     * @private
     * @returns {object} - Activity metrics
     */
    _analyzeActivityLevels() {
        const userActivities = new Map();
        let totalActivities = 0;
        let activeUsers = 0;

        // Count activities per user from momentum history
        for (const [userId, momentumState] of this.userMomentum.entries()) {
            const activities = momentumState.momentumHistory.length;
            userActivities.set(userId, activities);
            totalActivities += activities;

            if (activities > 0) activeUsers++;
        }

        // Calculate activity metrics
        const averageActivitiesPerUser = activeUsers > 0 ? totalActivities / activeUsers : 0;

        // Calculate average time between activities
        let totalTimeBetween = 0;
        let timeIntervalCount = 0;

        for (const [userId, momentumState] of this.userMomentum.entries()) {
            const history = momentumState.momentumHistory;

            for (let i = 1; i < history.length; i++) {
                const timeDiff = new Date(history[i].timestamp) - new Date(history[i - 1].timestamp);
                const daysDiff = timeDiff / (1000 * 60 * 60 * 24);

                if (daysDiff < 30) { // Ignore long gaps
                    totalTimeBetween += daysDiff;
                    timeIntervalCount++;
                }
            }
        }

        const averageDaysBetweenActivities = timeIntervalCount > 0 ?
            totalTimeBetween / timeIntervalCount : 7; // Default to 7 if no data

        // Calculate daily activity rate
        const now = new Date();
        const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

        let recentActivities = 0;

        for (const [userId, momentumState] of this.userMomentum.entries()) {
            recentActivities += momentumState.momentumHistory.filter(
                entry => new Date(entry.timestamp) >= thirtyDaysAgo
            ).length;
        }

        const averageActivitiesPerDay = recentActivities / 30;

        return {
            activeUsers,
            averageActivitiesPerUser,
            averageDaysBetweenActivities,
            averageActivitiesPerDay
        };
    }

    /**
     * Handle errors in momentum processing
     * 
     * @private
     * @param {Error} error - Error object
     * @param {string} userId - User ID
     * @param {string} contextName - Context name
     * @param {string} operation - Operation being performed
     */
    _handleMomentumError(error, userId, contextName, operation) {
        logger.error(`Momentum error during ${operation} for ${userId}${contextName ? `:${contextName}` : ''}: ${error.message}`, {
            userId,
            contextName,
            operation,
            stack: error.stack
        });

        // Attempt recovery
        try {
            const key = this._createKey(userId, contextName);
            const momentumState = this._getMomentumState(key);

            if (momentumState) {
                momentumState.error = {
                    message: error.message,
                    operation,
                    timestamp: new Date()
                };

                // Save the error state
                if (contextName) {
                    this.contextMomentum.set(key, momentumState);
                } else {
                    this.userMomentum.set(userId, momentumState);
                }
            }
        } catch (recoveryError) {
            logger.error(`Failed to recover from momentum error: ${recoveryError.message}`);
        }

        // Emit error event
        this.events.emit('momentumError', {
            userId,
            contextName,
            operation,
            error: error.message,
            timestamp: new Date()
        });
    }
}

module.exports = MomentumEngine;