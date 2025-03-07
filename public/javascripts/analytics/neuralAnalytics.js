/**
 * Neural Mind Map Analytics
 * 
 * Advanced analytics for neural mind maps that provides insights into
 * knowledge structures, concept relationships, and system performance.
 */

class NeuralAnalytics {
    constructor(options = {}) {
        this.options = {
            container: options.container || 'analyticsContainer',
            theme: options.theme || 'dark',
            tooltips: options.tooltips !== false,
            animations: options.animations !== false,
            metricGroups: options.metricGroups || ['structure', 'cognitive', 'performance'],
            initialView: options.initialView || 'overview',
            ...options
        };

        this.data = null;
        this.charts = new Map();
        this.metrics = new Map();
        this.selectedContext = null;
        this.timeRange = 'month';

        // Initialize dashboard
        this._initDashboard();
    }

    /**
     * Load analytics data for a specific context or user
     * 
     * @param {string} contextId - Context ID or 'user' for user-level analytics
     * @param {Object} options - Loading options
     * @returns {Promise<void>}
     */
    async loadData(contextId, options = {}) {
        try {
            const loadOptions = {
                timeRange: options.timeRange || this.timeRange,
                includeInsights: options.includeInsights !== false,
                includeUsageStats: options.includeUsageStats !== false,
                customMetrics: options.customMetrics || [],
                ...options
            };

            this.selectedContext = contextId;
            this._showLoading();

            let endpoint = '/api/neural-analytics/';
            if (contextId === 'user') {
                endpoint += 'user';
            } else {
                endpoint += `context/${encodeURIComponent(contextId)}`;
            }

            // Add query params
            const params = new URLSearchParams({
                timeRange: loadOptions.timeRange,
                includeInsights: loadOptions.includeInsights,
                includeUsageStats: loadOptions.includeUsageStats
            });

            if (loadOptions.customMetrics.length > 0) {
                params.append('metrics', loadOptions.customMetrics.join(','));
            }

            const response = await fetch(`${endpoint}?${params.toString()}`);
            if (!response.ok) {
                throw new Error(`Failed to load analytics: ${response.statusText}`);
            }

            this.data = await response.json();

            // Compute additional metrics
            this._computeDerivedMetrics();

            // Render the dashboard with new data
            this._renderDashboard();

            this._hideLoading();
            return this.data;

        } catch (error) {
            this._hideLoading();
            this._showError(error.message);
            throw error;
        }
    }

    /**
     * Set the time range for analytics
     * 
     * @param {string} range - Time range ('day', 'week', 'month', 'year', 'all')
     */
    setTimeRange(range) {
        if (['day', 'week', 'month', 'year', 'all'].includes(range)) {
            this.timeRange = range;

            if (this.selectedContext) {
                this.loadData(this.selectedContext, { timeRange: range });
            }
        }
    }

    /**
     * Change the dashboard view
     * 
     * @param {string} view - View name ('overview', 'structure', 'cognitive', 'performance')
     */
    changeView(view) {
        if (['overview', 'structure', 'cognitive', 'performance', 'insights'].includes(view)) {
            this._clearDashboard();
            this._renderView(view);

            // Update active tab
            document.querySelectorAll('.analytics-tab').forEach(tab => {
                tab.classList.remove('active');
            });

            const activeTab = document.querySelector(`.analytics-tab[data-view="${view}"]`);
            if (activeTab) {
                activeTab.classList.add('active');
            }
        }
    }

