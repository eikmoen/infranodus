# Platform Integration Guide for Neural Mind Maps

This guide provides detailed information on how to integrate the InfraNodus neural mind map system with various external platforms and services.

## Table of Contents

1. [Overview](#overview)
2. [File System Integration](#file-system-integration)
3. [PhotoPrism Integration](#photoprism-integration)
4. [MyMap.AI Integration](#mymapai-integration)
5. [Neural Model API Integrations](#neural-model-api-integrations)
6. [Platform-Specific Optimizations](#platform-specific-optimizations)
7. [Memory Management](#memory-management)
8. [Troubleshooting](#troubleshooting)

## Overview

The InfraNodus neural mind map system can integrate with various external platforms and services to enhance its capabilities. These integrations allow you to:

- Create neural mind maps from files on your computer
- Build knowledge graphs from your photo collections in PhotoPrism
- Exchange mind maps with MyMap.AI
- Utilize various AI models for enhanced neural processing

## File System Integration

### Configuration

To configure file system access:

1. Navigate to the **Integrations** page in InfraNodus
2. Select the **File System** tab
3. Add directories you want InfraNodus to be able to access
4. Configure scan options:
   - **Allow Recursive Scanning**: Enable to scan subdirectories
   - **Max Scan Depth**: Set maximum depth for subdirectory scanning

### Supported File Types

The file system integration can extract information from various file types:

- **Documents**: PDF, DOC/DOCX, TXT, MD, HTML
- **Images**: JPG/JPEG, PNG, GIF, WEBP
- **Audio**: MP3, WAV, FLAC, OGG, M4A
- **Video**: MP4, MKV, MOV, AVI, WEBM

### Technical Details

File system integration uses the `FileSystemConnector` class which:

1. Validates that directories are accessible
2. Scans for supported file types
3. Extracts metadata (creation date, size, etc.)
4. Performs content analysis when possible
5. Creates a structured knowledge graph from the file information

## PhotoPrism Integration

### Setup Requirements

- A running [PhotoPrism](https://photoprism.app/) instance
- API access to that instance

### Configuration Steps

1. Navigate to the **Integrations** page in InfraNodus
2. Select the **PhotoPrism** tab
3. Enter your PhotoPrism URL (e.g., `https://photos.example.com`)
4. Enter your PhotoPrism API key (optional)
5. Test the connection
6. Save the configuration

### Features

Once connected, you can:

- Browse albums from your PhotoPrism instance
- Create neural mind maps from selected albums or search results
- Include photo labels, people, and locations in your knowledge graphs
- Visualize photo relationships based on time, location, and content

### Technical Implementation

The integration uses PhotoPrism's REST API to:

1. Authenticate with your PhotoPrism instance
2. Retrieve album and photo information
3. Extract metadata (labels, people, locations, etc.)
4. Create structured knowledge graphs from the extracted information

## MyMap.AI Integration

### Overview

[MyMap.AI](https://mymap.ai) is a mind mapping platform that can exchange data with InfraNodus.

### Configuration

1. Navigate to the **Integrations** page in InfraNodus
2. Select the **MyMap.AI** tab
3. Enter your MyMap.AI API key
4. Save the configuration

### Export to MyMap

To export a context to MyMap.AI:

1. Select a context from the dropdown
2. Click "Export"
3. The system will create a new map in MyMap.AI and provide you with a link

### Import from MyMap

To import from MyMap.AI:

1. Enter the MyMap ID you want to import
2. Specify a context name for the imported data
3. Click "Import"
4. The system will create a new context with the imported data

## Neural Model API Integrations

### Supported AI Services

InfraNodus can integrate with various AI services:

- **OpenAI**: For GPT models and embeddings
- **Cohere**: For text embeddings and language models
- **Anthropic**: For Claude models
- **HuggingFace**: For access to open-source models

### Configuration

1. Navigate to the **Integrations** page in InfraNodus
2. Select the **API Connections** tab
3. Enter your API keys for the services you want to use
4. Save the configuration

### Feature Enhancements

These API integrations enable:

- Enhanced knowledge expansion using large language models
- Higher quality text embeddings for concept relationships
- More accurate semantic clustering
- Advanced cognitive insights generation

## Platform-Specific Optimizations

### Windows

- Uses Windows-specific paths for default directories
- Detects GPU capabilities using Windows Management Instrumentation (WMI)
- Handles Windows-specific file path limitations

### macOS

- Uses macOS-specific paths for default directories
- Detects GPU capabilities using system profiler
- Optimized for Metal GPU acceleration when available

### Linux

- Uses Linux-specific paths for default directories
- Detects GPU capabilities using lspci and other utilities
- Supports containerized environments

## Memory Management

The platform integration components use memory protection mechanisms to prevent excessive resource usage:

### Memory Protection Features

- **Monitoring**: Continuously monitors system memory usage
- **Thresholds**: Configurable thresholds for warning and emergency states
- **Garbage Collection**: Triggers garbage collection when memory usage is high
- **Component Registration**: Components can register callbacks for memory pressure events
- **Operation Gatekeeping**: Prevents memory-intensive operations when resources are low

### Configuration

Memory protection settings can be adjusted in the `.env` file:

## Troubleshooting

Common issues and solutions:

- **API Connection Errors**: Verify your API key is correct and not expired
- **Missing Nodes/Edges**: Check that your graph complies with both platforms' data models
- **Performance Issues**: Large graphs may require optimization before transfer
- **Format Compatibility**: Ensure any custom attributes have appropriate mappings

## Contributing

We welcome contributions to improve the integration between InfraNodus and MyMap.ai. Please see our [contribution guidelines](../CONTRIBUTING.md) for more information.

## Support

For technical support with the integration:
- Email: support@infranodus.com
- Visit: [InfraNodus Support Forum](https://infranodus.com/support)
- Documentation: [Full Integration Documentation](https://infranodus.com/docs/integrations/mymap-ai)
