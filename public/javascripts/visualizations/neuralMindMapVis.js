/**
 * Neural Mind Map Visualization
 * 
 * Advanced D3.js-based visualization for neural mind maps that renders
 * multi-layer concept networks with cluster highlighting, focus+context,
 * and interactive exploration features.
 */

class NeuralMindMapVis {
    constructor(container, options = {}) {
        this.container = typeof container === 'string' ?
            document.getElementById(container) : container;

        if (!this.container) {
            throw new Error('Container element not found');
        }

        this.options = {
            width: options.width || this.container.clientWidth || 800,
            height: options.height || this.container.clientHeight || 600,
            margin: options.margin || { top: 20, right: 20, bottom: 20, left: 20 },
            nodeRadius: options.nodeRadius || { min: 5, max: 20 },
            linkWidth: options.linkWidth || { min: 1, max: 5 },
            colors: options.colors || d3.schemeCategory10,
            transitionDuration: options.transitionDuration || 750,
            enableZoom: options.enableZoom !== false,
            clusterHulls: options.clusterHulls !== false,
            neuralLayers: options.neuralLayers !== false,
            pulseAnimations: options.pulseAnimations || false,
            nodeLabels: options.nodeLabels || 'auto',  // 'auto', 'always', 'hover', 'none'
            theme: options.theme || 'light', // 'light', 'dark'
            highlightOnHover: options.highlightOnHover !== false,
            ...options
        };

        // Set up the SVG container
        this._initSvg();

        // Initialize force simulation
        this._initForceSimulation();

        // Create visual elements
        this._createVisualElements();

        // Set up event handlers
        this._setupEventHandlers();

        // Data storage
        this.mindMap = null;
        this.nodes = [];
        this.links = [];
        this.clusters = [];
        this.layers = [];

        // UI state
        this.selectedNode = null;
        this.highlightedNodes = new Set();
        this.highlightedLinks = new Set();
        this.expandedClusters = new Set();
        this.zoomState = { scale: 1, translate: [0, 0] };
        this.activeLayer = -1; // -1 means all layers visible

        // Apply theme
        this._applyTheme();
    }

    /**
     * Render a neural mind map
     * 
     * @param {Object} mindMap - Neural mind map data
     * @param {Object} options - Rendering options
     */
    render(mindMap, options = {}) {
        this.mindMap = mindMap;

        // Merge rendering options
        const renderOptions = {
            focusNode: options.focusNode || null,
            activeLayer: options.activeLayer || -1,
            highlightClusters: options.highlightClusters,
            animate: options.animate !== false,
            layout: options.layout || 'neural', // 'force', 'neural', 'radial', 'hierarchical'
            ...options
        };

        // Process the mind map data
        this._processData();

        // Update the active layer
        this.activeLayer = renderOptions.activeLayer;

        // Update the visualization
        this._updateVisualization(renderOptions);

        return this;
    }

    /**
     * Focus on a specific node
     * 
     * @param {String} nodeId - ID of the node to focus on
     * @param {Object} options - Focus options
     */
    focusNode(nodeId, options = {}) {
        const node = this.nodes.find(n => n.id === nodeId);
        if (!node) return;

        this.selectedNode = node;

        const focusOptions = {
            zoom: options.zoom !== false,
            highlightConnections: options.highlightConnections !== false,
            transitionDuration: options.transitionDuration || this.options.transitionDuration,
            ...options
        };

        // Highlight connections
        if (focusOptions.highlightConnections) {
            this.highlightedNodes.clear();
            this.highlightedLinks.clear();

            this.highlightedNodes.add(node.id);

            // Find all connected links and nodes
            this.links.forEach(link => {
                if (link.source.id === node.id || link.target.id === node.id) {
                    this.highlightedLinks.add(link.id);
                    this.highlightedNodes.add(link.source.id);
                    this.highlightedNodes.add(link.target.id);
                }
            });

            this._updateHighlighting();
        }

        // Zoom to node if requested
        if (focusOptions.zoom) {
            this._zoomToNode(node, focusOptions.transitionDuration);
        }

        // Trigger event
        this._triggerEvent('nodeFocus', { node });

        return this;
    }

