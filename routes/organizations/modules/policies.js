/**
 * Factory Pattern για τη διαχείριση πολιτικών οργανισμών ανά Framework.
 *
 * Χρήση:
 *   import { managePoliciesRouter } from './modules/policies.js';
 *   router.use('/policies', managePoliciesRouter('NIS2', 'policy', 'NIS2 - Πολιτικές'));
 */

import express from 'express';
import { can } from '../../../auth/roles.js';
import Models from '../../../models/models.js';
import Cache from '../../../models/cache.js';
import { Op } from 'sequelize';
import log from '../../../lib/logger.js';

const typeLabels = {
    policy: {
        singular: 'Πολιτική',
        singularLower: 'πολιτική',
        plural: 'Πολιτικές',
        pluralLower: 'πολιτικές',
    },
    procedure: {
        singular: 'Διαδικασία',
        singularLower: 'διαδικασία',
        plural: 'Διαδικασίες',
        pluralLower: 'διαδικασίες',
    },
    default: {
        singular: 'Έγγραφο',
        singularLower: 'έγγραφο',
        plural: 'Έγγραφα',
        pluralLower: 'έγγραφα',
    },
};

/**
 * Δημιουργεί router για διαχείριση πολιτικών οργανισμού για ένα συγκεκριμένο framework.
 * @param {string} framework - Το αναγνωριστικό του framework (π.χ. 'NIS2', 'GDPR').
 * @param {string} type - Ο τύπος εγγράφου (π.χ. 'policy', 'procedure').
 * @param {string} label - Τίτλος για το view (π.χ. 'NIS2 - Πολιτικές').
 * @returns {express.Router}
 */
