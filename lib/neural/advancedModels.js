/**
 * Advanced Neural Models Integration
 * 
 * Extends neural mind map capabilities with BERT, GPT, and Granite model families,
 * providing comparative benchmarks and advanced embedding capabilities.
 */

const tf = require('@tensorflow/tfjs-node');
const axios = require('axios');
const TransformerModel = require('./transformerModel');
const logger = require('../log/logger');
const { memoryProtection } = require('../utils/memoryProtection');

class AdvancedModelRegistry {
    constructor(options = {}) {
        this.options = {
            apiKeys: {
                openai: process.env.OPENAI_API_KEY,
                anthropic: process.env.ANTHROPIC_API_KEY,
                cohere: process.env.COHERE_API_KEY,
                huggingface: process.env.HUGGINGFACE_API_KEY
            },
            useLocalModelsWhenAvailable: options.useLocalModelsWhenAvailable !== false,
            maxTokensPerRequest: options.maxTokensPerRequest || 2048,
            modelCaching: options.modelCaching !== false,
            cacheTTL: options.cacheTTL || 3600 * 24, // 24 hours
            preferredModels: options.preferredModels || {
                embedding: 'granite-13b-embedding',
                expansion: 'gpt-4',
                classification: 'bert-large'
            },
            ...options
        };

        this.models = new Map();
        this.embeddings = new Map();
        this.benchmarkResults = new Map();
        this.activeRequests = new Map();

        // Register basic models
        this._registerCoreModels();
    }

    /**
     * Get all registered models with metadata
     * 
     * @returns {Array<Object>} - Array of model information
     */
    getAvailableModels() {
        const models = [];
        for (const [id, model] of this.models.entries()) {
            models.push({
                id,
                name: model.name,
                type: model.type,
                provider: model.provider,
                embeddingDimension: model.embeddingDimension,
                contextLength: model.contextLength,
                capabilities: model.capabilities,
                isLocal: model.isLocal,
                requiresApiKey: model.requiresApiKey,
                status: model.status
            });
        }
        return models;
    }

    /**
     * Get a specific model by ID
     * 
     * @param {string} modelId - Model identifier
     * @returns {Object} - Model implementation or null if not found
     */
    async getModel(modelId) {
        // Get the model info
        const model = this.models.get(modelId);
        if (!model) {
            throw new Error(`Model not found: ${modelId}`);
        }

        // Check if model is already loaded
        if (!model.instance && model.status === 'registered') {
            // Load the model
            try {
                model.status = 'loading';
                model.instance = await this._loadModel(modelId, model);
                model.status = 'loaded';
            } catch (error) {
                model.status = 'error';
                model.error = error.message;
                throw error;
            }
        }

        return model;
    }

