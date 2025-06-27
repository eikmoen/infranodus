const express = require('express');
const router = express.Router();

const upgradeService = require('../lib/services/upgradeService');

// GET /upgrades - list available upgrade plans
router.get('/', (req, res) => {
    res.json({ upgrades: upgradeService.getUpgrades() });
});

// GET /upgrades/combos - list available combo bundles
router.get('/combos', (req, res) => {
    res.json({ combos: upgradeService.getCombos() });
});

// GET /upgrades/combos/:id - fetch a specific combo
router.get('/combos/:id', (req, res) => {
    const combo = upgradeService.getComboById(req.params.id);
    if (!combo) {
        return res.status(404).json({ error: 'Combo not found' });
    }
    res.json({ combo });
});

// GET /upgrades/:id - fetch a specific upgrade
router.get('/:id', (req, res) => {
    const upgrade = upgradeService.getUpgradeById(req.params.id);
    if (!upgrade) {
        return res.status(404).json({ error: 'Upgrade not found' });
    }
    res.json({ upgrade });
});

// POST /upgrades/reload - reload upgrade configuration
router.post('/reload', (req, res) => {
    upgradeService.reloadConfig();
    res.json({ success: true });
});

// POST /upgrades/purchase - create ChargeBee checkout session
router.post('/purchase', async (req, res) => {
    const { upgradeId, comboId, customer } = req.body || {};

    try {
        const hostedPage = await upgradeService.createCheckout({ upgradeId, comboId, customer });
        if (!hostedPage) {
            return res.json({ success: true, message: 'ChargeBee not configured' });
        }
        res.json({ success: true, hostedPage });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

module.exports = router;
