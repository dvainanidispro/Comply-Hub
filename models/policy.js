import { DataTypes } from 'sequelize';
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
        status: DataTypes.STRING,
        customName: DataTypes.STRING,
        version: DataTypes.STRING,
        description: DataTypes.TEXT,
        effectiveDate: DataTypes.DATE,
        reviewDate: DataTypes.DATE,
        files: {
            type: DataTypes.ARRAY(DataTypes.STRING),
            defaultValue: [],
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
        ],
    }
);

export { Policy };
