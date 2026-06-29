import { DataTypes } from 'sequelize';
import { db } from '../config/database.js';
import { successRule } from '../lib/kpi.js';
import { toNumber } from '../lib/utils.js';

/**
 * Περιοδικές καταγραφές KPI ανά οργανισμό, με snapshot του template που ίσχυε όταν δημιουργήθηκαν.
 */
const Kpi = db.define('kpi',
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
		framework: {
			type: DataTypes.STRING,
			allowNull: false,
		},
		code: {
			type: DataTypes.STRING,
			allowNull: false,
		},
		template: {
			type: DataTypes.JSONB,
			allowNull: false,
			comment: 'Snapshot του kpi_template από το οποίο προέκυψε το KPI, ώστε να μην επηρεάζονται παλιές εγγραφές από νεότερες αλλαγές.',
		},
		period: {
			type: DataTypes.STRING,
			allowNull: false,
			comment: 'Η περίοδος καταγραφής, πχ 2026, 2026-S1, 2026-Q3, 2026-M06.',
		},
		applicable: {
			type: DataTypes.BOOLEAN,
			allowNull: false,
			defaultValue: true,
			comment: 'Δηλώνει αν το KPI εφαρμόζεται στον συγκεκριμένο οργανισμό και στην περίοδο αυτή.',
		},
		value: {
			type: DataTypes.DECIMAL(12, 2),
			comment: 'Η τιμή που καταγράφηκε για το KPI στη συγκεκριμένη περίοδο.',
		},
		success: {
			type: DataTypes.VIRTUAL,
			comment: 'Επιστρέφει αν η τιμή του KPI καλύπτει το αποθηκευμένο thresholdTarget.',
			get() {
				if (!this.getDataValue('applicable')) { return null }

				const value = this.getDataValue('value');
                // Αν δεν έχει συμπληρωθεί, το θεωρούμε ακαθόριστο. NOTE: Μπορεί να αλλάξει σε null (ανεπιτυχές).
				if (value == null) { return null }
                
                const rule = successRule(this.getDataValue('template'));
				return rule.direction === 'up'
					? Number(value) >= rule.target
					: Number(value) <= rule.target;
			},
		},
		deviation: {
			type: DataTypes.VIRTUAL,
			comment: 'Επιστρέφει την απόκλιση από τον στόχο, με θετική τιμή όταν το KPI κινείται προς τη σωστή κατεύθυνση.',
			get() {
                const applicable = this.getDataValue('applicable');
				const value = this.getDataValue('value');
                const success = this.getDataValue('success');
                if (!applicable || success || value == null) { return null }
                
                const rule = successRule(this.getDataValue('template'));
				return toNumber( (value - rule.target) * rule.multiplier );
			},
		},
		comments: {
			type: DataTypes.TEXT,
			comment: 'Σχόλια, παρατηρήσεις ή διορθωτικές ενέργειες για τη συγκεκριμένη περίοδο.',
		},
	},
	{
		tableName: 'kpis',
		indexes: [
			{
				name: 'kpis_org_framework_period',
				fields: ['organizationId', 'framework', 'period'],
			},
			{
				name: 'kpis_org_period',
				fields: ['organizationId', 'period'],
			},
			{
				name: 'kpis_org_framework_code_period_unique',
				fields: ['organizationId', 'framework', 'code', 'period'],
				unique: true,
			},
		],
	}
);

export { Kpi };
