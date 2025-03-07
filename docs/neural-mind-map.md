# Neural Mind Map System

The Neural Mind Map is an advanced knowledge visualization and exploration system integrated with InfraNodus. It uses neural networks, deep learning, and graph theory to create sophisticated concept maps that represent knowledge in a multi-dimensional, interactive format.

## Overview

The Neural Mind Map system extends traditional knowledge graphs with:

- **Neural Network Processing**: Uses transformer-based architectures to analyze and structure concept relationships
- **Exponential Knowledge Expansion**: Dynamically grows knowledge networks while maintaining coherence
- **Multi-Layer Cognitive Organization**: Organizes concepts into intuitive layered structures
- **Semantic Clustering**: Identifies related concept clusters and emergent patterns
- **File System Integration**: Creates knowledge maps from file directories and metadata
- **PhotoPrism Integration**: Builds neural maps from photo libraries with semantic analysis
- **Interactive Visualization**: Provides sophisticated D3.js-based visualization tools

## Components

### Core Components

1. **Neural Mind Map Engine** (`neuralMindMap.js`):
   - Creates and manages neural mind map structures
   - Handles concept relationship modeling 
   - Organizes knowledge into layers and clusters

2. **Knowledge Expansion** (`knowledgeExpansion.js`):
   - Exponentially expands knowledge graphs
   - Maintains semantic coherence during growth
   - Generates insights from expanded knowledge

3. **TensorFlow Embeddings** (`tfEmbeddings.js`):
   - Provides neural embeddings for concepts
   - Supports multiple embedding models
   - Optimizes memory usage and performance

### Integration Components

4. **File System Connector** (`fileSystemConnector.js`):
   - Scans file directories to build knowledge maps
   - Extracts metadata from various file types
   - Analyzes content for deeper understanding

5. **PhotoPrism Integration**:
   - Connects to PhotoPrism photo libraries
   - Creates knowledge maps from photo metadata
   - Incorporates labels, people, and locations

### Visualization Components

6. **Neural Mind Map Visualization** (`neuralMindMapVis.js`):
   - D3.js-based advanced visualization
   - Interactive exploration of knowledge structures
   - Multi-layered visualization with clustering

7. **PhotoPrism Map Visualization** (`photoprismMapVis.js`):
   - Specialized visualization for photo-based mind maps
   - Timeline and map-based exploration
   - Thumbnail integration and details view

## Getting Started

### Prerequisites

- Node.js 14+ and npm
- TensorFlow.js compatible environment
- InfraNodus core installation
- (Optional) PhotoPrism instance for photo integration

### Installation

1. The Neural Mind Map system is included in the main InfraNodus repository
2. Install dependencies:
   ```
   npm install
   ```
3. Configure the system:
   ```
   npm run configure-neural
   ```
4. Start InfraNodus:
   ```
   npm start
   ```

### Configuration

Configure the Neural Mind Map system through:

1. Environment variables:
   - `NEURAL_CONFIG_KEY`: Encryption key for secure settings
   - `PHOTOPRISM_URL`: Default PhotoPrism URL (optional)
   - `PHOTOPRISM_API_KEY`: Default PhotoPrism API key (optional)

2. Neural configuration file (`neural-integrations.json`):
   - Location: `~/.infranodus/neural-integrations.json`
   - Contains user-specific and global settings
   - Managed through the UI or direct editing

## Usage

### Creating Neural Mind Maps

1. **From existing contexts**:
   - Navigate to the Neural Mind Map page
   - Select a context from the dropdown
   - Configure neural options
   - Click "Generate Mind Map"

2. **From file system**:
   - Go to the Files tab
   - Enter a directory path and context name
   - Configure scan options
   - Click "Scan Directory"

3. **From PhotoPrism**:
   - Go to the Photos tab
   - Connect to your PhotoPrism instance
   - Select an album or search criteria
   - Click "Scan Photos"

### Interacting with Neural Mind Maps

- **Zoom/Pan**: Use mouse wheel and drag
- **Focus Node**: Click on a node to focus
- **View Layers**: Filter to specific cognitive layers
- **Highlight Clusters**: Highlight semantic clusters
- **View Insights**: See cognitive insights in the Insights tab
- **Evolve Map**: Click "Evolve Mind Map" to enhance with new patterns

## API Reference

The Neural Mind Map system provides a RESTful API:

### Neural Mind Map API

- `POST /api/neural-mind/generate`: Generate a neural mind map
- `POST /api/neural-mind/evolve`: Evolve an existing mind map
- `POST /api/neural-mind/merge`: Merge multiple mind maps
- `GET /api/neural-mind/:contextId`: Get mind map for a context

### File Integration API

- `POST /api/neural-files/scan`: Scan a directory
- `GET /api/neural-files/scan/:scanId`: Get scan status
- `POST /api/neural-files/mindmap`: Create mind map from scan
- `GET /api/neural-files/mindmap/:mindmapId`: Get mind map visualization data

### PhotoPrism Integration API

- `GET /api/neural-files/photoprism/albums`: Get available albums
- `POST /api/neural-files/photoprism`: Scan PhotoPrism photos

## Advanced Features

### Neural Architecture Selection

Choose from multiple neural architectures:
- **Transformer**: Multi-head attention-based architecture
- **Recurrent**: Sequential concept processing with memory
- **Graph Neural Network**: Specialized for graph structures
- **Hybrid**: Combined transformer and GNN (recommended)

### Knowledge Expansion Depth

Control how deeply the system expands knowledge:
- Shallow (1-2): Quick, focused expansion
- Medium (3): Balanced expansion (default)
- Deep (4-5): Comprehensive, exploratory expansion

### Meta-Insights

The system analyzes mind maps to generate insights:
- **Structural insights**: Network topology and patterns
- **Semantic insights**: Concept relationships and themes
- **Gap insights**: Missing connections and concepts
- **Emergent insights**: New patterns across domains

## Troubleshooting

### Common Issues

1. **Memory errors during scanning large directories**
   - Reduce scan depth or disable content analysis
   - Increase memory limit in configuration

2. **Connection errors with PhotoPrism**
   - Verify URL and API key
   - Check PhotoPrism