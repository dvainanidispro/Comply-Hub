import express from 'express';
import Storage from '../../lib/storage.js';
import log from '../../lib/logger.js';

const storageRouter = express.Router();

/**
 * GET /admin/storage - Σελίδα διαχείρισης αρχείων
 */
storageRouter.get('/', async (req, res) => {
    try {
        await Storage.check(false);
        res.render('admin/storage', {
            user: req.user,
            title: 'Διαχείριση Αρχείων',
        });
    } catch (error) {
        log.error(`Σφάλμα κατά την ανάκτηση σελίδας storage: ${error}`);
        res.status(500).render('errors/500', { message: 'Ο φάκελος Storage δεν είναι προσβάσιμος' });
    }
});

/**
 * GET /admin/storage/download - Κατεβάζει ένα αρχείο
 */
storageRouter.get('/download', async (req, res) => {
    try {
        const filePath = req.query.path || '';
        const absolutePath = await Storage.path(filePath);
        res.download(absolutePath);
    } catch (error) {
        log.error(`Σφάλμα κατά το download αρχείου: ${error}`);
        res.status(400).json({ success: false, message: 'Αδύνατη η λήψη του αρχείου' });
    }
});

/**
 * DELETE /admin/storage/delete - Διαγραφή αρχείου ή φακέλου
 */
storageRouter.delete('/delete', async (req, res) => {
    try {
        const { path: itemPath } = req.body;
        await Storage.delete(itemPath);
        log.info(`Διαγράφηκε από storage: ${itemPath}`);
        res.json({ success: true, message: 'Η διαγραφή ολοκληρώθηκε επιτυχώς' });
    } catch (error) {
        log.error(`Σφάλμα κατά τη διαγραφή: ${error}`);
        res.status(400).json({ success: false, message: 'Σφάλμα κατά τη διαγραφή' });
    }
});

/**
 * GET /admin/storage/list - Επιστρέφει τα περιεχόμενα ενός φακέλου ως JSON
 */
storageRouter.get('/list', async (req, res) => {
    try {
        const folderPath = req.query.path || '';
        const result = await Storage.list(folderPath, false, true);
        res.json({ success: true, ...result });
    } catch (error) {
        log.error(`Σφάλμα κατά τη λίστα storage: ${error}`);
        res.status(400).json({ success: false, message: 'Σφάλμα κατά την ανάκτηση περιεχομένων φακέλου' });
    }
});

export default storageRouter;
