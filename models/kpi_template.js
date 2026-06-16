import { DataTypes } from 'sequelize';
import { db } from "../config/database.js";

/**
 * Πρότυπα KPI από τα οποία δημιουργούνται KPI εγγραφές για οργανισμούς.
 */
const KpiTemplate = db.define('kpi_template',
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
		code: {
			type: DataTypes.STRING,
			allowNull: false,
		},
		name: {
			type: DataTypes.STRING,
			allowNull: false,
		},
		description: DataTypes.TEXT,
		frequency: {
			type: DataTypes.STRING,
            allowNull: false,
			comment: 'Συχνότητα μέτρησης ή καταγραφής του KPI.',
		},
		responsible: {
			type: DataTypes.STRING,
			comment: 'Ο υπεύθυνος ρόλος ή τμήμα για την παρακολούθηση του KPI.',
		},
		source: {
			type: DataTypes.STRING,
			comment: 'Η πηγή δεδομένων από την οποία προκύπτει η τιμή του KPI.',
		},
		unit: {
			type: DataTypes.STRING,
			comment: 'Μονάδα μέτρησης, π.χ. ώρες, πλήθος, ποσοστό, κλπ.',
		},
		thresholdBest: {
			type: DataTypes.DECIMAL(12, 2),
            allowNull: false,
			comment: 'Τιμή βέλτιστου σεναρίου για αξιολόγηση ή validation.',
		},
		thresholdWorst: {
			type: DataTypes.DECIMAL(12, 2),
            allowNull: false,
			comment: 'Τιμή χειρότερου σεναρίου για αξιολόγηση ή validation.',
		},
		thresholdTarget: {
			type: DataTypes.DECIMAL(12, 2),
            allowNull: false,
			comment: 'Τιμή στόχου όπου το KPI θεωρείται επιτυχές όταν ικανοποιείται ή ξεπερνιέται.',
		},
		successRule: {
			type: DataTypes.VIRTUAL,
			comment: 'Επιστρέφει τα κριτήρια επιτυχίας.',
			get() {
				const thresholdBest = this.getDataValue('thresholdBest');
				const thresholdWorst = this.getDataValue('thresholdWorst');
				const thresholdTarget = this.getDataValue('thresholdTarget');
                const unit = this.getDataValue('unit');
				return ( Number(thresholdBest) > Number(thresholdWorst) ) 
                    ? {direction:'up', multiplier: 1, symbol:'>=', criteria: `${unit} >= ${thresholdTarget}`} 
                    : {direction:'down', multiplier: -1, symbol:'<=', criteria: `${unit} <= ${thresholdTarget}`};
			},
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
		tableName: 'kpi_templates',
		timestamps: false,
		indexes: [
			{
				name: 'kpi_templates_framework_code_unique',
				fields: ['framework', 'code'],
				unique: true,
			},
		],
	}
);

export { KpiTemplate };
