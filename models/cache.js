/**
 * cache module - Caching system για Sequelize model data.
 * Αν στον πίανκα υπάρχει πεδίο active, φιλτράρει μόνο τα active records.
 * 
 * Η λογική είναι να μειώσει τα queries στη βάση για δεδομένα που δεν αλλάζουν συχνά
 * και εμφανίζονται σε σελίδες "διαφορετικές" από τις σελίδες διαχείρισής τους.
 * Πχ τα Departments και Users που εμφανίζονται σε πολλές σελίδες ως dropdowns.
 * Παρόλα αυτά, στις σελίδες διαχείρισης τους (πχ /admin/departments, /admin/users/) 
 * θα γίνεται πάντα query για να εμφανίζονται και τα inactive records.
 * 
 * Exports:
 * - Cache.table:       Proxy — επιστρέφει array με τα records του model (raw)
 * - Cache.map:         Proxy — επιστρέφει Map<id, record> για γρήγορη αναζήτηση
 * - Cache.query:       Proxy — εκτελεί εγγεγραμμένο custom query και επιστρέφει array
 * - Cache.refresh:     Απαλείφει model ή custom query από το cache
 * - Cache.register:    Εγγράφει custom query function με όνομα
 * 
 * @example
 * import Cache from '../models/cache.js';
 * 
 * // Παράδειγμα 1: Λήψη array
 * const allUsersArray = await Cache.table.User;
 * 
 * // Παράδειγμα 2: Λήψη Map για γρήγορη αναζήτηση
 * const departmentMap = await Cache.map.Department;
 * const dept = departmentMap.get(5);
 * 
 * // Παράδειγμα 3: Refresh μετά από αλλαγές
 * Cache.refresh('Department');
 * 
 * // Παράδειγμα 4: Εγγραφή custom query (να γίνεται κατά την εκκίνηση - χωρίς καθυστέρηση)
 * // Σημ.: Αν το asyncFunction χρησιμοποιεί raw:true επιστρέφει plain objects,
 * //       αλλιώς επιστρέφει Sequelize instances (με πρόσβαση σε associations κλπ).
 * // Μπορεί να είναι οποιαδήποτε async function, πχ fetch, αρκεί να επιστρέφει Promise.
 * Cache.register('EmployeesActive', () => Models.Employee.findAll({
 *     include: [{ model: Models.User, as: 'user' }],
 *     order: [[{ model: Models.User, as: 'user' }, 'name', 'ASC']]
 * }).then(r => r.filter(e => e.status === 'active')));
 * 
 * // Παράδειγμα 5: Χρήση custom query
 * const employees = await Cache.query.EmployeesActive;
 */

import Models from './models.js';
import ms from 'ms';
import log from '../lib/logger.js';

/**
 * Cache για τα model data
 * @type {Map<string, Array>}
 */
const cache = new Map();

/**
 * Timeouts για καθαρισμό του cache
 * @type {Map<string, NodeJS.Timeout>}
 */
const timeouts = new Map();

/**
 * Διάρκεια cache σε milliseconds, default 1 ώρα
 */
const CACHE_DURATION = ms(process.env.CACHE_DURATION || '1h');

/**
 * Registry custom query functions
 * @type {Map<string, Function>}
 */
const customQueries = new Map();

/**
 * Cache για custom query data
 * @type {Map<string, Array>}
 */
const queryCache = new Map();

/**
 * Timeouts για καθαρισμό του query cache
 * @type {Map<string, NodeJS.Timeout>}
 */
const queryTimeouts = new Map();

/**
 * Καθαρίζει το cache για ένα συγκεκριμένο model
 * @param {string} modelName - Το όνομα του model
 */
function clearCache(modelName) {
    cache.delete(modelName);
    if (timeouts.has(modelName)) {
        clearTimeout(timeouts.get(modelName));
        timeouts.delete(modelName);
    }
    // log.dev(`Cache cleared for model ${modelName}`);
}

function clearQueryCache(name) {
    queryCache.delete(name);
    if (queryTimeouts.has(name)) {
        clearTimeout(queryTimeouts.get(name));
        queryTimeouts.delete(name);
    }
}