    /**
     * Filter visualization to show only specific layer(s)
     * 
     * @param {Number|Array} layerIds - Layer ID or array of layer IDs to show
     * @param {Object} options - Filtering options
     */
    filterLayers(layerIds, options = {}) {
        this.activeLayer = layerIds;

        const filterOptions = {
            transitionDuration: options.transitionDuration || this.options.transitionDuration,
            maintainOtherLayers: options.maintainOtherLayers || false,
            highlightLayerConnections: options.highlightLayerConnections !== false,
            ...options
        };

        // Update node and link visibility based on layer
        this._updateLayerVisibility(filterOptions);

        // Trigger event
        this._triggerEvent('layerFilter', { layers: layerIds });

        return this;
    }

    /**
     * Highlight a specific cluster
     * 
     * @param {String} clusterId - ID of the cluster to highlight
     * @param {Object} options - Highlighting options
     */
    highlightCluster(clusterId, options = {}) {
        const cluster = this.clusters.find(c => c.id === clusterId);
        if (!cluster) return;

        const highlightOptions = {
            exclusive: options.exclusive || false,
            expandCluster: options.expandCluster !== false,
            zoomToCluster: options.zoomToCluster || false,
            highlightIntensity: options.highlightIntensity || 0.8,
            ...options
        };

        // Clear existing highlights if exclusive
        if (highlightOptions.exclusive) {
            this.highlightedNodes.clear();
            this.highlightedLinks.clear();
            this.expandedClusters.clear();
        }

        // Highlight cluster nodes
        cluster.nodes.forEach(nodeId => {
            this.highlightedNodes.add(nodeId);
        });

        // Highlight internal links
        this.links.forEach(link => {
            const sourceInCluster = cluster.nodes.includes(link.source.id);
            const targetInCluster = cluster.nodes.includes(link.target.id);

            if (sourceInCluster && targetInCluster) {
                this.highlightedLinks.add(link.id);
            }
        });

        // Mark cluster as expanded
        if (highlightOptions.expandCluster) {
            this.expandedClusters.add(cluster.id);
            this._updateClusterHulls();
        }

        // Update highlighting
        this._updateHighlighting();

        // Zoom to cluster if requested
        if (highlightOptions.zoomToCluster) {
            this._zoomToNodes(
                this.nodes.filter(n => cluster.nodes.includes(n.id)),
                this.options.transitionDuration
            );
        }

        // Trigger event
        this._triggerEvent('clusterHighlight', { cluster });

        return this;
    }

    /**
     * Toggle fullscreen mode
     * 
     * @param {Boolean} fullscreen - Whether to enter or exit fullscreen
     */
    toggleFullscreen(fullscreen) {
        const isFullscreen = fullscreen !== undefined ?
            fullscreen : !this._isFullscreen;

        if (isFullscreen) {
            // Enter fullscreen
            if (this.container.requestFullscreen) {
                this.container.requestFullscreen();
            } else if (this.container.mozRequestFullScreen) {
                this.container.mozRequestFullScreen();
            } else if (this.container.webkitRequestFullscreen) {
                this.container.webkitRequestFullscreen();
            } else if (this.container.msRequestFullscreen) {
                this.container.msRequestFullscreen();
            }

            this._isFullscreen = true;
        } else {
            // Exit fullscreen
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.mozCancelFullScreen) {
                document.mozCancelFullScreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            }

            this._isFullscreen = false;
        }

        // Resize visualization after toggling fullscreen
        setTimeout(() => this.resize(), 100);

