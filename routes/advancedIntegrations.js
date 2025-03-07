/**
 * Advanced integration routes for more sophisticated platform integrations
 */

const { enhancedIntegration, events } = require('../lib/utils/enhancedIntegration');
const { platformIntegration } = require('../lib/utils/platformIntegration');
const Entry = require('../lib/entry');
const User = require('../lib/user');
const logger = require('../lib/log/logger');

/**
 * Render advanced integrations UI
 */
exports.renderAdvancedIntegrations = function (req, res, next) {
    if (!res.locals.user) {
        return res.redirect('/login');
    }

    // Get user's active integrations
    const activeSyncs = enhancedIntegration.getActiveSyncs(req.user.uid);

    // Get available workflows
    const workflowTemplates = enhancedIntegration.getWorkflowTemplates();

    // Get available contexts
    const contexts = res.locals.contextslist || [];

    res.render('advanced-integrations', {
        title: 'Advanced Platform Integrations',
        activeSyncs,
        workflowTemplates,
        contexts,
        exportOptions: enhancedIntegration.getExportOptions(),
        user: req.user,
        integrationActive: true
    });
};

/**
 * Start a new synchronization between platforms
 */
exports.startSync = async function (req, res, next) {
    if (!res.locals.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        const {
            infraContext,
            myMapId,
            direction = 'bidirectional',
            interval,
            autoResolveConflicts,
            transformOptions = {}
        } = req.body;

        // Get API key
        const apiKey = req.body.apiKey || req.user.settings?.mymap_api_key;

        if (!apiKey) {
            return res.status(400).json({ error: 'MyMap API key is required' });
        }

        if (!infraContext || !myMapId) {
            return res.status(400).json({ error: 'InfraNodus context and MyMap ID are required' });
        }

        // Start sync
        const syncId = enhancedIntegration.startSync(
            req.user.uid,
            infraContext,
            myMapId,
            apiKey,
            {
                direction,
                interval: interval ? parseInt(interval, 10) : undefined,
                autoResolveConflicts,
                transformOptions
            }
        );

        res.json({
            success: true,
            syncId,
            message: `Synchronization started between ${infraContext} and MyMap ${myMapId}`
        });

    } catch (error) {
        logger.error(`Failed to start sync: ${error.message}`, { userId: req.user.uid });
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * Stop an active synchronization
 */
exports.stopSync = function (req, res, next) {
    if (!res.locals.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        const { syncId } = req.params;

        if (!syncId) {
            return res.status(400).json({ error: 'Sync ID is required' });
        }

        // Check if this sync belongs to the user
        const activeSyncs = enhancedIntegration.getActiveSyncs(req.user.uid);
        const userSync = activeSyncs.find(sync => sync.syncId === syncId);

        if (!userSync) {
            return res.status(404).json({ error: 'Sync not found or not owned by user' });
        }

        // Stop the sync
        const stopped = enhancedIntegration.stopSync(syncId);

        res.json({
            success: stopped,
            message: stopped ? 'Synchronization stopped' : 'Failed to stop synchronization'
        });

    } catch (error) {
        logger.error(`Failed to stop sync: ${error.message}`, { userId: req.user.uid });
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * Get all active synchronizations for the user
 */
exports.getSyncs = function (req, res, next) {
    if (!res.locals.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        const activeSyncs = enhancedIntegration.getActiveSyncs(req.user.uid);

        res.json({
            success: true,
            syncs: activeSyncs
        });

    } catch (error) {
        logger.error(`Failed to get syncs: ${error.message}`, { userId: req.user.uid });
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * Apply a workflow template
 */
exports.applyWorkflowTemplate = async function (req, res, next) {
    if (!res.locals.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        const { templateId, params = {} } = req.body;

        if (!templateId) {
            return res.status(400).json({ error: 'Template ID is required' });
        }

        // Apply API key from user settings if not provided
        if (!params.apiKey) {
            params.apiKey = req.user.settings?.mymap_api_key;
        }

        if (!params.apiKey) {
            return res.status(400).json({ error: 'MyMap API key is required' });
        }

        // Apply the template
        const result = await enhancedIntegration.applyWorkflowTemplate(
            templateId,
            req.user.uid,
            params
        );

        res.json({
            success: true,
            ...result
        });

    } catch (error) {
        logger.error(`Failed to apply template: ${error.message}`, { userId: req.user.uid });
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * Register a webhook for integration events
 */
exports.registerWebhook = function (req, res, next) {
    if (!res.locals.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        const { infraContext, webhookUrl, events = [], includeData = false } = req.body;

        if (!infraContext || !webhookUrl) {
            return res.status(400).json({ error: 'Context and webhook URL are required' });
        }

        // Register the webhook
        const webhookId = enhancedIntegration.registerWebhook(
            req.user.uid,
            infraContext,
            webhookUrl,
            { events, includeData }
        );

        res.json({
            success: true,
            webhookId,
            message: `Webhook registered for context ${infraContext}`
        });

    } catch (error) {
        logger.error(`Failed to register webhook: ${error.message}`, { userId: req.user.uid });
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * Remove a registered webhook
 */
exports.removeWebhook = function (req, res, next) {
    if (!res.locals.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        const { webhookId } = req.params;

        if (!webhookId) {
            return res.status(400).json({ error: 'Webhook ID is required' });
        }

        // Remove the webhook
        const removed = enhancedIntegration.removeWebhook(webhookId);

        res.json({
            success: removed,
            message: removed ? '