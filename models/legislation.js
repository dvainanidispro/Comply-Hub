import { DataTypes } from 'sequelize';
import { db } from "../config/database.js";

const Legislation = db.define('legislation',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        framework: {
            type: DataTypes.STRING,
            allowNull: false,
            comment: 'Πλαίσιο νομοθεσίας (πχ nis2, gdpr).',
        },
        // code: {
        //     type: DataTypes.STRING,
        //     allowNull: false,
        // },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        description: DataTypes.TEXT,
        file: {
            type: DataTypes.STRING,
            comment: 'Όνομα αρχείου που έχει ανεβεί.',
        },
        link: {
            type: DataTypes.STRING,
            comment: 'Σύνδεσμος εξωτερικής πηγής.',
        },
        sequence: {
            type: DataTypes.INTEGER,
        },
        active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
    },
    {
        tableName: 'legislation',
        timestamps: true,
        indexes: [
            {
                name: 'legislation_framework',
                fields: ['framework'],
            },
            // {
            //     name: 'legislation_framework_code_unique',
            //     fields: ['framework', 'code'],
            //     unique: true,
            // },
        ],
    }
);

export { Legislation };