    /**
     * Generate text completion using a specified model
     * 
     * @param {string} modelId - Model to use
     * @param {string|Array<string>} prompt - Text prompt(s)
     * @param {Object} options - Completion options
     * @returns {Promise<Object>} - Completion results
     */
    async generateCompletion(modelId, prompt, options = {}) {
        const model = await this.getModel(modelId);

        if (!model.capabilities.includes('completion')) {
            throw new Error(`Model ${modelId} does not support text completion`);
        }

        const completionOptions = {
            maxTokens: options.maxTokens || 256,
            temperature: options.temperature ?? 0.7,
            topP: options.topP ?? 1.0,
            frequencyPenalty: options.frequencyPenalty ?? 0,
            presencePenalty: options.presencePenalty ?? 0,
            stop: options.stop || null,
            ...options
        };

        try {
            // Track active request
            const requestId = `completion-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            this.activeRequests.set(requestId, { modelId, type: 'completion', startTime: Date.now() });

            let result;

            // Handle different model types
            if (model.provider === 'openai') {
                result = await this._generateOpenAICompletion(model, prompt, completionOptions);
            } else if (model.provider === 'anthropic') {
                result = await this._generateAnthropicCompletion(model, prompt, completionOptions);
            } else if (model.provider === 'cohere') {
                result = await this._generateCohereCompletion(model, prompt, completionOptions);
            } else if (model.provider === 'local') {
                result = await this._generateLocalCompletion(model, prompt, completionOptions);
            } else if (model.provider === 'granite') {
                result = await this._generateGraniteCompletion(model, prompt, completionOptions);
            } else {
                throw new Error(`Unsupported model provider: ${model.provider}`);
            }

            // Complete request tracking
            this.activeRequests.delete(requestId);

            return result;
        } catch (error) {
            logger.error(`Error generating completion with ${modelId}: ${error.message}`, { stack: error.stack });
            throw error;
        }
    }

    /**
     * Generate embeddings for texts using a specified model
     * 
     * @param {string} modelId - Model to use
     * @param {string|Array<string>} texts - Text(s) to embed
     * @param {Object} options - Embedding options
     * @returns {Promise<Array<Array<number>>>} - Text embeddings
     */
    async generateEmbeddings(modelId, texts, options = {}) {
        const model = await this.getModel(modelId);

        if (!model.capabilities.includes('embedding')) {
            throw new Error(`Model ${modelId} does not support embedding generation`);
        }

        const embeddingOptions = {
            batchSize: options.batchSize || 16,
            normalize: options.normalize !== false,
            cacheResults: options.cacheResults !== false && this.options.modelCaching,
            ...options
        };

        // Convert single text to array
        const textArr = Array.isArray(texts) ? texts : [texts];

        // Check cache first if enabled
        const embeddings = [];
        const uncachedIndices = [];
        const uncachedTexts = [];

        if (embeddingOptions.cacheResults) {
            // Check what's already cached
            for (let i = 0; i < textArr.length; i++) {
                const text = textArr[i];
                const cacheKey = `${modelId}:${text}`;

                if (this.embeddings.has(cacheKey)) {
                    embeddings[i] = this.embeddings.get(cacheKey);
                } else {
                    uncachedIndices.push(i);
                    uncachedTexts.push(text);
                }
            }
        } else {
            // Skip cache checking, process all
            for (let i = 0; i < textArr.length; i++) {
                uncachedIndices.push(i);
                uncachedTexts.push(textArr[i]);
            }
        }

        // Generate embeddings for uncached texts
        if (uncachedTexts.length > 0) {
            try {
                // Track active request
                const requestId = `embedding-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                this.activeRequests.set(requestId, { modelId, type: 'embedding', startTime: Date.now() });

                let newEmbeddings;

                // Handle different model types
                if (model.provider === 'openai') {
                    newEmbeddings = await this._generateOpenAIEmbeddings(model, uncachedTexts, embeddingOptions);
                } else if (model.provider === 'anthropic') {
                    newEmbeddings = await this._generateAnthropicEmbeddings(model, uncachedTexts, embeddingOptions);
                } else if (model.provider === 'cohere') {
                    newEmbeddings = await this._generateCohereEmbeddings(model, uncachedTexts, embeddingOptions);
                } else if (model.provider === 'huggingface') {
                    newEmbeddings = await this._generateHuggingFaceEmbeddings(model, uncachedTexts, embeddingOptions);
                } else if (model.provider === 'local') {
                    newEmbeddings = await this._generateLocalEmbeddings(model, uncachedTexts, embeddingOptions);
                } else if (model.provider === 'granite') {
                    newEmbeddings = await this._generateGraniteEmbeddings(model, uncachedTexts, embeddingOptions);
                } else {
                    throw new Error(`Unsupported model provider: ${model.provider}`);
                }

                // Store new embeddings in cache
                if (embeddingOptions.cacheResults) {
                    for (let i = 0; i < uncachedTexts.length; i++) {
                        const text = uncachedTexts[i];
                        const embedding = newEmbeddings[i];
                        const cacheKey = `${modelId}:${text}`;
                        this.embeddings.set(cacheKey, embedding);
                    }
                }

                // Merge cached and new embeddings
                for (let i = 0; i < uncachedIndices.length; i++) {
                    embeddings[uncachedIndices[i]] = newEmbeddings[i];
                }

                // Complete request tracking
                this.activeRequests.delete(requestId);
            } catch (error) {
                logger.error(`Error generating embeddings with ${modelId}: ${error.message}`, { stack: error.stack });
                throw error;
            }
        }

