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

    /* GET /download?name=MyFile.pdf - Λήψη αρχείου νομοθεσίας με το όνομα στο query param */
    router.get('/download', Storage.download(`modules/legislation/${framework.toLowerCase()}`));

    return router;
}

export { legislationRouter };
