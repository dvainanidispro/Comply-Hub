import express from 'express';
import Cache from '../../../models/cache.js';
import { expectedCurrentKpis, expectedKpisInRange } from '../../../lib/kpi.js';
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
        // let result = await expectedCurrentKpis(req.org, framework);
        let result = await expectedKpisInRange(req.org, framework, res.locals.org.startDate);
        res.render('json', { result });
    });

	return kpi;
}

