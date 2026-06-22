import express from 'express';
import Cache from '../../../models/cache.js';
import Models from '../../../models/models.js';
import { expectedCurrentKpis, expectedKpisInRange } from '../../../lib/kpi.js';
import { successRule } from '../../../models/kpi_template.js';
import { currentPeriods } from '../../../lib/periods.js';
import jsonView from './json.js';
import log from '../../../lib/logger.js';

/**
 * Δημιουργεί router για development προβολή KPI δεδομένων οργανισμού.
 * @param {string} framework - Το αναγνωριστικό του framework.
 * @param {string} label - Τίτλος για το view.
 * @returns {express.Router}
 */
export function kpiRouter(framework, label) {
	const kpi = express.Router();

	kpi.get('/', async (req, res) => {
        const periods = currentPeriods(new Date(), -1);

        const [expectedKpis, submittedKpis] = await Promise.all([
            expectedCurrentKpis(req.org, framework),
            Models.Kpi.findAll({
                where: { organizationId: req.org, framework, period: periods },
            }).then((rows) => rows.map((k) => k.toJSON())),
        ]);

        expectedKpis.forEach((kpi) => {
            kpi.submitted = false;
        });
        submittedKpis.forEach((kpi) => {
            kpi.submitted = true;
        });

        // Random values for testing. TODO: Remove this after testing.
        expectedKpis.forEach((kpi) => {
            const roll = Math.random();
            if (roll < 0.35) { return; }  // ~35% ασυμπλήρωτα

            const rule = successRule(kpi.template);
            if (roll < 0.65) {
                // ~30% επιτυχημένα: τιμή μεταξύ target και best
                const spread = Math.abs(kpi.template.thresholdBest - rule.target);
                kpi.value = +(rule.target + Math.random() * spread).toFixed(2);
            } else {
                // ~35% αποτυχημένα: τιμή μεταξύ worst και target
                const spread = Math.abs(rule.target - kpi.template.thresholdWorst);
                kpi.value = +(kpi.template.thresholdWorst + Math.random() * spread).toFixed(2);
            }
            kpi.success = rule.direction === 'up' ? kpi.value >= rule.target : kpi.value <= rule.target;
            kpi.deviation = kpi.success ? null : +((kpi.value - rule.target) * rule.multiplier).toFixed(2);
        });

        const submittedKpiMap = new Map(submittedKpis.map((k) => [`${k.period}:${k.code}`, k]));  // μοναδικό κλειδί: period:code
        const kpis = expectedKpis.map((expected) => submittedKpiMap.get(`${expected.period}:${expected.code}`) ?? expected);
        kpis.forEach((k) => { k.status = k.success ? 'success' : (k.value != null ? 'danger' : 'warning'); });

        // res.render('json', { result: kpis });
        res.render('organizations/kpi/kpi', { result: kpis });
    });

	return kpi;
}

