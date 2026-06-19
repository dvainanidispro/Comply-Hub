import { DataTypes } from 'sequelize';
import { db } from "../config/database.js"; 

const Organization = db.define('organization', 
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        name: DataTypes.STRING,
        scope: { type: DataTypes.ARRAY(DataTypes.STRING), defaultValue: [] }, 
        startDate: { type: DataTypes.DATEONLY, allowNull: false, defaultValue: DataTypes.NOW },
        endDate: { type: DataTypes.DATEONLY, allowNull: true },
        active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    {
        tableName: 'organizations',
        timestamps: false,
        indexes: [
            { 
                fields: ['name'],
                unique: true
            }
        ],
    }
);

export { Organization };