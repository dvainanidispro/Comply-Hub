/**
 * Factory Pattern για τη διαχείριση πολιτικών οργανισμών ανά Framework.
 *
 * Χρήση:
 *   import { managePoliciesRouter } from './modules/policies.js';
 *   router.use('/policies', managePoliciesRouter('NIS2', 'NIS2 — Πολιτικές'));
 */

import express from 'express';
import log from '../../../lib/logger.js';

/**
 * Δημιουργεί router για διαχείριση πολιτικών οργανισμού για ένα συγκεκριμένο framework.
 * @param {string} framework - Το αναγνωριστικό του framework (π.χ. 'NIS2', 'GDPR').
 * @param {string} label - Τίτλος για το view (π.χ. 'NIS2 — Πολιτικές').
 * @returns {express.Router}
 */
export function managePoliciesRouter(framework, label) {
    const policies = express.Router();

    /* GET /policies - Λίστα πολιτικών οργανισμού για το framework */
    policies.get('/', async (req, res) => {
        try {
            res.render('organizations/policies/policies', {
                framework,
                user: req.user,
                org: req.org,
                title: label,
            });
        } catch (error) {
            log.error(`${framework} org policies GET error: ${error}`);
            res.status(500).render('errors/500');
        }
    });

    return policies;
}
