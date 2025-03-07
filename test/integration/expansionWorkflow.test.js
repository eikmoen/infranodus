const { expect } = require('chai');
const sinon = require('sinon');
const { knowledgeExpansion } = require('../../lib/exponential/knowledgeExpansion');
const { cosmicSymphony } = require('../../lib/cosmic/symphonyProgression');
const { celestialVeritas } = require('../../lib/cosmic/celestialVeritas');
const testGraph = require('../fixtures/testGraph');

describe('Expansion to Symphony Workflow Integration', function () {
    const userId = 'test-user-integration';
    const contextName = 'test-context-integration';
    let expansionJobId;
    let mockGraph;

    before(function () {
        // Use the fixed test graph
        mockGraph = testGraph.basicGraph;

        // Set up mocks/stubs for the modules we're integrating
        sinon.stub(knowledgeExpansion, '_fetchGraph').resolves(mockGraph);
        sinon.stub(knowledgeExpansion, '_saveToInfraNodus').resolves();

        // Create mock model providers for expansion
        const mockProvider = {
            generateConcepts: sinon.stub().resolves([
                { id: 'exp1', name: 'Expanded Concept 1' },
                { id: 'exp2', name: 'Expanded Concept 2' }
            ]),
            generateConnections: sinon.stub().resolves([
                { source: 'node1', target: 'exp1', weight: 0.8 },
                { source: 'exp1', target: 'exp2', weight: 0.9 }
            ]),
            generateInsights: sinon.stub().resolves([
                { type: 'cluster', description: 'Integration insight', nodes: ['exp1', 'exp2'] }
            ])
        };

        // Register the mock provider
        knowledgeExpansion.registerModelProvider('test-model', mockProvider);

        // Define the behavior we want for the expansion job's internal processing
        sinon.stub(knowledgeExpansion, '_expandRecursively').callsFake(async (jobId, graph, depth) => {
            const job = knowledgeExpansion.expansionJobs.get(jobId);
            if (job) {
                // Simulate expansion completion
                job.status = 'completed';
                job.progress = 100;
                job.lastUpdateTime = new Date();
                job.generatedNodes = 2;
                job.generatedConnections = 2;
                job.results = {
                    nodes: mockProvider.generateConcepts.firstCall.returnValue,
                    connections: mockProvider.generateConnections.firstCall.returnValue,
                    insights: mockProvider.generateInsights.firstCall.returnValue
                };
            }
        });
    });

    after(function () {
        sinon.restore();
    });

    it('should complete the full expansion-symphony-veritas workflow', async function () {
        // Step 1: Start with knowledge expansion
        expansionJobId = knowledgeExpansion.startExpansion(userId, contextName, {
            depth: 2,
            model: 'test-model'
        });

        expect(expansionJobId).to.be.a('string');

        // Wait for "async" expansion to complete
        await new Promise(resolve => setTimeout(resolve, 100));

        // Check expansion status - should be completed
        const status = knowledgeExpansion.getExpansionStatus(expansionJobId);
        expect(status.status).to.equal('completed');

        // Get expansion results to use in the next step
        const expansionResults = knowledgeExpansion.getExpansionResults(expansionJobId);
        expect(expansionResults).to.be.an('object');
        expect(expansionResults.nodes).to.be.an('array');
        expect(expansionResults.connections).to.be.an('array');

        // Step 2: Enhance the graph with expansion results
        const enhancedGraph = {
            ...mockGraph,
            nodes: [...mockGraph.nodes, ...expansionResults.nodes],
            edges: [...mockGraph.edges, ...expansionResults.connections]
        };

        // Set up mock for cosmic symphony analysis
        sinon.stub(cosmicSymphony, '_extractTemporalData').returns({});
        sinon.stub(cosmicSymphony, '_identifyHarmonicResonances').returns([
            { id: 'harmony1', source: 'node1', target: 'exp1', strength: 0.9 }
        ]);
        sinon.stub(cosmicSymphony, '_mapConceptualProgressions').returns([]);
        sinon.stub(cosmicSymphony, '_identifyCosmicPatterns').returns([
            { id: 'pattern1', nodes: ['node1', 'exp1', 'exp2'], strength: 0.85 }
        ]);
        sinon.stub(cosmicSymphony, '_calculateSymphonyScore').returns({
            overall: 0.8,
            harmony: 0.85,
            progression: 0.75,
            complexity: 0.7,
            resonance: 0.9,
            cohesion: 0.8,
            emergence: 0.75
        });
        sinon.stub(cosmicSymphony, '_calculateCosmicDensity').returns(0.7);
        sinon.stub(cosmicSymphony, '_identifyHarmonicClusters').returns([]);
        sinon.stub(cosmicSymphony, '_orchestrateConcepts').returns({});
        sinon.stub(cosmicSymphony, '_analyzeTemporalHarmonics').returns({});

        // Step 3: Perform cosmic symphony analysis on the enhanced graph
        const symphonyResults = cosmicSymphony.analyzeCosmicSymphony(userId, contextName, enhancedGraph);

        expect(symphonyResults).to.be.an('object');
        expect(symphonyResults.symphonyScore.overall).to.equal(0.8);

        // Step 4: Set up mock for celestial veritas analysis
        sinon.stub(celestialVeritas, '_identifyLatentConnections').returns([]);
        sinon.stub(celestialVeritas, '_detectShadowContradictions').returns([
            {
                id: 'contra1',
                type: 'logical',
                description: 'Integration contradiction',
                concepts: ['node1', 'exp2'],
                severity: 0.7
            }
        ]);
        sinon.stub(celestialVeritas, '_uncoverCelestialTruths').returns([
            {
                id: 'truth1',
                insight: 'Integration truth',
                confidence: 0.85,
                involvedNodes: ['node1', 'exp1', 'node2'],
                energyLevel: 0.8
            }
        ]);
        sinon.stub(celestialVeritas, '_synthesizeResolutions').returns([
            {
                id: 'res1',
                contradictionId: 'contra1',
                approach: 'synthesis',
                synthesis: 'Integration resolution',
                transformPotential: 0.8
            }
        ]);
        sinon.stub(celestialVeritas, '_calculateCoherenceMetrics').returns({
            overall: 0.75,
            logical: 0.8,
            semantic: 0.7,
            structural: 0.75,
            temporal: 0.7,
            transformative: 0.8
        });
        sinon.stub(celestialVeritas, '_generateTruthSummary').returns('Integration summary');

        // Step 5: Complete the workflow with celestial veritas analysis
        const veritasResults = celestialVeritas.revealCelestialTruths(userId, contextName, enhancedGraph);

        expect(veritasResults).to.be.an('object');
        expect(veritasResults.truthCount).to.equal(1);
        expect(veritasResults.contradictionCount).to.equal(1);
        expect(veritasResults.coherenceMetrics.overall).to.equal(0.75);

        // Verify the complete workflow maintains data consistency
        expect(veritasResults.userId).to.equal(symphonyResults.userId).to.equal(userId);
        expect(veritasResults.contextName).to.equal(symphonyResults.contextName).to.equal(contextName);
    });
});
