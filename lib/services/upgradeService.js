const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');
const chargebee = require('chargebee');
const options = require('../../options');

/**
 * Service to manage upgrade plans and combos and integrate with ChargeBee.
 */
class UpgradeService extends EventEmitter {
    constructor({ configPath = process.env.UPGRADE_CONFIG_PATH || path.join(__dirname, '../../config/upgrades.json'), watch = false } = {}) {
        super();
        this.configPath = configPath;
        this._configureChargebee();
        this._loadConfig();
        if (watch) {
            fs.watchFile(this.configPath, () => this.reloadConfig());
        }
    }

    _configureChargebee() {
        if (options.chargebee && options.chargebee.site && options.chargebee.api_key) {
            chargebee.configure({
                site: options.chargebee.site,
                api_key: options.chargebee.api_key
            });
            this.chargebeeEnabled = true;
        } else {
            this.chargebeeEnabled = false;
        }
    }

    _loadConfig() {
        const raw = fs.readFileSync(this.configPath, 'utf8');
        const parsed = JSON.parse(raw);
        this.upgrades = parsed.plans || [];
        this.combos = parsed.combos || [];
    }

    reloadConfig() {
        this._loadConfig();
        this.emit('configReloaded');
    }

    getUpgrades() {
        return this.upgrades;
    }

    getUpgradeById(id) {
        return this.upgrades.find(u => u.id === id) || null;
    }

    getCombos() {
        return this.combos;
    }

    getComboById(id) {
        return this.combos.find(c => c.id === id) || null;
    }

    /**
     * Create a ChargeBee checkout session for an upgrade or combo.
     * Returns hosted page data or null if ChargeBee is not configured.
     *
     * @param {Object} options
     * @param {string} [options.upgradeId]
     * @param {string} [options.comboId]
     * @param {Object} [options.customer] - optional customer info
     */
    async createCheckout({ upgradeId, comboId, customer = {} }) {
        if (!this.chargebeeEnabled) {
            return null;
        }

        let priceIds = [];
        if (upgradeId) {
            const up = this.getUpgradeById(upgradeId);
            if (!up) throw new Error('Unknown upgrade');
            if (up.chargebee_price_id) priceIds.push(up.chargebee_price_id);
        } else if (comboId) {
            const combo = this.getComboById(comboId);
            if (!combo) throw new Error('Unknown combo');
            if (Array.isArray(combo.chargebee_price_ids)) {
                priceIds = combo.chargebee_price_ids.slice();
            }
        } else {
            throw new Error('upgradeId or comboId required');
        }

        const items = priceIds.map(id => ({ item_price_id: id, quantity: 1 }));

        return new Promise((resolve, reject) => {
            chargebee.hosted_page
                .checkout_new_for_items({ subscription_items: items, customer })
                .request((err, result) => {
                    if (err) return reject(err);
                    resolve(result.hosted_page);
                });
        });
    }
}

module.exports = new UpgradeService();
module.exports.UpgradeService = UpgradeService;
