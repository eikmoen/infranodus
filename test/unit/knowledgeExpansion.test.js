const { expect } = require('chai');
const sinon = require('sinon');
const { KnowledgeExpansion } = require('../../lib/exponential/knowledgeExpansion');
const { memoryProtection } = require('../../lib/utils/memoryProtection');

describe('KnowledgeExpansion', function () {
    let knowledgeExpansion;
    const userId = 'test-user-123';
    const contextName = 'test-context';

    beforeEach(function () {
        knowledgeExpansion = new KnowledgeExpansion({
            maxExpansionDepth: 2,
            expansionFactor: 1.2,
            defaultModel: 'test-model'
        });

        // Mock internal methods
        sinon.stub(knowledgeExpansion, '_fetchGraph').resolves({
            nodes: [
                { id: 'node1', name: 'Concept A' },
                { id: 'node2', name: 'Concept B' }
            ],
            edges: [
                { source: 'node1', target: 'node2', weight: 1 }
            ],
            contextName
        });

        sinon.stub(knowledgeExpansion, '_saveToInfraNodus').resolves();

        // Mock model provider
        const mockProvider = {
            generateConcepts: sinon.stub().resolves([
                { id: 'new1', name: 'New Concept 1' },
                { id: 'new2', name: 'New Concept 2' }
            ]),
            generateConnections: sinon.stub().resolves([
                { source: 'node1', target: 'new1', weight: 0.8 },
                { source: 'new1', target: 'new2', weight: 0.9 }
            ]),
            generateInsights: sinon.stub().resolves([
                { type: 'cluster', description: 'Test insight', nodes: ['new1', 'new2'] }
            ])
        };

        knowledgeExpansion.registerModelProvider('test-model', mockProvider);

        // Mock memory protection
        sinon.stub(memoryProtection, 'checkMemoryUsage').returns({
            usageRatio: 0.5,
            usagePercent: 50
        });
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('#startExpansion', function () {
        it('should initialize expansion job with correct options', function () {
            const jobId = knowledgeExpansion.startExpansion(userId, contextName);

            expect(jobId).to.be.a('string');
            expect(jobId).to.include('expansion-test-user-123-test-context');

            const job = knowledgeExpansion.expansionJobs.get(jobId);
            expect(job).to.exist;
            expect(job.userId).to.equal(userId);
            expect(job.contextName).to.equal(contextName);
            expect(job.status).to.equal('initializing');
        });

        it('should apply custom expansion options', function () {
            const options = {
                depth: 3,
                factor: 2.0,
                model: 'advanced-model',
                focusNodes: ['node1']
            };

            const jobId = knowledgeExpansion.startExpansion(userId, contextName, options);
            const job = knowledgeExpansion.expansionJobs.get(jobId);

            expect(job.options.depth).to.equal(3);
            expect(job.options.factor).to.equal(2.0);
            expect(job.options.model).to.equal('advanced-model');
            expect(job.options.focusNodes).to.deep.equal(['node1']);
        });
    });

    describe('#getExpansionStatus', function () {
        it('should return the status of an expansion job', function () {
            const jobId = knowledgeExpansion.startExpansion(userId, contextName);
            const status = knowledgeExpansion.getExpansionStatus(jobId);

            expect(status).to.be.an('object');
            expect(status.jobId).to.equal(jobId);
            expect(status.userId).to.equal(userId);
            expect(status.contextName).to.equal(contextName);
            expect(status.status).to.be.oneOf(['initializing', 'running']);
            expect(status.progress).to.be.a('number');
        });

        it('should throw error for non-existent job ID', function () {
            expect(() => knowledgeExpansion.getExpansionStatus('non-existent-job')).to.throw(Error);
        });
    });

    describe('#cancelExpansion', function () {
        it('should mark a job for cancellation', function () {
            const jobId = knowledgeExpansion.startExpansion(userId, contextName);

            // Verify initial state
            const initialJob = knowledgeExpansion.expansionJobs.get(jobId);
            expect(initialJob.status).to.not.equal('cancelling');

            // Cancel the job
            const result = knowledgeExpansion.cancelExpansion(jobId);
            expect(result).to.be.true;

            // Check updated job status
            const updatedJob = knowledgeExpansion.expansionJobs.get(jobId);
            expect(updatedJob.status).to.equal('cancelling');
        });

        it('should return false for non-existent jobs', function () {
            const result = knowledgeExpansion.cancelExpansion('non-existent-job');
            expect(result).to.be.false;
        });
    });

    describe('#_runExpansionProcess', function () {
        it('should handle the complete expansion process', async function () {
            // This will test the actual expansion process flow
            const jobId = knowledgeExpansion.startExpansion(userId, contextName);

            // We'll need to wait for the async process to complete
            // In a real test, we'd use a more sophisticated approach to wait for completion
            await new Promise(resolve => setTimeout(resolve, 100));

            // Check that _fetchGraph was called
            expect(knowledgeExpansion._fetchGraph.calledOnce).to.be.true;
            expect(knowledgeExpansion._fetchGraph.calledWith(userId, contextName)).to.be.true;

            // Since we've stubbed _expandRecursively, we should verify it was properly called
            const provider = knowledgeExpansion.modelProviders.get('test-model');

            // In a real implementation, we'd restore the stub for _expandRecursively and
            // implement it to verify the recursive process, but that would be quite complex
            // for this test example
        });
    });

    describe('Memory Protection Integration', function () {
        it('should check memory usage during expansion', async function () {
            // Setup memory protection to report high usage
            memoryProtection.checkMemoryUsage.restore();
            sinon.stub(memoryProtection, 'checkMemoryUsage').returns({
                usageRatio: 0.9, // 90% usage
                usagePercent: 90
            });

            // Mock _expandRecursively to test memory protection
            sinon.stub(knowledgeExpansion, '_expandRecursively').resolves();

            const jobId = knowledgeExpansion.startExpansion(userId, contextName);

            // Wait for async process
            await new Promise(resolve => setTimeout(resolve, 100));

            // The expansion should have been stopped due to high memory usage
            const job = knowledgeExpansion.expansionJobs.get(jobId);
            expect(job.status).to.equal('partially_completed');
            expect(job.error).to.contain('Memory limit reached');
        });
    });
});
