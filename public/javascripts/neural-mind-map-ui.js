/**
 * Neural Mind Map UI Controller
 * 
 * Handles the UI interactions for the neural mind map visualization system,
 * including file and PhotoPrism integrations.
 */

class NeuralMindMapUI {
    constructor() {
        this.visualization = null;
        this.activeContext = null;
        this.activeScanId = null;
        this.currentMindMap = null;
        this.isLoading = false;
        this.photoprismConnected = false;

        // Initialize the UI
        this._initUI();
    }

    /**
     * Initialize the UI components and event handlers
     */
    _initUI() {
        // Visualization container
        this.container = document.getElementById('neuralMindMapVis');

        // Initialize visualization with placeholder
        this._showPlaceholder();

        // Check PhotoPrism connection status
        this._checkPhotoprismConnection();

        // Add event listeners
        this._setupEventListeners();
    }

    /**
     * Set up all event listeners for UI interactions
     */
    _setupEventListeners() {
        // Context tab listeners
        document.getElementById('generateMindMapBtn').addEventListener('click', () => this._generateMindMap());
        document.getElementById('evolveMindMapBtn').addEventListener('click', () => this._evolveMindMap());

        // File tab listeners
        document.getElementById('scanDirectoryBtn').addEventListener('click', () => this._scanDirectory());

        // PhotoPrism tab listeners
        document.getElementById('scanPhotoprismBtn').addEventListener('click', () => this._scanPhotoprism());
        document.getElementById('connectPhotoprismBtn').addEventListener('click', () => this._connectPhotoprism());

        // Visualization control listeners
        document.getElementById('layoutSelect').addEventListener('change', (e) => this._changeLayout(e.target.value));
        document.getElementById('themeSelect').addEventListener('change', (e) => this._changeTheme(e.target.value));
        document.getElementById('zoomInBtn').addEventListener('click', () => this._zoomIn());
        document.getElementById('zoomOutBtn').addEventListener('click', () => this._zoomOut());
        document.getElementById('zoomFitBtn').addEventListener('click', () => this._zoomFit());
        document.getElementById('fullscreenBtn').addEventListener('click', () => this._toggleFullscreen());
        document.getElementById('exportBtn').addEventListener('click', () => this._showExportModal());

        // Export modal listeners
        document.getElementById('exportFormat').addEventListener('change', (e) => {
            const pngOptions = document.getElementById('pngOptions');
            pngOptions.classList.toggle('d-none', e.target.value !== 'png');
        });
        document.getElementById('downloadExportBtn').addEventListener('click', () => this._exportVisualization());

        // Context selection change
        document.getElementById('contextSelect').addEventListener('change', (e) => {
            this.activeContext = e.target.value;
        });
    }

