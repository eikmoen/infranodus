/**
 * Memory Protection Utility
 * 
 * Provides mechanisms to prevent memory leaks and excessive resource usage
 * in the neural mind map system, especially when processing large datasets.
 */

const logger = require('../log/logger');
const os = require('os');

class MemoryProtection {
    constructor(options = {}) {
        this.options = {
            maxMemoryPercent: options.maxMemoryPercent || 80, // Max percentage of system memory to use
            gcThreshold: options.gcThreshold || 75, // Memory percentage to trigger GC
            monitorInterval: options.monitorInterval || 30000, // Check memory every 30 seconds
            emergencyLimit: options.emergencyLimit || 90, // Emergency cutoff percentage
            enableMonitoring: options.enableMonitoring !== false,
            ...options
        };

        this.monitoring = false;
        this.intervalId = null;
        this.callbacks = new Map();
        this.memoryStats = {
            lastCheck: Date.now(),
            totalMemory: 0,
            freeMemory: 0,
            usedMemory: 0,
            usedPercent: 0,
            warningIssued: false
        };

        // Start monitoring if enabled
        if (this.options.enableMonitoring) {
            this.startMonitoring();
        }
    }

    /**
     * Start memory monitoring
     */
    startMonitoring() {
        if (this.monitoring) return;

        this.monitoring = true;
        this.intervalId = setInterval(() => this.checkMemory(), this.options.monitorInterval);
        logger.info('Memory protection monitoring started');

        // Immediate first check
        this.checkMemory();

        return this;
    }

    /**
     * Stop memory monitoring
     */
    stopMonitoring() {
        if (!this.monitoring) return;

        clearInterval(this.intervalId);
        this.intervalId = null;
        this.monitoring = false;
        logger.info('Memory protection monitoring stopped');

        return this;
    }

    /**
     * Check current memory usage and take action if needed
     */
    checkMemory() {
        const totalMemory = os.totalmem();
        const freeMemory = os.freemem();
        const usedMemory = totalMemory - freeMemory;
        const usedPercent = (usedMemory / totalMemory) * 100;

        this.memoryStats = {
            lastCheck: Date.now(),
            totalMemory,
            freeMemory,
            usedMemory,
            usedPercent,
            warningIssued: this.memoryStats.warningIssued
        };

        // Check if we should trigger garbage collection
        if (usedPercent > this.options.gcThreshold) {
            this.suggestGarbageCollection();
        }

        // Check if we're approaching emergency limit
        if (usedPercent > this.options.emergencyLimit) {
            this.emergencyMemoryRelease();
        }
        // Issue warning if we're exceeding max memory limit
        else if (usedPercent > this.options.maxMemoryPercent && !this.memoryStats.warningIssued) {
            logger.warn(`Memory usage high: ${usedPercent.toFixed(1)}% - approaching limit of ${this.options.maxMemoryPercent}%`);
            this.memoryStats.warningIssued = true;
            this.notifyMemoryPressure('high');
        }
        // Reset warning flag when memory usage drops
        else if (usedPercent < this.options.maxMemoryPercent - 10 && this.memoryStats.warningIssued) {
            this.memoryStats.warningIssued = false;
            this.notifyMemoryPressure('normal');
        }

        return this.memoryStats;
    }

    /**
     * Suggest garbage collection if supported
     */
    suggestGarbageCollection() {
        if (global.gc) {
            logger.debug('Suggesting garbage collection');
            try {
                global.gc();
                logger.debug('Garbage collection completed');
            } catch (error) {
                logger.error('Error during garbage collection:', error);
            }
        }
    }

    /**
     * Emergency actions when memory usage is critical
     */
    emergencyMemoryRelease() {
        logger.error(`CRITICAL: Memory usage at ${this.memoryStats.usedPercent.toFixed(1)}% - above emergency limit of ${this.options.emergencyLimit}%`);

        // Notify all callbacks about critical memory pressure
        this.notifyMemoryPressure('critical');

        // Clear caches of registered components
        this.emergencyClearance();

        // Suggest garbage collection
        this.suggestGarbageCollection();
    }

    /**
     * Register a component for memory management
     * 
     * @param {string} componentId - Unique ID for the component
     * @param {object} callbacks - Object containing callback functions
     */
    registerComponent(componentId, callbacks) {
        this.callbacks.set(componentId, {
            onMemoryPressure: callbacks.onMemoryPressure || null,
            clearCache: callbacks.clearCache || null,
            getMemoryUsage: callbacks.getMemoryUsage || null
        });

        return this;
    }

    /**
     * Unregister a component
     * 
     * @param {string} componentId - Component to unregister
     */
    unregisterComponent(componentId) {
        this.callbacks.delete(componentId);
        return this;
    }

    /**
     * Notify registered components about memory pressure changes
     * 
     * @param {string} level - Pressure level ('normal', 'high', 'critical')
     */
    notifyMemoryPressure(level) {
        this.callbacks.forEach((callbacks, componentId) => {
            if (callbacks.onMemoryPressure) {
                try {
                    callbacks.onMemoryPressure(level, this.memoryStats);
                } catch (error) {
                    logger.error(`Error in memory pressure callback for ${componentId}:`, error);
                }
            }
        });
    }

    /**
     * Clear caches in emergency situations
     */
    emergencyClearance() {
        logger.warn('Performing emergency cache clearance');

        this.callbacks.forEach((callbacks, componentId) => {
            if (callbacks.clearCache) {
                try {
                    callbacks.clearCache();
                    logger.debug(`Cleared cache for ${componentId}`);
                } catch (error) {
                    logger.error(`Error clearing cache for ${componentId}:`, error);
                }
            }
        });
    }

    /**
     * Check if operation is allowed based on current memory usage
     * 
     * @param {string} operationType - Type of operation to check
     * @returns {boolean} - Whether operation should proceed
     */
    allowOperation(operationType) {
        // Check current memory status
        const stats = this.checkMemory();

        // Always prevent operations when in critical state
        if (stats.usedPercent > this.options.emergencyLimit) {
            logger.warn(`Operation ${operationType} rejected due to critical memory pressure`);
            return false;
        }

        // Differentiate by operation type
        switch (operationType) {
            case 'expansion':
                // Knowledge expansion is memory intensive
                return stats.usedPercent < this.options.maxMemoryPercent - 10;

            case 'visualization':
                // Visualization should still work under pressure but with reduced features
                return stats.usedPercent < this.options.maxMemoryPercent;

            case 'fileScanning':
                // File scanning can be memory intensive
                return stats.usedPercent < this.options.maxMemoryPercent - 15;

            default:
                // Default: allow if under max memory percent
                return stats.usedPercent < this.options.maxMemoryPercent;
        }
    }

    /**
     * Get memory stats
     * 
     * @returns {object} - Current memory statistics
     */
    getStats() {
        return { ...this.memoryStats };
    }
}

// Create singleton instance
const memoryProtection = new MemoryProtection();

module.exports = {
    memoryProtection,
    MemoryProtection
};
