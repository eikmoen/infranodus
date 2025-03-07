const path = require('path');

// Mock dependencies before importing the module
jest.mock('@tensorflow/tfjs-node', () => ({
  loadGraphModel: jest.fn().mockResolvedValue({}),
  tensor1d: jest.fn().mockReturnValue({
    dataSync: jest.fn().mockReturnValue([0.85]),
    dispose: jest.fn()
  }),
  tensor2d: jest.fn().mockReturnValue({}),
  norm: jest.fn().mockReturnValue({
    dataSync: jest.fn().mockReturnValue([1])
  }),
  sub: jest.fn().mockReturnValue({}),
  mul: jest.fn().mockReturnValue({}),
  sum: jest.fn().mockReturnValue({
    dataSync: jest.fn().mockReturnValue([0.85])
  }),
  add: jest.fn().mockReturnValue({}),
  div: jest.fn().mockReturnValue({
    dataSync: jest.fn().mockReturnValue([0.85])
  }),
  sqrt: jest.fn().mockReturnValue({}),
  abs: jest.fn().mockReturnValue({}),
  square: jest.fn().mockReturnValue({}),
  dispose: jest.fn()
}));

jest.mock('@tensorflow/tfjs-node-gpu', () => ({}));
jest.mock('@tensorflow-models/universal-sentence-encoder', () => ({
  load: jest.fn().mockResolvedValue({
    embed: jest.fn().mockResolvedValue({
      array: jest.fn().mockResolvedValue([
        [0.1, 0.2, 0.3, 0.4, 0.5]
      ]),
      dispose: jest.fn()
    })
  })
}));

jest.mock('node-fetch', () => 
  jest.fn().mockResolvedValue({
    ok: true,
    json: jest.fn().mockResolvedValue({
      data: [
        { index: 0, embedding: Array(1536).fill(0.1) },
        { index: 1, embedding: Array(1536).fill(0.2) }
      ]
    })
  })
);

jest.mock('fs', () => ({
  promises: {
    writeFile: jest.fn().mockResolvedValue(undefined),
    readFile: jest.fn().mockResolvedValue(JSON.stringify({
      version: 1,
      modelName: 'universal-sentence-encoder',
      dimension: 512,
      created: new Date().toISOString(),
      embeddings: {
        'test text': {
          vector: Array(512).fill(0.1),
          timestamp: Date.now()
        }
      }
    }))
  }
}));

jest.mock('../../lib/log/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
}));

jest.mock('../../lib/utils/memoryProtection', () => ({
  memoryProtection: {
    registerComponent: jest.fn()
  }
}));

jest.mock('../../lib/utils/platformIntegration', () => ({
  platformIntegration: {
    hasTensorFlowGPUSupport: jest.fn().mockReturnValue(false)
  }
}));

// Import after mocks are set up
const TFEmbeddingsService = require('../../lib/exponential/tfEmbeddings');

