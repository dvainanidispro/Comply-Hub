import express from 'express';
import jsonView from './json.js';
import { expectedKpis } from '../../../lib/kpi.js';
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
        let result = await expectedKpis(req.org, framework);
        res.render('json', { result });
    });

	return kpi;
}

