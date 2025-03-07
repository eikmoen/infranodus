/**
 * Neural Mind Map Theme Configuration
 * 
 * Manages color palettes, themes, and visual settings for neural mind maps.
 * Provides optimized color sets for different scenarios and visualization types.
 */

class ThemeSettings {
    constructor() {
        // Define base themes
        this.themes = {
            cosmic: {
                id: 'cosmic',
                name: 'Cosmic',
                description: 'Default space-inspired theme with purples and blues',
                darkMode: true,
                colors: {
                    background: '#0d1117',
                    foreground: '#c9d1d9',
                    accent: '#58a6ff',
                    highlight: '#bc8cff',
                    visualizationBackground: 'radial-gradient(circle at 50% 50%, rgba(13, 17, 23, 0.7) 0%, rgba(13, 17, 23, 1) 100%)',
                    borders: '#30363d',
                    sidebar: '#161b22',
                    success: '#2ea043',
                    warning: '#ffa657',
                    error: '#ff7b72',
                    info: '#79c0ff'
                },
                clusters: [
                    '#58a6ff', '#bc8cff', '#7ee787', '#ff7b72', 
                    '#ffa657', '#d2a8ff', '#a371f7', '#79c0ff'
                ],
                connections: [
                    'rgba(88, 166, 255, 0.6)', 
                    'rgba(188, 140, 255, 0.6)', 
                    'rgba(126, 231, 135, 0.6)', 
                    'rgba(255, 123, 114, 0.6)'
                ]
            },
            forest: {
                id: 'forest',
                name: 'Forest',
                description: 'Nature-inspired theme with various greens',
                darkMode: true,
                colors: {
                    background: '#0d1117',
                    foreground: '#c9d1d9',
                    accent: '#2ea043',
                    highlight: '#7ee787',
                    visualizationBackground: 'radial-gradient(circle at 50% 50%, rgba(13, 17, 23, 0.7) 0%, rgba(13, 17, 23, 1) 100%)',
                    borders: '#30363d',
                    sidebar: '#161b22',
                    success: '#2ea043',
                    warning: '#ffa657',
                    error: '#ff7b72',
                    info: '#79c0ff'
                },
                clusters: [
                    '#2ea043', '#7ee787', '#56d364', '#3fb950', 
                    '#26a641', '#238636', '#1b7f2c', '#116620'
                ],
                connections: [
                    'rgba(46, 160, 67, 0.6)', 
                    'rgba(126, 231, 135, 0.6)', 
                    'rgba(86, 211, 100, 0.6)', 
                    'rgba(38, 166, 65, 0.6)'
                ]
            },
            sunset: {
                id: 'sunset',
                name: 'Sunset',
                description: 'Warm theme with oranges and reds',
                darkMode: true,
                colors: {
                    background: '#0d1117',
                    foreground: '#c9d1d9',
                    accent: '#ff7b72',
                    highlight: '#ffa657',
                    visualizationBackground: 'radial-gradient(circle at 50% 50%, rgba(13, 17, 23, 0.7) 0%, rgba(13, 17, 23, 1) 100%)',
                    borders: '#30363d',
                    sidebar: '#161b22',
                    success: '#2ea043',
                    warning: '#ffa657',
                    error: '#ff7b72',
                    info: '#79c0ff'
                },
                clusters: [
                    '#ff7b72', '#ffa657', '#f0883e', '#fd7e14', 
                    '#e85d04', '#dc2626', '#b91c1c', '#7f1d1d'
                ],
                connections: [
                    'rgba(255, 123, 114, 0.6)', 
                    'rgba(255, 166, 87, 0.6)', 
                    'rgba(240, 136, 62, 0.6)', 
                    'rgba(232, 93, 4, 0.6)'
                ]
            },
            ocean: {
                id: 'ocean',
                name: 'Ocean',
                description: 'Refreshing theme with various blues',
                darkMode: true,
                colors: {
                    background: '#0d1117',
                    foreground: '#c9d1d9',
                    accent: '#388bfd',
                    highlight: '#1f6feb',
                    visualizationBackground: 'radial-gradient(circle at 50% 50%, rgba(13, 17, 23, 0.7) 0%, rgba(13, 17, 23, 1) 100%)',
                    borders: '#30363d',
                    sidebar: '#161b22',
                    success: '#2ea043',
                    warning: '#ffa657',
                    error: '#ff7b72',
                    info: '#79c0ff'
                },
                clusters: [
                    '#388bfd', '#1f6feb', '#58a6ff', '#79c0ff', 
                    '#0d419d', '#0c2d6b', '#033d8b', '#0366d6'
                ],
                connections: [
                    'rgba(56, 139, 253, 0.6)', 
                    'rgba(31, 111, 235, 0.6)', 
                    'rgba(88, 166, 255, 0.6)', 
                    'rgba(121, 192, 255, 0.6)'
                ]
            },
            monochrome: {
                id: 'monochrome',
                name: 'Monochrome',
                description: 'Clean theme with various grays',
                darkMode: true,
                colors: {
                    background: '#0d1117',
                    foreground: '#c9d1d9',
                    accent: '#8b949e',
                    highlight: '#c9d1d9',
                    visualizationBackground: 'radial-gradient(circle at 50% 50%, rgba(13, 17, 23, 0.7) 0%, rgba(13, 17, 23, 1) 100%)',
                    borders: '#30363d',
                    sidebar: '#161b22',
                    success: '#2ea043',
                    warning: '#ffa657',
                    error: '#ff7b72',
                    info: '#79c0ff'
                },
                clusters: [
                    '#c9d1d9', '#b1bac4', '#8b949e', '#6e7681', 
                    '#484f58', '#30363d', '#21262d', '#161b22'
                ],
                connections: [
                    'rgba(201, 209, 217, 0.6)', 
                    'rgba(177, 186, 196, 0.6)', 
                    'rgba(139, 148, 158, 0.6)', 
                    'rgba(110, 118, 129, 0.6)'
                ]
            },
            // Light mode themes
            light: {
                id: 'light',
                name: 'Light',
                description: 'Clean light theme',
                darkMode: false,
                colors: {
                    background: '#ffffff',
                    foreground: '#24292e',
                    accent: '#0366d6',
                    highlight: '#6f42c1',
                    visualizationBackground: 'radial-gradient(circle at 50% 50%, rgba(246, 248, 250, 0.7) 0%, rgba(246, 248, 250, 1) 100%)',
                    borders: '#e1e4e8',
                    sidebar: '#f6f8fa',
                    success: '#28a745',
                    warning: '#f66a0a',
                    error: '#d73a49',
                    info: '#0366d6'
                },
                clusters: [
                    '#0366d6', '#6f42c1', '#28a745', '#d73a49',
                    '#f66a0a', '#5319e7', '#005cc5', '#22863a'
                ],
                connections: [
                    'rgba(3, 102, 214, 0.6)',
                    'rgba(111, 66, 193, 0.6)',
                    'rgba(40, 167, 69, 0.6)',
                    'rgba(215, 58, 73, 0.6)'
                ]
            }
        };

        // Default theme
        this.currentTheme = this.themes.cosmic;
        
        // For accessibility
        this.highContrastMode = false;
    }

