/**
 * Factory Pattern για τη διαχείριση KPI Templates ανά Framework.
 *
 * Χρήση:
 *   import { manageKpiTemplatesRouter } from './kpi.js';
 *   router.use('/kpi', manageKpiTemplatesRouter('NIS2', 'NIS2 - Πρότυπα KPI'));
 */

import express from 'express';
import Models from '../../../models/models.js';
import Cache from '../../../models/cache.js';
import { UniqueConstraintError } from 'sequelize';
import log from '../../../lib/logger.js';

/**
 * Δημιουργεί router για διαχείριση KPI templates ενός συγκεκριμένου framework.
 * @param {string} framework - Το αναγνωριστικό του framework (π.χ. 'NIS2', 'GDPR').
 * @param {string} label - Τίτλος για το view (π.χ. 'NIS2 - Πρότυπα KPI').
 * @returns {express.Router}
 */
export function manageKpiTemplatesRouter(framework, label) {
    const kpi = express.Router();

    /* GET / - Λίστα KPI templates για το framework */
    kpi.get('/', async (req, res) => {
        try {
            const kpiTemplates = await Models.KpiTemplate.findAll({
                where: { framework },
                order: [
                    ['sequence', 'ASC NULLS LAST'],
                    ['code', 'ASC'],
                ],
                raw: true,
            });

            res.render('frameworks/kpi', {
                kpiTemplates,
                framework,
                user: req.user,
                title: label,
                baseUrl: req.baseUrl,
            });
        } catch (error) {
            log.error(`${framework} KPI templates GET error: ${error}`);
            res.status(500).render('errors/500');
        }
    });

    /* POST / - Δημιουργία νέου KPI template */
    kpi.post('/', async (req, res) => {
        try {
            const { code, name, description, frequency, responsible, source, unit, thresholdBest, thresholdWorst, thresholdTarget, sequence } = req.body;
            const seqInt = parseInt(sequence);

            await Models.KpiTemplate.create({
                framework,
                code: code || null,
                name: name || null,
                description: description || null,
                frequency: frequency || null,
                responsible: responsible || null,
                source: source || null,
                unit: unit || null,
                thresholdBest: thresholdBest ?? null,
                thresholdWorst: thresholdWorst ?? null,
                thresholdTarget: thresholdTarget ?? null,
                sequence: isNaN(seqInt) ? null : seqInt,
                active: true,
            });

            Cache.refresh('KpiTemplate');
            res.json({ ok: true });
        } catch (error) {
            if (error instanceof UniqueConstraintError || error.name === 'SequelizeUniqueConstraintError') {
                return res.status(400).json({ ok: false, message: 'Υπάρχει ήδη KPI template με τον ίδιο κωδικό.' });
            }
            log.error(`${framework} KPI templates POST error: ${error}`);
            res.status(500).json({ ok: false, message: error.message });
        }
    });

    /* PUT /:id - Ενημέρωση KPI template */
    kpi.put('/:id', async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            const { code, name, description, frequency, responsible, source, unit, thresholdBest, thresholdWorst, thresholdTarget, sequence, active } = req.body;

            const template = await Models.KpiTemplate.findOne({ where: { id, framework } });
            if (!template) { return res.status(404).json({ ok: false, message: 'Δεν βρέθηκε.' }); }

            const seqInt = parseInt(sequence);

            await template.update({
                code: code || null,
                name: name || null,
                description: description || null,
                frequency: frequency || null,
                responsible: responsible || null,
                source: source || null,
                unit: unit || null,
                thresholdBest: thresholdBest ?? null,
                thresholdWorst: thresholdWorst ?? null,
                thresholdTarget: thresholdTarget ?? null,
                sequence: isNaN(seqInt) ? null : seqInt,
                active: active === 'true' || active === true,
            });

            Cache.refresh('KpiTemplate');
            res.json({ ok: true });
        } catch (error) {
            if (error instanceof UniqueConstraintError || error.name === 'SequelizeUniqueConstraintError') {
                return res.status(400).json({ ok: false, message: 'Υπάρχει ήδη KPI template με τον ίδιο κωδικό.' });
            }
            log.error(`${framework} KPI templates PUT ${req.params.id} error: ${error}`);
            res.status(500).json({ ok: false, message: error.message });
        }
    });

    /* DELETE /:id - Διαγραφή KPI template */
    kpi.delete('/:id', async (req, res) => {
        try {
            const id = parseInt(req.params.id);

            const template = await Models.KpiTemplate.findOne({ where: { id, framework } });
            if (!template) { return res.status(404).json({ ok: false, message: 'Δεν βρέθηκε.' }); }

            await template.destroy();
            Cache.refresh('KpiTemplate');
            res.json({ ok: true });
        } catch (error) {
            log.error(`${framework} KPI templates DELETE ${req.params.id} error: ${error}`);
            res.status(500).json({ ok: false, message: error.message });
        }
    });

    return kpi;
}