        return this;
    }

    /**
     * Resize the visualization
     * 
     * @param {Object} dimensions - New dimensions
     */
    resize(dimensions = {}) {
        const width = dimensions.width || this.container.clientWidth || this.options.width;
        const height = dimensions.height || this.container.clientHeight || this.options.height;

        this.options.width = width;
        this.options.height = height;

        // Update SVG dimensions
        this.svg
            .attr('width', width)
            .attr('height', height);

        // Update the force layout
        this.simulation
            .force('center', d3.forceCenter(width / 2, height / 2));

        // Update the visualization
        this._updateVisualization({ animate: false });

        return this;
    }

    /**
     * Export the visualization as SVG or PNG
     * 
     * @param {String} format - Export format ('svg' or 'png')
     * @param {Object} options - Export options
     * @returns {String|Blob} - Exported data
     */
    export(format = 'svg', options = {}) {
        const exportOptions = {
            filename: options.filename || 'neural-mind-map',
            width: options.width || this.options.width,
            height: options.height || this.options.height,
            dpi: options.dpi || 300,
            includeStyles: options.includeStyles !== false,
            ...options
        };

        if (format === 'svg') {
            // Clone the SVG
            const clonedSvg = this.svg.node().cloneNode(true);

            // Add inline styles if requested
            if (exportOptions.includeStyles) {
                this._inlineStyles(clonedSvg);
            }

            // Generate SVG string
            const serializer = new XMLSerializer();
            let svgString = serializer.serializeToString(clonedSvg);

            // Add XML declaration
            svgString = '<?xml version="1.0" standalone="no"?>\r\n' + svgString;

            // Create download if filename is provided
            if (options.download) {
                const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
                const url = URL.createObjectURL(blob);

                const link = document.createElement('a');
                link.href = url;
                link.download = `${exportOptions.filename}.svg`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                setTimeout(() => URL.revokeObjectURL(url), 100);
            }

            return svgString;
        } else if (format === 'png') {
            // Create a canvas
            const canvas = document.createElement('canvas');
            const scale = exportOptions.dpi / 96; // Standard screen DPI is 96
            canvas.width = exportOptions.width * scale;
            canvas.height = exportOptions.height * scale;
            const context = canvas.getContext('2d');

            // Fill with background color
            context.fillStyle = this.options.theme === 'dark' ? '#1a1a1a' : '#ffffff';
            context.fillRect(0, 0, canvas.width, canvas.height);

            // Get SVG as data URL
            const serializer = new XMLSerializer();
            const svgString = serializer.serializeToString(this.svg.node());
            const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
            const DOMURL = window.URL || window.webkitURL || window;
            const svgUrl = DOMURL.createObjectURL(svgBlob);

            // Draw SVG on canvas
            const img = new Image();

            return new Promise((resolve, reject) => {
                img.onload = () => {
                    context.drawImage(img, 0, 0, canvas.width, canvas.height);
                    DOMURL.revokeObjectURL(svgUrl);

                    try {
                        if (options.download) {
                            canvas.toBlob((blob) => {
                                const url = URL.createObjectURL(blob);
                                const link = document.createElement('a');
                                link.href = url;
                                link.download = `${exportOptions.filename}.png`;
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                                setTimeout(() => URL.revokeObjectURL(url), 100);
                                resolve(blob);
                            });
                        } else {
                            resolve(canvas.toDataURL('image/png'));
                        }
                    } catch (e) {
                        reject(e);
                    }
                };

                img.onerror = reject;
                img.src = svgUrl;
            });
        }

        throw new Error(`Unsupported export format: ${format}`);
    }

    // Private methods

    /**
     * Initialize SVG container
     * 
     * @private
     */
    _initSvg() {
        const { width, height, margin } = this.options;

        // Create SVG element
        this.svg = d3.select(this.container)
            .append('svg')
            .attr('width', width)
            .attr('height', height)
            .attr('class', 'neural-mind-map')
            .attr('aria-label', 'Neural mind map visualization');

        // Create defs for markers and patterns
        this.defs = this.svg.append('defs');

        // Create arrow marker for directed links
        this.defs.append('marker')
            .attr('id', 'neural-arrow')
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 20)
            .attr('refY', 0)
            .attr('markerWidth', 6)
            .attr('markerHeight', 6)
            .attr('orient', 'auto')
            .append('path')
            .attr('d', 'M0,-5L10,0L0,5')
            .attr('class', 'marker-path');

        // Create neural glow filter
        const filter = this.defs.append('filter')
            .attr('id', 'neural-glow')
            .attr('x', '-50%')
            .attr('y', '-50%')
            .attr('width', '200%')
            .attr('height', '200%');

        filter.append('feGaussianBlur')
            .attr('stdDeviation', '3')
            .attr('result', 'blur');

        filter.append('feComposite')
            .attr('in', 'SourceGraphic')
            .attr('in2', 'blur')
            .attr('operator', 'over');

        // Create main group for pan/zoom
        this.mainGroup = this.svg.append('g')
            .attr('class', 'main-group');

        // Create groups for different visualization elements
        this.layerGroup = this.mainGroup.append('g')
            .attr('class', 'layer-group');

        this.hullGroup = this.mainGroup.append('g')
            .attr('class', 'hull-group');

        this.linkGroup = this.mainGroup.append('g')
            .attr('class', 'link-group');

        this.nodeGroup = this.mainGroup.append('g')
            .attr('class', 'node-group');

        this.labelGroup = this.mainGroup.append('g')
            .attr('class', 'label-group');

        // Set up zoom behavior
        if (this.options.enableZoom) {
            this.zoom = d3.zoom()
                .scaleExtent([0.1, 10])
                .on('zoom', (event) => {
                    this.mainGroup.attr('transform', event.transform);
                    this.zoomState = {
                        scale: event.transform.k,
                        translate: [event.transform.x, event.transform.y]
                    };
                    this._updateLabelsVisibility();
                });

            this.svg.call(this.zoom);
        }
    }

    /**
     * Initialize force simulation
     * 
     * @private
     */
    _initForceSimulation() {
        const { width, height } = this.options;

        this.simulation = d3.forceSimulation()
            .force('center', d3.forceCenter(width / 2, height / 2))
            .force('charge', d3.forceManyBody().strength(-100))
            .force('collide', d3.forceCollide().radius(d => d.radius * 1.5))
            .force('link', d3.forceLink().id(d => d.id).distance(100))
            .on('tick', () => this._updatePositions());
    }

    /**
     * Create visual elements
     * 
     * @private
     */
    _createVisualElements() {
        // Neural pulse animation
        if (this.options.pulseAnimations) {
            const pulseAnimation = this.defs.append('radialGradient')
                .attr('id', 'neural-pulse')
                .attr('gradientUnits', 'objectBoundingBox')
                .attr('cx', '0.5')
                .attr('cy', '0.5')
                .attr('r', '0.5');

            // Animation keyframes
            pulseAnimation.append('animate')
                .attr('attributeName', 'r')
                .attr('values', '0.6; 0.5; 0.6')
                .attr('dur', '3s')
                .attr('repeatCount', 'indefinite');

            // Gradient stops
            pulseAnimation.append('stop')
                .attr('offset', '0%')
                .attr('stop-color', '#ffffff');

            pulseAnimation.append('stop')
                .attr('offset', '100%')
                .attr('stop-color', '#7db9e8')
                .append('animate')
                .attr('attributeName', 'stop-color')
                .attr('values', '#7db9e8; #1e5799; #7db9e8')
                .attr('dur', '3s')
                .attr('repeatCount', 'indefinite');
        }
    }

    /**
     * Set up event handlers
     * 
     * @private
     */
    _setupEventHandlers() {
        // Window resize handler
        window.addEventListener('resize', () => {
            this.resize();
        });

        // Fullscreen change handler
        document.addEventListener('fullscreenchange', () => {
            this._isFullscreen = !!document.fullscreenElement;
            this.resize();
        });
    }

    /**
     * Apply theme styling
     * 
     * @private
     */
    _applyTheme() {
        const theme = this.options.theme;

        // Base styles
        const baseStyles = document.createElement('style');
        baseStyles.textContent = `
            .neural-mind-map {
                background-color: ${theme === 'dark' ? '#1a1a1a' : '#ffffff'};
            }
            .neural-node {
                stroke: ${theme === 'dark' ? '#ffffff' : '#000000'};
                stroke-width: 1.5px;
            }
            .neural-link {
                stroke: ${theme === 'dark' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)'};
                stroke-opacity: 0.6;
            }
            .neural-hull {
                fill-opacity: 0.1;
                stroke-width: 1.5px;
                stroke-opacity: 0.4;
            }
            .neural-label {
                font-family: Arial, sans-serif;
                font-size: 12px;
                pointer-events: none;
                fill: ${theme === 'dark' ? '#ffffff' : '#333333'};
            }
            .marker-path {
                fill: ${theme === 'dark' ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.4)'};
            }
            .neural-layer {
                fill: none;
                stroke: ${theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'};
                stroke-width: 1px;
            }
            .highlighted {
                stroke-width: 2.5px;
            }
            .dimmed {
                opacity: 0.3;
            }
        `;

        document.head.appendChild(baseStyles);
    }

    /**
     * Process mind map data
     * 
     * @private
     */
    _processData() {
        if (!this.mindMap) return;

        // Process nodes
        this.nodes = this.mindMap.nodes.map(node => ({
            ...node,
            radius: this._calculateNodeRadius(node),
            x: node.x || Math.random() * this.options.width,
            y: node.y || Math.random() * this.options.height
        }));

        // Process links
        this.links = this.mindMap.connections.map(conn => ({
            id: `link-${conn.source}-${conn.target}`,
            source: conn.source,
            target: conn.target,
            weight: conn.weight || conn.neuralWeight || 1,
            type: conn.type || 'default'
        }));

        // Process clusters
        this.clusters = this.mindMap.clusters.map(cluster => ({
            ...cluster,
            color: cluster.color || this.options.colors[Math.floor(Math.random() * this.options.colors.length)]
        }));

        // Process layers
        this.layers = this.mindMap.layers.map(layer => ({
            ...layer,
            radius: (layer.level + 1) * 100  // Simplified radius calculation
        }));
    }

    /**
     * Calculate node radius based on importance
     * 
     * @private
     * @param {Object} node - Node data
     * @returns {Number} - Node radius
     */
    _calculateNodeRadius(node) {
        const minRadius = this.options.nodeRadius.min;
        const maxRadius = this.options.nodeRadius.max;
        const weight = node.weight || node.neuralActivation || 0.5;

        return minRadius + (maxRadius - minRadius) * weight;
    }

    /**
     * Update visualization with current data
     * 
     * @private
     * @param {Object} options - Update options
     */
    _updateVisualization(options) {
        const animate = options.animate !== false;
        const duration = animate ? this.options.transitionDuration : 0;

        // Update simulation
        this.simulation
            .nodes(this.nodes)
            .force('link', d3.forceLink(this.links).id(d => d.id).distance(d => 100 / (d.weight || 0.5)));

        // Reheat the simulation
        this.simulation.alpha(1).restart();

        // Draw/update layers if enabled
        if (this.options.neuralLayers) {
            this._updateLayers(duration);
        }

        // Draw/update links
        this._updateLinks(duration);

        // Draw/update nodes
        this._updateNodes(duration);

        // Draw/update node labels
        this._updateLabels(duration);

        // Draw/update cluster hulls if enabled
        if (this.options.clusterHulls) {
            this._updateClusterHulls(duration);
        }

        // Apply layout if specified
        if (options.layout === 'neural') {
            this._applyNeuralLayout();
        } else if (options.layout === 'radial') {
            this._applyRadialLayout();
        } else if (options.layout === 'hierarchical') {
            this._applyHierarchicalLayout();
        }

        // Focus on a node if specified
        if (options.focusNode) {
            this.focusNode(options.focusNode);
        }

        // Update layer visibility if active layer is set
        if (this.activeLayer !== -1) {
            this._updateLayerVisibility({ transitionDuration: duration });
        }
    }

    // More implementation details would follow here...
    // Including _updatePositions(), _updateLinks(), _updateNodes(), _zoomToNode(), etc.
}

// Register as global or as module export
typeof module !== 'undefined' ? module.exports = NeuralMindMapVis : window.NeuralMindMapVis = NeuralMindMapVis;
