/**
 * Factory Pattern για file management πόρων οργανισμών ανά Framework/ResourceType.
 *
 * Χρήση:
 *   import { manageStorageRouter } from './modules/storage.js';
 *   policiesRouter.use('/:resourceId/storage', manageStorageRouter('GDPR', 'policies'));
 * 
 *   Με αυτόν τον τρόπο αν το policiesRouter διαχειρίζεται το path: `/organization/frameworks/gdpr/policies`, 
 *   τότε το storage router του προσθέτει τα paths: `/organization/frameworks/gdpr/policies/:policyId/storage` 
 *   (πχ `/organization/frameworks/gdpr/policies/1/storage/list`)
 *   για όλα τα policyId, ενώ έχει πρόσβαση στα URL params του parent router (mergeParams: true), 
 *   κυρίως για το resourceId (πχ policyId) ώστε να κατασκευάζει το σωστό storage path για κάθε πόρο.
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
        if (!resourceId) throw new Error('Μη έγκυρο resource ID.');
        return `organizations/${req.org}/${framework.toLowerCase()}/${resourceType}/${resourceId}`;
    }



    /* GET /list - Λίστα αρχείων πόρου (desanitized) */
    router.get('/list', async (req, res) => {
        try {
            const result = await Storage.list(resourcePath(req));
            res.json({ success: true, ...result });
        } catch (error) {
            log.error(`Storage list error (${framework}/${resourceType}): ${error}`);
            res.status(500).json({ success: false, message: 'Σφάλμα κατά την ανάκτηση αρχείων.' });
        }
    });

    /* GET /download - Λήψη αρχείου με όνομα στο query param */
    router.get('/download', Storage.download(resourcePath));

    /* DELETE /delete - Διαγραφή αρχείου με όνομα στο body */
    router.delete('/delete', async (req, res) => {
        try {
            const displayName = req.body.name || '';
            if (!displayName) {
                return res.status(400).json({ success: false, message: 'Δεν δόθηκε όνομα αρχείου.' });
            }

            const folderPath = resourcePath(req);
            await Storage.delete(folderPath, displayName);
            log.info(`Διαγράφηκε αρχείο: ${folderPath}/${displayName}`);
            res.json({ success: true, message: 'Το αρχείο διαγράφηκε επιτυχώς.' });
        } catch (error) {
            if (error?.code === 'ENOENT') {
                return res.status(404).json({ success: false, message: 'Το αρχείο δεν βρέθηκε.' });
            }

            log.error(`Storage delete error (${framework}/${resourceType}): ${error}`);
            res.status(500).json({ success: false, message: 'Σφάλμα κατά τη διαγραφή.' });
        }
    });

    /* POST /upload - Ανέβασμα αρχείου με sanitize ονόματος μέσω Storage.store */
    router.post('/upload', upload.single('file'), async (req, res) => {
        try {
            const folderPath = resourcePath(req);
            const storedFileName = await Storage.store(folderPath, req.file);
            log.info(`Ανέβηκε αρχείο στο: ${folderPath}/${storedFileName}`);
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
