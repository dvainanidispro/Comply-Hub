/**
 * Factory Pattern για τη διαχείριση Policy Types ανά Framework.
 *
 * Αντί να έχουμε ξεχωριστό router για κάθε framework (NIS2, GDPR κλπ.),
 * η συνάρτηση managePoliciesRouter() δημιουργεί και επιστρέφει έναν
 * προρυθμισμένο Express router για το framework που της δίνουμε.
 *
 * Χρήση:
 *   import { managePoliciesRouter } from './policies.js';
 *   router.use('/policies', managePoliciesRouter('NIS2', 'policy', 'NIS2 - Πολιτικές'));
 */

import express from 'express';
import Models from '../../../models/models.js';
import Cache from '../../../models/cache.js';
import { ForeignKeyConstraintError, UniqueConstraintError } from 'sequelize';
import log from '../../../lib/logger.js';

const typeLabels = {
    policy: {
        singular: 'Πρότυπο πολιτικής',
        singularLower: 'πρότυπο πολιτικής',
        singularGenitive: 'πρότυπου πολιτικής',
        plural: 'Πρότυπα πολιτικών',
        pluralLower: 'πρότυπα πολιτικών',
    },
    procedure: {
        singular: 'Πρότυπο διαδικασίας',
        singularLower: 'πρότυπο διαδικασίας',
        singularGenitive: 'πρότυπου διαδικασίας',
        plural: 'Πρότυπα διαδικασιών',
        pluralLower: 'πρότυπα διαδικασιών',
    },
    default: {
        singular: 'Πρότυπο εγγράφου',
        singularLower: 'πρότυπο εγγράφου',
        singularGenitive: 'πρότυπου εγγράφου',
        plural: 'Πρότυπα εγγράφων',
        pluralLower: 'πρότυπα εγγράφων',
    },
};

function getUniqueConstraintMessage(displayType) {
    return `Υπάρχει ήδη ${displayType.singularLower} με τον ίδιο κωδικό.`;
}

/**
 * Δημιουργεί router για διαχείριση policy types ενός συγκεκριμένου framework.
 * @param {string} framework - Το αναγνωριστικό του framework (π.χ. 'NIS2', 'GDPR').
 * @param {string} type - Ο τύπος εγγράφου (π.χ. 'policy', 'procedure').
 * @param {string} label - Τίτλος για το view (π.χ. 'NIS2 - Πολιτικές').
 * @returns {express.Router}
 */
export function managePoliciesRouter(framework, type, label) {
    const policies = express.Router();
    const displayType = typeLabels[type||'default'];

    
    /* GET /policies - Λίστα policy types για το framework */
    policies.get('/', async (req, res) => {
        try {
            const policies = await Models.PolicyType.findAll({
                where: { framework, type },
                order: [
                    ['sequence', 'ASC'],
                    ['id', 'ASC'],
                ],
                raw: true,
            });

            res.render('frameworks/policies', {
                policies,
                framework,
                user: req.user,
                title: label,
                displayType,
                baseUrl: req.baseUrl,
            });
        } catch (error) {
            log.error(`${framework} policies GET error: ${error}`);
            res.status(500).render('errors/500');
        }
    });

    /* POST /policies - Δημιουργία νέου policy type */
    policies.post('/', async (req, res) => {
        try {
            const { code, name, description, sequence, default: isDefault, active } = req.body;

            const seqInt = parseInt(sequence);

            await Models.PolicyType.create({
                framework,
                type,
                code: code || null,
                name: name || null,
                description: description || null,
                sequence: isNaN(seqInt) ? null : seqInt,
                default: isDefault === 'true' || isDefault === true,
                active: active === undefined ? true : (active === 'true' || active === true),
            });

            Cache.refresh('PolicyType');
            res.json({ ok: true });
        } catch (error) {
            if (error instanceof UniqueConstraintError || error.name === 'SequelizeUniqueConstraintError') {
                return res.status(400).json({ ok: false, message: getUniqueConstraintMessage(displayType) });
            }
            log.error(`${framework} policies POST error: ${error}`);
            res.status(500).json({ ok: false, message: error.message });
        }
    });

    /* PUT /policies/:id - Ενημέρωση policy type */
    policies.put('/:id', async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            const { code, name, description, sequence, default: isDefault, active } = req.body;

            const policy = await Models.PolicyType.findOne({ where: { id, framework, type } });
            if (!policy) {
                return res.status(404).json({ ok: false, message: 'Δεν βρέθηκε.' });
            }

            const seqInt = parseInt(sequence);

            await policy.update({
                code: code || null,
                name: name || null,
                description: description || null,
                sequence: isNaN(seqInt) ? null : seqInt,
                default: isDefault === 'true' || isDefault === true,
                active: active === 'true' || active === true,
            });

            Cache.refresh('PolicyType');
            res.json({ ok: true });
        } catch (error) {
            if (error instanceof UniqueConstraintError || error.name === 'SequelizeUniqueConstraintError') {
                return res.status(400).json({ ok: false, message: getUniqueConstraintMessage(displayType) });
            }
            log.error(`${framework} policies PUT ${req.params.id} error: ${error}`);
            res.status(500).json({ ok: false, message: error.message });
        }
    });

    /* DELETE /policies/:id - Διαγραφή policy type */
    policies.delete('/:id', async (req, res) => {
        try {
            const id = parseInt(req.params.id);

            const policy = await Models.PolicyType.findOne({ where: { id, framework, type } });
            if (!policy) {
                return res.status(404).json({ ok: false, message: 'Δεν βρέθηκε.' });
            }

            await policy.destroy();

            Cache.refresh('PolicyType');
            res.json({ ok: true });
        } catch (error) {
            if (error instanceof ForeignKeyConstraintError) {
                return res.status(400).json({ ok: false, message: 'Δεν είναι δυνατή η διαγραφή διότι συνδέεται με άλλες εγγραφές.' });
            }
            log.error(`${framework} policies DELETE ${req.params.id} error: ${error}`);
            res.status(500).json({ ok: false, message: error.message });
        }
    });

    return policies;
}