    /**
     * Export analytics data or visualizations
     * 
     * @param {string} format - Export format ('json', 'csv', 'png', 'pdf')
     * @param {Object} options - Export options
     * @returns {Promise<Blob|string>} - Exported data
     */
    async exportAnalytics(format = 'json', options = {}) {
        if (!this.data) {
            throw new Error('No analytics data loaded');
        }

        const exportOptions = {
            filename: options.filename || `neural-analytics-${this.selectedContext}`,
            includeRawData: options.includeRawData !== false,
            includeCharts: options.includeCharts !== false,
            chartDPI: options.chartDPI || 300,
            ...options
        };

        switch (format.toLowerCase()) {
            case 'json':
                return this._exportJSON(exportOptions);

            case 'csv':
                return this._exportCSV(exportOptions);

            case 'png':
                return this._exportPNG(exportOptions);

            case 'pdf':
                return this._exportPDF(exportOptions);

            default:
                throw new Error(`Unsupported export format: ${format}`);
        }
    }

    /**
     * Initialize the dashboard structure
     * 
     * @private
     */
    _initDashboard() {
        const container = document.getElementById(this.options.container);
        if (!container) {
            throw new Error(`Container element not found: ${this.options.container}`);
        }

        // Clear container
        container.innerHTML = '';
        container.classList.add('neural-analytics-dashboard');
        container.classList.add(this.options.theme);

        // Create header
        const header = document.createElement('div');
        header.className = 'analytics-header';
        header.innerHTML = `
            <h2>Neural Mind Map Analytics</h2>
            <div class="analytics-controls">
                <div class="time-range-selector">
                    <label for="timeRangeSelect">Time Range:</label>
                    <select id="timeRangeSelect" class="form-control">
                        <option value="day">Last 24 Hours</option>
                        <option value="week">Last Week</option>
                        <option value="month" selected>Last Month</option>
                        <option value="year">Last Year</option>
                        <option value="all">All Time</option>
                    </select>
                </div>
                <div class="analytics-actions">
                    <button id="exportAnalyticsBtn" class="btn btn-outline-primary btn-sm">
                        <i class="fas fa-download"></i> Export
                    </button>
                    <button id="refreshAnalyticsBtn" class="btn btn-outline-secondary btn-sm">
                        <i class="fas fa-sync-alt"></i> Refresh
                    </button>
                </div>
            </div>
        `;
        container.appendChild(header);

        // Create navigation tabs
        const tabs = document.createElement('div');
        tabs.className = 'analytics-tabs';
        tabs.innerHTML = `
            <ul class="nav nav-tabs">
                <li class="nav-item">
                    <a class="nav-link analytics-tab active" data-view="overview" href="#">
                        <i class="fas fa-chart-pie"></i> Overview
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link analytics-tab" data-view="structure" href="#">
                        <i class="fas fa-project-diagram"></i> Structure
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link analytics-tab" data-view="cognitive" href="#">
                        <i class="fas fa-brain"></i> Cognitive
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link analytics-tab" data-view="performance" href="#">
                        <i class="fas fa-tachometer-alt"></i> Performance
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link analytics-tab" data-view="insights" href="#">
                        <i class="fas fa-lightbulb"></i> Insights
                    </a>
                </li>
            </ul>
        `;
        container.appendChild(tabs);

        // Create content area
        const contentArea = document.createElement('div');
        contentArea.className = 'analytics-content';
        contentArea.innerHTML = `
            <div class="analytics-loading d-none">
                <div class="spinner-border text-primary" role="status">
                    <span class="sr-only">Loading analytics...</span>
                </div>
            </div>
            <div class="analytics-error d-none">
                <div class="alert alert-danger" role="alert">
                    <i class="fas fa-exclamation-triangle"></i>
                    <span class="error-message">Error loading analytics</span>
                </div>
            </div>
            <div class="analytics-placeholder">
                <div class="placeholder-message">
                    <i class="fas fa-chart-line"></i>
                    <p>Select a context to view analytics</p>
                </div>
            </div>
            <div class="analytics-view-content d-none"></div>
        `;
        container.appendChild(contentArea);

        // Set up event handlers
        this._setupEventHandlers();
    }

