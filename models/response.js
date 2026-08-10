import { DataTypes } from 'sequelize';
import { db } from '../config/database.js';

/**
 * Model για τις απαντήσεις ερωτηματολογίων, μαζί με το draft/submitted state και προαιρετικό snapshot του questionnaire κατά την υποβολή.
 */
const Response = db.define('response',
    {
        id: {
            type: DataTypes.UUID,
            primaryKey: true,
            defaultValue: DataTypes.UUIDV4,
        },
        questionnaireId: {
            type: DataTypes.BIGINT,
            allowNull: false,
            comment: 'Το τεχνικό κλειδί του questionnaire row στο οποίο ανήκει το response.',
        },
        organizationId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            comment: 'Ο οργανισμός τον οποίο αφορά το questionnaire.',
        },
        status: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: 'assigned',
            comment: 'Κατάσταση υποβολής. Επιτρεπτές τιμές: assigned, draft, submitted.',
        },
        accessTokenHash: {
            type: DataTypes.STRING,
            allowNull: true,
            comment: 'Hash του κωδικού πρόσβασης στο συγκεκριμένο response μέσω public link. Null σημαίνει ότι η public πρόσβαση έχει ανακληθεί.',
        },
        lockedAt: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: 'Από αυτή τη στιγμή και μετά το response είναι μόνο για ανάγνωση μέσω public link.',
        },
        // data:
        data: {
            type: DataTypes.JSONB,
            allowNull: true,
            comment: 'Το πλήρες plain object του Response όπως παράγεται από το JSON.stringify(response).',
        },
        questionnaireSnapshot: {
            type: DataTypes.JSONB,
            allowNull: true,
            comment: 'Snapshot του questionnaire, ώστε να μην επηρεάζονται τα submitted responses από μεταγενέστερες αλλαγές.',
        },
        // submission data:
        submittedAt: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        submittedByUserId: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        submittedByPartnerId: {
            type: DataTypes.BIGINT,
            allowNull: true,
            comment: 'Ο partner στον οποίο έχει ανατεθεί το response και ο οποίος το συμπληρώνει ή το υποβάλλει.',
        },
        // approval data:
        approvedAt: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        approvedBy: {
            type: DataTypes.INTEGER,
            allowNull: true,
            comment: 'Ο χρήστης που ενέκρινε το response. Χρησιμοποιείται και ως boolean από τον κώδικα.',
        },
    },
    {
        tableName: 'responses',
        timestamps: true,
        indexes: [
            {
                name: 'responses_questionnaire_id',
                fields: ['questionnaireId'],
            },
            {
                name: 'responses_organization_id',
                fields: ['organizationId'],
            },
            {
                name: 'responses_submitted_by_user_id',
                fields: ['submittedByUserId'],
            },
            {
                name: 'responses_submitted_by_partner_id',
                fields: ['submittedByPartnerId'],
            },
            {
                name: 'responses_access_token_hash_unique',
                unique: true,
                fields: ['accessTokenHash'],
            },
            {
                name: 'responses_approved_by',
                fields: ['approvedBy'],
            },
        ],
    }
);

export { Response };