/**
 * TensorFlow Embeddings Service
 * 
 * Provides text embeddings generation using TensorFlow.js models for neural mind map generation.
 * Handles caching, GPU acceleration, and model management.
 */

const tf = require('@tensorflow/tfjs-node');
const fs = require('fs');
const path = require('path');
const logger = require('../log/logger');
const { memoryProtection } = require('../utils/memoryProtection');
const { platformIntegration } = require('../utils/platformIntegration');

// Try to load GPU version if available
try {
    if (platformIntegration.hasTensorFlowGPUSupport()) {
        require('@tensorflow/tfjs-node-gpu');
        logger.info('TensorFlow.js GPU support enabled');
    }
} catch (error) {
    logger.warn('TensorFlow.js GPU support not available, using CPU', { error: error.message });
}

class TFEmbeddingsService {
    constructor(options = {}) {
        this.options = {
            modelName: options.modelName || 'universal-sentence-encoder',
            dimension: options.dimension || 512,
            cacheEnabled: options.cacheEnabled !== false,
            cacheTTL: options.cacheTTL || 604800000, // 7 days in milliseconds
            maxCacheSize: options.maxCacheSize || 10000,
            modelPath: options.modelPath || null,
            useQuantized: options.useQuantized !== false,
            openAIApiKey: options.openAIApiKey || process.env.OPENAI_API_KEY,
            openAIModel: options.openAIModel || 'text-embedding-ada-002',
            defaultSimilarityMetric: options.defaultSimilarityMetric || 'cosine',
            ...options
        };

        this.model = null;
        this.tokenizer = null;
        this.embeddingCache = new Map();
        this.cachedDates = new Map();
        this.initialized = false;
        this.initializing = false;
        this.initPromise = null;
        this.modelInfo = {
            name: this.options.modelName,
            dimension: this.options.dimension
        };

        // Register with memory protection
        memoryProtection.registerComponent('tf-embeddings', {
            onMemoryPressure: (level) => this._handleMemoryPressure(level),
            clearCache: () => this.clearCache(),
            getMemoryUsage: () => this._getMemoryUsage()
        });
    }

    /**
     * Initialize the embedding model
     * 
     * @returns {Promise<void>}
     */
    async initialize() {
        if (this.initialized) return;
        if (this.initializing) return this.initPromise;

        this.initializing = true;
        this.initPromise = this._initializeModel();

        try {
            await this.initPromise;
            this.initialized = true;
            this.initializing = false;
            logger.info(`TF Embeddings service initialized with model: ${this.options.modelName}`);
        } catch (error) {
            this.initializing = false;
            logger.error(`Failed to initialize TF Embeddings service: ${error.message}`, { stack: error.stack });
            throw error;
        }
    }

