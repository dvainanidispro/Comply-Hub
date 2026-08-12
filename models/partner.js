import { DataTypes } from 'sequelize';
import { db } from '../config/database.js';

/**
 * Model για συνεργάτες οργανισμών που μπορούν να υποβάλλουν απαντήσεις σε ερωτηματολόγια.
 */
const Partner = db.define('partner',
	{
		id: {
			type: DataTypes.BIGINT,
			primaryKey: true,
			autoIncrement: true,
		},
		uuid: {
			type: DataTypes.UUID,
			allowNull: false,
			defaultValue: DataTypes.UUIDV4,
			comment: 'Δημόσιο αναγνωριστικό για χρήση σε URLs χωρίς έκθεση του τεχνικού id.',
		},
		organizationId: {
			type: DataTypes.INTEGER,
			allowNull: false,
			comment: 'Ο οργανισμός στον οποίο ανήκει ο συνεργάτης.',
		},
		profile: {
			type: DataTypes.JSONB,
			allowNull: false,
			defaultValue: {},
			comment: 'Στοιχεία συνεργάτη, όπως όνομα, email επικοινωνίας, ΑΦΜ, διεύθυνση και τηλέφωνο.',
		},
		password: {
			type: DataTypes.STRING,
			allowNull: true,
			comment: 'Hash κωδικού, όταν ο συνεργάτης χρειάζεται να συνδεθεί.',
		},
		active: {
			type: DataTypes.BOOLEAN,
			allowNull: false,
			defaultValue: true,
			comment: 'Επιτρέπει ανάκληση της πρόσβασης χωρίς διαγραφή του ιστορικού responses.',
		},
	},
	{
		tableName: 'partners',
		timestamps: true,
        defaultScope: {
            // By default, για λόγους ασφαλείας το password δεν έρχεται στα queries
            attributes: { exclude: ['password'] },
        },
		indexes: [
			{
				name: 'partners_uuid_unique',
				unique: true,
				fields: ['uuid'],
			},
			{
				name: 'partners_organization_id',
				fields: ['organizationId'],
			},
		],
	}
);

export { Partner };
