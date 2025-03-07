/**
 * Neural Mind Map Integrations Configuration
 * 
 * This module provides configuration and management for integrating
 * the neural mind map with external systems like PhotoPrism and file systems.
 * It handles secrets management, persistent configuration storage, and defaults.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const EventEmitter = require('events');
const logger = require('../log/logger');

class NeuralIntegrationsConfig {
    constructor(options = {}) {
        this.options = {
            configDir: options.configDir || path.join(process.env.HOME || process.env.USERPROFILE, '.infranodus'),
            configFile: options.configFile || 'neural-integrations.json',
            encryptionKey: options.encryptionKey || process.env.NEURAL_CONFIG_KEY || 'infranodus-neural-key',
            ...options
        };

        this.events = new EventEmitter();
        this.configs = new Map();
        this.userConfigs = new Map();
        this.initialized = false;

        // Create config directory if it doesn't exist
        if (!fs.existsSync(this.options.configDir)) {
            fs.mkdirSync(this.options.configDir, { recursive: true });
        }

        // Initialize encryption
        this._initializeEncryption();
    }

    /**
     * Initialize the configuration
     * 
     * @returns {Promise<void>}
     */
    async initialize() {
        if (this.initialized) return;

        try {
            await this._loadConfigurations();
            this.initialized = true;
            logger.info('Neural integrations configuration initialized');
        } catch (error) {
            logger.error(`Failed to initialize neural integrations configuration: ${error.message}`, { stack: error.stack });
            throw error;
        }
    }

    /**
     * Get PhotoPrism configuration for a user
     * 
     * @param {string} userId - User ID
     * @returns {object|null} - PhotoPrism configuration or null if not configured
     */
    getPhotoprismConfig(userId) {
        this._ensureInitialized();

        const userConfig = this.userConfigs.get(userId);
        if (!userConfig || !userConfig.photoprism) {
            return null;
        }

        return {
            url: userConfig.photoprism.url,
            apiKey: this._decrypt(userConfig.photoprism.encryptedApiKey),
            sessionId: userConfig.photoprism.sessionId
        };
    }

    /**
     * Set PhotoPrism configuration for a user
     * 
     * @param {string} userId - User ID
     * @param {object} config - PhotoPrism configuration
     * @returns {Promise<void>}
     */
    async setPhotoprismConfig(userId, config) {
        this._ensureInitialized();

        // Validate config
        if (!config.url) {
            throw new Error('PhotoPrism URL is required');
        }

        // Get existing user config or create new one
        let userConfig = this.userConfigs.get(userId) || {};

        // Update PhotoPrism config
        userConfig.photoprism = {
            url: config.url,
            encryptedApiKey: config.apiKey ? this._encrypt(config.apiKey) : null,
            sessionId: config.sessionId || null,
            lastUpdated: new Date().toISOString()
        };

        // Store updated config
        this.userConfigs.set(userId, userConfig);

        // Save to disk
        await this._saveConfigurations();

        // Emit event
        this.events.emit('photoprismConfigUpdated', { userId });

        return true;
    }

    /**
     * Get file system integration configuration for a user
     * 
     * @param {string} userId - User ID
     * @returns {object} - File system configuration
     */
    getFileSystemConfig(userId) {
        this._ensureInitialized();

        const userConfig = this.userConfigs.get(userId);
        if (!userConfig || !userConfig.fileSystem) {
            // Return default config if user config doesn't exist
            return {
                allowedPaths: [],
                allowRecursive: true,
                maxScanDepth: 5,
                allowContentAnalysis: true,
                supportedExtensions: {
                    images: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
                    documents: ['.pdf', '.doc', '.docx', '.txt', '.md', '.html'],
                    audio: ['.mp3', '.wav', '.flac', '.ogg', '.m4a'],
                    video: ['.mp4', '.mkv', '.mov', '.avi', '.webm']
                }
            };
        }

        return userConfig.fileSystem;
    }

    /**
     * Set file system integration configuration for a user
     * 
     * @param {string} userId - User ID
     * @param {object} config - File system configuration
     * @returns {Promise<boolean>} - Success status
     */
    async setFileSystemConfig(userId, config) {
        this._ensureInitialized();

        // Get existing user config or create new one
        let userConfig = this.userConfigs.get(userId) || {};

        // Update file system config
        userConfig.fileSystem = {
            ...config,
            lastUpdated: new Date().toISOString()
        };

        // Store updated config
        this.userConfigs.set(userId, userConfig);

        // Save to disk
        await this._saveConfigurations();

        // Emit event
        this.events.emit('fileSystemConfigUpdated', { userId });

        return true;
    }

    /**
     * Get global neural mind map configuration
     * 
     * @returns {object} - Global configuration
     */
    getGlobalConfig() {
        this._ensureInitialized();

        const globalConfig = this.configs.get('global') || {};

        // Merge with default settings
        return {
            embeddingModel: globalConfig.embeddingModel || 'universal-sentence-encoder',
            useGPU: globalConfig.useGPU || false,
            maxExpansionDepth: globalConfig.maxExpansionDepth || 3,
            defaultNeuralArchitecture: globalConfig.defaultNeuralArchitecture || 'hybrid',
            memoryLimit: globalConfig.memoryLimit || 2048, // MB
            cacheEnabled: globalConfig.cacheEnabled !== false,
            logLevel: globalConfig.logLevel || 'info',
            ...globalConfig
        };
    }

    /**
     * Set global neural mind map configuration
     * 
     * @param {object} config - Global configuration
     * @returns {Promise<boolean>} - Success status
     */
    async setGlobalConfig(config) {
        this._ensureInitialized();

        // Update global config
        this.configs.set('global', {
            ...config,
            lastUpdated: new Date().toISOString()
        });

        // Save to disk
        await this._saveConfigurations();

        // Emit event
        this.events.emit('globalConfigUpdated');

        return true;
    }

    /**
     * Test PhotoPrism connection with the provided configuration
     * 
     * @param {object} config - PhotoPrism configuration to test
     * @returns {Promise<object>} - Connection test result
     */
    async testPhotoprismConnection(config) {
        const axios = require('axios');

        try {
            const headers = {};
            if (config.apiKey) {
                headers['Authorization'] = `Bearer ${config.apiKey}`;
            } else if (config.sessionId) {
                headers['X-Session-ID'] = config.sessionId;
            }

            const response = await axios.get(`${config.url}/api/v1/config`, {
                headers,
                timeout: 5000
            });

            return {
                success: true,
                version: response.data.version,
                name: response.data.name,
                users: response.data.count.users,
                photos: response.data.count.photos
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                status: error.response?.status,
                statusText: error.response?.statusText
            };
        }
    }

    /**
     * Initialize encryption for sensitive configuration values
     * 
     * @private
     */
    _initializeEncryption() {
        // Create encryption key from the provided key using SHA-256
        const hash = crypto.createHash('sha256');
        hash.update(this.options.encryptionKey);
        this.encryptionKey = hash.digest().slice(0, 32); // Use first 32 bytes for AES-256
        this.algorithm = 'aes-256-ctr';
    }

    /**
     * Encrypt sensitive value
     * 
     * @private
     * @param {string} value - Value to encrypt
     * @returns {string} - Encrypted value as hex string with IV
     */
    _encrypt(value) {
        if (!value) return null;

        // Generate random initialization vector
        const iv = crypto.randomBytes(16);

        // Create cipher
        const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);

        // Encrypt the value
        let encrypted = cipher.update(value, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        // Return IV + encrypted value
        return iv.toString('hex') + ':' + encrypted;
    }

    /**
     * Decrypt sensitive value
     * 
     * @private
     * @param {string} encrypted - Encrypted value with IV
     * @returns {string} - Decrypted value
     */
    _decrypt(encrypted) {
        if (!encrypted) return null;

        try {
            // Split IV and encrypted value
            const parts = encrypted.split(':');
            const iv = Buffer.from(parts[0], 'hex');
            const encryptedValue = parts[1];

            // Create decipher
            const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, iv);

            // Decrypt the value
            let decrypted = decipher.update(encryptedValue, 'hex', 'utf8');
            decrypted += decipher.final('utf8');

            return decrypted;
        } catch (error) {
            logger.error(`Failed to decrypt value: ${error.message}`);
            return null;
        }
    }

    /**
     * Load configurations from disk
     * 
     * @private
     * @returns {Promise<void>}
     */
    async _loadConfigurations() {
        const configPath = path.join(this.options.configDir, this.options.configFile);

        try {
            // Check if config file exists
            if (!fs.existsSync(configPath)) {
                // Create default config file
                await this._saveConfigurations();
                return;
            }

            // Read and parse config file
            const configContent = await fs.promises.readFile(configPath, 'utf8');
            const config = JSON.parse(configContent);

            // Load global configs
            if (config.globals) {
                Object.entries(config.globals).forEach(([key, value]) => {
                    this.configs.set(key, value);
                });
            }

            // Load user configs
            if (config.users) {
                Object.entries(config.users).forEach(([userId, value]) => {
                    this.userConfigs.set(userId, value);
                });
            }
        } catch (error) {
            logger.error(`Failed to load configurations: ${error.message}`, { stack: error.stack });
            throw error;
        }
    }

    /**
     * Save configurations to disk
     * 
     * @private
     * @returns {Promise<void>}
     */
    async _saveConfigurations() {
        const configPath = path.join(this.options.configDir, this.options.configFile);

        try {
            // Convert maps to objects for JSON serialization
            const config = {
                globals: Object.fromEntries(this.configs),
                users: Object.fromEntries(this.userConfigs),
                lastUpdated: new Date().toISOString()
            };

            // Write config file
            await fs.promises.writeFile(configPath, JSON.stringify(config, null, 2), 'utf8');
        } catch (error) {
            logger.error(`Failed to save configurations: ${error.message}`, { stack: error.stack });
            throw error;
        }
    }

    /**
     * Ensure the configuration is initialized
     * 
     * @private
     */
    _ensureInitialized() {
        if (!this.initialized) {
            throw new Error('Neural integrations configuration is not initialized');
        }
    }
}

// Create singleton instance
const neuralIntegrationsConfig = new NeuralIntegrationsConfig();

module.exports = {
    neuralIntegrationsConfig,
    events: neuralIntegrationsConfig.events
};
