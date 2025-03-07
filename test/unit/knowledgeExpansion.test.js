const { expect } = require('chai');
const sinon = require('sinon');
const { KnowledgeExpansion } = require('../../lib/exponential/knowledgeExpansion');

describe('KnowledgeExpansion', function () {
    let knowledgeExpansion;

    beforeEach(function () {
        knowledgeExpansion = new KnowledgeExpansion({
            maxExpansionDepth: 2,
            expansionFactor: 1.2,
            defaultModel: 'test-model'
        });

        // Mock the internal methods
        sinon.stub(knowledgeExpansion, '_fetchGraph').resolves({
            nodes: [
                { id: 'node1', name: 'Concept A' },
                { id: 'node2', name: 'Concept B' }
            ],
            edges: [
                { source: 'node1', target: 'node2', weight: 1 }
            ]
        });

        sinon.stub(knowledgeExpansion, '_saveToInfraNodus').resolves();
    });

    // Test startExpansion, cancelExpansion, and other public methods

    afterEach(function () {
        sinon.restore();
    });
});
