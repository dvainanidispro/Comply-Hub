import { DataTypes } from 'sequelize';
import { db } from '../config/database.js';
import log from '../lib/logger.js';

/**
 * Model για γενικές ρυθμίσεις της εφαρμογής
 */
export const Setting = db.define('Setting', 
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        key: {
            type: DataTypes.STRING,
            allowNull: false,
            comment: 'Το κλειδί της ρύθμισης'
        },
        value: {
            type: DataTypes.JSONB,
            allowNull: true,
            comment: 'Η τιμή της ρύθμισης'
        }
    }, 

    {
        tableName: 'settings',
        timestamps: true,
        indexes: [
            {
                name: 'settings_key_index',
                unique: true,
                fields: ['key']
            }
        ]
    }   
);



// Private cache για τις ρυθμίσεις. Αποθηκεύεται ολόκληρος ο πίνακας ρυθμίσεων κι όχι ανά ρύθμιση.
const _cache = new Map();
let _cacheInitialized = false;

/**
 * Utility object για εύκολη χρήση των ρυθμίσεων της εφαρμογής με caching
 * Χρήση: settings.get('some_key') για ανάκτηση, settings.set('some_key', value) για αποθήκευση.
 */
export const settings = {
    /**
     * Πρόσβαση στην cache για inspection
     * Χρήση: settings.cache ή settings.cache.get('some_key') κλπ
     */
    get cache() {
        return _cache;
    },

    /**
     * Ανανέωση της cache από τη βάση
     * @returns {Promise<void>}
     */
    async refresh() {
        const allSettings = await Setting.findAll();
        _cache.clear();
        for (const setting of allSettings) {
            _cache.set(setting.key, setting.value);
        }
        _cacheInitialized = true;
        log.dev(`Settings cache ανανεώθηκε με ${allSettings.length} ρυθμίσεις από τη βάση.`);
    },

    /**
     * Ανάκτηση τιμής ρύθμισης από cache
     * @param {string} key - Το κλειδί της ρύθμισης
     * @returns {Promise<any>} Η τιμή της ρύθμισης ή null αν δεν υπάρχει
     */
    async get(key) {
        if (!_cacheInitialized) {
            await this.refresh();
        }
        return _cache.get(key) ?? null;
    },

    /**
     * Αποθήκευση ή ενημέρωση ρύθμισης
     * Ενημερώνει την cache αμέσως και αποθηκεύει στη βάση asynchronously
     * @param {string} key - Το κλειδί της ρύθμισης
     * @param {any} value - Η τιμή της ρύθμισης
     * @returns {Object} Το key-value pair που αποθηκεύτηκε
     */
    set(key, value) {
        _cache.set(key, value);
        _cacheInitialized = true;
        
        // Fire and forget - αποθήκευση στη βάση χωρίς await
        Setting.upsert({ key, value }).catch(err => {
            log.error(`Σφάλμα αποθήκευσης setting "${key}" στη βάση: ${err.message}`);
        });
        
        return { key, value };
    }
};