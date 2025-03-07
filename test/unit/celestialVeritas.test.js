/**
 * Unit tests for the CelestialVeritas module
 */

const { expect } = require('chai');
const sinon = require('sinon');
const { CelestialVeritas } = require('../../lib/cosmic/celestialVeritas');
const { memoryProtection } = require('../../lib/utils/memoryProtection');

describe('CelestialVeritas', function () {
    let celestialVeritas;
    let mockGraph;
    const userId = 'test-user-123';
    const contextName = 'test-context';

    before(function () {
        // Create instance with specific test options
        celestialVeritas = new CelestialVeritas({
            truthThreshold: 0.7,
            shadowDepth: 2,
            veritasDimensions: 3,
            synthesisIntensity: 0.6,
            resolutionMethod: 'test-method'
        });

        // Verify instance was created with correct options
        expect(celestialVeritas.options.truthThreshold).to.equal(0.7);
        expect(celestialVeritas.options.shadowDepth).to.equal(2);
        expect(celestialVeritas.options.veritasDimensions).to.equal(3);
        expect(celestialVeritas.options.synthesisIntensity).to.equal(0.6);
        expect(celestialVeritas.options.resolutionMethod).to.equal('test-method');
    });

    beforeEach(function () {
        // Setup mock graph for testing
        mockGraph = {
            nodes: [
                { id: 'node1', name: 'Concept A', connections: ['node2', 'node3'] },
                { id: 'node2', name: 'Concept B', connections: ['node1'] },
                { id: 'node3', name: 'Concept C', connections: ['node1', 'node4'] },
                { id: 'node4', name: 'Concept D', connections: ['node3'] },
            ],
            edges: [
                { source: 'node1', target: 'node2', weight: 1 },
                { source: 'node1', target: 'node3', weight: 2 },
                { source: 'node3', target: 'node4', weight: 1 },
            ],
            contextName: contextName
        };

        // Mock internal methods to isolate test scope
        sinon.stub(celestialVeritas, '_identifyLatentConnections').returns([
            { source: 'node2', target: 'node4', confidence: 0.8, type: 'semantic' }
        ]);

        sinon.stub(celestialVeritas, '_detectShadowContradictions').returns([
            {
                id: 'contra1',
                type: 'logical',
                description: 'Test contradiction',
                concepts: ['node1', 'node4'],
                severity: 0.8
            }
        ]);

        sinon.stub(celestialVeritas, '_uncoverCelestialTruths').returns([
            {
                id: 'truth1',
                insight: 'Test celestial truth',
                confidence: 0.9,
                involvedNodes: ['node1', 'node2', 'node3'],
                energyLevel: 0.85
            }
        ]);

        sinon.stub(celestialVeritas, '_synthesizeResolutions').returns([
            {
                id: 'res1',
                contradictionId: 'contra1',
                approach: 'synthesis',
                synthesis: 'Test resolution synthesis',
                transformPotential: 0.75
            }
        ]);

        sinon.stub(celestialVeritas, '_calculateCoherenceMetrics').returns({
            overall: 0.8,
            logical: 0.75,
            semantic: 0.82,
            structural: 0.79,
            temporal: 0.7,
            transformative: 0.85
        });

        sinon.stub(celestialVeritas, '_generateTruthSummary').returns('Test truth summary');

        // Memory protection stub
        sinon.stub(memoryProtection, 'checkMemoryUsage').returns({
            usageRatio: 0.6,
            usagePercent: '60%'
        });
    });

    it('should reveal celestial truths', function () {
        // Call the method being tested
        const result = celestialVeritas.revealCelestialTruths(userId, contextName, mockGraph);

        // Verify results
        expect(result).to.be.an('object');
        expect(result.userId).to.equal(userId);
        expect(result.contextName).to.equal(contextName);
        expect(result.truthCount).to.equal(1);
        expect(result.contradictionCount).to.equal(1);
        expect(result.resolutionCount).to.equal(1);
        expect(result.coherenceMetrics.overall).to.equal(0.8);

        // Check that celestial truths were included in result
        expect(result.celestialTruths).to.be.an('array').with.lengthOf(1);
        expect(result.celestialTruths[0].id).to.equal('truth1');
        expect(result.celestialTruths[0].insight).to.equal('Test celestial truth');

        // Check that shadow contradictions were included
        expect(result.shadowContradictions).to.be.an('array').with.lengthOf(1);
        expect(result.shadowContradictions[0].id).to.equal('contra1');
        expect(result.shadowContradictions[0].description).to.equal('Test contradiction');

        // Check that resolutions were included
        expect(result.topResolutions).to.be.an('array').with.lengthOf(1);
        expect(result.topResolutions[0].id).to.equal('res1');
        expect(result.topResolutions[0].approach).to.equal('synthesis');

        // Verify that the results were stored in the cache maps
        expect(celestialVeritas.celestialTruths.has(`${userId}:${contextName}`)).to.be.true;
        expect(celestialVeritas.shadowContradictions.has(`${userId}:${contextName}`)).to.be.true;
        expect(celestialVeritas.veritasSynthesis.has(`${userId}:${contextName}`)).to.be.true;
    });

    it('should perform simplified analysis when memory usage is high', function () {
        // Update memory stub to report high usage
        memoryProtection.checkMemoryUsage.restore();
        sinon.stub(memoryProtection, 'checkMemoryUsage').returns({
            usageRatio: 0.9,
            usagePercent: '90%'
        });

        // Set up stub for simplified analysis
        sinon.stub(celestialVeritas, '_performSimplifiedAnalysis').returns({
            userId,
            contextName,
            coherenceMetrics: { overall: 0.5 },
            truthCount: 1,
            contradictionCount: 1
        });

        // Call the method being tested
        const result = celestialVeritas.revealCelestialTruths(userId, contextName, mockGraph);

        // Verify the simplified analysis was used
        expect(celestialVeritas._performSimplifiedAnalysis.calledOnce).to.be.true;
        expect(result.coherenceMetrics.overall).to.equal(0.5);
    });

    it('should get details for a specific celestial truth', function () {
        // First reveal truths to populate the cache
        celestialVeritas.revealCelestialTruths(userId, contextName, mockGraph);

        // Set up additional stubs for detail methods
        sinon.stub(celestialVeritas, '_findConnectedTruths').returns([
            { id: 'truth2', insight: 'Connected truth', relationshipToOriginal: 'complementary' }
        ]);

        sinon.stub(celestialVeritas, '_identifyApplicationDomains').returns([
            { name: "Test Domain", relevance: 0.8, explanation: "Test explanation" }
        ]);

        sinon.stub(celestialVeritas, '_calculateExpansionPotential').returns({
            potential: 0.75,
            directions: [{ domain: "Test Direction", potential: 0.8 }]
        });

        sinon.stub(celestialVeritas, '_generateTruthNarrative').returns('Test narrative');

        sinon.stub(celestialVeritas, '_prepareVisualizationData').returns({
            nodes: [],
            edges: [],
            centralInsight: {},
            radiatingConnections: []
        });

        // Call the method being tested
        const result = celestialVeritas.getCelestialTruthDetails(userId, contextName, 'truth1');

        // Verify results
        expect(result).to.be.an('object');
        expect(result.id).to.equal('truth1');
        expect(result.insight).to.equal('Test celestial truth');
        expect(result.narrative).to.equal('Test narrative');
        expect(result.connectedTruths).to.be.an('array').with.lengthOf(1);
        expect(result.connectedTruths[0].id).to.equal('truth2');
        expect(result.applicationDomains).to.be.an('array').with.lengthOf(1);
        expect(result.applicationDomains[0].name).to.equal('Test Domain');
        expect(result.expansionPotential).to.be.an('object');
        expect(result.expansionPotential.potential).to.equal(0.75);
        expect(result.visualizationData).to.be.an('object');
    });

    it('should throw error when getting details for non-existent truth', function () {
        // First reveal truths to populate the cache
        celestialVeritas.revealCelestialTruths(userId, contextName, mockGraph);

        // Call with non-existent ID
        expect(() => celestialVeritas.getCelestialTruthDetails(userId, contextName, 'nonexistent'))
            .to.throw('Celestial truth nonexistent not found');
    });

    afterEach(function () {
        // Restore all stubs
        sinon.restore();
    });
});