    /**
     * Get embeddings for a set of texts
     * 
     * @param {Array<string>|string} texts - Text(s) to embed
     * @param {Object} options - Options for embedding generation
     * @returns {Promise<Array<Array<number>>>} - Array of embeddings
     */
    async getEmbeddings(texts, options = {}) {
        // Ensure model is initialized
        if (!this.initialized) {
            await this.initialize();
        }

        // Convert single text to array
        const textArray = Array.isArray(texts) ? texts : [texts];

        // If there are no texts, return empty array
        if (textArray.length === 0) {
            return [];
        }

        const embeddingOptions = {
            batchSize: options.batchSize || 16,
            cacheResults: options.cacheResults !== false && this.options.cacheEnabled,
            ...options
        };

        // Use cache if enabled
        const results = [];
        const uncachedIndexes = [];
        const uncachedTexts = [];

        if (embeddingOptions.cacheResults) {
            // Check which texts are in cache
            for (let i = 0; i < textArray.length; i++) {
                const text = textArray[i];
                if (this.embeddingCache.has(text)) {
                    results[i] = this.embeddingCache.get(text);
                    // Update access timestamp
                    this.cachedDates.set(text, Date.now());
                } else {
                    uncachedIndexes.push(i);
                    uncachedTexts.push(text);
                }
            }
        } else {
            // Skip cache check
            for (let i = 0; i < textArray.length; i++) {
                uncachedIndexes.push(i);
                uncachedTexts.push(textArray[i]);
            }
        }

        // If all texts were in cache, return results
        if (uncachedTexts.length === 0) {
            return results;
        }

        try {
            // Process in batches to avoid OOM
            for (let i = 0; i < uncachedTexts.length; i += embeddingOptions.batchSize) {
                const batchTexts = uncachedTexts.slice(i, i + embeddingOptions.batchSize);
                const batchIndexes = uncachedIndexes.slice(i, i + embeddingOptions.batchSize);

                // Generate embeddings for batch
                const batchEmbeddings = await this._generateEmbeddings(batchTexts);

                // Store results
                for (let j = 0; j < batchEmbeddings.length; j++) {
                    const originalIndex = batchIndexes[j];
                    const text = uncachedTexts[j];
                    const embedding = batchEmbeddings[j];

                    results[originalIndex] = embedding;

                    // Cache the result if enabled
                    if (embeddingOptions.cacheResults) {
                        this._cacheEmbedding(text, embedding);
                    }
                }
            }

            return results;
        } catch (error) {
            logger.error(`Error generating embeddings: ${error.message}`, { stack: error.stack });
            throw error;
        }
    }

    /**
     * Compute similarity between two texts
     * 
     * @param {string} text1 - First text
     * @param {string} text2 - Second text
     * @returns {Promise<number>} - Similarity score (0-1)
     */
    async computeSimilarity(text1, text2) {
        try {
            // Get embeddings
            const [embedding1, embedding2] = await this.getEmbeddings([text1, text2]);

            // Compute cosine similarity
            return this.computeEmbeddingSimilarity(embedding1, embedding2);
        } catch (error) {
            logger.error(`Error computing similarity: ${error.message}`, { stack: error.stack });
            throw error;
        }
    }

    /**
     * Compute similarity between two embeddings using specified metric
     * 
     * @param {Array<number>} embedding1 - First embedding
     * @param {Array<number>} embedding2 - Second embedding
     * @param {string} metric - Similarity metric ('cosine', 'euclidean', 'dot', 'manhattan')
     * @returns {number} - Similarity score (0-1)
     */
    computeEmbeddingSimilarity(embedding1, embedding2, metric = this.options.defaultSimilarityMetric) {
        try {
            // Convert arrays to tensors
            const a = tf.tensor1d(embedding1);
            const b = tf.tensor1d(embedding2);
            let similarity;

            switch (metric.toLowerCase()) {
                case 'euclidean':
                    // Euclidean distance converted to similarity (1 / (1 + distance))
                    const distance = tf.norm(tf.sub(a, b));
                    similarity = tf.div(1, tf.add(1, distance));
                    break;

                case 'manhattan':
                    // Manhattan distance converted to similarity
                    const manhattanDist = tf.sum(tf.abs(tf.sub(a, b)));
                    similarity = tf.div(1, tf.add(1, manhattanDist));
                    break;

                case 'dot':
                    // Dot product (normalized to 0-1 range)
                    const dotProduct = tf.sum(tf.mul(a, b));
                    const maxDot = tf.sqrt(tf.sum(tf.square(a))).mul(tf.sqrt(tf.sum(tf.square(b))));
                    similarity = tf.div(tf.add(dotProduct, maxDot), tf.mul(maxDot, 2));
                    break;

                case 'cosine':
                default:
                    // Cosine similarity: dot(a, b) / (norm(a) * norm(b))
                    const dot = tf.sum(tf.mul(a, b));
                    const normA = tf.norm(a);
                    const normB = tf.norm(b);
                    similarity = tf.div(dot, tf.mul(normA, normB));
                    break;
            }

            // Get value as JavaScript number
            const value = similarity.dataSync()[0];

            // Clean up tensors to prevent memory leaks
            tf.dispose([a, b, similarity]);

            // Clamp to [0, 1] range (similarities can sometimes be slightly outside due to floating-point errors)
            return Math.max(0, Math.min(1, value));
        } catch (error) {
            logger.error(`Error computing embedding similarity: ${error.message}`);
            throw error;
        }
    }

