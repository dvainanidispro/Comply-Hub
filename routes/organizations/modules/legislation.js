import express from 'express';
import Models from '../../../models/models.js';
import log from '../../../lib/logger.js';
import Storage from '../../../lib/storage.js';

function legislationRouter(framework, title) {
    const router = express.Router();

    router.get('/', async (req, res) => {
        try {
            const legislation = await Models.Legislation.findAll({
                where: { framework, active: true },
                order: [['sequence', 'ASC NULLS LAST']],
            });

            res.render('organizations/legislation/legislation', {
                title,
                framework,
                legislation,
                downloadUrl: `${req.baseUrl}/download`,
            });
        } catch (error) {
            log(`Σφάλμα κατά τη φόρτωση νομοθεσίας ${framework}: ${error.message}`);
            res.status(500).render('errors/500');
        }
    });

    /* GET /download - Λήψη αρχείου νομοθεσίας με το desanitized όνομα στο query param */
    router.get('/download', async (req, res) => {
        try {
            const displayName = req.query.name || '';
            const sanitizedFileName = Storage.sanitizer.sanitize(displayName);
            const filePath = `modules/legislation/${framework.toLowerCase()}/${sanitizedFileName}`;
            const absolutePath = await Storage.path(filePath);
            res.download(absolutePath, displayName);
        } catch (error) {
            log(`Σφάλμα κατά τη λήψη αρχείου νομοθεσίας ${framework}: ${error.message}`);
            res.status(400).json({ success: false, message: 'Αδύνατη η λήψη του αρχείου.' });
        }
    });

    return router;
}

export { legislationRouter };
