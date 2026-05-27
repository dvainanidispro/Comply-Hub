/**
 * Factory Pattern για τη διαχείριση νομοθεσίας ανά Framework.
 *
 * Χρήση:
 *   import { manageLegislationRouter } from './legislation.js';
 *   router.use('/legislation', manageLegislationRouter('NIS2', 'NIS2 - Νομοθεσία'));
 */

import express from 'express';
import multer from 'multer';
import { UniqueConstraintError } from 'sequelize';
import Models from '../../../models/models.js';
import log from '../../../lib/logger.js';

const upload = multer({ storage: multer.memoryStorage() });

const decodeFilename = name => Buffer.from(name, 'latin1').toString('utf8');

/**
 * Δημιουργεί router για διαχείριση νομοθεσίας ενός συγκεκριμένου framework.
 * @param {string} framework - Το αναγνωριστικό του framework (π.χ. 'NIS2', 'GDPR').
 * @param {string} label - Τίτλος για το view (π.χ. 'NIS2 - Νομοθεσία').
 * @returns {express.Router}
 */
export function manageLegislationRouter(framework, label) {

    const legislation = express.Router();
    const resourcePath = `modules/legislation/${framework.toLowerCase()}`;


    /* GET / - Λίστα νομοθεσίας για το framework */
    legislation.get('/', async (req, res) => {
        try {
            const items = await Models.Legislation.findAll({
                where: { framework },
                order: [
                    ['sequence', 'ASC NULLS LAST'],
                    ['code', 'ASC'],
                ],
                raw: true,
            });

            res.render('frameworks/legislation', {
                items,
                framework,
                user: req.user,
                title: label,
                baseUrl: req.baseUrl,
            });
        } catch (error) {
            log.error(`${framework} legislation GET error: ${error}`);
            res.status(500).render('errors/500');
        }
    });

    /* POST / - Δημιουργία νέου εγγράφου */
    legislation.post('/', upload.single('file'), async (req, res) => {
        try {
            const { code, name, description, link, sequence } = req.body;
            const seqInt = parseInt(sequence);

            await Models.Legislation.create({
                framework,
                code: code || null,
                name: name || null,
                description: description || null,
                link: link || null,
                file: req.file ? decodeFilename(req.file.originalname) : null,
                sequence: isNaN(seqInt) ? null : seqInt,
                active: true,
            });

            res.json({ ok: true });
        } catch (error) {
            if (error instanceof UniqueConstraintError || error.name === 'SequelizeUniqueConstraintError') {
                return res.status(400).json({ ok: false, message: 'Υπάρχει ήδη έγγραφο με τον ίδιο κωδικό.' });
            }
            log.error(`${framework} legislation POST error: ${error}`);
            res.status(500).json({ ok: false, message: error.message });
        }
    });

    /* PUT /:id - Ενημέρωση εγγράφου */
    legislation.put('/:id', upload.single('file'), async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            const { code, name, description, link, sequence, active } = req.body;

            const item = await Models.Legislation.findOne({ where: { id, framework } });
            if (!item) return res.status(404).json({ ok: false, message: 'Δεν βρέθηκε.' });

            const seqInt = parseInt(sequence);

            const updateData = {
                code: code || null,
                name: name || null,
                description: description || null,
                link: link || null,
                sequence: isNaN(seqInt) ? null : seqInt,
                active: active === 'true' || active === true,
            };
            if (req.file) {
                updateData.file = decodeFilename(req.file.originalname);
            } else if (req.body.clearFile === 'true') {
                updateData.file = null;
            }

            await item.update(updateData);
            res.json({ ok: true });
        } catch (error) {
            if (error instanceof UniqueConstraintError || error.name === 'SequelizeUniqueConstraintError') {
                return res.status(400).json({ ok: false, message: 'Υπάρχει ήδη έγγραφο με τον ίδιο κωδικό.' });
            }
            log.error(`${framework} legislation PUT ${req.params.id} error: ${error}`);
            res.status(500).json({ ok: false, message: error.message });
        }
    });

    return legislation;
}
