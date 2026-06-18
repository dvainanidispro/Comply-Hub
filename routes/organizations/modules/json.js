/**
 * Δημιουργεί middleware που κάνει render το development JSON view.
 * @param {Object} options - Επιλογές για το view.
 * @param {string} [options.title='Αποτέλεσμα'] - Ο τίτλος της σελίδας.
 * @param {Object|Function} options.result - Το αντικείμενο result ή συνάρτηση που το επιστρέφει.
 * @returns {Function}
 */
export default function jsonView({ result, title = 'Αποτέλεσμα' }) {
	return async (req, res) => {
		try {
			const resolvedResult = result instanceof Function ? await result(req, res) : result;

			res.render('json', {
				user: req.user,
				title,
				result: resolvedResult,
			});
		} catch (error) {
			console.error(`JSON development view error: ${error}`);
			res.status(500).render('errors/500');
		}
	};
}