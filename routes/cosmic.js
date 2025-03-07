/**
 * Routes for Cosmic Symphony functionality
 */

const { cosmicSymphony } = require('../lib/cosmic/symphonyProgression');
const Entry = require('../lib/entry');
const User = require('../lib/user');
const logger = require('../lib/log/logger');

/**
 * Render the cosmic symphony view
 */
exports.renderCosmicView = function (req, res, next) {
    if (!res.locals.user) {
        return res.redirect('/login');
    }

    // Get available contexts for the dropdown
    const contexts = res.locals.contextslist || [];

    res.render('cosmic-symphony', {
        title: 'Cosmic Symphony',
        contexts: contexts,
        user: req.user,
        cosmicActive: true
    });
};

/**
 * Generate a cosmic symphony analysis
 */
exports.generateCosmicAnalysis = async function (req, res, next) {
    if (!res.locals.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        const { contextName } = req.body;

        if (!contextName) {
            return res.status(400).json({ error: 'Context name is required' });
        }

        // Get graph data for the context
        const entry = new Entry();
        const userId = req.user.uid;

        const graphData = await new Promise((resolve, reject) => {
            entry.getGraph(userId, contextName, function (err, graph) {
                if (err) return reject(err);
                graph.contextName = contextName;
                resolve(graph);
            });
        });

        // Run the cosmic symphony analysis
        const analysis = cosmicSymphony.analyzeCosmicSymphony(userId, contextName, graphData);

        res.json({
            success: true,
            analysis
        });

    } catch (error) {
        logger.error(`Failed to generate cosmic analysis: ${error.message}`, { userId: req.user.uid });
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * Get visualization data for cosmic symphony view
 */
exports.getVisualizationData = function (req, res, next) {
    if (!res.locals.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        const { contextName } = req.query;

        if (!contextName) {
            return res.status(400).json({ error: 'Context name is required' });
        }

        // Get visualization data
        const visualizationData = cosmicSymphony.getVisualizationData(req.user.uid, contextName);

        res.json({
            success: true,
            visualizationData
        });

    } catch (error) {
        logger.error(`Failed to get visualization data: ${error.message}`, { userId: req.user.uid });
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * Get resonance recommendations
 */
exports.getResonanceRecommendations = function (req, res, next) {
    if (!res.locals.user) {
        return res.status(401).json({ error: 'Authentication required'