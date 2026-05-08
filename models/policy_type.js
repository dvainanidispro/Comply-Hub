import { DataTypes } from 'sequelize';
import { db } from "../config/database.js";

const PolicyType = db.define('policy_type',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        framework: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        code: DataTypes.STRING,
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        description: DataTypes.TEXT,
        default: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            comment: "Εάν θα συμπεριλαμβάνεται στην μαζική δήλωση πολιτικών σε νέους οργανισμούς."
        },
        sequence: {
            type: DataTypes.SMALLINT,
            comment: 'Χρησιμοποιείται για την οπτική ταξινόμηση, δεν έχει λειτουργική σημασία.',
        },
        active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
    },
    {
        tableName: 'policy_types',
        timestamps: false,
        indexes: [
            {
                name: 'policy_types_framework_code_unique',
                fields: ['framework', 'code'],
                unique: true,
            },
        ],
    }
);

export { PolicyType };
