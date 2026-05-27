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
import Storage from '../../../lib/storage.js';

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

    /* Εκτελείται μετά από POST/PUT για εκκαθάριση ορφανών αρχείων */
    async function cleanup() {
        try {
            const [{ files }, dbRecords] = await Promise.all([
                Storage.list(resourcePath),
                Models.Legislation.findAll({ where: { framework }, attributes: ['file'], raw: true }),
            ]);

            const dbFileNames = new Set(dbRecords.map(r => r.file).filter(Boolean));

            for (const file of files) {
                if (!dbFileNames.has(file.name)) {
                    const sanitizedName = Storage.sanitizer.sanitize(file.name);
                    await Storage.delete(`${resourcePath}/${sanitizedName}`);
                    log.info(`Cleanup: διαγράφηκε ορφανό αρχείο ${resourcePath}/${sanitizedName}`);
                }
            }
        } catch (error) {
            log.error(`${framework} legislation cleanup error: ${error}`);
        }
    }


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

            let storedFileName = null;
            if (req.file) {
                const decodedName = decodeFilename(req.file.originalname);
                await Storage.store(resourcePath, { ...req.file, originalname: decodedName });
                storedFileName = decodedName;
            }

            await Models.Legislation.create({
                framework,
                code: code || null,
                name: name || null,
                description: description || null,
                link: link || null,
                file: storedFileName,
                sequence: isNaN(seqInt) ? null : seqInt,
                active: true,
            });

            log.success(`Νέο έγγραφο νομοθεσίας δημιουργήθηκε: ${code || name} (Framework: ${framework})`);

            res.json({ ok: true });
            cleanup();
        } catch (error) {
            if (error?.code === Storage.errorCodes.duplicateFile) {
                return res.status(400).json({ ok: false, message: 'Υπάρχει ήδη αρχείο νομοθεσίας με το ίδιο όνομα. Μετονομάστε το νέο αρχείο ή διαγράψτε πρώτα το παλιό.' });
            }
            if (error instanceof UniqueConstraintError || error.name === 'SequelizeUniqueConstraintError') {
                return res.status(400).json({ ok: false, message: 'Υπάρχει ήδη νομοθεσία με τον ίδιο κωδικό.' });
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
                const decodedName = decodeFilename(req.file.originalname);
                await Storage.store(resourcePath, { ...req.file, originalname: decodedName });
                updateData.file = decodedName;
            } else if (req.body.clearFile === 'true') {
                updateData.file = null;
            }

            await item.update(updateData);
            log.success(`Έγγραφο νομοθεσίας ενημερώθηκε: ${code || name} (ID: ${id}, Framework: ${framework})`);

            res.json({ ok: true });
            cleanup();
        } catch (error) {
            if (error?.code === Storage.errorCodes.duplicateFile) {
                return res.status(400).json({ ok: false, message: 'Υπάρχει ήδη αρχείο νομοθεσίας με το ίδιο όνομα. Μετονομάστε το νέο αρχείο ή διαγράψτε πρώτα το παλιό.' });
            }
            if (error instanceof UniqueConstraintError || error.name === 'SequelizeUniqueConstraintError') {
                return res.status(400).json({ ok: false, message: 'Υπάρχει ήδη νομοθεσία με τον ίδιο κωδικό.' });
            }
            log.error(`${framework} legislation PUT ${req.params.id} error: ${error}`);
            res.status(500).json({ ok: false, message: error.message });
        }
    });

    return legislation;
}
