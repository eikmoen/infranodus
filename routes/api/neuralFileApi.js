/**
 * Neural File System API
 * 
 * RESTful API for integrating neural mind maps with file systems
 * and media libraries like PhotoPrism.
 */

const express = require('express');
const router = express.Router();
const { FileSystemConnector } = require('../../lib/connectors/fileSystemConnector');
const { NeuralMindMap } = require('../../lib/exponential/neuralMindMap');
const logger = require('../../lib/log/logger');
const middleware = require('../middleware');

// Initialize file system connector
const fileConnector = new FileSystemConnector({
    enableContentAnalysis: true,
    photoprismConfig: {
        // This would come from environment variables or config in production
        url: process.env.PHOTOPRISM_URL,
        apiKey: process.env.PHOTOPRISM_API_KEY
    }
});

// Middleware to check if user is authenticated
router.use(middleware.ensureAuthenticated);

/**
 * Start scanning a directory to create a neural mind map
 * POST /api/neural-files/scan
 */
router.post('/scan', async (req, res) => {
    try {
        const { directoryPath, contextName, options } = req.body;

        if (!directoryPath || !contextName) {
            return res.status(400).json({ error: 'Directory path and context name are required' });
        }

        const scanId = await fileConnector.scanDirectoryToMindMap(
            req.user.id,
            directoryPath,
            contextName,
            options
        );

        res.json({
            success: true,
            scanId,
            status: 'initializing'
        });
    } catch (error) {
        logger.error(`Error starting file scan: ${error.message}`, { stack: error.stack });
        res.status(500).json({ error: error.message });
    }
});

/**
 * Start scanning PhotoPrism to create a neural mind map
 * POST /api/neural-files/photoprism
 */
router.post('/photoprism', async (req, res) => {
    try {
        const { contextName, options } = req.body;

        if (!contextName) {
            return res.status(400).json({ error: 'Context name is required' });
        }

        const scanId = await fileConnector.createPhotoprismMindMap(
            req.user.id,
            contextName,
            options
        );

        res.json({
            success: true,
            scanId,
            status: 'initializing'
        });
    } catch (error) {
        logger.error(`Error starting PhotoPrism scan: ${error.message}`, { stack: error.stack });
        res.status(500).json({ error: error.message });
    }
});

/**
 * Get scan status
 * GET /api/neural-files/scan/:scanId
 */
router.get('/scan/:scanId', async (req, res) => {
    try {
        const { scanId } = req.params;
        const status = fileConnector.getScanStatus(scanId);

        res.json({
            success: true,
            ...status
        });
    } catch (error) {
        logger.error(`Error getting scan status: ${error.message}`);
        res.status(404).json({ error: error.message });
    }
});

/**
 * Create mind map from scan results
 * POST /api/neural-files/mindmap
 */
router.post('/mindmap', async (req, res) => {
    try {
        const { scanId, options } = req.body;

        if (!scanId) {
            return res.status(400).json({ error: 'Scan ID is required' });
        }

        const mindMap = await fileConnector.createMindMapFromScan(scanId, options);

        res.json({
            success: true,
            mindMap: {
                id: mindMap.id,
                created: mindMap.created,
                nodeCount: mindMap.nodes.length,
                connectionCount: mindMap.connections.length,
                layerCount: mindMap.layers.length,
                clusterCount: mindMap.clusters.length,
                fileCount: mindMap.nodes.filter(n => n.isFile).length,
                insights: mindMap.insights.map(i => ({
                    type: i.type,
                    description: i.description,
                    confidence: i.confidence
                }))
            }
        });
    } catch (error) {
        logger.error(`Error creating mind map: ${error.message}`, { stack: error.stack });
        res.status(500).json({ error: error.message });
    }
});

/**
 * Get mind map data for visualization
 * GET /api/neural-files/mindmap/:mindmapId
 */
router.get('/mindmap/:mindmapId', async (req, res) => {
    try {
        const { mindmapId } = req.params;

        // Find the user's mind map
        const neuralMindMap = new NeuralMindMap();
        const mindMap = neuralMindMap.conceptMaps.get(`${req.user.id}-${mindmapId}`);

        if (!mindMap) {
            return res.status(404).json({ error: 'Mind map not found' });
        }

        // Return visualization-ready data
        res.json({
            success: true,
            visualization: {
                nodes: mindMap.nodes.map(node => ({
                    id: node.id,
                    name: node.name,
                    weight: node.weight,
                    neuralActivation: node.neuralActivation,
                    layer: node.layer,
                    isFile: node.isFile || false,
                    isDirectory: node.isDirectory || false,
                    type: node.type || 'concept'
                })),
                connections: mindMap.connections,
                layers: mindMap.layers,
                clusters: mindMap.clusters,
                visualization: mindMap.visualization,
                fileVisualizations: mindMap.fileVisualizations
            }
        });
    } catch (error) {
        logger.error(`Error getting mind map visualization data: ${error.message}`, { stack: error.stack });
        res.status(500).json({ error: error.message });
    }
});

