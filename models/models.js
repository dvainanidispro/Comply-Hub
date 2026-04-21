import { User } from "./user.js";
import { Organization } from "./organization.js";
import { db } from '../config/database.js';
import log from '../lib/logger.js';


////////////////    MODELS ASSOCIATIONS    ////////////////


////////////////    MODELS SYNC    ////////////////

/**
 * Συγχρονίζει όλα τα models με τη βάση κατά την εκκίνηση
 */
async function syncModels() {
    if (process.env.SYNCMODELS==='true') {
        try {
            await db.sync({ alter: true });
            log.success('Όλα τα models συγχρονίστηκαν επιτυχώς με τη βάση.');
        } catch (err) {
            log.error(`[Sequelize] Σφάλμα συγχρονισμού models: ${JSON.stringify(err)}`);
        }
    } 
}






export default {
    syncModels,
    User,
    Organization,
};