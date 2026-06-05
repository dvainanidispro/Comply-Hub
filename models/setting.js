import { DataTypes } from 'sequelize';
import { db } from '../config/database.js';

/**
 * Model για γενικές ρυθμίσεις της εφαρμογής
 */
const Setting = db.define('Setting', 
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
        timestamps: false,
        indexes: [
            {
                name: 'settings_key_index',
                unique: true,
                fields: ['key']
            }
        ]
    }   
);



/**
 * Utility object για εύκολη χρήση των ρυθμίσεων της εφαρμογής
 * Χρήση: await Settings.get('some_key') για ανάκτηση, await Settings.set('some_key', value) για αποθήκευση.
 */
const Settings = {
    /**
     * Ανάκτηση τιμής ρύθμισης από τη βάση
     * @param {string} key - Το κλειδί της ρύθμισης
     * @returns {Promise<any>} Η τιμή της ρύθμισης ή null αν δεν υπάρχει
     */
    async get(key) {
        const setting = await Setting.findOne({ where: { key } });
        return setting?.value ?? null;
    },

    /**
     * Αποθήκευση ή ενημέρωση ρύθμισης στη βάση
     * @param {string} key - Το κλειδί της ρύθμισης
     * @param {any} value - Η τιμή της ρύθμισης
     * @returns {Promise<boolean>} true αν η αποθήκευση ήταν επιτυχής
     */
    async set(key, value) {
        await Setting.upsert({ key, value });
        return true;
    }
};


export { Setting, Settings };