export function managePoliciesRouter(framework, type, label) {
    const policies = express.Router();
    const displayType = typeLabels[type||'default'];

    /* GET / - Λίστα πολιτικών οργανισμού για το framework */
    policies.get('/', async (req, res) => {
        try {
            const policiesList = await Models.Policy.findAll({
                where: {
                    organizationId: req.org,
                    framework,
                    type,
                },
                include: [{ model: Models.PolicyType, as: 'policyType' }],
                order: [['createdAt', 'ASC']],
            });

            res.render('organizations/policies/policies', {
                framework,
                user: req.user,
                title: label,
                displayType,
                policies: policiesList,
                baseUrl: req.baseUrl,
            });
        } catch (error) {
            log.error(`${framework} org policies GET error: ${error}`);
            res.status(500).render('errors/500');
        }
    });

    /* GET /mass-creation - Φόρμα μαζικής δημιουργίας πολιτικών */
    policies.get('/mass-creation', can('manage:any:content'), async (req, res) => {
        try {
            const allPolicyTypes = await Cache.table.PolicyType;
            const availableTemplates = allPolicyTypes.filter(pt => pt.framework === framework && pt.type === type);

            const existing = await Models.Policy.findAll({
                where: {
                    organizationId: req.org,
                    framework,
                    type,
                },
                attributes: ['policyTypeId'],
                raw: true,
            });
            const existingIds = new Set(existing.map(p => p.policyTypeId).filter(Boolean));

            const policyTypes = availableTemplates.map(pt => ({ ...pt, assigned: existingIds.has(pt.id) }));

            res.render('organizations/policies/mass-creation', {
                framework,
                user: req.user,
                section: label,
                title: `${label} - Μαζική Δημιουργία`,
                displayType,
                policyTypes,
                baseUrl: req.baseUrl,
            });
        } catch (error) {
            log.error(`${framework} mass-creation GET error: ${error}`);
            res.status(500).render('errors/500');
        }
    });

    /* POST /mass-creation - Μαζική δημιουργία πολιτικών */
    policies.post('/mass-creation', can('manage:any:content'), async (req, res) => {

        try {
            const policyTypeMap = await Cache.map.PolicyType;

            const selectedIds = [req.body.policyTypeIds].flat().filter(Boolean).map(Number);

            const records = selectedIds.map(id => {
                const pt = policyTypeMap.get(id);
                if (!pt || pt.framework !== framework || pt.type !== type) return null;
                return {
                    organizationId: req.org,
                    policyTypeId: id,
                    type,
                    code: pt.code,
                    name: pt.name,
                    description: pt.description,
                    status: 'to_be_created',
                    framework: pt.framework,
                };
            }).filter(Boolean);

            if (records.length) {
                await Models.Policy.bulkCreate(records, { ignoreDuplicates: true });
            }

            res.json({ success: true, message: `Οι επιλεγμένες ${displayType.pluralLower} δημιουργήθηκαν επιτυχώς.` });
        } catch (error) {
            log.error(`${framework} mass-creation POST error: ${error}`);
            res.status(500).render('errors/500');
        }
    });

    /* GET /new - Φόρμα δημιουργίας νέας πολιτικής */
    policies.get('/new', async (req, res) => {
        try {
            const allPolicyTypes = await Cache.table.PolicyType;
            const availableTemplates = allPolicyTypes.filter(pt => pt.framework === framework && pt.type === type);

            const existing = await Models.Policy.findAll({
                where: {
                    organizationId: req.org,
                    framework,
                    type,
                },
                attributes: ['policyTypeId'],
                raw: true,
            });
            const existingIds = new Set(existing.map(p => p.policyTypeId).filter(Boolean));
            const availablePolicyTypes = availableTemplates.filter(pt => !existingIds.has(pt.id));

            res.render('organizations/policies/single-policy', {
                framework,
                user: req.user,
                section: label,
                title: `${label} - Νέα ${displayType.singular}`,
                mode: 'create',
                displayType,
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
            const { policyTypeId, code, name, description, version, effectiveDate, reviewDate, status } = req.body;

            /* Έλεγχος για duplicate code ή policyTypeId στο ίδιο framework */
            const duplicateConditions = [{ code }];
            if (policyTypeId) duplicateConditions.push({ policyTypeId: Number(policyTypeId) });

            const existing = await Models.Policy.findOne({
                where: { organizationId: req.org, framework, type, [Op.or]: duplicateConditions },
                attributes: ['code', 'policyTypeId'],
            });

            if (existing) {
                if (existing.code === code)
                    return res.json({ success: false, message: `Υπάρχει ήδη ${displayType.singularLower} με τον ίδιο κωδικό.` });
                return res.json({ success: false, message: `Υπάρχει ήδη ${displayType.singularLower} για τον ίδιο τύπο εγγράφου.` });
            }

            await Models.Policy.create({
                organizationId: req.org,
                policyTypeId: policyTypeId || null,
                type,
                code,
                name,
                description,
                version,
                effectiveDate: effectiveDate || null,
                reviewDate: reviewDate || null,
                status,
                framework,
            });
            res.json({ success: true, message: `Η ${displayType.singularLower} δημιουργήθηκε επιτυχώς.` });
        } catch (error) {
            log.error(`${framework} create policy POST error: ${error}`);
            res.json({ success: false, message: `Σφάλμα κατά τη δημιουργία της ${displayType.singularLower}.` });
        }
    });

    /* GET /:id - Φόρμα επεξεργασίας πολιτικής */
    policies.get('/:id', async (req, res) => {
        try {
            const policy = await Models.Policy.findOne({
                where: {
                    id: req.params.id,
                    organizationId: req.org,
                    framework,
                    type,
                },
                include: [{ model: Models.PolicyType, as: 'policyType' }],
            });
            if (!policy) return res.status(404).render('errors/404');

            res.render('organizations/policies/single-policy', {
                framework,
                user: req.user,
                section: label,
                title: `${label} - ${policy.name}`,
                mode: 'edit',
                displayType,
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
            const { code, name, description, version, effectiveDate, reviewDate, status } = req.body;
            const policyId = parseInt(req.params.id);

            /* Query για fetch της πολιτικής προς επεξεργασίας και ενδεχομένως και άλλης με duplicate code */
            const candidates = await Models.Policy.findAll({
                where: {
                    organizationId: req.org,
                    framework,
                    type,
                    [Op.or]: [{ id: policyId }, { code }],
                },
            });

            const policy = candidates.find(p => p.id === policyId);
            if (!policy) return res.status(404).json({ success: false, message: `Η ${displayType.singularLower} δεν βρέθηκε.` });

            const duplicate = candidates.find(p => p.code === code && p.id !== policyId);
            if (duplicate) return res.json({ success: false, message: `Υπάρχει ήδη ${displayType.singularLower} με τον ίδιο κωδικό.` });

            await policy.update({ code, name, description, version, effectiveDate: effectiveDate || null, reviewDate: reviewDate || null, status });

            res.json({ success: true, message: `Η ${displayType.singularLower} αποθηκεύτηκε επιτυχώς.` });
        } catch (error) {
            log.error(`${framework} update policy PUT error: ${error}`);
            res.json({ success: false, message: `Σφάλμα κατά την αποθήκευση της ${displayType.singularLower}.` });
        }
    });

    /* DELETE /:id - Διαγραφή πολιτικής */
    policies.delete('/:id', can('manage:any:content'), async (req, res) => {
        try {
            const policy = await Models.Policy.findOne({
                where: {
                    id: req.params.id,
                    organizationId: req.org,
                    framework,
                    type,
                },
            });
            if (!policy) return res.status(404).json({ success: false, message: `Η ${displayType.singularLower} δεν βρέθηκε.` });

            await policy.destroy();
            res.json({ success: true, message: `Η ${displayType.singularLower} διαγράφηκε επιτυχώς.` });
        } catch (error) {
            log.error(`${framework} delete policy DELETE error: ${error}`);
            res.json({ success: false, message: `Σφάλμα κατά τη διαγραφή της ${displayType.singularLower}.` });
        }
    });

    return policies;
}
