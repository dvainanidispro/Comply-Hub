import Cache from '../models/cache.js';
import { currentPeriodName, periodsInRange } from './periods.js';


/**
 * Επιστρέφει τα κριτήρια επιτυχίας ενός KPI template ή snapshot.
 * @param {object} template - Το template ή snapshot που περιέχει thresholds και unit
 * @returns {{direction: string, multiplier: number, target: number, symbol: string, criteria: string}} Τα κριτήρια επιτυχίας
 */
function successRule(template) {
	const thresholdBest = Number(template.thresholdBest);
	const thresholdWorst = Number(template.thresholdWorst);
	const thresholdTarget = Number(template.thresholdTarget);

	return (thresholdBest > thresholdWorst)
		? {
			direction: 'up',
			multiplier: 1,
			target: thresholdTarget,
			symbol: '≥',
			criteria: `≥ ${Number(template.thresholdTarget)}`,
		}
		: {
			direction: 'down',
			multiplier: -1,
			target: thresholdTarget,
			symbol: '≤',
			criteria: `≤ ${Number(template.thresholdTarget)}`,
		};
}



/** Δημιουργεί ένα αντικείμενο KPI με βάση το template και την περίοδο */
function expectedKpiObject(organizationId, template, period) {
    return {
        organizationId,
        framework: template.framework,
        code: template.code,
        template: {
            id: template.id,
            framework: template.framework,
            code: template.code,
            name: template.name,
            description: template.description,
            frequency: template.frequency,
            responsible: template.responsible,
            source: template.source,
            unit: template.unit,
            thresholdBest: Number(template.thresholdBest),
            thresholdWorst: Number(template.thresholdWorst),
            thresholdTarget: Number(template.thresholdTarget),
            successRule: successRule(template),
            sequence: template.sequence,
            active: template.active,
        },
        period,
        applicable: true,
        value: null,
        success: null,
        deviation: null,
        comments: null,
    };
}

/**
 * Επιστρέφει τα αναμενόμενα KPI που θα έπρεπε να υπάρχουν για έναν οργανισμό, ασυμπλήρωτα (άδεια)
 * στην περίοδο που προκύπτει από τη currentDate με δυνατότητα μετατόπισης,
 * βάσει των ενεργών KPI templates του framework.
 * Δεν ελέγχει την πραγματική κατάσταση στη βάση — επιστρέφει μόνο ό,τι "έπρεπε" να υπάρχει.
 * @param {number} organizationId - Το id του οργανισμού.
 * @param {string} framework - Το framework (πχ 'NIS2', 'GDPR').
 * @param {Date} [currentDate=new Date()] - Η ημερομηνία αναφοράς.
 * @param {number} [offsetPeriods=-1] - Αριθμός περιόδων μετατόπισης (αρνητικός για παρελθόν).
 * @returns {Promise<object[]>} Array με άδεια KPI objects.
 */
async function expectedCurrentKpis(organizationId, framework, currentDate = new Date(), offsetPeriods = -1) {
    const templates = await Cache.table.KpiTemplate;
    return templates
        .filter((t) => t.framework === framework)
        .map((t) => expectedKpiObject(organizationId, t, currentPeriodName(t.frequency, offsetPeriods, currentDate)));
}

/**
 * Επιστρέφει τα αναμενόμενα KPI που θα έπρεπε να υπάρχουν για έναν οργανισμό, ασυμπλήρωτα (άδεια)
 * σε range περιόδων, βάσει των ενεργών KPI templates του framework.
 * Δεν ελέγχει την πραγματική κατάσταση στη βάση — επιστρέφει μόνο ό,τι "έπρεπε" να υπάρχει.
 * @param {number} organizationId - Το id του οργανισμού.
 * @param {string} framework - Το framework (πχ 'NIS2', 'GDPR').
 * @param {Date | [Date] | [Date, Date]} dateRange - Ημερομηνία έναρξης ή range ημερομηνιών [startDate, endDate].
 * @param {number} [offsetPeriods=-1] - Αριθμός περιόδων μετατόπισης (αρνητικός για παρελθόν).
 * @returns {Promise<object[]>} Array με άδεια KPI objects.
 */
async function expectedKpisInRange(organizationId, framework, dateRange, offsetPeriods = -1) {
    const templates = await Cache.table.KpiTemplate;

    return templates
        .filter((t) => t.framework === framework)
        .flatMap((t) => periodsInRange(dateRange, offsetPeriods, [t.frequency])
            .map((period) => expectedKpiObject(organizationId, t, period)));
}



export { successRule, expectedCurrentKpis, expectedKpisInRange };
