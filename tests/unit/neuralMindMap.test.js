/**
 * Unit tests for Neural Mind Map module
 */

const { NeuralMindMap } = require('../../lib/exponential/neuralMindMap');
const { TFEmbeddingsService } = require('../../lib/exponential/tfEmbeddings');

// Mock dependencies
jest.mock('../../lib/log/logger', () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
}));

jest.mock('../../lib/exponential/tfEmbeddings', () => ({
    TFEmbeddingsService: jest.fn().mockImplementation(() => ({
        getEmbeddings: jest.fn().mockResolvedValue([
            Array(768).fill(0).map(() => Math.random()),
            Array(768).fill(0).map(() => Math.random())
        ]),
        computeSimilarity: jest.fn().mockReturnValue(0.85)
    }))
}));

describe('NeuralMindMap', () => {
    let neuralMindMap;

    beforeEach(() => {
        // Create a fresh instance for each test
        neuralMindMap = new NeuralMindMap({
            // Test-specific options
            embeddingDimension: 256,
            minSimilarityThreshold: 0.7,
            networkDepth: 3
        });
    });

    afterEach(() => {
        // Clean up
        jest.clearAllMocks();
    });

    describe('Constructor', () => {
        test('should initialize with default options when none provided', () => {
            const defaultMap = new NeuralMindMap();
            expect(defaultMap.options.embeddingDimension).toBe(768);
            expect(defaultMap.options.minSimilarityThreshold).toBeLessThan(1);
            expect(defaultMap.options.networkDepth).toBeGreaterThan(0);
        });

        test('should override default options with provided values', () => {
            expect(neuralMindMap.options.embeddingDimension).toBe(256);
            expect(neuralMindMap.options.minSimilarityThreshold).toBe(0.7);
            expect(neuralMindMap.options.networkDepth).toBe(3);
        });

        test('should initialize required data structures', () => {
            expect(neuralMindMap.events).toBeDefined();
            expect(neuralMindMap.networkModels).toBeInstanceOf(Map);
            expect(neuralMindMap.embeddingCache).toBeInstanceOf(Map);
            expect(neuralMindMap.conceptMaps).toBeInstanceOf(Map);
        });
    });

    describe('generateNeuralMindMap', () => {
        const mockUserId = 'user123';
        const mockContext = 'testContext';

        test('should return a mind map object with required properties', async () => {
            // Setup
            neuralMindMap._expandKnowledgeGraph = jest.fn().mockResolvedValue('job123');
            neuralMindMap._waitForExpansionJob = jest.fn().mockResolvedValue({});
            neuralMindMap._getNeuralNetworkForContext = jest.fn().mockResolvedValue({});
            neuralMindMap._fetchGraph = jest.fn().mockResolvedValue({
                nodes: [
                    { id: 'node1', name: 'Node 1' },
                    { id: 'node2', name: 'Node 2' }
                ],
                edges: [
                    { source: 'node1', target: 'node2', weight: 1 }
                ]
            });
            neuralMindMap._generateConceptEmbeddings = jest.fn().mockResolvedValue();
            neuralMindMap._createNeuralMapStructure = jest.fn().mockResolvedValue({
                id: 'map123',
                nodes: [],
                connections: [],
                layers: [],
                clusters: [],
                cognitiveMetrics: {}
            });
            neuralMindMap._generateMetaInsights = jest.fn().mockResolvedValue();
            neuralMindMap._generateVisualizationData = jest.fn().mockReturnValue({});

            // Execute
            const result = await neuralMindMap.generateNeuralMindMap(mockUserId, mockContext, {
                expandKnowledge: true
            });

            // Assert
            expect(result).toBeDefined();
            expect(result.id).toBeDefined();
            expect(neuralMindMap.conceptMaps.get(`${mockUserId}-${mockContext}`)).toBe(result);
            expect(neuralMindMap._generateMetaInsights).toHaveBeenCalled();
            expect(neuralMindMap._generateVisualizationData).toHaveBeenCalled();
        });

        test('should handle errors and reject with appropriate message', async () => {
            // Setup
            const errorMessage = 'Test error';
            neuralMindMap._fetchGraph = jest.fn().mockRejectedValue(new Error(errorMessage));

            // Execute & Assert
            await expect(neuralMindMap.generateNeuralMindMap(mockUserId, mockContext))
                .rejects.toThrow(errorMessage);
        });

        test('should not expand knowledge when option is false', async () => {
            // Setup
            neuralMindMap._expandKnowledgeGraph = jest.fn();
            neuralMindMap._getNeuralNetworkForContext = jest.fn().mockResolvedValue({});
            neuralMindMap._fetchGraph = jest.fn().mockResolvedValue({
                nodes: [], edges: []
            });
            neuralMindMap._createNeuralMapStructure = jest.fn().mockResolvedValue({
                id: 'map123',
                nodes: [],
                connections: [],
                layers: [],
                clusters: [],
                cognitiveMetrics: {}
            });

            // Execute
            await neuralMindMap.generateNeuralMindMap(mockUserId, mockContext, {
                expandKnowledge: false
            });

            // Assert
            expect(neuralMindMap._expandKnowledgeGraph).not.toHaveBeenCalled();
        });
    });

    describe('evolveNeuralMap', () => {
        const mockUserId = 'user123';
        const mockContext = 'testContext';
        const mockMapKey = `${mockUserId}-${mockContext}`;

        beforeEach(() => {
            // Setup mock mind map
            neuralMindMap.conceptMaps.set(mockMapKey, {
                id: 'map123',
                nodes: [{ id: 'node1', name: 'Test Node' }],
                connections: [],
                layers: [],
                clusters: []
            });
        });

        test('should throw error if mind map does not exist', async () => {
            // Execute & Assert
            await expect(neuralMindMap.evolveNeuralMap('nonExistentUser', mockContext))
                .rejects.toThrow(/No existing neural mind map found/);
        });

        test('should evolve mind map and return evolved version', async () => {
            // Setup
            neuralMindMap._getNeuralNetworkForContext = jest.fn().mockResolvedValue({});
            neuralMindMap._applyEvolutionaryAlgorithms = jest.fn().mockResolvedValue({
                id: 'evolved-map123',
                nodes: [
                    { id: 'node1', name: 'Test Node' },
                    { id: 'new-node1', name: 'New Node' }
                ],
                connections: [],
                layers: [],
                clusters: [],
                evolutionMetrics: {
                    originalSize: 1,
                    newSize: 2,
                    novelty: 0.5
                }
            });
            neuralMindMap._detectEmergentPatterns = jest.fn().mockResolvedValue();

            // Execute
            const result = await neuralMindMap.evolveNeuralMap(mockUserId, mockContext, {
                creativityFactor: 0.8
            });

            // Assert
            expect(result).toBeDefined();
            expect(result.nodes.length).toBe(2);
            expect(result.id).toContain('evolved');
            expect(neuralMindMap.conceptMaps.get(mockMapKey)).toBe(result);
            expect(neuralMindMap._applyEvolutionaryAlgorithms).toHaveBeenCalledWith(
                expect.anything(),
                expect.anything(),
                expect.objectContaining({
                    creativityFactor: 0.8
                })
            );
        });
    });

    describe('mergeNeuralMindMaps', () => {
        const mockUserId = 'user123';
        const mockContexts = ['context1', 'context2'];
        const targetContext = 'mergedContext';

        beforeEach(() => {
            // Setup mock mind maps
            neuralMindMap.conceptMaps.set(`${mockUserId}-${mockContexts[0]}`, {
                nodes: [{ id: 'node1', name: 'Node 1' }],
                connections: [],
                clusters: []
            });
            neuralMindMap.conceptMaps.set(`${mockUserId}-${mockContexts[1]}`, {
                nodes: [{ id: 'node2', name: 'Node 2' }],
                connections: [],
                clusters: []
            });
        });

        test('should throw error if insufficient contexts provided', async () => {
            // Execute & Assert
            await expect(neuralMindMap.mergeNeuralMindMaps(mockUserId, [], targetContext))
                .rejects.toThrow(/At least two context names are required/);

            await expect(neuralMindMap.mergeNeuralMindMaps(mockUserId, ['singleContext'], targetContext))
                .rejects.toThrow(/At least two context names are required/);
        });

        test('should throw error if context not found', async () => {
            // Execute & Assert
            await expect(neuralMindMap.mergeNeuralMindMaps(
                mockUserId, ['context1', 'nonExistentContext'], targetContext
            )).rejects.toThrow(/Mind map not found for context/);
        });

        test('should merge mind maps and return result', async () => {
            // Setup
            neuralMindMap._performNeuralMerge = jest.fn().mockResolvedValue({