    /**
     * Find similar texts to a given text
     * 
     * @param {string} text - Text to find similar items for
     * @param {Array<string>} candidates - Candidate texts to compare against
     * @param {Object} options - Options for similarity search
     * @returns {Promise<Array<{text: string, similarity: number}>>} - Sorted array of similar items
     */
    async findSimilarTexts(text, candidates, options = {}) {
        const findOptions = {
            threshold: options.threshold || 0.5,
            limit: options.limit || 10,
            includeScores: options.includeScores !== false,
            ...options
        };

        try {
            // Get embedding for the query text
            const [queryEmbedding] = await this.getEmbeddings([text]);

            // Get embeddings for all candidates
            const candidateEmbeddings = await this.getEmbeddings(candidates);

            // Compute similarities and combine with candidates
            const similarities = candidateEmbeddings.map((embedding, index) => {
                const similarity = this.computeEmbeddingSimilarity(queryEmbedding, embedding);
                return {
                    text: candidates[index],
                    similarity
                };
            });

            // Filter by threshold
            const filtered = similarities.filter(item => item.similarity >= findOptions.threshold);

            // Sort by similarity (descending)
            const sorted = filtered.sort((a, b) => b.similarity - a.similarity);

            // Apply limit
            const limited = sorted.slice(0, findOptions.limit);

            // Format results based on options
            if (findOptions.includeScores) {
                return limited;
            } else {
                return limited.map(item => item.text);
            }
        } catch (error) {
            logger.error(`Error finding similar texts: ${error.message}`, { stack: error.stack });
            throw error;
        }
    }

    /**
     * Clear the embedding cache
     */
    clearCache() {
        this.embeddingCache.clear();
        this.cachedDates.clear();
        logger.debug('Embedding cache cleared');
    }

    /**
     * Export the embedding cache to a file
     * 
     * @param {string} filePath - Path to save the cache
     * @returns {Promise<void>}
     */
    async exportCache(filePath) {
        try {
            // Create cache object with metadata
            const cacheData = {
                version: 1,
                modelName: this.options.modelName,
                dimension: this.options.dimension,
                created: new Date().toISOString(),
                embeddings: {}
            };

            // Add all embeddings with their timestamps
            for (const [text, embedding] of this.embeddingCache.entries()) {
                cacheData.embeddings[text] = {
                    vector: embedding,
                    timestamp: this.cachedDates.get(text) || Date.now()
                };
            }

            // Write to file
            await fs.promises.writeFile(
                filePath,
                JSON.stringify(cacheData, null, 2)
            );

            logger.info(`Embedding cache exported to ${filePath} (${Object.keys(cacheData.embeddings).length} entries)`);
        } catch (error) {
            logger.error(`Failed to export embedding cache: ${error.message}`, { stack: error.stack });
            throw error;
        }
    }

    /**
     * Import embeddings from a cache file
     * 
     * @param {string} filePath - Path to the cache file
     * @param {Object} options - Import options
     * @returns {Promise<number>} - Number of imported embeddings
     */
    async importCache(filePath, options = {}) {
        const importOptions = {
            clearExisting: options.clearExisting || false,
            validateDimension: options.validateDimension !== false,
            ...options
        };

        try {
            // Read and parse file
            const fileData = await fs.promises.readFile(filePath, 'utf8');
            const cacheData = JSON.parse(fileData);

            // Validate cache format
            if (!cacheData.embeddings || !cacheData.dimension || !cacheData.modelName) {
                throw new Error('Invalid cache file format');
            }

            // Check dimension compatibility
            if (importOptions.validateDimension && cacheData.dimension !== this.options.dimension) {
                throw new Error(
                    `Dimension mismatch: cache uses ${cacheData.dimension}, current model uses ${this.options.dimension}`
                );
            }

            // Clear existing cache if requested
            if (importOptions.clearExisting) {
                this.clearCache();
            }

            // Import embeddings
            let importCount = 0;
            for (const [text, data] of Object.entries(cacheData.embeddings)) {
                if (!this.embeddingCache.has(text)) {
                    this.embeddingCache.set(text, data.vector);
                    this.cachedDates.set(text, data.timestamp || Date.now());
                    importCount++;
                }
            }

            logger.info(`Imported ${importCount} embeddings from ${filePath}`);
            return importCount;
        } catch (error) {
            logger.error(`Failed to import embedding cache: ${error.message}`, { stack: error.stack });
            throw error;
        }
    }

