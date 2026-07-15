import { DataTypes } from 'sequelize';
import { db } from '../config/database.js';

/**
 * Model για τους ορισμούς ερωτηματολογίων και τα answer sets που απαιτούνται για την ανασύστασή τους.
 */
const Questionnaire = db.define('questionnaire',
    {
        id: {
            type: DataTypes.BIGINT,
            primaryKey: true,
            autoIncrement: true,
        },
        definedBy: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: 'organization',
            comment: 'system ή organization. Δηλώνει αν το questionnaire ορίζεται από το σύστημα (developer) ή από οργανισμό (χρήστη ή admin).',
        },
        framework: {
            type: DataTypes.STRING,
            allowNull: true,
            comment: 'Το framework στο οποίο ανήκει το questionnaire.',
        },
        organizationId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            comment: 'Ο οργανισμός που όρισε το questionnaire, όταν το definedBy είναι organization.',
        },
        code: {
            type: DataTypes.STRING,
            allowNull: false,
            comment: 'Το domain αναγνωριστικό του ερωτηματολογίου. Πρέπει να ταυτίζεται με το definition.code.',
        },
        public: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
            comment: 'Δηλώνει αν το questionnaire είναι δημόσια διαθέσιμο (ίσως με χρήση GET paramater για διαχωρισμό συμπληρωτή) ή απαιτεί log-in.',
        },
        active: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
            comment: 'Δηλώνει αν το questionnaire είναι ενεργό.',
        },
        title: {
            type: DataTypes.STRING,
            allowNull: false,
            comment: 'Αντίγραφο του definition.title για γρήγορα listings και αναζήτηση χωρίς άνοιγμα του JSONB.',
        },
        definition: {
            type: DataTypes.JSONB,
            allowNull: true,
            comment: 'Ο πλήρης ορισμός του questionnaire όπως παράγεται από το Questionnaire.toJSON().',
        },
        content: {
            type: DataTypes.VIRTUAL,
            get() {
                const definition = this.getDataValue('definition');
                return definition?.content || [];
            }
        },
        answers: {
            type: DataTypes.JSONB,
            allowNull: true,
            comment: 'Τα answer sets του questionnaire, χωρίς το sentinel id:0 μέσα στα options.',
        },
    },
    {
        tableName: 'questionnaires',
        timestamps: true,
        indexes: [
            {
                name: 'questionnaires_code_unique',
                unique: true,
                fields: ['code'],
            },
        ],
    }
);

export { Questionnaire };