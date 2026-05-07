import express from 'express';
import { ForeignKeyConstraintError } from 'sequelize';
import Models from '../../models/models.js';
import Cache from '../../models/cache.js';
import log from '../../lib/logger.js';

const nis2Policies = express.Router();

const FRAMEWORK = 'NIS2';

/**
 * GET /admin/framework/nis2/policies - Λίστα policy types για NIS2
 */
nis2Policies.get('/policies', async (req, res) => {
    try {
        const policies = await Models.PolicyType.findAll({
            where: { framework: FRAMEWORK },
            order: [
                ['sequence', 'ASC'],
                ['id', 'ASC'],
            ],
            raw: true,
        });

        res.render('framework/nis2/policies', {
            policies,
            user: req.user,
            title: 'NIS2 - Πολιτικές',
        });
    } catch (error) {
        log.error(`NIS2 policies GET error: ${error}`);
        res.status(500).render('errors/500');
    }
});

/**
 * POST /admin/framework/nis2/policies - Δημιουργία νέου NIS2 policy type
 */
nis2Policies.post('/policies', async (req, res) => {
    try {
        const { code, name, description, sequence, default: isDefault, active } = req.body;

        const seqInt = parseInt(sequence);

        await Models.PolicyType.create({
            framework: FRAMEWORK,
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
        log.error(`NIS2 policies POST error: ${error}`);
        res.status(500).json({ ok: false, message: error.message });
    }
});

/**
 * PUT /admin/framework/nis2/policies/:id - Ενημέρωση NIS2 policy type
 */
nis2Policies.put('/policies/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { code, name, description, sequence, default: isDefault, active } = req.body;

        const policy = await Models.PolicyType.findOne({ where: { id, framework: FRAMEWORK } });
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
        log.error(`NIS2 policies PUT ${req.params.id} error: ${error}`);
        res.status(500).json({ ok: false, message: error.message });
    }
});

/**
 * DELETE /admin/framework/nis2/policies/:id - Απενεργοποίηση NIS2 policy type
 */
nis2Policies.delete('/policies/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);

        const policy = await Models.PolicyType.findOne({ where: { id, framework: FRAMEWORK } });
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
        log.error(`NIS2 policies DELETE ${req.params.id} error: ${error}`);
        res.status(500).json({ ok: false, message: error.message });
    }
});

export default nis2Policies;
