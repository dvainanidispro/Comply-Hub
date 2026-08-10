import { User } from "./user.js";
import { Organization } from "./organization.js";
import { PolicyType } from "./policy_type.js";
import { Policy } from "./policy.js";
import { Legislation } from "./legislation.js";
import { Setting } from "./setting.js";
import { KpiTemplate } from "./kpi_template.js";
import { Kpi } from "./kpi.js";
import { Questionnaire } from "./questionnaire.js";
import { Response } from "./response.js";
import { Partner } from "./partner.js";

import { db } from '../config/database.js';
import log from '../lib/logger.js';



////////////////    MODELS ASSOCIATIONS    ////////////////

User.belongsTo(Organization, { foreignKey: 'organizationId', as: 'organization' });
Organization.hasMany(User, { foreignKey: 'organizationId', as: 'users' });

Policy.belongsTo(PolicyType, { foreignKey: 'policyTypeId', as: 'policyType' });
PolicyType.hasMany(Policy, { foreignKey: 'policyTypeId', as: 'policies' });

Policy.belongsTo(Organization, { foreignKey: 'organizationId', as: 'organization' });
Organization.hasMany(Policy, { foreignKey: 'organizationId', as: 'policies' });

Kpi.belongsTo(Organization, { foreignKey: 'organizationId', as: 'organization' });
Organization.hasMany(Kpi, { foreignKey: 'organizationId', as: 'kpis' });

Partner.belongsTo(Organization, { foreignKey: 'organizationId', as: 'organization' });
Organization.hasMany(Partner, { foreignKey: 'organizationId', as: 'partners' });



Questionnaire.belongsTo(Organization, { foreignKey: 'organizationId', as: 'organization' });
Organization.hasMany(Questionnaire, { foreignKey: 'organizationId', as: 'questionnaires' });

Response.belongsTo(Questionnaire, { foreignKey: 'questionnaireId', as: 'questionnaire' });
Questionnaire.hasMany(Response, { foreignKey: 'questionnaireId', as: 'responses', onDelete: 'RESTRICT' });

Response.belongsTo(Organization, { foreignKey: 'organizationId', as: 'organization' });
Organization.hasMany(Response, { foreignKey: 'organizationId', as: 'responses' });

Response.belongsTo(User, { foreignKey: 'submittedByUserId', as: 'submittedByUser' });
User.hasMany(Response, { foreignKey: 'submittedByUserId', as: 'submittedResponses' });

Response.belongsTo(Partner, { foreignKey: 'submittedByPartnerId', as: 'submittedByPartner' });
Partner.hasMany(Response, { foreignKey: 'submittedByPartnerId', as: 'submittedResponses', onDelete: 'RESTRICT' });

Response.belongsTo(User, { foreignKey: 'approvedBy', as: 'approvedByUser' });
User.hasMany(Response, { foreignKey: 'approvedBy', as: 'approvedResponses' });


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
    KpiTemplate,
    Kpi,
    Partner,
    Questionnaire,
    Response,
    Setting, // αν και κάνουμε χρήση του utility Settings
};