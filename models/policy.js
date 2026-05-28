import { DataTypes, Op } from 'sequelize';
import { db } from "../config/database.js";

const Policy = db.define('policy',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        organizationId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        policyTypeId: DataTypes.INTEGER,
        type: {
            type: DataTypes.STRING,
            allowNull: false,
            comment: "Τύπος. Δυνατές τιμές: policy, procedure, standard, guideline, plan.",
        },
        code: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        description: DataTypes.TEXT,
        version: DataTypes.STRING,
        effectiveDate: DataTypes.DATE,
        reviewDate: DataTypes.DATE,
        status: DataTypes.STRING,
        framework: {
            type: DataTypes.STRING,
            comment: 'Χρησιμοποιείται για filtering των custom policies (όταν policyTypeId=null).',
        },
        classification: {
            type: DataTypes.STRING,
            comment: 'Διαβάθμιση. Δυνατές τιμές: public, internal, confidential.',
        },
        files: {
            type: DataTypes.ARRAY(DataTypes.STRING),
            defaultValue: [],
            comment: 'Array από αντικείμενα { path, filename, mimetype }'
        },
    },
    {
        tableName: 'policies',
        timestamps: true,
        indexes: [
            {
                name: 'policies_organization_id',
                fields: ['organizationId'],
            },
            {
                name: 'policies_policy_type_id',
                fields: ['policyTypeId'],
            },
            {
                name: 'policies_org_policy_type_unique',
                fields: ['organizationId', 'policyTypeId'],
                unique: true,
                where: { policyTypeId: { [Op.ne]: null } },
            },
        ],
    }
);

export { Policy };
