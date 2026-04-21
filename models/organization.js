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
        active: DataTypes.BOOLEAN,
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