    /**
     * Get theme by ID
     * 
     * @param {string} themeId - Theme identifier
     * @returns {object} - Theme configuration
     */
    getTheme(themeId) {
        return this.themes[themeId] || this.themes.cosmic;
    }

    /**
     * Set current theme
     * 
     * @param {string} themeId - Theme identifier
     * @returns {object} - Selected theme
     */
    setTheme(themeId) {
        if (this.themes[themeId]) {
            this.currentTheme = this.themes[themeId];
            return this.currentTheme;
        }
        return this.currentTheme;
    }

    /**
     * Get color palette optimized for specific visualization
     * 
     * @param {string} visualizationType - Type of visualization
     * @param {object} options - Palette options
     * @returns {object} - Color palette
     */
    getOptimizedPalette(visualizationType, options = {}) {
        const theme = options.theme ? this.getTheme(options.theme) : this.currentTheme;
        const nodeCount = options.nodeCount || 8;
        const needsSequential = options.sequential || false;
        const accessibility = options.accessibility || false;

        // Base palette from theme
        let palette = [...theme.clusters];

        switch (visualizationType) {
            case 'categorical':
                // Good for distinct categories
                return palette;

            case 'sequential':
                // For representing values in sequence
                if (theme.id === 'forest') {
                    return [
                        '#b6e6aa', '#7ee787', '#56d364', '#3fb950',
                        '#2ea043', '#238636', '#196c2e', '#0f5323'
                    ];
                } else if (theme.id === 'ocean') {
                    return [
                        '#a5d6ff', '#79c0ff', '#58a6ff', '#388bfd',
                        '#1f6feb', '#0366d6', '#0351b0', '#033d8b'
                    ];
                } else {
                    // Default sequential
                    return [
                        '#a5d6ff', '#79c0ff', '#58a6ff', '#388bfd',
                        '#1f6feb', '#0366d6', '#0351b0', '#033d8b'
                    ];
                }

            case 'diverging':
                // For showing divergence from a center point
                return [
                    '#d73a49', '#f97583', '#ffbac0', '#f0f0f0', 
                    '#c0e0ff', '#79c0ff', '#388bfd', '#0366d6'
                ];

            case 'dynamic':
                // Adjust based on node count
                if (nodeCount <= 3) {
                    return palette.slice(0, 3);
                } else if (nodeCount <= 5) {
                    return palette.slice(0, 5);
                } else {
                    return palette;
                }
        }

        // Apply accessibility adjustments if needed
        if (accessibility || this.highContrastMode) {
            return this._enhanceAccessibility(palette);
        }

        return palette;
    }

