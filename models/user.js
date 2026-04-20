import { DataTypes } from 'sequelize';
import { db } from "../config/database.js"; 

const User = db.define('user', 
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        email: DataTypes.STRING,
        name: DataTypes.STRING,
        password: DataTypes.STRING,
        roles: DataTypes.JSONB,
        organization: DataTypes.INTEGER,
        active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
    },
    {
        tableName: 'users',
        timestamps: true,
        indexes: [
            { 
                fields: ['email'],
                unique: true
            }
        ],
    }
);

export { User };