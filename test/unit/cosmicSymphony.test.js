const { expect } = require('chai');
const sinon = require('sinon');
const { CosmicSymphony } = require('../../lib/cosmic/symphonyProgression');
const testGraph = require('../fixtures/testGraph');

describe('CosmicSymphony', function () {
    let cosmicSymphony;
    const userId = 'test-user-123';
    const contextName = 'test-context';

    beforeEach(function () {
        cosmicSymphony = new CosmicSymphony({
            harmonicThreshold: 0.6,
            resonanceDepth: 2,
            dimensionality: 3
        });

        // Create stubs for private methods
        sinon.stub(cosmicSymphony, '_extractTemporalData').returns({
            nodeTimestamps: {},
            edgeTimestamps: {},
            conceptEvolution: [],
            temporalClusters: []
        });

        sinon.stub(cosmicSymphony, '_identifyHarmonicResonances').returns([
            {
                id: 'resonance1',
                source: 'node1',
                target: 'node2',
                strength: 0.8,
                type: 'complementary'
            }
        ]);

        sinon.stub(cosmicSymphony, '_mapConceptualProgressions').returns([
            {
                id: 'progression1',
                path: ['node1', 'node3', 'node4'],
                strength: 0.7,
                description: 'Test progression'
            }
        ]);

        sinon.stub(cosmicSymphony, '_identifyCosmicPatterns').returns([
            {
                id: 'pattern1',
                nodes: ['node1', 'node2', 'node3'],
                type: 'triad',
                strength: 0.85,
                description: 'Test pattern'
            }
        ]);

        sinon.stub(cosmicSymphony, '_calculateSymphonyScore').returns({
            overall: 0.75,
            harmony: 0.8,
            progression: 0.7,
            complexity: 0.65,
            resonance: 0.9,
            cohesion: 0.6,
            emergence: 0.8
        });

        sinon.stub(cosmicSymphony, '_calculateCosmicDensity').returns(0.65);
        sinon.stub(cosmicSymphony, '_identifyHarmonicClusters').returns([
            { id: 'cluster1', nodes: ['node1', 'node2'], strength: 0.7 }
        ]);
        sinon.stub(cosmicSymphony, '_orchestrateConcepts').returns({
            conductors: ['node1'],
            soloists: ['node3'],
            sections: { main: ['node2', 'node4'] },
            harmonics: ['node5'],
            rhythmics: ['node6'],
            bridges: ['node7']
        });
        sinon.stub(cosmicSymphony, '_analyzeTemporalHarmonics').returns({
            cycles: [],
            waves: [],
            tempos: {},
            evolution: []
        });
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('#analyzeCosmicSymphony', function () {
        it('should analyze a graph and return comprehensive results', function () {
            const graph = testGraph.basicGraph;
            const result = cosmicSymphony.analyzeCosmicSymphony(userId, contextName, graph);

            // Test result structure and content
            expect(result).to.be.an('object');
            expect(result.userId).to.equal(userId);
            expect(result.contextName).to.equal(contextName);
            expect(result.symphonyScore).to.be.an('object');
            expect(result.symphonyScore.overall).to.equal(0.75);

            // Verify that methods were called with correct parameters
            expect(cosmicSymphony._extractTemporalData.calledWith(graph)).to.be.true;
            expect(cosmicSymphony._identifyHarmonicResonances.calledWith(graph)).to.be.true;

            // Verify storage of results
            const key = `${userId}:${contextName}`;
            expect(cosmicSymphony.temporalProgressions.has(key)).to.be.true;
            expect(cosmicSymphony.harmonicResonances.has(key)).to.be.true;
            expect(cosmicSymphony.cosmicPatterns.has(key)).to.be.true;
            expect(cosmicSymphony.symphonyScores.has(key)).to.be.true;
        });
    });

    describe('#getVisualizationData', function () {
        it('should return properly structured visualization data', function () {
            // First analyze a graph to populate the data
            const graph = testGraph.basicGraph;
            cosmicSymphony.analyzeCosmicSymphony(userId, contextName, graph);

            // Set up stubs for visualization preparation methods
            sinon.stub(cosmicSymphony, '_prepareNodesForVisualization').returns([]);
            sinon.stub(cosmicSymphony, '_prepareEdgesForVisualization').returns([]);
            sinon.stub(cosmicSymphony, '_prepareProgressionPaths').returns([]);
            sinon.stub(cosmicSymphony, '_generateHarmonicFields').returns([]);
            sinon.stub(cosmicSymphony, '_generateCosmicBackdrop').returns({});
            sinon.stub(cosmicSymphony, '_generateTemporalWaves').returns([]);
            sinon.stub(cosmicSymphony, '_generateOrchestrationLayers').returns([]);
            sinon.stub(cosmicSymphony, '_calculateCosmicTempo').returns({});
            sinon.stub(cosmicSymphony, '_calculateHarmonicFlow').returns({});
            sinon.stub(cosmicSymphony, '_extractPulsationPatterns').returns({});

            // Get visualization data
            const result = cosmicSymphony.getVisualizationData(userId, contextName);

            // Test result structure
            expect(result).to.be.an('object');
            expect(result.type).to.equal('cosmic-symphony');
            expect(result.dimensions).to.equal(3);
            expect(result.scaling).to.equal('logarithmic');
            expect(result.nodeData).to.be.an('array');
            expect(result.edgeData).to.be.an('array');
            expect(result.progressionPaths).to.be.an('array');
            expect(result.harmonicFields).to.be.an('array');
            expect(result.cosmicBackdrop).to.be.an('object');
            expect(result.temporalWaves).to.be.an('array');
            expect(result.orchestrationLayers).to.be.an('array');
            expect(result.animationSettings).to.be.an('object');
        });
    });

    describe('#getResonanceRecommendations', function () {
        it('should return prioritized resonance recommendations', function () {
            // First analyze a graph to populate the data
            const graph = testGraph.basicGraph;
            cosmicSymphony.analyzeCosmicSymphony(userId, contextName, graph);

            // Set up stubs for recommendation methods
            sinon.stub(cosmicSymphony, '_identifyPotentialResonances').returns([
                { source: 'node1', target: 'node5', type: 'complementary' },
                { source: 'node2', target: 'node6', type: 'bridging' }
            ]);

            sinon.stub(cosmicSymphony, '_calculateResonanceStrength').returns(0.8);
            sinon.stub(cosmicSymphony, '_calculateGrowthPotential').returns(0.75);
            sinon.stub(cosmicSymphony, '_predictHarmonicImpact').returns({
                overallChange: 0.2,
                specificImpacts: {}
            });

            sinon.stub(cosmicSymphony, '_generateResonanceDescription').returns('Test description');
            sinon.stub(cosmicSymphony, '_miniResonanceVisualization').returns({
                nodes: [],
                edges: [],
                highlights: {}
            });

            // Get recommendations
            const result = cosmicSymphony.getResonanceRecommendations(userId, contextName, 2);

            // Test result structure
            expect(result).to.be.an('array').with.lengthOf(2);
            expect(result[0].source).to.be.a('string');
            expect(result[0].target).to.be.a('string');
            expect(result[0].resonanceType).to.be.a('string');
            expect(result[0].resonanceStrength).to.be.a('number');
            expect(result[0].growthPotential).to.be.a('number');
            expect(result[0].description).to.be.a('string');
            expect(result[0].visualization).to.be.an('object');
        });
    });

    describe('#generateCosmicProgression', function () {
        it('should generate a progressive path for concept development', function () {
            // First analyze a graph to populate the data
            const graph = testGraph.basicGraph;
            cosmicSymphony.analyzeCosmicSymphony(userId, contextName, graph);

            // Set up stubs for progression methods
            sinon.stub(cosmicSymphony, '_generateProgressionPath').returns([
                {
                    concept: "Example Concept",
                    purpose: "Bridges conceptual domains",
                    connections: ["Related Concept 1", "Related Concept 2"],
                    resonanceType: "harmonic",
                    cosmicSignificance: 0.8
                }
            ]);

            sinon.stub(cosmicSymphony, '_generateStepDescription').returns('Test step description');
            sinon.stub(cosmicSymphony, '_generatePathVisualization').returns({});
            sinon.stub(cosmicSymphony, '_evaluateCosmicSignificance').returns({
                overallSignificance: 0.85,
                keyInsights: [],
                transformativePotential: 0.9
            });
            sinon.stub(cosmicSymphony, '_calculateHarmonicPotential').returns(0.8);
            sinon.stub(cosmicSymphony, '_generateCosmicNarrative').returns('Test narrative');

            // Generate progression with options
            const options = {
                steps: 5,
                focus: 'balanced',
                startNodes: ['node1'],
                conceptualDistance: 'focused'
            };

            const result = cosmicSymphony.generateCosmicProgression(userId, contextName, options);

            // Test result structure
            expect(result).to.be.an('object');
            expect(result.path).to.be.an('array');
            expect(result.steps).to.be.an('array');
            expect(result.visualization).to.be.an('object');
            expect(result.cosmicSignificance).to.be.an('object');
            expect(result.harmonicPotential).to.be.a('number');
            expect(result.narrative).to.be.a('string');

            // Verify options were passed correctly
            expect(cosmicSymphony._generateProgressionPath.firstCall.args[3]).to.deep.include({
                steps: 5,
                focus: 'balanced',
                startNodes: ['node1'],
                conceptualDistance: 'focused'
            });
        });
    });
});