/**
 * Φέρνει τα data από το model (με caching)
 * @param {string} modelName - Το όνομα του model (π.χ. 'Lease', 'Party')
 * @returns {Promise<Array>}
 */
async function getTableData(modelName) {
    // Έλεγχος αν υπάρχει cached data
    if (cache.has(modelName)) {
        // log.dev(`Cache hit for model ${modelName}`);
        return cache.get(modelName);
    }
    
    // Έλεγχος αν το model υπάρχει
    const Model = Models[modelName];
    if (!Model) {
        throw new Error(`Model ${modelName} δεν βρέθηκε`);
    }
    
    // Query στη βάση - φιλτράρισμα μόνο αν υπάρχει πεδίο active και ταξινόμηση αν υπάρχει πεδίο name
    const where = Model.rawAttributes.active ? { active: true } : {};
    const order = Model.rawAttributes.name ? [['name', 'ASC']] : [];
    const data = await Model.findAll({ where, order, raw: true });

    // log.dev(`Fetched ${data.length} records from database for model ${modelName}`);
    
    // Αποθήκευση στο cache
    cache.set(modelName, data);
    
    // Ορισμός timeout για καθαρισμό
    const timeout = setTimeout(() => {
        clearCache(modelName);
    }, CACHE_DURATION);
    
    timeouts.set(modelName, timeout);
    
    return data;
}

async function getQueryData(name) {
    if (queryCache.has(name)) return queryCache.get(name);
    
    const asyncFunction = customQueries.get(name);
    if (!asyncFunction) throw new Error(`Custom query '${name}' δεν βρέθηκε`);
    
    const data = await asyncFunction();
    
    queryCache.set(name, data);
    const timeout = setTimeout(() => clearQueryCache(name), CACHE_DURATION);
    queryTimeouts.set(name, timeout);
    
    return data;
}

/**
 * Φέρνει τα data από το model ως Map (με caching)
 * @param {string} modelName - Το όνομα του model
 * @returns {Promise<Map>}
 */
async function getTableDataAsMap(modelName) {
    const data = await getTableData(modelName);
    return new Map(data.map(item => [item.id, item]));
}

/**
 * Κεντρικό cache object με μεθόδους πρόσβασης στα model data.
 * @property {Proxy} table   - Επιστρέφει Promise<Array> για το model
 * @property {Proxy} map     - Επιστρέφει Promise<Map<id, record>> για το model
 * @property {Function} refresh - Απαλείφει το model από το cache
 * 
 * @example
 * const allUsers = await Cache.table.User;
 * const deptMap  = await Cache.map.Department;
 * Cache.refresh('Department');
 */
const Cache = {
    table: new Proxy({}, {
        get(target, modelName) {
            if (typeof modelName === 'string') return getTableData(modelName);
        },
    }),
    map: new Proxy({}, {
        get(target, modelName) {
            if (typeof modelName === 'string') return getTableDataAsMap(modelName);
        },
    }),
    query: new Proxy({}, {
        get(target, name) {
            if (typeof name === 'string') return getQueryData(name);
        },
    }),
    refresh(name) {
        clearQueryCache(name);
        clearCache(name);
    },
    /**
     * Εγγράφει custom query function με δεδομένο όνομα για χρήση μέσω Cache.query
     * @param {string} name - Το όνομα του custom query
     * @param {Function} asyncFunction - Async function που επιστρέφει array
     */
    register(name, asyncFunction) {
        customQueries.set(name, asyncFunction);
    },
};

export default Cache;

// Preload models από την PRELOAD_MODELS env μεταβλητή
if (process.env.PRELOAD_MODELS) {
    setTimeout(async () => {
        try {
            const modelsToPreload = JSON.parse(process.env.PRELOAD_MODELS);
            const loaded = [];

            for (const modelName of modelsToPreload) {
                try {
                    await getTableData(modelName);
                    loaded.push(modelName);
                } catch (error) {
                    log.warn(`Failed to preload model ${modelName}: ${error.message}`);
                }
            }

            if (loaded.length) {
                log.info(`Preloaded models from database: ${loaded.join(', ')}`);
            }
        } catch (error) {
            log.error(`Failed to parse PRELOAD_MODELS: ${error.message}`);
        }
    }, ms(process.env.PRELOAD_DELAY || '10s'));
}