        return embeddings;
    }

    /**
     * Run an objective comparison benchmark between models
     * 
     * @param {Array<string>} modelIds - Models to compare
     * @param {string} taskType - Task type ('embedding', 'completion', 'classification')
     * @param {Object} options - Benchmark options
     * @returns {Promise<Object>} - Benchmark results
     */
    async runModelComparison(modelIds, taskType, options = {}) {
        const benchmarkOptions = {
            datasetSize: options.datasetSize || 100,
            metrics: options.metrics || ['accuracy', 'latency', 'cost'],
            repetitions: options.repetitions || 3,
            timeout: options.timeout || 60000, // 1 minute
            datasetSource: options.datasetSource || 'generated',
            customDataset: options.customDataset || null,
            ...options
        };

        logger.info(`Starting model comparison benchmark for task: ${taskType}`);

        try {
            // Generate or use provided dataset
            const dataset = await this._getBenchmarkDataset(taskType, benchmarkOptions);

            // Run benchmarks for each model
            const results = {};

            for (const modelId of modelIds) {
                const model = await this.getModel(modelId);

                if (!model.capabilities.includes(taskType)) {
                    logger.warn(`Model ${modelId} does not support ${taskType}, skipping in comparison`);
                    continue;
                }

                results[modelId] = await this._benchmarkModel(model, dataset, taskType, benchmarkOptions);
            }

            // Calculate comparative metrics
            const comparison = this._analyzeComparisonResults(results, taskType, benchmarkOptions);

            // Store benchmark results
            const benchmarkId = `${taskType}-${Date.now()}`;
            this.benchmarkResults.set(benchmarkId, {
                id: benchmarkId,
                taskType,
                models: modelIds,
                options: benchmarkOptions,
                results,
                comparison,
                timestamp: new Date().toISOString()
            });

            return {
                benchmarkId,
                results,
                comparison
            };
        } catch (error) {
            logger.error(`Error running model comparison: ${error.message}`, { stack: error.stack });
            throw error;
        }
    }

    /**
     * Get detailed analysis of Granite models compared to others
     * 
     * @param {string} taskType - Task to analyze ('embedding', 'completion', 'classification')
     * @param {Array<string>} compareWith - Other model families to compare with
     * @returns {Promise<Object>} - Detailed comparison results
     */
    async getGraniteModelAnalysis(taskType, compareWith = ['openai', 'anthropic', 'cohere']) {
        // Get available Granite models for this task
        const graniteModels = Array.from(this.models.entries())
            .filter(([id, model]) => model.provider === 'granite' && model.capabilities.includes(taskType))
            .map(([id]) => id);

        if (graniteModels.length === 0) {
            throw new Error(`No Granite models available for task type: ${taskType}`);
        }

        // Get comparison models
        const comparisonModels = Array.from(this.models.entries())
            .filter(([id, model]) => compareWith.includes(model.provider) && model.capabilities.includes(taskType))
            .map(([id]) => id);

        if (comparisonModels.length === 0) {
            throw new Error(`No comparison models available for specified providers`);
        }

        // Run the comparison benchmark
        const benchmarkResults = await this.runModelComparison(
            [...graniteModels, ...comparisonModels],
            taskType,
            {
                datasetSize: 50,
                repetitions: 5,
                metrics: ['accuracy', 'latency', 'cost', 'memory', 'throughput']
            }
        );

        // Generate additional analysis for Granite specifically
        const graniteAnalysis = this._generateGraniteSpecificAnalysis(
            benchmarkResults,
            graniteModels,
            comparisonModels
        );

        return {
            ...benchmarkResults,
            graniteAnalysis
        };
    }

    /**
     * Register a new model with the registry
     * 
     * @param {string} modelId - Unique model identifier
     * @param {Object} modelInfo - Model metadata and configuration
     * @returns {boolean} - Success status
     */
    registerModel(modelId, modelInfo) {
        if (this.models.has(modelId)) {
            throw new Error(`Model already registered with ID: ${modelId}`);
        }

        this.models.set(modelId, {
            id: modelId,
            name: modelInfo.name || modelId,
            type: modelInfo.type || 'unknown',
            provider: modelInfo.provider || 'custom',
            embeddingDimension: modelInfo.embeddingDimension || 768,
            contextLength: modelInfo.contextLength || 2048,
            capabilities: modelInfo.capabilities || [],
            isLocal: modelInfo.isLocal || false,
            requiresApiKey: modelInfo.requiresApiKey !== false,
            status: 'registered',
            config: modelInfo.config || {},
            modelPath: modelInfo.modelPath || null
        });

        logger.info(`Registered model: ${modelId} (${modelInfo.name})`);
        return true;
    }

    /**
     * Unregister and clean up a model
     * 
     * @param {string} modelId - Model to remove
     * @returns {boolean} - Success status
     */
    unregisterModel(modelId) {
        const model = this.models.get(modelId);
        if (!model) {
            return false;
        }

        // Clean up model instance if it exists
        if (model.instance) {
            if (typeof model.instance.dispose === 'function') {
                model.instance.dispose();
            }
        }

        // Remove from models registry
        this.models.delete(modelId);

        // Clean up embeddings cache for this model
        const cacheKeysToDelete = [];
        for (const key of this.embeddings.keys()) {
            if (key.startsWith(`${modelId}:`)) {
                cacheKeysToDelete.push(key);
            }
        }

        cacheKeysToDelete.forEach(key => this.embeddings.delete(key));

        logger.info(`Unregistered model: ${modelId}`);
        return true;
    }

    /**
     * Register core built-in models
     * 
     * @private
     */
    _registerCoreModels() {
        // OpenAI Models
        if (this.options.apiKeys.openai) {
            this.registerModel('gpt-4', {
                name: 'GPT-4',
                type: 'large-language-model',
                provider: 'openai',
                embeddingDimension: 1536,
                contextLength: 8192,
                capabilities: ['completion', 'chat'],
                requiresApiKey: true
            });

            this.registerModel('gpt-3.5-turbo', {
                name: 'GPT-3.5 Turbo',
                type: 'large-language-model',
                provider: 'openai',
                embeddingDimension: 1536,
                contextLength: 4096,
                capabilities: ['completion', 'chat'],
                requiresApiKey: true
            });

            this.registerModel('text-embedding-ada-002', {
                name: 'Ada Embeddings',
                type: 'embedding-model',
                provider: 'openai',
                embeddingDimension: 1536,
                capabilities: ['embedding'],
                requiresApiKey: true
            });
        }

        // Anthropic Models
        if (this.options.apiKeys.anthropic) {
            this.registerModel('claude-2', {
                name: 'Claude 2',
                type: 'large-language-model',
                provider: 'anthropic',
                contextLength: 100000,
                capabilities: ['completion', 'chat'],
                requiresApiKey: true
            });
        }

        // Cohere Models
        if (this.options.apiKeys.cohere) {
            this.registerModel('cohere-embed-english-v3.0', {
                name: 'Cohere Embed English',
                type: 'embedding-model',
                provider: 'cohere',
                embeddingDimension: 1024,
                capabilities: ['embedding'],
                requiresApiKey: true
            });
        }

        // Hugging Face Models
        if (this.options.apiKeys.huggingface) {
            this.registerModel('sentence-transformers/all-mpnet-base-v2', {
                name: 'MPNet Base',
                type: 'embedding-model',
                provider: 'huggingface',
                embeddingDimension: 768,
                capabilities: ['embedding'],
                requiresApiKey: true
            });
        }

        // Local Models
        if (this.options.useLocalModelsWhenAvailable) {
            this.registerModel('bert-base-uncased', {
                name: 'BERT Base Uncased',
                type: 'language-model',
                provider: 'local',
                embeddingDimension: 768,
                capabilities: ['embedding', 'classification'],
                isLocal: true,
                modelPath: './models/bert-base-uncased'
            });

            this.registerModel('distilbert', {
                name: 'DistilBERT',
                type: 'language-model',
                provider: 'local',
                embeddingDimension: 768,
                capabilities: ['embedding', 'classification'],
                isLocal: true,
                modelPath: './models/distilbert'
            });
        }

        // Granite Models (for comparison)
        this.registerModel('granite-13b-embeddings', {
            name: 'Granite 13B Embeddings',
            type: 'embedding-model',
            provider: 'granite',
            embeddingDimension: 4096,
            capabilities: ['embedding'],
            requiresApiKey: true
        });

        this.registerModel('granite-34b-instruct', {
            name: 'Granite 34B Instruct',
            type: 'large-language-model',
            provider: 'granite',
            contextLength: 8192,
            capabilities: ['completion', 'chat'],
            requiresApiKey: true
        });
    }

    /**
     * Load a specific model instance
     * 
     * @private
     * @param {string} modelId - Model ID to load
     * @param {Object} modelInfo - Model configuration
     * @returns {Promise<Object>} - Loaded model instance
     */
    async _loadModel(modelId, modelInfo) {
        if (modelInfo.isLocal) {
            // Load local model
            if (modelInfo.type === 'language-model') {
                // For BERT-like models
                if (modelId.includes('bert')) {
                    return this._loadLocalBertModel(modelInfo);
                }
            }

            throw new Error(`Unsupported local model type: ${modelInfo.type}`);
        } else {
            // For remote API models, we don't need to load anything specific
            // Just return a simple API client configuration
            return {
                modelId,
                provider: modelInfo.provider,
                apiKey: this.options.apiKeys[modelInfo.provider]
            };
        }
    }

    /**
     * Load a local BERT model
     * 
     * @private
     * @param {Object} modelInfo - Model configuration
     * @returns {Promise<Object>} - Loaded BERT model
     */
    async _loadLocalBertModel(modelInfo) {
        // Create a BERT model instance based on TransformerModel
        const bert = new TransformerModel({
            embeddingDimension: modelInfo.embeddingDimension,
            usePretrainedModel: true,
            pretrainedModelPath: modelInfo.modelPath
        });

        // Initialize the model
        await bert.initialize();

        return bert;
    }

    /**
     * Generate embeddings with an OpenAI model
     * 
     * @private
     * @param {Object} model - Model information
     * @param {Array<string>} texts - Texts to embed
     * @param {Object} options - Embedding options
     * @returns {Promise<Array<Array<number>>>} - Generated embeddings
     */
    async _generateOpenAIEmbeddings(model, texts, options) {
        const { Configuration, OpenAIApi } = require('openai');

        const configuration = new Configuration({
            apiKey: this.options.apiKeys.openai,
        });
        const openai = new OpenAIApi(configuration);

        const embeddings = [];

        // Process in batches to avoid rate limits
        for (let i = 0; i < texts.length; i += options.batchSize) {
            const batch = texts.slice(i, Math.min(i + options.batchSize, texts.length));

            const response = await openai.createEmbedding({
                model: model.id,
                input: batch,
            });

            // Extract embeddings from response
            const batchEmbeddings = response.data.data.map(item => item.embedding);
            embeddings.push(...batchEmbeddings);
        }

        return embeddings;
    }

    /**
     * Generate embeddings with a Cohere model
     * 
     * @private
     * @param {Object} model - Model information
     * @param {Array<string>} texts - Texts to embed
     * @param {Object} options - Embedding options
     * @returns {Promise<Array<Array<number>>>} - Generated embeddings
     */
    async _generateCohereEmbeddings(model, texts, options) {
        const cohere = require('cohere-ai');
        cohere.init(this.options.apiKeys.cohere);

        const embeddings = [];

        // Process in batches to avoid rate limits
        for (let i = 0; i < texts.length; i += options.batchSize) {
            const batch = texts.slice(i, Math.min(i + options.batchSize, texts.length));

            const response = await cohere.embed({
                texts: batch,
                model: model.id
            });

            // Extract embeddings from response
            embeddings.push(...response.body.embeddings);
        }

        return embeddings;
    }

    /**
     * Generate embeddings with a local model
     * 
     * @private
     * @param {Object} model - Model information
     * @param {Array<string>} texts - Texts to embed
     * @param {Object} options - Embedding options
     * @returns {Promise<Array<Array<number>>>} - Generated embeddings
     */
    async _generateLocalEmbeddings(model, texts, options) {
        // For TransformerModel (BERT) models
        if (model.instance instanceof TransformerModel) {
            return model.instance.generateEmbeddings(texts, {
                batchSize: options.batchSize,
                poolingStrategy: 'cls'
            });
        }

        throw new Error(`Unsupported local model for embeddings: ${model.id}`);
    }

    /**
     * Generate embeddings with a Granite model
     * 
     * @private
     * @param {Object} model - Model information
     * @param {Array<string>} texts - Texts to embed
     * @param {Object} options - Embedding options
     * @returns {Promise<Array<Array<number>>>} - Generated embeddings
     */
    async _generateGraniteEmbeddings(model, texts, options) {
        // Here we would implement the specific API calls for Granite models
        // Since they're fictional in this context, we'll simulate with a realistic implementation

        const mockGraniteApi = {
            async generateEmbeddings(texts, modelConfig, options) {
                // Simulate Granite embeddings with appropriate structure and dimensions
                return texts.map(_ => {
                    // Generate embedding with the correct dimension
                    return Array(modelConfig.embeddingDimension).fill(0)
                        .map(() => (Math.random() - 0.5) * 0.1); // Small values centered around 0
                });
            }
        };

        // Generate embeddings with mock API
        const embeddings = await mockGraniteApi.generateEmbeddings(texts, {
            embeddingDimension: model.embeddingDimension
        }, options);

        // If requested, normalize embeddings to unit length
        if (options.normalize) {
            return embeddings.map(embedding => {
                const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
                return embedding.map(val => val / magnitude);
            });
        }

        return embeddings;
    }

    /**
     * Generate text completion with a Granite model
     * 
     * @private
     * @param {Object} model - Model information
     * @param {string|Array<string>} prompt - Text prompt
     * @param {Object} options - Completion options
     * @returns {Promise<Object>} - Completion result
     */
    async _generateGraniteCompletion(model, prompt, options) {
        // Mock implementation since Granite is fictional here
        const completion = `This is a simulated response from the ${model.name} model. 
In a real implementation, this would be an actual API call to a Granite model endpoint
with appropriate authentication and format handling.

The Granite model family particularly excels at:
- Coherent multi-turn dialogue
- Accurate information retrieval and synthesis
- Following complex instructions
- Generating structured content
- Maintaining context over long sequences

Compared to other models, Granite achieves better performance with similar parameter counts
through architectural innovations and improved training methodology.`;

        // Calculate token counts (simplified estimation)
        const inputTokens = prompt.length / 4; // Rough approximation
        const outputTokens = completion.length / 4;

        return {
            completion,
            usage: {
                promptTokens: Math.ceil(inputTokens),
                completionTokens: Math.ceil(outputTokens),
                totalTokens: Math.ceil(inputTokens + outputTokens)
            },
            model: model.id
        };
    }

    /**
     * Generate a benchmark dataset
     * 
     * @private
     * @param {string} taskType - Type of task
     * @param {Object} options - Benchmark options
     * @returns {Promise<Object>} - Dataset for benchmarking
     */
    async _getBenchmarkData