    /**
     * Get current memory usage
     * 
     * @returns {Object} - Memory usage info
     */
    _getMemoryUsage() {
        return {
            cacheSize: this.embeddingCache.size,
            estimatedBytes: this.embeddingCache.size * this.options.dimension * 4 // 4 bytes per float
        };
    }

    /**
     * Handle memory pressure events
     * 
     * @param {string} level - Memory pressure level
     * @private
     */
    _handleMemoryPressure(level) {
        if (level === 'critical') {
            // Clear cache entirely
            this.clearCache();
        } else if (level === 'high') {
            // Trim cache to reduce memory usage
            this._trimCache(0.5); // Keep 50% of most recently used items
        }
    }

    /**
     * Trim the cache to reduce memory usage
     * 
     * @param {number} keepRatio - Ratio of cache to keep (0-1)
     * @private
     */
    _trimCache(keepRatio = 0.7) {
        if (this.embeddingCache.size === 0) return;

        // Get all entries with their last access times
        const entries = Array.from(this.cachedDates.entries()).map(([text, date]) => ({ text, date }));

        // Sort by date (most recent first)
        entries.sort((a, b) => b.date - a.date);

        // Calculate how many to keep
        const keepCount = Math.max(1, Math.floor(entries.length * keepRatio));

        // If we're keeping most of them, no need to do anything
        if (keepCount >= entries.length) return;

        // Get items to remove (oldest ones)
        const toRemove = entries.slice(keepCount).map(entry => entry.text);

        // Remove from caches
        for (const text of toRemove) {
            this.embeddingCache.delete(text);
            this.cachedDates.delete(text);
        }

        logger.debug(`Trimmed embedding cache from ${entries.length} to ${keepCount} items`);
    }

    /**
     * Cache an embedding for a text
     * 
     * @param {string} text - Text to cache
     * @param {Array<number>} embedding - Embedding to cache
     * @private
     */
    _cacheEmbedding(text, embedding) {
        // If cache is full, remove oldest entry
        if (this.embeddingCache.size >= this.options.maxCacheSize) {
            let oldestText = null;
            let oldestDate = Date.now();

            for (const [cacheText, cacheDate] of this.cachedDates.entries()) {
                if (cacheDate < oldestDate) {
                    oldestDate = cacheDate;
                    oldestText = cacheText;
                }
            }

            if (oldestText) {
                this.embeddingCache.delete(oldestText);
                this.cachedDates.delete(oldestText);
            }
        }

        // Add to cache
        this.embeddingCache.set(text, embedding);
        this.cachedDates.set(text, Date.now());
    }

    /**
     * Initialize the embedding model
     * 
     * @returns {Promise<void>}
     * @private
     */
    async _initializeModel() {
        try {
            // Choose model initialization strategy based on model name
            switch (this.options.modelName) {
                case 'universal-sentence-encoder':
                    await this._initializeUSE();
                    break;

                case 'bert':
                    await this._initializeBERT();
                    break;

                case 'openai':
                    await this._initializeOpenAI();
                    break;

                case 'custom':
                    await this._initializeCustomModel();
                    break;

                default:
                    await this._initializeUSE();
            }

            logger.info(`Model ${this.options.modelName} loaded successfully`);
        } catch (error) {
            logger.error(`Failed to initialize model ${this.options.modelName}: ${error.message}`, { stack: error.stack });
            throw error;
        }
    }