/**
 * Get available PhotoPrism albums
 * GET /api/neural-files/photoprism/albums
 */
router.get('/photoprism/albums', async (req, res) => {
    try {
        if (!fileConnector.photoprismClient) {
            return res.status(400).json({ error: 'PhotoPrism is not configured' });
        }

        const albums = await fileConnector.photoprismClient.fetchAlbums();

        res.json({
            success: true,
            albums: albums.map(album => ({
                id: album.UID,
                name: album.Title,
                photoCount: album.PhotoCount,
                thumbnail: album.Thumb
            }))
        });
    } catch (error) {
        logger.error(`Error fetching PhotoPrism albums: ${error.message}`, { stack: error.stack });
        res.status(500).json({ error: error.message });
    }
});

/**
 * Get file details
 * GET /api/neural-files/file/:fileId
 */
router.get('/file/:fileId', async (req, res) => {
    try {
        const { fileId } = req.params;

        const fileDetails = await fileConnector.performFileAction(
            req.user.id,
            fileId,
            'getMetadata',
            { includePreview: true }
        );

        res.json({
            success: true,
            file: fileDetails
        });
    } catch (error) {
        logger.error(`Error getting file details: ${error.message}`);
        res.status(404).json({ error: error.message });
    }
});

/**
 * Find similar files
 * POST /api/neural-files/file/:fileId/similar
 */
router.post('/file/:fileId/similar', async (req, res) => {
    try {
        const { fileId } = req.params;
        const { threshold, limit } = req.body;

        const similarFiles = await fileConnector.performFileAction(
            req.user.id,
            fileId,
            'findSimilar',
            {
                similarityThreshold: threshold || 0.7,
                maxResults: limit || 10
            }
        );

        res.json({
            success: true,
            similarFiles
        });
    } catch (error) {
        logger.error(`Error finding similar files: ${error.message}`, { stack: error.stack });
        res.status(500).json({ error: error.message });
    }
});

/**
 * Generate tags for a file
 * POST /api/neural-files/file/:fileId/tags
 */
router.post('/file/:fileId/tags', async (req, res) => {
    try {
        const { fileId } = req.params;
        const { maxTags } = req.body;

        const generatedTags = await fileConnector.performFileAction(
            req.user.id,
            fileId,
            'generateTags',
            { maxTags: maxTags || 10 }
        );

        res.json({
            success: true,
            tags: generatedTags
        });
    } catch (error) {
        logger.error(`Error generating tags: ${error.message}`, { stack: error.stack });
        res.status(500).json({ error: error.message });
    }
});

/**
 * Add a file to a collection
 * POST /api/neural-files/file/:fileId/collection
 */
router.post('/file/:fileId/collection', async (req, res) => {
    try {
        const { fileId } = req.params;
        const { collectionId } = req.body;

        if (!collectionId) {
            return res.status(400).json({ error: 'Collection ID is required' });
        }

        const result = await fileConnector.performFileAction(
            req.user.id,
            fileId,
            'addToCollection',
            { collectionId }
        );

        res.json({
            success: true,
            result
        });
    } catch (error) {
        logger.error(`Error adding file to collection: ${error.message}`, { stack: error.stack });
        res.status(500).json({ error: error.message });
    }
});

/**
 * Cancel an active scan
 * POST /api/neural-files/scan/:scanId/cancel
 */
router.post('/scan/:scanId/cancel', async (req, res) => {
    try {
        const { scanId } = req.params;
        const status = fileConnector.getScanStatus(scanId);

        // Verify this is the user's scan
        if (status.userId !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized to cancel this scan' });
        }

        // Attempt to cancel
        const cancelled = await fileConnector.cancelScan(scanId);

        res.json({
            success: cancelled,
            message: cancelled ? 'Scan cancellation requested' : 'Scan could not be cancelled'
        });
    } catch (error) {
        logger.error(`Error cancelling scan: ${error.message}`);
        res.status(404).json({ error: error.message });
    }
});

/**
 * Health check for the neural files API
 * GET /api/neural-files/health
 */
router.get('/health', (req, res) => {
    const photoprismStatus = fileConnector.photoprismClient ? 'connected' : 'not configured';

    res.json({
        success: true,
        status: 'healthy',
        photoprism: photoprismStatus,
        activeScans: fileConnector.activeScans.size,
        embeddingService: {
            loadedModels: fileConnector.embeddingService.getLoadedModels(),
            cacheSize: fileConnector.embeddingService.getCacheSize()
        },
        version: '1.0.0'
    });
});

module.exports = router;