describe('TFEmbeddingsService Tests', () => {
  let embeddingsService;
  
  beforeEach(() => {
    // Reset mocks between tests
    jest.clearAllMocks();
    
    // Create a new instance for each test
    embeddingsService = new TFEmbeddingsService({
      modelName: 'universal-sentence-encoder',
      dimension: 512,
      cacheEnabled: true
    });
  });
  
  describe('Initialization', () => {
    test('should initialize with default options', () => {
      const service = new TFEmbeddingsService();
      expect(service.options.modelName).toBe('universal-sentence-encoder');
      expect(service.options.dimension).toBe(512);
      expect(service.options.cacheEnabled).toBe(true);
    });
    
    test('should initialize with custom options', () => {
      const service = new TFEmbeddingsService({
        modelName: 'bert',
        dimension: 768,
        cacheEnabled: false
      });
      expect(service.options.modelName).toBe('bert');
      expect(service.options.dimension).toBe(768);
      expect(service.options.cacheEnabled).toBe(false);
    });
    
    test('should initialize the model successfully', async () => {
      await embeddingsService.initialize();
      expect(embeddingsService.initialized).toBe(true);
    });
  });
  
  describe('Embedding Generation', () => {
    beforeEach(async () => {
      await embeddingsService.initialize();
    });
    
    test('should generate embeddings for a single text', async () => {
      const result = await embeddingsService.getEmbeddings('hello world');
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1); // One embedding for one input
      expect(Array.isArray(result[0])).toBe(true);
    });
    
    test('should generate embeddings for multiple texts', async () => {
      const result = await embeddingsService.getEmbeddings(['hello', 'world']);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2); // Two embeddings for two inputs
    });
    
    test('should use cache for repeated queries', async () => {
      // First call should generate embeddings
      await embeddingsService.getEmbeddings('cached text');
      
      // Mock the cache
      embeddingsService.embeddingCache.set('cached text', [0.1, 0.2, 0.3]);
      embeddingsService.cachedDates.set('cached text', Date.now());
      
      // Second call should use cache
      const spy = jest.spyOn(embeddingsService, '_generateEmbeddings');
      await embeddingsService.getEmbeddings('cached text');
      expect(spy).not.toHaveBeenCalled();
    });
    
    test('should handle empty input array gracefully', async () => {
      const result = await embeddingsService.getEmbeddings([]);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });
  });
  
  describe('Similarity Computation', () => {
    beforeEach(async () => {
      await embeddingsService.initialize();
      
      // Mock getEmbeddings to return predictable values
      embeddingsService.getEmbeddings = jest.fn()
        .mockResolvedValue([[0.1, 0.2, 0.3], [0.2, 0.3, 0.4]]);
    });
    
    test('should compute similarity between two texts', async () => {
      const similarity = await embeddingsService.computeSimilarity('text1', 'text2');
      expect(typeof similarity).toBe('number');
      expect(similarity).toBeGreaterThanOrEqual(0);
      expect(similarity).toBeLessThanOrEqual(1);
    });
    
    test('should compute similarity using different metrics', () => {
      const embedding1 = [0.1, 0.2, 0.3];
      const embedding2 = [0.2, 0.3, 0.4];
      
      const cosineSim = embeddingsService.computeEmbeddingSimilarity(embedding1, embedding2, 'cosine');
      expect(typeof cosineSim).toBe('number');
      
      const euclideanSim = embeddingsService.computeEmbeddingSimilarity(embedding1, embedding2, 'euclidean');
      expect(typeof euclideanSim).toBe('number');
      
      const manhattanSim = embeddingsService.computeEmbeddingSimilarity(embedding1, embedding2, 'manhattan');
      expect(typeof manhattanSim).toBe('number');
      
      const dotSim = embeddingsService.computeEmbeddingSimilarity(embedding1, embedding2, 'dot');
      expect(typeof dotSim).toBe('number');
    });
  });
  
  describe('Finding Similar Texts', () => {
    beforeEach(async () => {
      await embeddingsService.initialize();
      
      // Mock getEmbeddings to return predictable values
      embeddingsService.getEmbeddings = jest.fn()
        .mockImplementation((texts) => {
          if (Array.isArray(texts)) {
            return Promise.resolve(texts.map(() => Array(5).fill(0.5)));
          } else {
            return Promise.resolve([Array(5).fill(0.5)]);
          }
        });
      
      // Mock similarity computation
      embeddingsService.computeEmbeddingSimilarity = jest.fn()
        .mockImplementation((embedding1, embedding2) => {
          // Return different similarities based on text indices
          const idx = Math.floor(Math.random() * 10) / 10;
          return 0.5 + idx; // Values between 0.5 and 1.5
        });
    });
    
    test('should find similar texts with default options', async () => {
      const result = await embeddingsService.findSimilarTexts(
        'query',
        ['text1', 'text2', 'text3']
      );
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeLessThanOrEqual(10); // Default limit is 10
      
      // Each result should have text and similarity
      result.forEach(item => {
        expect(item).toHaveProperty('text');
        expect(item).toHaveProperty('similarity');
        expect(typeof item.similarity).toBe('number');
      });
    });
    
    test('should apply threshold and limit', async () => {
      const result = await embeddingsService.findSimilarTexts(
        'query',
        ['text1', 'text2', 'text3', 'text4', 'text5'],
        { threshold: 0.7, limit: 2 }
      );
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeLessThanOrEqual(2);
      
      // All results should have similarity >= threshold
      result.forEach(item => {
        expect(item.similarity).toBeGreaterThanOrEqual(0.7);
      });
    });
  });
  
  describe('Cache Management', () => {
    test('should clear cache', () => {
      // Add some items to cache
      embeddingsService.embeddingCache.set('text1', [0.1, 0.2]);
      embeddingsService.cachedDates.set('text1', Date.now());
      
      embeddingsService.clearCache();
      
      expect(embeddingsService.embeddingCache.size).toBe(0);
      expect(embeddingsService.cachedDates.size).toBe(0);
    });
    
    test('should export cache to file', async () => {
      // Add some items to cache
      embeddingsService.embeddingCache.set('text1', [0.1, 0.2]);
      embeddingsService.cachedDates.set('text1', Date.now());
      
      await embeddingsService.exportCache('cache.json');
      
      // Check that writeFile was called
      expect(require('fs').promises.writeFile).toHaveBeenCalled();
    });
    
    test('should import cache from file', async () => {
      await embeddingsService.importCache('cache.json');
      
      // Cache should contain the test item from the mock file
      expect(embeddingsService.embeddingCache.has('test text')).toBe(true);
    });
    
    test('should handle cache trim operations', () => {
      // Add many items to cache with different dates
      for (let i = 0; i < 20; i++) {
        embeddingsService.embeddingCache.set(`text${i}`, Array(5).fill(0.1));
        embeddingsService.cachedDates.set(`text${i}`, Date.now() - i * 1000); // Older as i increases
      }
      
      // Trim to keep 50%
      embeddingsService._trimCache(0.5);
      
      // Should have about half the items
      expect(embeddingsService.embeddingCache.size).toBeLessThanOrEqual(10);
    });
  });
  
  describe('OpenAI Integration', () => {
    beforeEach(() => {
      embeddingsService = new TFEmbeddingsService({
        modelName: 'openai',
        openAIApiKey: 'test-key',
        openAIModel: 'text-embedding-ada-002'
      });
    });
    
    test('should initialize OpenAI embeddings client', async () => {
      await embeddingsService.initialize();
      expect(embeddingsService.modelInfo.name).toBe('openai');
      expect(embeddingsService.modelInfo.model).toBe('text-embedding-ada-002');
    });
    
    test('should generate OpenAI embeddings', async () => {
      await embeddingsService.initialize();
      
      const result = await embeddingsService._generateOpenAIEmbeddings(['hello', 'world']);
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
      expect(result[0].length).toBe(1536); // OpenAI ada embeddings are 1536-dimensional
    });
    
    test('should throw error without API key', async () => {
      embeddingsService = new TFEmbeddingsService({
        modelName: 'openai'
      });
      
      await expect(embeddingsService.initialize()).rejects.toThrow('OpenAI API key is required');
    });
  });
  
  describe('Error Handling', () => {
    test('should handle model initialization errors', async () => {
      // Mock implementation to throw an error
      jest.requireMock('@tensorflow-models/universal-sentence-encoder').load
        .mockRejectedValueOnce(new Error('Test error'));
      
      await expect(embeddingsService.initialize()).rejects.toThrow('Test error');
      expect(embeddingsService.initialized).toBe(false);
    });
    
    test('should handle embedding generation errors', async () => {
      await embeddingsService.initialize();
      
      // Mock the model to throw an error
      embeddingsService.model.embed = jest.fn().mockRejectedValueOnce(new Error('Embedding error'));
      
      await expect(embeddingsService._generateUSEEmbeddings(['test']))
        .rejects.toThrow('Embedding error');
    });
  });
});
