/**
 * Unit tests for the Memory Protection module
 */

const { expect } = require('chai');
const sinon = require('sinon');
const { MemoryProtection } = require('../../lib/utils/memoryProtection');
const v8 = require('v8');

describe('MemoryProtection', function () {
    let memoryProtection;
    let v8Stub;
    let processEmitStub;
    let loggerStub;

    beforeEach(function () {
        // Mock logger
        loggerStub = {
            info: sinon.spy(),
            warn: sinon.spy(),
            error: sinon.spy(),
            debug: sinon.spy()
        };

        // Create instance with specific test options and mocked logger
        memoryProtection = new MemoryProtection({
            warningThreshold: 0.7,
            criticalThreshold: 0.85,
            checkIntervalMs: 1000,
            enableGC: true,
            logWarnings: true
        });

        // Replace the module's logger with our stub
        memoryProtection.logger = loggerStub;

        // Stub v8.getHeapStatistics
        v8Stub = sinon.stub(v8, 'getHeapStatistics').returns({
            total_heap_size: 100000000,
            used_heap_size: 50000000,
            heap_size_limit: 200000000
        });

        // Stub process.emit
        if (global.process) {
            processEmitStub = sinon.stub(process, 'emit');
        } else {
            // If we're in a browser environment for some reason
            global.process = { emit: sinon.spy() };
            processEmitStub = global.process.emit;
        }

        // Mock global.gc
        global.gc = sinon.spy();
    });

    it('should initialize with correct options', function () {
        expect(memoryProtection.options.warningThreshold).to.equal(0.7);
        expect(memoryProtection.options.criticalThreshold).to.equal(0.85);
        expect(memoryProtection.options.checkIntervalMs).to.equal(1000);
        expect(memoryProtection.options.enableGC).to.be.true;
        expect(memoryProtection.options.logWarnings).to.be.true;
    });

    it('should check memory usage correctly', function () {
        const result = memoryProtection.checkMemoryUsage();

        expect(result).to.be.an('object');
        expect(result.usedHeap).to.equal(50000000);
        expect(result.heapLimit).to.equal(200000000);
        expect(result.usageRatio).to.equal(0.25); // 50MB / 200MB
        expect(result.usagePercent).to.equal(25); // 25%

        // Should not trigger warnings at this level
        expect(loggerStub.warn.called).to.be.false;
        expect(loggerStub.error.called).to.be.false;
        expect(global.gc.called).to.be.false;
    });

    it('should handle warning level memory usage', function () {
        // Update v8 stub to report high but not critical usage
        v8Stub.returns({
            total_heap_size: 160000000,
            used_heap_size: 150000000, // 75% of limit
            heap_size_limit: 200000000
        });

        const result = memoryProtection.checkMemoryUsage();

        expect(result.usageRatio).to.equal(0.75); // 150MB / 200MB

        // Should trigger warning
        expect(loggerStub.warn.calledOnce).to.be.true;
        expect(loggerStub.error.called).to.be.false;

        // Should attempt garbage collection
        expect(global.gc.calledOnce).to.be.true;
    });

    it('should handle critical memory usage', function () {
        // Update v8 stub to report critical usage
        v8Stub.returns({
            total_heap_size: 190000000,
            used_heap_size: 180000000, // 90% of limit
            heap_size_limit: 200000000
        });

        const result = memoryProtection.checkMemoryUsage();

        expect(result.usageRatio).to.equal(0.9); // 180MB / 200MB

        // Should trigger error
        expect(loggerStub.error.calledOnce).to.be.true;

        // Should attempt garbage collection
        expect(global.gc.calledOnce).to.be.true;

        // Should emit memory alarm
        expect(processEmitStub.calledWith('memoryAlarm')).to.be.true;
        const alarmData = processEmitStub.firstCall.args[1];
        expect(alarmData).to.be.an('object');
        expect(alarmData.usagePercent).to.equal(90);
    });

    it('should start and stop monitoring', function () {
        const clockStub = sinon.useFakeTimers();

        // Start monitoring
        memoryProtection.startMonitoring();
        expect(memoryProtection.isMonitoring).to.be.true;
        expect(memoryProtection.intervalId).to.not.be.null;
        expect(loggerStub.info.calledWith('Memory protection monitoring started')).to.be.true;

        // Should have run checkMemoryUsage once immediately
        expect(v8Stub.calledOnce).to.be.true;

        // Advance clock and verify it was called again
        v8Stub.reset();
        clockStub.tick(1000);
        expect(v8Stub.calledOnce).to.be.true;

        // Stop monitoring
        memoryProtection.stopMonitoring();
        expect(memoryProtection.isMonitoring).to.be.false;
        expect(memoryProtection.intervalId).to.be.null;
        expect(loggerStub.info.calledWith('Memory protection monitoring stopped')).to.be.true;

        // Should not call checkMemoryUsage again
        v8Stub.reset();
        clockStub.tick(1000);
        expect(v8Stub.called).to.be.false;

        clockStub.restore();
    });

    it('should format bytes correctly', function () {
        expect(memoryProtection.formatBytes(0)).to.equal('0 Bytes');
        expect(memoryProtection.formatBytes(1023)).to.equal('1023 Bytes');
        expect(memoryProtection.formatBytes(1024)).to.equal('1 KB');
        expect(memoryProtection.formatBytes(1536)).to.equal('1.5 KB');
        expect(memoryProtection.formatBytes(1048576)).to.equal('1 MB');
        expect(memoryProtection.formatBytes(1073741824)).to.equal('1 GB');
        expect(memoryProtection.formatBytes(1610612736)).to.equal('1.5 GB');
    });

    it('should get memory report', function () {
        const report = memoryProtection.getMemoryReport();

        expect(report).to.be.an('object');
        expect(report.heapTotal).to.equal('95.37 MB'); // 100MB formatted
        expect(report.heapUsed).to.equal('47.68 MB'); // 50MB formatted
        expect(report.heapLimit).to.equal('190.73 MB'); // 200MB formatted
        expect(report.usagePercent).to.equal('25.00%');
    });

    afterEach(function () {
        // Restore all stubs
        if (memoryProtection.intervalId) {
            clearInterval(memoryProtection.intervalId);
        }
        v8Stub.restore();
        if (processEmitStub.restore) {
            processEmitStub.restore();
        }
        delete global.gc;
        if (global.process === process) {
            // Only delete if we created it
            delete global.process;
        }
        sinon.restore();
    });
});
