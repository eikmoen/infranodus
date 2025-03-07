const { expect } = require('chai');
const sinon = require('sinon');
const { memoryProtection } = require('../../lib/utils/memoryProtection');
const { KnowledgeExpansion } = require('../../lib/exponential/knowledgeExpansion');

describe('Memory Usage During Operations', function () {
    let knowledgeExpansion;
    let v8Mock;
    let initialMemoryStats;
    let highMemoryStats;
    let criticalMemoryStats;

    beforeEach(function () {
        // Mock v8.getHeapStatistics
        initialMemoryStats = {
            total_heap_size: 100 * 1024 * 1024, // 100MB
            used_heap_size: 40 * 1024 * 1024,   // 40MB
            heap_size_limit: 1024 * 1024 * 1024 // 1GB
        };

        highMemoryStats = {
            total_heap_size: 800 * 1024 * 1024, // 800MB
            used_heap_size: 700 * 1024 * 1024,  // 700MB
            heap_size_limit: 1024 * 1024 * 1024 // 1GB
        };

        criticalMemoryStats = {
