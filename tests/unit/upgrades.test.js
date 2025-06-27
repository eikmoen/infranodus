const { UpgradeService } = require('../../lib/services/upgradeService');
const path = require('path');
const fs = require('fs');
const os = require('os');

const upgradeService = require('../../lib/services/upgradeService');

describe('upgradeService', () => {
    test('returns upgrades', () => {
        const upgrades = upgradeService.getUpgrades();
        expect(Array.isArray(upgrades)).toBe(true);
        expect(upgrades.length).toBeGreaterThan(0);
    });

    test('returns combos', () => {
        const combos = upgradeService.getCombos();
        expect(Array.isArray(combos)).toBe(true);
        expect(combos.length).toBeGreaterThan(0);
    });

    test('getUpgradeById works', () => {
        const upgrade = upgradeService.getUpgradeById('pro');
        expect(upgrade).toBeDefined();
        expect(upgrade.id).toBe('pro');
    });

    test('getComboById works', () => {
        const combo = upgradeService.getComboById('starter-pack');
        expect(combo).toBeDefined();
        expect(combo.upgrades).toContain('basic');
    });

    test('returns null for unknown upgrade', () => {
        expect(upgradeService.getUpgradeById('unknown')).toBeNull();
    });

    test('reloadConfig updates configuration', () => {
        const tmp = path.join(os.tmpdir(), 'upgrades.test.json');
        fs.writeFileSync(tmp, JSON.stringify({ plans: [{ id: 'x' }], combos: [] }));
        const service = new UpgradeService({ configPath: tmp });
        expect(service.getUpgradeById('x')).toBeDefined();
        fs.writeFileSync(tmp, JSON.stringify({ plans: [{ id: 'y' }], combos: [] }));
        service.reloadConfig();
        expect(service.getUpgradeById('x')).toBeNull();
        expect(service.getUpgradeById('y')).toBeDefined();
        fs.unlinkSync(tmp);
    });
});
