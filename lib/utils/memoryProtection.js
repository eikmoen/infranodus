/**
 * Memory Protection Utility
 * 
 * Provides monitoring and protection against out-of-memory conditions.
 */

const v8 = require('v8');
const logger = require('../log/logger');

class MemoryProtection {
    constructor(options = {}) {
        this.options = {
            warningThreshold: options.warningThreshold || 0.75, // 75% memory usage triggers warning
            criticalThreshold: options.criticalThreshold || 0.85, // 85% memory usage is critical
            checkIntervalMs: options.checkIntervalMs || 30000, // Check every 30 seconds
            enableGC: options.enableGC !== undefined ? options.enableGC : true, // Try to GC when needed
            logWarnings: options.logWarnings !== undefined ? options.logWarnings : true, // Log memory warnings
            ...options
        };

        this.logger = logger;
        this.isMonitoring = false;
        this.intervalId = null;
        this.lastWarningTime = 0;
        this.warningMinInterval = 60000; // Minimum 1 minute between repeated warnings
    }

    /**
     * Start monitoring memory usage
     */
    startMonitoring() {
        if (this.isMonitoring) return;

        this.isMonitoring = true;

        // Check immediately on start
        this.checkMemoryUsage();

        // Set up interval for periodic checks
        this.intervalId = setInterval(() => {
            this.checkMemoryUsage();
        }, this.options.checkIntervalMs);

        this.logger.info('Memory protection monitoring started');
    }

    /**
     * Stop monitoring memory usage
     */
    stopMonitoring() {
        if (!this.isMonitoring) return;

        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }

        this.isMonitoring = false;
        this.logger.info('Memory protection monitoring stopped');
    }

    /**
     * Check current memory usage and take action if necessary
     * 
     * @returns {object} Memory usage statistics
     */
    checkMemoryUsage() {
        // Get memory statistics from V8
        const stats = v8.getHeapStatistics();

        const usedHeap = stats.used_heap_size;
        const heapLimit = stats.heap_size_limit;
        const usageRatio = usedHeap / heapLimit;
        const usagePercent = Math.round(usageRatio * 100);

        const result = {
            usedHeap,
            heapLimit,
            usageRatio,
            usagePercent,
            formattedUsed: this.formatBytes(usedHeap),
            formattedLimit: this.formatBytes(heapLimit)
        };

        // Check if we need to take action
        if (usageRatio >= this.options.criticalThreshold) {
            // Critical memory usage - trigger protection
            this._handleCriticalMemory(result);
        }
        else if (usageRatio >= this.options.warningThreshold) {
            // High memory usage - issue warning
            this._handleHighMemory(result);
        }

        return result;
    }

    /**
     * Get a formatted report of current memory usage
     * 
     * @returns {object} Memory report
     */
    getMemoryReport() {
        const stats = process.memoryUsage();

        return {
            heapTotal: this.formatBytes(stats.heapTotal),
            heapUsed: this.formatBytes(stats.heapUsed),
            external: this.formatBytes(stats.external),
            rss: this.formatBytes(stats.rss),
            heapLimit: this.formatBytes(v8.getHeapStatistics().heap_size_limit),
            usagePercent: (stats.heapUsed / v8.getHeapStatistics().heap_size_limit * 100).toFixed(2) + '%'
        };
    }

    /**
     * Format bytes into a human-readable string
     * 
     * @param {number} bytes - Number of bytes
     * @param {number} decimals - Number of decimal places
     * @returns {string} Formatted string
     */
    formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];

        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    /**
     * Handle high memory usage (warning level)
     * 
     * @private
     * @param {object} memStats - Memory statistics
     */
    _handleHighMemory(memStats) {
        const now = Date.now();

        // Avoid too many warnings in a short time
        if (now - this.lastWarningTime < this.warningMinInterval) {
            return;
        }

        this.lastWarningTime = now;

        if (this.options.logWarnings) {
            this.logger.warn(`High memory usage: ${memStats.usagePercent}% of heap limit`);
        }

        // Try garbage collection if enabled
        if (this.options.enableGC && global.gc) {
            try {
                global.gc();
                if (this.options.logWarnings) {
                    this.logger.info('Forced garbage collection executed');
                }
            } catch (e) {
                this.logger.error('Failed to force garbage collection', e);
            }
        }
    }

    /**
     * Handle critical memory usage
     * 
     * @private
     * @param {object} memStats - Memory statistics
     */
    _handleCriticalMemory(memStats) {
        this.logger.error(`CRITICAL memory usage: ${memStats.usagePercent}% of heap limit`);

        // Try garbage collection if enabled
        if (this.options.enableGC && global.gc) {
            try {
                global.gc();
                this.logger.info('Emergency garbage collection executed');
            } catch (e) {
                this.logger.error('Failed to force garbage collection', e);
            }
        }

        // Emit event for application to handle
        if (global.process) {
            process.emit('memoryAlarm', {
                usagePercent: memStats.usagePercent,
                usedHeap: memStats.usedHeap,
                heapLimit: memStats.heapLimit
            });
        }
    }
}

// Create singleton instance with default options
const memoryProtection = new MemoryProtection();

module.exports = {
    memoryProtection,
    MemoryProtection
};