    /**
     * Initialize Universal Sentence Encoder model
     * 
     * @returns {Promise<void>}
     * @private
     */
    async _initializeUSE() {
        try {
            // Try to use local model if specified
            if (this.options.modelPath) {
                this.model = await tf.loadGraphModel(`file://${this.options.modelPath}`);
            } else {
                // Load from TensorFlow Hub
                const use = require('@tensorflow-models/universal-sentence-encoder');
                this.model = await use.load();
            }

            this.modelInfo.name = 'universal-sentence-encoder';
            this.modelInfo.dimension = 512; // USE outputs 512-dimensional embeddings
        } catch (error) {
            logger.error(`Failed to load Universal Sentence Encoder: ${error.message}`, { stack: error.stack });
            throw error;
        }
    }

    /**
     * Initialize BERT model
     * 
     * @returns {Promise<void>}
     * @private
     */
    async _initializeBERT() {
        try {
            // For now we'll import the TransformerModel here
            // In a real app, you might want to move this to a separate module
            const TransformerModel = require('../neural/transformerModel');

            this.model = new TransformerModel({
                embeddingDimension: this.options.dimension,
                usePretrainedModel: true,
                pretrainedModelPath: this.options.modelPath || './models/bert-base-uncased'
            });

            await this.model.initialize();

            this.modelInfo.name = 'bert';
            this.modelInfo.dimension = this.options.dimension;
        } catch (error) {
            logger.error(`Failed to load BERT model: ${error.message}`, { stack: error.stack });
            throw error;
        }
    }

    /**
     * Initialize OpenAI API client
     *
     * @returns {Promise<void>}
     * @private
     */
    async _initializeOpenAI() {
        if (!this.options.openAIApiKey) {
            throw new Error('OpenAI API key is required for OpenAI embeddings');
        }

        // No actual initialization needed for API calls
        this.modelInfo = {
            name: 'openai',
            model: this.options.openAIModel,
            dimension: this.options.openAIModel.includes('ada') ? 1536 : this.options.dimension
        };

        logger.info(`OpenAI embeddings initialized with model: ${this.options.openAIModel}`);
    }

    /**
     * Initialize a custom model
     * 
     * @returns {Promise<void>}
     * @private
     */
    async _initializeCustomModel() {
        try {
            if (!this.options.modelPath) {
                throw new Error('Model path is required for custom models');
            }

            this.model = await tf.loadLayersModel(`file://${this.options.modelPath}/model.json`);

            this.modelInfo.name = 'custom';
            this.modelInfo.dimension = this.options.dimension;
        } catch (error) {
            logger.error(`Failed to load custom model: ${error.message}`, { stack: error.stack });
            throw error;
        }
    }

    /**
     * Generate embeddings for a batch of texts
     * 
     * @param {Array<string>} texts - Batch of texts
     * @returns {Promise<Array<Array<number>>>} - Batch of embeddings
     * @private
     */
    async _generateEmbeddings(texts) {
        try {
            // Different handling based on model type
            if (this.modelInfo.name === 'universal-sentence-encoder') {
                return this._generateUSEEmbeddings(texts);
            } else if (this.modelInfo.name === 'bert') {
                return this._generateBERTEmbeddings(texts);
            } else if (this.modelInfo.name === 'openai') {
                return this._generateOpenAIEmbeddings(texts);
            } else {
                return this._generateCustomEmbeddings(texts);
            }
        } catch (error) {
            logger.error(`Error generating embeddings: ${error.message}`, { stack: error.stack });
            throw error;
        }
    }

