/**
 * Factory Pattern για τη διαχείριση πολιτικών οργανισμών ανά Framework.
 *
 * Χρήση:
 *   import { managePoliciesRouter } from './modules/policies.js';
 *   router.use('/policies', managePoliciesRouter('NIS2', 'NIS2 - Πολιτικές'));
 */

import express from 'express';
import Models from '../../../models/models.js';
import Cache from '../../../models/cache.js';
import log from '../../../lib/logger.js';

/**
 * Δημιουργεί router για διαχείριση πολιτικών οργανισμού για ένα συγκεκριμένο framework.
 * @param {string} framework - Το αναγνωριστικό του framework (π.χ. 'NIS2', 'GDPR').
 * @param {string} label - Τίτλος για το view (π.χ. 'NIS2 - Πολιτικές').
 * @returns {express.Router}
 */
export function managePoliciesRouter(framework, label) {
    const policies = express.Router();

    /* GET / - Λίστα πολιτικών οργανισμού για το framework */
    policies.get('/', async (req, res) => {
        try {
            const orgPolicies = await Models.Policy.findAll({
                where: { organizationId: req.org },
                include: [{ model: Models.PolicyType, as: 'policyType' }],
                order: [['createdAt', 'ASC']],
            });

            /* Φιλτράρισμα βάσει framework (πεδίο policy.framework) */
            const frameworkPolicies = orgPolicies.filter(p => p.framework === framework);

            res.render('organizations/policies/policies', {
                framework,
                user: req.user,
                org: req.org,
                title: label,
                policies: frameworkPolicies,
                baseUrl: req.baseUrl,
            });
        } catch (error) {
            log.error(`${framework} org policies GET error: ${error}`);
            res.status(500).render('errors/500');
        }
    });

    /* GET /mass-creation - Φόρμα μαζικής δημιουργίας πολιτικών */
    policies.get('/mass-creation', async (req, res) => {
        try {
            const allPolicyTypes = await Cache.table.PolicyType;
            const frameworkTypes = allPolicyTypes.filter(pt => pt.framework === framework);

            const existing = await Models.Policy.findAll({
                where: { organizationId: req.org },
                attributes: ['policyTypeId'],
                raw: true,
            });
            const existingIds = new Set(existing.map(p => p.policyTypeId).filter(Boolean));

            const policyTypes = frameworkTypes.map(pt => ({ ...pt, assigned: existingIds.has(pt.id) }));

            res.render('organizations/policies/mass-creation', {
                framework,
                user: req.user,
                org: req.org,
                title: `${label} - Μαζική Δημιουργία`,
                policyTypes,
                baseUrl: req.baseUrl,
            });
        } catch (error) {
            log.error(`${framework} mass-creation GET error: ${error}`);
            res.status(500).render('errors/500');
        }
    });

    /* POST /mass-creation - Μαζική δημιουργία πολιτικών */
    policies.post('/mass-creation', async (req, res) => {

        try {
            const policyTypeMap = await Cache.map.PolicyType;

            const selectedIds = [req.body.policyTypeIds].flat().filter(Boolean).map(Number);

            const records = selectedIds.map(id => {
                const pt = policyTypeMap.get(id);
                if (!pt) return null;
                return {
                    organizationId: req.org,
                    policyTypeId: id,
                    name: pt.name,
                    description: pt.description,
                    status: 'to_be_created',
                    framework: pt.framework,
                };
            }).filter(Boolean);

            if (records.length) {
                await Models.Policy.bulkCreate(records, { ignoreDuplicates: true });
            }

            res.json({ success: true, message: 'Οι επιλεγμένες πολιτικές δημιουργήθηκαν επιτυχώς.' });
        } catch (error) {
            log.error(`${framework} mass-creation POST error: ${error}`);
            res.status(500).render('errors/500');
        }
    });

    /* GET /new - Φόρμα δημιουργίας νέας πολιτικής */
    policies.get('/new', async (req, res) => {
        try {
            const allPolicyTypes = await Cache.table.PolicyType;
            const frameworkTypes = allPolicyTypes.filter(pt => pt.framework === framework);

            const existing = await Models.Policy.findAll({
                where: { organizationId: req.org },
                attributes: ['policyTypeId'],
                raw: true,
            });
            const existingIds = new Set(existing.map(p => p.policyTypeId).filter(Boolean));
            const availablePolicyTypes = frameworkTypes.filter(pt => !existingIds.has(pt.id));

            res.render('organizations/policies/single-policy', {
                framework,
                user: req.user,
                org: req.org,
                title: `${label} - Νέα Πολιτική`,
                mode: 'create',
                availablePolicyTypes,
                baseUrl: req.baseUrl,
            });
        } catch (error) {
            log.error(`${framework} new policy GET error: ${error}`);
            res.status(500).render('errors/500');
        }
    });

    /* POST / - Δημιουργία νέας πολιτικής */
    policies.post('/', async (req, res) => {
        try {
            const { policyTypeId, name, description, version, effectiveDate, reviewDate, status } = req.body;
            await Models.Policy.create({
                organizationId: req.org,
                policyTypeId: policyTypeId || null,
                name,
                description,
                version,
                effectiveDate: effectiveDate || null,
                reviewDate: reviewDate || null,
                status,
                framework,
            });
            res.json({ success: true, message: 'Η πολιτική δημιουργήθηκε επιτυχώς.' });
        } catch (error) {
            log.error(`${framework} create policy POST error: ${error}`);
            res.json({ success: false, message: 'Σφάλμα κατά τη δημιουργία της πολιτικής.' });
        }
    });

    /* GET /:id - Φόρμα επεξεργασίας πολιτικής */
    policies.get('/:id', async (req, res) => {
        try {
            const policy = await Models.Policy.findOne({
                where: { id: req.params.id, organizationId: req.org },
                include: [{ model: Models.PolicyType, as: 'policyType' }],
            });
            if (!policy) return res.status(404).render('errors/404');

            res.render('organizations/policies/single-policy', {
                framework,
                user: req.user,
                org: req.org,
                title: `${label} - ${policy.name}`,
                mode: 'edit',
                policy,
                baseUrl: req.baseUrl,
            });
        } catch (error) {
            log.error(`${framework} edit policy GET error: ${error}`);
            res.status(500).render('errors/500');
        }
    });

    /* PUT /:id - Ενημέρωση πολιτικής */
    policies.put('/:id', async (req, res) => {
        try {
            const policy = await Models.Policy.findOne({
                where: { id: req.params.id, organizationId: req.org },
            });
            if (!policy) return res.status(404).json({ success: false, message: 'Η πολιτική δεν βρέθηκε.' });

            const { name, description, version, effectiveDate, reviewDate, status } = req.body;
            await policy.update({ name, description, version, effectiveDate: effectiveDate || null, reviewDate: reviewDate || null, status });

            res.json({ success: true, message: 'Η πολιτική αποθηκεύτηκε επιτυχώς.' });
        } catch (error) {
            log.error(`${framework} update policy PUT error: ${error}`);
            res.json({ success: false, message: 'Σφάλμα κατά την αποθήκευση της πολιτικής.' });
        }
    });

    return policies;
}