    /**
     * Generate a neural mind map for the selected context
     */
    async _generateMindMap() {
        const contextName = document.getElementById('contextSelect').value;

        if (!contextName) {
            this._showNotification('Please select a context', 'warning');
            return;
        }

        // Get options from UI
        const options = {
            expansionDepth: parseInt(document.getElementById('expansionDepth').value),
            neuralArchitecture: document.getElementById('neuralArchitecture').value,
            includeMetaInsights: document.getElementById('includeMetaInsights').checked,
            temporalModeling: document.getElementById('temporalModeling').checked,
            expandKnowledge: true // Always expand knowledge for better results
        };

        this._showLoading('Generating neural mind map...');

        try {
            const response = await fetch('/api/neural-mind/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contextName,
                    options
                })
            });

            if (!response.ok) {
                throw new Error(`Failed to generate mind map: ${response.statusText}`);
            }

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Unknown error generating mind map');
            }

            this.currentMindMap = data.mindMap;

            // Render the visualization
            this._renderMindMap(data.mindMap);

            // Update insights tab
            this._updateInsights(data.mindMap.insights);

            this._hideLoading();
            this._showNotification('Neural mind map generated successfully', 'success');

        } catch (error) {
            this._hideLoading();
            this._showNotification(`Error: ${error.message}`, 'danger');
            console.error('Error generating mind map:', error);
        }
    }

    /**
     * Evolve the current mind map
     */
    async _evolveMindMap() {
        if (!this.currentMindMap || !this.activeContext) {
            this._showNotification('No active mind map to evolve', 'warning');
            return;
        }

        this._showLoading('Evolving neural mind map...');

        try {
            const evolutionOptions = {
                creativityFactor: 0.7,
                evolutionSteps: 2,
                preserveCoreConcepts: true,
                introduceNovelConcepts: true
            };

            const response = await fetch('/api/neural-mind/evolve', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contextName: this.activeContext,
                    options: evolutionOptions
                })
            });

            if (!response.ok) {
                throw new Error(`Failed to evolve mind map: ${response.statusText}`);
            }

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Unknown error evolving mind map');
            }

            this.currentMindMap = data.mindMap;

            // Render the visualization
            this._renderMindMap(data.mindMap);

            // Update insights tab
            this._updateInsights(data.mindMap.insights);

            this._hideLoading();
            this._showNotification('Neural mind map evolved successfully', 'success');

        } catch (error) {
            this._hideLoading();
            this._showNotification(`Error: ${error.message}`, 'danger');
            console.error('Error evolving mind map:', error);
        }
    }

    /**
     * Scan a directory to create a neural mind map
     */
    async _scanDirectory() {
        const directoryPath = document.getElementById('directoryPath').value;
        const contextName = document.getElementById('fileContextName').value;

        if (!directoryPath || !contextName) {
            this._showNotification('Directory path and context name are required', 'warning');
            return;
        }

        // Get options from UI
        const options = {
            recursive: document.getElementById('recursiveScan').checked,
            extractMetadata: document.getElementById('extractMetadata').checked,
            analyzeContent: document.getElementById('analyzeContent').checked
        };

        try {
            const response = await fetch('/api/neural-files/scan', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    directoryPath,
                    contextName,
                    options
                })
            });

            if (!response.ok) {
                throw new Error(`Failed to start scan: ${response.statusText}`);
            }

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Unknown error starting scan');
            }

            this.activeScanId = data.scanId;

            // Show scan status UI
            const scanStatusEl = document.querySelector('.scan-status');
            scanStatusEl.classList.remove('d-none');

            // Start polling for scan status
            this._pollScanStatus();

            this._showNotification('Directory scan started', 'info');

        } catch (error) {
            this._showNotification(`Error: ${error.message}`, 'danger');
            console.error('Error scanning directory:', error);
        }
    }

    /**
     * Poll for scan status updates
     */
    async _pollScanStatus() {
        if (!this.activeScanId) return;

        try {
            const response = await fetch(`/api/neural-files/scan/${this.activeScanId}`);

            if (!response.ok) {
                throw new Error(`Failed to get scan status: ${response.statusText}`);
            }

            const data = await response.json();

            // Update progress UI
            const progressBar = document.querySelector('.progress-bar');
            const statusText = document.getElementById('scanStatusText');

            progressBar.style.width = `${data.progress}%`;
            statusText.textContent = `${data.status}: ${data.filesScanned}/${data.filesTotal} files processed`;

            // Check if scan is complete
            if (data.status === 'completed') {
                this._showNotification('Scan completed successfully', 'success');
                statusText.textContent = `Scan completed: ${data.filesScanned} files processed`;

                // Create mind map from scan
                await this._createMindMapFromScan();
                return;
            } else if (data.status === 'failed') {
                this._showNotification(`Scan failed: ${data.error}`, 'danger');
                statusText.textContent = `Scan failed: ${data.error}`;
                return;
            }

            // Continue polling
            setTimeout(() => this._pollScanStatus(), 1000);

        } catch (error) {
            this._showNotification(`Error: ${error.message}`, 'danger');
            console.error('Error polling scan status:', error);
        }
    }

    /**
     * Create a mind map from scan results
     */
    async _createMindMapFromScan() {
        if (!this.activeScanId) return;

        this._showLoading('Creating neural mind map from scan results...');

        try {
            const response = await fetch('/api/neural-files/mindmap', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    scanId: this.activeScanId,
                    options: {
                        includeMetaInsights: true,
                        clusterFiles: true,
                        fileNodeSize: 'proportional',
                        highlightImportantFiles: true
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`Failed to create mind map: ${response.statusText}`);
            }

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Unknown error creating mind map');
            }

            // Get the full mind map data
            const mindmapId = data.mindMap.id;
            const mindmapResponse = await fetch(`/api/neural-files/mindmap/${mindmapId}`);

            if (!mindmapResponse.ok) {
                throw new Error(`Failed to fetch mind map data: ${mindmapResponse.statusText}`);
            }

            const mindmapData = await mindmapResponse.json();

            this.currentMindMap = data.mindMap;

            // Render the visualization
            this._renderFileBasedMindMap(mindmapData.visualization);

            // Update insights tab
            this._updateInsights(data.mindMap.insights);

            this._hideLoading();
            this._showNotification('Neural mind map created from files', 'success');

            // Reset scan status
            document.querySelector('.scan-status').classList.add('d-none');

        } catch (error) {
            this._hideLoading();
            this._