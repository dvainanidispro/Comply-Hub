import { User } from "./user.js";
import { Organization } from "./organization.js";
import { PolicyType } from "./policy_type.js";
import { Policy } from "./policy.js";
import { Legislation } from "./legislation.js";
import { Setting } from "./setting.js";
import { db } from '../config/database.js';
import log from '../lib/logger.js';


////////////////    MODELS ASSOCIATIONS    ////////////////

User.belongsTo(Organization, { foreignKey: 'organizationId', as: 'organization' });
Organization.hasMany(User, { foreignKey: 'organizationId', as: 'organization' });

Policy.belongsTo(Organization, { foreignKey: 'organizationId', as: 'organization' });
Organization.hasMany(Policy, { foreignKey: 'organizationId', as: 'policies' });

Policy.belongsTo(PolicyType, { foreignKey: 'policyTypeId', as: 'policyType' });
PolicyType.hasMany(Policy, { foreignKey: 'policyTypeId', as: 'policies' });


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
    PolicyType,
    Policy,
    Legislation,
    Setting, // αν και κάνουμε χρήση του utility Settings
};