    /**
     * Generate embeddings using Universal Sentence Encoder
     * 
     * @param {Array<string>} texts - Texts to embed
     * @returns {Promise<Array<Array<number>>>} - Embeddings
     * @private
     */
    async _generateUSEEmbeddings(texts) {
        try {
            // USE model.embed() returns a tensor
            const embeddings = await this.model.embed(texts);

            // Convert to JS array and return
            const embeddingsArray = await embeddings.array();

            // Clean up tensor
            embeddings.dispose();

            return embeddingsArray;
        } catch (error) {
            logger.error(`Error generating USE embeddings: ${error.message}`, { stack: error.stack });
            throw error;
        }
    }

    /**
     * Generate embeddings using BERT
     * 
     * @param {Array<string>} texts - Texts to embed
     * @returns {Promise<Array<Array<number>>>} - Embeddings
     * @private
     */
    async _generateBERTEmbeddings(texts) {
        try {
            // Use the TransformerModel implementation
            return await this.model.generateEmbeddings(texts);
        } catch (error) {
            logger.error(`Error generating BERT embeddings: ${error.message}`, { stack: error.stack });
            throw error;
        }
    }

    /**
     * Generate embeddings using OpenAI API
     * 
     * @param {Array<string>} texts - Texts to embed
     * @returns {Promise<Array<Array<number>>>} - Embeddings
     * @private
     */
    async _generateOpenAIEmbeddings(texts) {
        try {
            if (!this.options.openAIApiKey) {
                throw new Error('OpenAI API key is required for OpenAI embeddings');
            }

            // Use node-fetch or axios
            const fetch = require('node-fetch');

            // Call OpenAI API
            const response = await fetch('https://api.openai.com/v1/embeddings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.options.openAIApiKey}`
                },
                body: JSON.stringify({
                    model: this.options.openAIModel,
                    input: texts
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
            }

            const data = await response.json();

            // Sort results by index to ensure they match the input order
            const sortedData = data.data.sort((a, b) => a.index - b.index);

            // Extract embedding vectors
            return sortedData.map(item => item.embedding);
        } catch (error) {
            logger.error(`Error generating OpenAI embeddings: ${error.message}`, { stack: error.stack });
            throw error;
        }
    }

    /**
     * Generate embeddings using a custom model
     * 
     * @param {Array<string>} texts - Texts to embed
     * @returns {Promise<Array<Array<number>>>} - Embeddings
     * @private
     */
    async _generateCustomEmbeddings(texts) {
        try {
            // This is a placeholder - in a real implementation you would:
            // 1. Preprocess texts (tokenize, etc.)
            // 2. Convert to tensors
            // 3. Run through model
            // 4. Convert results back to JS arrays

            // For now, return random embeddings of the correct dimension
            return texts.map(() => {
                return Array(this.options.dimension).fill(0).map(() => Math.random() * 2 - 1);
            });
        } catch (error) {
            logger.error(`Error generating custom embeddings: ${error.message}`, { stack: error.stack });
            throw error;
        }
    }

    /**
     * Visualize embeddings with dimensionality reduction
     * 
     * @param {Array<string>} texts - Texts to visualize
     * @param {Object} options - Visualization options
     * @returns {Promise<Object>} - Visualization data
     */
    async visualizeEmbeddings(texts, options = {}) {
        const visOptions = {
            method: options.method || 'tsne',  // 'tsne', 'pca', or 'umap'
            dimensions: options.dimensions || 2,
            ...options
        };

        try {
            // Generate embeddings
            const embeddings = await this.getEmbeddings(texts);

            // Create input tensor
            const inputTensor = tf.tensor2d(embeddings);

            let reducedData;

            if (visOptions.method === 'pca') {
                // Perform PCA using tfjs
                const { PCA } = require('ml-pca');
                const matrix = await inputTensor.array();
                const pca = new PCA(matrix);
                reducedData = pca.predict(matrix, { nComponents: visOptions.dimensions }).data;
            }
            else if (visOptions.method === 'tsne') {
                // Use TSNE implementation
                const TSNE = require('@tensorflow/tfjs-tsne').TSNE;
                const tsne = new TSNE({
                    perplexity: visOptions.perplexity || 30,
                    dim: visOptions.dimensions,