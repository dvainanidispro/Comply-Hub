import { DataTypes } from 'sequelize';
import { db } from "../config/database.js";

const PolicyType = db.define('policy_type',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        scope: DataTypes.STRING,
        code: DataTypes.STRING,
        name: DataTypes.STRING,
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
    },
    {
        tableName: 'policy_types',
        timestamps: false,
        indexes: [
            {
                name: 'policy_types_scope_code_unique',
                fields: ['scope', 'code'],
                unique: true,
            },
        ],
    }
);

export { PolicyType };
