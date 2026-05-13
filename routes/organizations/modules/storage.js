/**
 * Factory Pattern για file management πόρων οργανισμών ανά Framework/ResourceType.
 *
 * Χρήση:
 *   import { manageStorageRouter } from './modules/storage.js';
 *   policiesRouter.use('/:resourceId/storage', manageStorageRouter('GDPR', 'policies'));
 *
 * Storage path: organizations/{orgId}/modules/{framework}/{resourceType}/{resourceId}/
 */

import express from 'express';
import multer from 'multer';
import Storage from '../../../lib/storage.js';
import log from '../../../lib/logger.js';

const upload = multer({ storage: multer.memoryStorage() });



/**
 * Δημιουργεί factory router για file management πόρων ανά framework/resourceType.
 * Χρησιμοποιεί mergeParams ώστε να βλέπει τα URL params του parent router.
 * @param {string} framework - Αναγνωριστικό framework (π.χ. 'NIS2', 'GDPR').
 * @param {string} resourceType - Τύπος πόρου (π.χ. 'policies', 'procedures').
 * @param {string} [resourceParamName='resourceId'] - Το URL param που περιέχει το resource ID.
 * @returns {express.Router}
 */
export function manageStorageRouter(framework, resourceType, resourceParamName = 'resourceId') {
    const router = express.Router({ mergeParams: true });

    /* Κατασκευή του relative storage path για τον πόρο βάσει req context */
    function resourcePath(req) {
        const resourceId = parseInt(req.params[resourceParamName], 10);
        return `organizations/${req.org}/modules/${framework.toLowerCase()}/${resourceType}/${resourceId}`;
    }

    /* Middleware: έλεγχος org context και valid resource ID */
    router.use((req, res, next) => {
        if (!req.org) {
            return res.status(403).json({ success: false, message: 'Δεν έχει οριστεί οργανισμός.' });
        }
        const resourceId = parseInt(req.params[resourceParamName], 10);
        if (!resourceId) {
            return res.status(400).json({ success: false, message: 'Μη έγκυρο resource ID.' });
        }
        next();
    });



    /* GET /list - Λίστα αρχείων πόρου με desanitized ονόματα για εμφάνιση */
    router.get('/list', async (req, res) => {
        try {
            const result = await Storage.list(resourcePath(req), true);
            res.json({ success: true, ...result });
        } catch (error) {
            log.error(`Storage list error (${framework}/${resourceType}): ${error}`);
            res.status(500).json({ success: false, message: 'Σφάλμα κατά την ανάκτηση αρχείων.' });
        }
    });

    /* GET /download - Λήψη αρχείου με sanitized όνομα στο query param */
    router.get('/download', async (req, res) => {
        try {
            const fileName = req.query.name || '';
            const filePath = `${resourcePath(req)}/${fileName}`;
            const absolutePath = await Storage.path(filePath);
            const displayName = Storage.sanitizer.desanitize(fileName);
            res.download(absolutePath, displayName);
        } catch (error) {
            log.error(`Storage download error (${framework}/${resourceType}): ${error}`);
            res.status(400).json({ success: false, message: 'Αδύνατη η λήψη του αρχείου.' });
        }
    });

    /* DELETE /delete - Διαγραφή αρχείου με sanitized όνομα στο body */
    router.delete('/delete', async (req, res) => {
        try {
            const fileName = req.body.name || '';
            const filePath = `${resourcePath(req)}/${fileName}`;
            await Storage.delete(filePath);
            log.info(`Διαγράφηκε αρχείο: ${filePath}`);
            res.json({ success: true, message: 'Το αρχείο διαγράφηκε επιτυχώς.' });
        } catch (error) {
            log.error(`Storage delete error (${framework}/${resourceType}): ${error}`);
            res.status(400).json({ success: false, message: 'Σφάλμα κατά τη διαγραφή.' });
        }
    });

    /* POST /upload - Ανέβασμα αρχείου με sanitize ονόματος μέσω Storage.store */
    router.post('/upload', upload.single('file'), async (req, res) => {
        try {
            const folderPath = resourcePath(req);
            await Storage.store(folderPath, req.file);
            log.info(`Ανέβηκε αρχείο στο: ${folderPath}`);
            res.json({ success: true, message: 'Το αρχείο ανέβηκε επιτυχώς.' });
        } catch (error) {
            if (error?.code === Storage.errorCodes.duplicateFile) {
                return res.json({ success: false, message: 'Υπάρχει ήδη αρχείο με το ίδιο όνομα. Μετονομάστε το νέο αρχείο ή διαγράψτε πρώτα το παλιό.' });
            }
            log.error(`Storage upload error (${framework}/${resourceType}): ${error}`);
            res.status(500).json({ success: false, message: 'Σφάλμα κατά το ανέβασμα.' });
        }
    });

    return router;
}