    /**
     * Set up event handlers for dashboard controls
     * 
     * @private
     */
    _setupEventHandlers() {
        // Time range selector
        const timeRangeSelect = document.getElementById('timeRangeSelect');
        if (timeRangeSelect) {
            timeRangeSelect.addEventListener('change', (e) => {
                this.setTimeRange(e.target.value);
            });
        }

        // Tab navigation
        document.querySelectorAll('.analytics-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                const view = tab.getAttribute('data-view');
                this.changeView(view);
            });
        });

        // Export button
        const exportBtn = document.getElementById('exportAnalyticsBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this._showExportModal();
            });
        }

        // Refresh button
        const refreshBtn = document.getElementById('refreshAnalyticsBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                if (this.selectedContext) {
                    this.loadData(this.selectedContext);
                }
            });
        }
    }

    /**
     * Show loading indicator
     * 
     * @private
     */
    _showLoading() {
        const loading = document.querySelector('.analytics-loading');
        if (loading) {
            loading.classList.remove('d-none');
        }

        // Hide other elements
        document.querySelector('.analytics-placeholder')?.classList.add('d-none');
        document.querySelector('.analytics-error')?.classList.add('d-none');
        document.querySelector('.analytics-view-content')?.classList.add('d-none');
    }

    /**
     * Hide loading indicator
     * 
     * @private
     */
    _hideLoading() {
        const loading = document.querySelector('.analytics-loading');
        if (loading) {
            loading.classList.add('d-none');
        }

        // Show content area if data is available
        if (this.data) {
            document.querySelector('.analytics-view-content')?.classList.remove('d-none');
        } else {
            document.querySelector('.analytics-placeholder')?.classList.remove('d-none');
        }
    }

    /**
     * Show error message
     * 
     * @private
     * @param {string} message - Error message
     */
    _showError(message) {
        const errorElement = document.querySelector('.analytics-error');
        const errorMessage = document.querySelector('.error-message');

        if (errorElement && errorMessage) {
            errorMessage.textContent = message;
            errorElement.classList.remove('d-none');
        }

        // Hide other elements
        document.querySelector('.analytics-loading')?.classList.add('d-none');
        document.querySelector('.analytics-placeholder')?.classList.add('d-none');
        document.querySelector('.analytics-view-content')?.classList.add('d-none');
    }

    /**
     * Clear the dashboard content
     * 
     * @private
     */
    _clearDashboard() {
        const contentArea = document.querySelector('.analytics-view-content');
        if (contentArea) {
            contentArea.innerHTML = '';
        }

        // Dispose existing charts
        this.charts.forEach(chart => {
            if (chart.destroy && typeof chart.destroy === 'function') {
                chart.destroy();
            }
        });

        this.charts.clear();
    }

    /**
     * Compute derived metrics from raw analytics data
     * 
     * @private
     */
    _computeDerivedMetrics() {
        if (!this.data || !this.data.metrics) return;

        const metrics = this.data.metrics;

        // Knowledge density (connections per node)
        if (metrics.nodeCount && metrics.connectionCount) {
            metrics.knowledgeDensity = metrics.connectionCount / metrics.nodeCount;
        }

        // Growth rate (percentage increase over time)
        if (metrics.historicalNodeCounts && metrics.historicalNodeCounts.length > 1) {
            const oldest = metrics.historicalNodeCounts[0].count;
            const newest = metrics.historicalNodeCounts[metrics.historicalNodeCounts.length - 1].count;

            if (oldest > 0) {
                metrics.growthRate = ((newest - oldest) / oldest) * 100;
            }
        }

        // Cognitive complexity score (combined metric)
        if (metrics.avgClusterCoherence && metrics.clusterCount && metrics.layerCount) {
            metrics.cognitiveComplexityScore =
                (metrics.avgClusterCoherence * 0.4) +
                (Math.min(metrics.clusterCount / 10, 1) * 0.3) +
                (Math.min(metrics.layerCount / 5, 1) * 0.3);
        }

        // Store computed metrics
        this.metrics = new Map(Object.entries(metrics));
    }

    /**
     * Render the dashboard with the current data
     * 
     * @private
     */
    _renderDashboard() {
        if (!this.data) return;

        this._clearDashboard();

        // Render the initial view
        this._renderView(this.options.initialView);
    }

    /**
     * Render a specific view
     * 
     * @private
     * @param {string} viewName - View to render
     */
    _renderView(viewName) {
        const contentArea = document.querySelector('.analytics-view-content');
        if (!contentArea || !this.data) return;

        switch (viewName) {
            case 'overview':
                this._renderOverviewView(contentArea);
                break;

            case 'structure':
                this._renderStructureView(contentArea);
                break;

            case 'cognitive':
                this._renderCognitiveView(contentArea);
                break;

            case 'performance':
                this._renderPerformanceView(contentArea);
                break;

            case 'insights':
                this._renderInsightsView(contentArea);
                break;

            default:
                this._renderOverviewView(contentArea);
        }
    }

    /**
     * Render overview dashboard view
     * 
     * @private
     * @param {HTMLElement} container - Container element
     */
    _renderOverviewView(container) {
        // Clear container
        container.innerHTML = '';

        // Create summary metrics cards
        const metricsRow = document.createElement('div');
        metricsRow.className = 'row metrics-cards';

        // Add key metric cards
        metricsRow.innerHTML = `
            <div class="col-md-3">
                <div class="metric-card">
                    <div class="metric-icon">
                        <i class="fas fa-project-diagram"></i>
                    </div>
                    <div class="metric-content">
                        <h4 class="metric-value">${this.metrics.get('nodeCount') || 0}</h4>
                        <p class="metric-name">Concepts</p>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="metric-card">
                    <div class="metric-icon">
                        <i class="fas fa-sitemap"></i>
                    </div>
                    <div class="metric-content">
                        <h4 class="metric-value">${this.metrics.get('clusterCount') || 0}</h4>
                        <p class="metric-name">Clusters</p>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="metric-card">
                    <div class="metric-icon">
                        <i class="fas fa-lightbulb"></i>
                    </div>
                    <div class="metric-content">
                        <h4 class="metric-value">${this.metrics.get('insightCount') || 0}</h4>
                        <p class="metric-name">Insights</p>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="metric-card">
                    <div class="metric-icon">
                        <i class="fas fa-brain"></i>
                    </div>
                    <div class="metric-content">
                        <h4 class="metric-value">${(this.metrics.get('cognitiveComplexityScore') || 0).toFixed(2)}</h4>
                        <p class="metric-name">Complexity Score</p>
                    </div>
                </div>
            </div>
        `;

        container.appendChild(metricsRow);

        // Create charts row
        const chartsRow = document.createElement('div');
        chartsRow.className = 'row charts-row';

        // Growth chart
        const growthChartCol = document.createElement('div');
        growthChartCol.className = 'col-md-6';
        growthChartCol.innerHTML = '<div class="chart-container"><canvas id="growthChart"></canvas></div>';
        chartsRow.appendChild(growthChartCol);

        // Structure chart
        const structureChartCol = document.createElement('div');
        structureChartCol.className = 'col-md-6';
        structureChartCol.innerHTML = '<div class="chart-container"><canvas id="structureChart"></canvas></div>';
        chartsRow.appendChild(structureChartCol);

        container.appendChild(chartsRow);

        // Create insight highlights row
        if (this.data.insights && this.data.insights.length > 0) {
            const insightsRow = document.createElement('div');
            insightsRow.className = 'row insights-row';
            insightsRow.innerHTML = `
                <div class="col-md-12">
                    <div class="insights-card">
                        <h3>Key Insights</h3>
                        <div class="insights-list">
                            ${this.data.insights.slice(0, 3).map(insight => `
                                <div class="insight-item">
                                    <div class="insight-icon">
                                        <i class="fas fa-lightbulb"></i>
                                    </div>
                                    <div class="insight-content">
                                        <p>${insight.description}</p>
                                        <div class="insight-meta">
                                            <span class="insight-type">${insight.type}</span>
                                            <span class="insight-confidence">Confidence: ${(insight.confidence * 100).toFixed(0)}%</span>
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            `;
            container.appendChild(insightsRow);
        }

        // Render the charts
        this._renderGrowthChart();
        this._renderStructureChart();
    }

    // Additional methods for rendering specific views and charts would follow...

    /**
     * Render a growth chart showing node and connection increases over time
     * 
     * @private
     */
    _renderGrowthChart() {
        if (!this.data.metrics.historicalNodeCounts) return;

        const ctx = document.getElementById('growthChart').getContext('2d');

        const labels = this.data.metrics.historicalNodeCounts.map(item =>
            new Date(item.date).toLocaleDateString()
        );

        const nodeData = this.data.metrics.historicalNodeCounts.map(item => item.count);
        const connectionData = this.data.metrics.historicalConnectionCounts?.map(item => item.count) || [];

        const chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Concepts',
                        data: nodeData,
                        borderColor: '#58a6ff',
                        backgroundColor: 'rgba(88, 166, 255, 0.1)',
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'Connections',
                        data: connectionData,
                        borderColor: '#7ee787',
                        backgroundColor: 'rgba(126, 231, 135, 0.1)',
                        tension: 0.4,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Knowledge Growth Over Time',
                        color: this.options.theme === 'dark' ? '#ffffff' : '#333333'
                    },
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: this.options.theme === 'dark' ? '#ffffff' : '#333333'
                        }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    }
                },
                scales: {
                    x: {
                        grid: {
                            color: this.options.theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                        },
                        ticks: {
                            color: this.options.theme === 'dark' ? '#ffffff' : '#333333'
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: this.options.theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                        },
                        ticks: {
                            color: this.options.theme === 'dark' ? '#ffffff' : '#333333'
                        }
                    }
                }
            }
        });

        this.charts.set('growthChart', chart);
    }

    /**
     * Render a structure chart showing distribution of clusters and layers
     * 
     * @private
     */
    _renderStructureChart() {
        if (!this.data.metrics.clusterSizes) return;

        const ctx = document.getElementById('structureChart').getContext('2d');

        const clusterLabels = this.data.metrics.clusterSizes.map((item, index) => `Cluster ${index + 1}`);
        const clusterSizes = this.data.metrics.clusterSizes;

        const chart = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: clusterLabels,
                datasets: [
                    {
                        label: 'Cluster Size',
                        data: clusterSizes,
                        backgroundColor: 'rgba(255, 99, 132, 0.2)',
                        borderColor: 'rgba(255, 99, 132, 1)',
                        borderWidth: 2
                    },
                    {
                        label: 'Cluster Coherence',
                        data: this.data.metrics.clusterCoherences || clusterSizes.map(() => 0),
                        backgroundColor: 'rgba(54, 162, 235, 0.2)',
                        borderColor: 'rgba(54, 162, 235, 1)',
                        borderWidth: 2
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Knowledge Structure',
                        color: this.options.theme === 'dark' ? '#ffffff' : '#333333'
                    },
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: this.options.theme === 'dark' ? '#ffffff' : '#333333'
                        }
                    }
                },
                scales: {
                    r: {
                        angleLines: {
                            color: this.options.theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                        },
                        grid: {
                            color: this.options.theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                        },
                        pointLabels: {
                            color: this.options.theme === 'dark' ? '#ffffff' : '#333333'
                        },
                        ticks: {
                            color: this.options.theme === 'dark' ? '#ffffff' : '#333333',
                            backdropColor: this.options.theme === 'dark' ? '#161b22' : '#ffffff'
                        }
                    }
                }
            }
        });

        this.charts.set('structureChart', chart);
    }

    // Additional methods would be implemented for other views and export functionality
}

// Export the class
typeof module !== 'undefined' ? module.exports = NeuralAnalytics : window.NeuralAnalytics = NeuralAnalytics;
