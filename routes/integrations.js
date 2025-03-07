/**
 * Routes for platform integrations (MyMap.ai, etc.)
 */

const { platformIntegration } = require('../lib/utils/platformIntegration');
const Entry = require('../lib/entry');
const User = require('../lib/user');
const logger = require('../lib/log/logger');

exports.renderIntegrations = function (req, res, next) {
    if (!res.locals.user) {
        return res.redirect('/login');
    }

    // Get available contexts for the dropdown
    let contexts = res.locals.contextslist;

    res.render('integrations', {
        title: 'Platform Integrations',
        contexts: contexts,
        integrations: {
            mymap: {
                enabled: process.env.MYMAP_INTEGRATION_ENABLED === 'true' || true,
                connected: false // This would be determined by checking if user has API key stored
            }
        }
    });
};

exports.exportToMyMap = async function (req, res, next) {
    if (!res.locals.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        const context = req.body.context || '#private';
        const apiKey = req.body.api_key || req.user.settings?.mymap_api_key;

        // Get the graph data for the context
        const entry = new Entry();
        const userId = req.user.uid;

        const graphData = await new Promise((resolve, reject) => {
            entry.getGraph(userId, context, function (err, graph) {
                if (err) return reject(err);

                // Add context name to graph data
                graph.contextName = context;
                resolve(graph);
            });
        });

        // Export to MyMap
        const result = await platformIntegration.exportToMyMap(graphData, userId, apiKey);

        // Return success response with MyMap URL
        res.json({
            success: true,
            mymap_id: result.id,
            mymap_url: result.url || `https://mymap.ai/maps/${result.id}`
        });

    } catch (error) {
        logger.error(`Export to MyMap failed: ${error.message}`, { userId: req.user.uid });
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

exports.importFromMyMap = async function (req, res, next) {
    if (!res.locals.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        const mapId = req.body.map_id;
        const context = req.body.context || '#mymap';
        const apiKey = req.body.api_key || req.user.settings?.mymap_api_key;

        if (!mapId) {
            return res.status(400).json({ error: 'MyMap ID is required' });
        }

        // Import from MyMap
        const graphData = await platformIntegration.importFromMyMap(mapId, req.user.uid, context, apiKey);

        // Now process the import data and add to InfraNodus
        const entry = new Entry();
        const userId = req.user.uid;

        // First add all statements
        for (const statement of graphData.statements) {
            await new Promise((resolve, reject) => {
                entry.submit(userId, statement, function (err) {
                    if (err) return reject(err);
                    resolve();
                });
            });
        }

        // Return success response
        res.json({
            success: true,
            context: context,
            imported_statements: graphData.statements.length,
            imported_nodes: graphData.nodes.length
        });

    } catch (error) {
        logger.error(`Import from MyMap failed: ${error.message}`, { userId: req.user.uid });
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

exports.getMyMapList = async function (req, res, next) {
    if (!res.locals.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        const apiKey = req.query.api_key || req.user.settings?.mymap_api_key;

        if (!apiKey) {
            return res.status(400).json({ error: 'MyMap API key is required' });
        }

        // Get list of maps from MyMap
        const maps = await platformIntegration.getMyMapList(req.user.uid, apiKey);

        // Return maps list
        res.json({
            success: true,
            maps: maps
        });

    } catch (error) {
        logger.error(`Failed to get MyMap list: ${error.message}`, { userId: req.user.uid });
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

exports.saveIntegrationSettings = async function (req, res, next) {
    if (!res.locals.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        const userId = req.user.uid;
        const myMapApiKey = req.body.mymap_api_key;

        // Update user settings
        const user = new User();

        await new Promise((resolve, reject) => {
            user.updateSettings(userId, { mymap_api_key: myMapApiKey }, function (err) {
                if (err) return reject(err);
                resolve();
            });
        });

        res.json({
            success: true,
            message: 'Integration settings saved successfully'
        });

    } catch (error) {
        logger.error(`Failed to save integration settings: ${error.message}`, { userId: req.user.uid });
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};
