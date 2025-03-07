/**
 * Platform Integration Utility
 * 
 * Provides utilities for integrating with various platforms and operating systems.
 * Handles OS-specific behaviors and optimizations for the neural mind map system.
 */

const os = require('os');
const path = require('path');
const fs = require('fs');
const logger = require('../log/logger');

class PlatformIntegration {
    constructor() {
        this.platform = os.platform();
        this.isWindows = this.platform === 'win32';
        this.isMacOS = this.platform === 'darwin';
        this.isLinux = this.platform === 'linux';
        this.homeDir = os.homedir();
        this.tempDir = os.tmpdir();
        this.cpuInfo = os.cpus();
        this.totalMemory = os.totalmem();
        this.gpuInfo = null;

        // Try to detect GPU information if possible
        this._detectGPU();
    }

    /**
     * Get default data directory based on platform
     * 
     * @param {string} appName - Application name for directory
     * @returns {string} - Path to data directory
     */
    getDataDirectory(appName = 'infranodus') {
        if (this.isWindows) {
            return path.join(process.env.APPDATA || this.homeDir, appName);
        } else if (this.isMacOS) {
            return path.join(this.homeDir, 'Library', 'Application Support', appName);
        } else {
            // Linux and others
            return path.join(this.homeDir, `.${appName}`);
        }
    }

    /**
     * Get temporary directory for the application
     * 
     * @param {string} appName - Application name for subdirectory
     * @returns {string} - Path to temporary directory
     */
    getTempDirectory(appName = 'infranodus') {
        const tempPath = path.join(this.tempDir, appName);

        // Create if it doesn't exist
        if (!fs.existsSync(tempPath)) {
            try {
                fs.mkdirSync(tempPath, { recursive: true });
            } catch (error) {
                logger.warn(`Failed to create temp directory: ${error.message}`);
            }
        }

        return tempPath;
    }

    /**
     * Check if TensorFlow GPU support is available
     * 
     * @returns {boolean} - Whether GPU support is available
     */
    hasTensorFlowGPUSupport() {
        try {
            // Try to load TensorFlow.js
            const tf = require('@tensorflow/tfjs-node-gpu');
            return tf.getBackend() === 'tensorflow' && tf.env().getFlags().WEBGL_VERSION > 0;
        } catch (e) {
            return false;
        }
    }

    /**
     * Get optimal thread pool size based on available CPUs
     * 
     * @param {number} factor - Factor to multiply by (default: 0.75)
     * @returns {number} - Recommended thread pool size
     */
    getOptimalThreadPoolSize(factor = 0.75) {
        const cpuCount = this.cpuInfo.length;
        return Math.max(1, Math.floor(cpuCount * factor));
    }

    /**
     * Detect if running in container environment
     * 
     * @returns {boolean} - Whether running in container
     */
    isContainerized() {
        // Check common indicators of container environments
        return fs.existsSync('/.dockerenv') || fs.existsSync('/run/.containerenv');
    }

    /**
     * Get platform-specific file path
     * 
     * @param {string} filePath - Original file path
     * @returns {string} - Platform-appropriate path
     */
    normalizePath(filePath) {
        return path.normalize(filePath);
    }

    /**
     * Check if path is accessible on this platform
     * 
     * @param {string} dirPath - Directory to check
     * @returns {boolean} - Whether path is accessible
     */
    isPathAccessible(dirPath) {
        try {
            fs.accessSync(dirPath, fs.constants.R_OK);
            return true;
        } catch (e) {
            return false;
        }
    }

    /**
     * Open a file or URL with the default application
     * 
     * @param {string} target - File path or URL to open
     * @returns {Promise<void>}
     */
    async openWithDefaultApp(target) {
        const { exec } = require('child_process');

        return new Promise((resolve, reject) => {
            let command;

            if (this.isWindows) {
                command = `start "" "${target}"`;
            } else if (this.isMacOS) {
                command = `open "${target}"`;
            } else {
                command = `xdg-open "${target}"`;
            }

            exec(command, (error) => {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            });
        });
    }

    /**
     * Detect GPU capabilities 
     * 
     * @private
     */
    _detectGPU() {
        try {
            if (this.isWindows) {
                this._detectWindowsGPU();
            } else if (this.isLinux) {
                this._detectLinuxGPU();
            } else if (this.isMacOS) {
                this._detectMacGPU();
            }
        } catch (error) {
            logger.debug(`GPU detection failed: ${error.message}`);
        }
    }

    /**
     * Detect Windows GPU
     * 
     * @private
     */
    _detectWindowsGPU() {
        const { execSync } = require('child_process');

        try {
            // Use PowerShell to get GPU info
            const output = execSync('powershell -command "Get-WmiObject win32_VideoController | Select-Object -Property Name,AdapterRAM,DriverVersion"', { encoding: 'utf8' });

            // Parse the output
            const gpuLines = output.split('\n').filter(line => line.trim().length > 0);
            if (gpuLines.length > 2) {  // Skip header lines
                this.gpuInfo = {
                    name: gpuLines[2].trim(),
                    supported: gpuLines[2].toLowerCase().includes('nvidia') || gpuLines[2].toLowerCase().includes('amd')
                };
            }
        } catch (error) {
            logger.debug(`Windows GPU detection error: ${error.message}`);
        }
    }

    /**
     * Detect Linux GPU
     * 
     * @private
     */
    _detectLinuxGPU() {
        const { execSync } = require('child_process');

        try {
            // Try lspci command
            const output = execSync('lspci | grep -i vga', { encoding: 'utf8' });

            if (output) {
                this.gpuInfo = {
                    name: output.split(':').pop().trim(),
                    supported: output.toLowerCase().includes('nvidia') || output.toLowerCase().includes('amd')
                };
            }
        } catch (error) {
            logger.debug(`Linux GPU detection error: ${error.message}`);
        }
    }

    /**
     * Detect Mac GPU
     * 
     * @private
     */
    _detectMacGPU() {
        const { execSync } = require('child_process');

        try {
            // Use system_profiler on Mac
            const output = execSync('system_profiler SPDisplaysDataType | grep Chipset', { encoding: 'utf8' });

            if (output) {
                this.gpuInfo = {
                    name: output.split(':').pop().trim(),
                    supported: true  // Most Mac GPUs support Metal which works with TensorFlow
                };
            }
        } catch (error) {
            logger.debug(`Mac GPU detection error: ${error.message}`);
        }
    }
}

// Create singleton instance
const platformIntegration = new PlatformIntegration();

module.exports = {
    platformIntegration,
    PlatformIntegration
};
