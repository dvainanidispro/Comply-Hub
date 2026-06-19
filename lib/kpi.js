import Cache from '../models/cache.js';
import { currentPeriodName } from './periods.js';

/**
 * Επιστρέφει τα αναμενόμενα KPI που θα έπρεπε να υπάρχουν για έναν οργανισμό, ασυμπλήρωτα (άδεια)
 * στην τρέχουσα περίοδο, βάσει των ενεργών KPI templates του framework.
 * Δεν ελέγχει την πραγματική κατάσταση στη βάση — επιστρέφει μόνο ό,τι "έπρεπε" να υπάρχει.
 * @param {number} organizationId - Το id του οργανισμού.
 * @param {string} framework - Το framework (πχ 'NIS2', 'GDPR').
 * @returns {Promise<object[]>} Array με άδεια KPI objects.
 */
async function expectedKpis(organizationId, framework) {
    const templates = await Cache.table.KpiTemplate;
    return templates
        .filter((t) => t.framework === framework)
        .map((t) => ({
            organizationId,
            framework: t.framework,
            code: t.code,
            template: {
                id: t.id,
                framework: t.framework,
                code: t.code,
                name: t.name,
                description: t.description,
                frequency: t.frequency,
                responsible: t.responsible,
                source: t.source,
                unit: t.unit,
                thresholdBest: Number(t.thresholdBest),
                thresholdWorst: Number(t.thresholdWorst),
                thresholdTarget: Number(t.thresholdTarget),
                sequence: t.sequence,
                active: t.active,
            },
            period: currentPeriodName(t.frequency, -1),
            applicable: true,
            value: null,
            success: null,
            deviation: null,
            comments: null,
        }));
}

export { expectedKpis };