    /**
     * Enhance color palette for better accessibility
     * 
     * @private
     * @param {Array} palette - Original color palette
     * @returns {Array} - Accessibility-enhanced palette
     */
    _enhanceAccessibility(palette) {
        // Increase contrast and avoid problematic color combinations
        return palette.map(color => {
            // This is a simple example - in a real implementation,
            // you would use a proper color manipulation library
            return color; // Placeholder for actual implementation
        });
    }

    /**
     * Get CSS variables for current theme
     * 
     * @returns {object} - CSS variable map
     */
    getCssVariables() {
        const theme = this.currentTheme;
        
        return {
            '--neural-bg-color': theme.colors.background,
            '--neural-fg-color': theme.colors.foreground,
            '--neural-accent-color': theme.colors.accent,
            '--neural-highlight-color': theme.colors.highlight,
            '--neural-border-color': theme.colors.borders,
            '--neural-sidebar-color': theme.colors.sidebar,
            '--neural-success-color': theme.colors.success,
            '--neural-warning-color': theme.colors.warning,
            '--neural-error-color': theme.colors.error,
            '--neural-info-color': theme.colors.info,
            '--neural-visualization-bg': theme.colors.visualizationBackground,
            '--neural-cluster-1': theme.clusters[0],
            '--neural-cluster-2': theme.clusters[1],
            '--neural-cluster-3': theme.clusters[2],
            '--neural-cluster-4': theme.clusters[3],
            '--neural-cluster-5': theme.clusters[4],
            '--neural-cluster-6': theme.clusters[5],
            '--neural-cluster-7': theme.clusters[6],
            '--neural-cluster-8': theme.clusters[7],
            '--neural-connection-1': theme.connections[0],
            '--neural-connection-2': theme.connections[1],
            '--neural-connection-3': theme.connections[2],
            '--neural-connection-4': theme.connections[3]
        };
    }

    /**
     * Apply theme to HTML document
     * 
     * @param {string} themeId - Theme to apply
     */
    applyTheme(themeId) {
        const theme = this.setTheme(themeId);
        const variables = this.getCssVariables();
        
        // Apply CSS variables to document root
        const root = document.documentElement;
        
        for (const [key, value] of Object.entries(variables)) {
            root.style.setProperty(key, value);
        }
        
        // Set appropriate body class
        if (theme.darkMode) {
            document.body.classList.add('dark-mode');
            document.body.classList.remove('light-mode');
        } else {
            document.body.classList.add('light-mode');
            document.body.classList.remove('dark-mode');
        }
        
        // Add theme-specific class
        document.body.className = document.body.className
            .replace(/\btheme-\S+/g, '')
            .trim();
        document.body.classList.add(`theme-${theme.id}`);
        
        // Set visualization palette class
        const visualizationContainer = document.querySelector('.neural-visualization-container');
        if (visualizationContainer) {
            visualizationContainer.className = visualizationContainer.className
                .replace(/\bneural-palette-\S+/g, '')
                .trim();
            visualizationContainer.classList.add(`neural-palette-${theme.id}`);
        }
    }
}

// Create singleton instance
const themeSettings = new ThemeSettings();

module.exports = {
    themeSettings,
    ThemeSettings
};
