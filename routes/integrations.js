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

/**
 * Integrations Routes
 * 
 * Handles routes for external integrations like PhotoPrism and file systems
 */

const express = require('express');
const router = express.Router();
const { neuralIntegrationsConfig } = require('../lib/config/neuralIntegrations');
const { FileSystemConnector } = require('../lib/connectors/fileSystemConnector');
const middleware = require('./middleware');

// Create file system connector instance
const fileConnector = new FileSystemConnector();

// Ensure user is authenticated for all routes
router.use(middleware.ensureAuthenticated);

/**
 * GET /integrations
 * Show integrations page
 */
router.get('/', (req, res) => {
    const userId = req.user.id;

    // Get user's PhotoPrism configuration
    const photoprismConfig = neuralIntegrationsConfig.getPhotoprismConfig(userId);
    const fileSystemConfig = neuralIntegrationsConfig.getFileSystemConfig(userId);

    // Check platforms and capabilities
    const platformCapabilities = {
        os: platformIntegration.platform,
        gpuSupport: platformIntegration.gpuInfo?.supported || false,
        gpuName: platformIntegration.gpuInfo?.name || 'Unknown',
        tensorflowGPU: platformIntegration.hasTensorFlowGPUSupport()
    };

    res.render('integrations', {
        title: 'Neural Mind Map Integrations',
        user: req.user,
        photoprismConnected: !!photoprismConfig,
        photoprismUrl: photoprismConfig?.url || '',
        fileSystemConfig,
        platformCapabilities,
        globalConfig: neuralIntegrationsConfig.getGlobalConfig()
    });
});

/**
 * POST /integrations/photoprism
 * Configure PhotoPrism integration
 */
router.post('/photoprism', async (req, res) => {
    const userId = req.user.id;
    const { url, apiKey } = req.body;

    try {
        if (!url) {
            return res.status(400).json({ success: false, error: 'PhotoPrism URL is required' });
        }

        // Test connection first
        const testResult = await neuralIntegrationsConfig.testPhotoprismConnection({
            url,
            apiKey
        });

        if (!testResult.success) {
            return res.status(400).json({
                success: false,
                error: `Connection failed: ${testResult.error || 'Unknown error'}`
            });
        }

        // Save configuration
        await neuralIntegrationsConfig.setPhotoprismConfig(userId, {
            url,
            apiKey
        });

        res.json({
            success: true,
            message: 'PhotoPrism integration configured successfully',
            details: {
                name: testResult.name,
                version: testResult.version,
                photos: testResult.photos
            }
        });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /integrations/filesystem
 * Configure file system integration
 */
router.post('/filesystem', async (req, res) => {
    const userId = req.user.id;
    const { allowedPaths, allowRecursive, maxScanDepth } = req.body;

    try {
        // Validate and normalize paths
        const normalizedPaths = Array.isArray(allowedPaths)
            ? allowedPaths.map(p => platformIntegration.normalizePath(p))
            : [];

        // Validate accessibility of paths
        const inaccessiblePaths = [];
        for (const path of normalizedPaths) {
            if (!platformIntegration.isPathAccessible(path)) {
                inaccessiblePaths.push(path);
            }
        }

        if (inaccessiblePaths.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'Some paths are not accessible',
                inaccessiblePaths
            });
        }

        // Save configuration
        await neuralIntegrationsConfig.setFileSystemConfig(userId, {
            allowedPaths: normalizedPaths,
            allowRecursive: allowRecursive === true,
            maxScanDepth: parseInt(maxScanDepth) || 5
        });

        res.json({
            success: true,
            message: 'File system integration configured successfully'
        });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /integrations/default-paths
 * Get default paths based on platform
 */
router.get('/default-paths', (req, res) => {
    const defaultPaths = [];

    // Add home directory
    defaultPaths.push(platformIntegration.homeDir);

    // Add Documents folder
    if (platformIntegration.isWindows) {
        defaultPaths.push(platformIntegration.normalizePath(`${platformIntegration.homeDir}\\Documents`));
    } else if (platformIntegration.isMacOS) {
        defaultPaths.push(platformIntegration.normalizePath(`${platformIntegration.homeDir}/Documents`));
    } else {
        defaultPaths.push(platformIntegration.normalizePath(`${platformIntegration.homeDir}/Documents`));
    }

    res.json({
        success: true,
        defaultPaths
    });
});

/**
 * POST /integrations/test-photoprism
 * Test PhotoPrism connection
 */
router.post('/test-photoprism', async (req, res) => {
    try {
        const { url, apiKey } = req.body;

        const testResult = await neuralIntegrationsConfig.testPhotoprismConnection({
            url,
            apiKey
        });

        res.json(testResult);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * DELETE /integrations/photoprism
 * Remove PhotoPrism integration
 */
router.delete('/photoprism', async (req, res) => {
    const userId = req.user.id;

    try {
        await neuralIntegrationsConfig.setPhotoprismConfig(userId, {
            url: null,
            apiKey: null
        });

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
