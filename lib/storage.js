import log from './logger.js';
import fs from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';

/**
 * Διαχείριση αποθηκευτικού χώρου.
 */
const Storage = {};

/** Θέση του φάκελου Storage */
Storage.storagePath = path.resolve(process.cwd(), process.env.STORAGEPATH ?? 'storage');

/**
 * Ελέγχει αν ο φάκελος Storage υπάρχει και έχει δικαιώματα read/write.
 * Καλείται κατά την εκκίνηση του server.
 */
Storage.check = async function(logResult=true) {
    try {
        await fs.access(Storage.storagePath, constants.R_OK | constants.W_OK);
        if (logResult) log.system(`Ο φάκελος Storage βρίσκεται στη θέση: ${Storage.storagePath}`);
    } catch {
        log.error(`Δεν είναι δυνατή η πρόσβαση στον φάκελο Storage: ${Storage.storagePath}`);
        throw new Error(`Storage folder inaccessible: ${Storage.storagePath}`);
    }
}

/**
 * Επιστρέφει τα περιεχόμενα ενός φακέλου (αρχεία & υποφάκελοι).
 * @param {string} folderPath - Σχετικό path ως προς το storagePath
 * @returns {{ folders: Array, files: Array }}
 */
Storage.list = async function(folderPath = '') {
    const targetPath = path.resolve(Storage.storagePath, folderPath);

    // Ασφάλεια: αποτροπή path traversal εκτός του storage φακέλου
    if (targetPath !== Storage.storagePath && !targetPath.startsWith(Storage.storagePath + path.sep)) {
        throw new Error('Μη επιτρεπτό path');
    }

    const entries = await fs.readdir(targetPath, { withFileTypes: true });
    const folders = [];
    const files = [];

    for (const entry of entries) {
        const relativePath = folderPath ? `${folderPath}/${entry.name}` : entry.name;
        if (entry.isDirectory()) {
            folders.push({ name: entry.name, path: relativePath });
        } else if (entry.isFile()) {
            const stat = await fs.stat(path.join(targetPath, entry.name));
            files.push({ name: entry.name, path: relativePath, size: stat.size });
        }
    }

    folders.sort((a, b) => a.name.localeCompare(b.name));
    files.sort((a, b) => a.name.localeCompare(b.name));

    return { folders, files };
};

/**
 * Επιστρέφει το απόλυτο path ενός αρχείου αφού ελέγξει ότι βρίσκεται εντός storage, με σκοπό το download του. 
 * @param {string} filePath - Σχετικό path ως προς το storagePath
 * @returns {string} Απόλυτο path του αρχείου
 */
Storage.serve = async function(filePath) {
    const targetPath = path.resolve(Storage.storagePath, filePath);

    // Ασφάλεια: αποτροπή path traversal εκτός του storage φακέλου
    if (!targetPath.startsWith(Storage.storagePath + path.sep)) {
        throw new Error('Μη επιτρεπτό path');
    }

    await fs.access(targetPath, constants.R_OK);
    return targetPath;
};

/**
 * Διαγράφει ένα αρχείο ή φάκελο (μαζί με τα περιεχόμενά του).
 * @param {string} targetPath - Σχετικό path ως προς το storagePath
 */
Storage.delete = async function(targetPath) {
    const absolutePath = path.resolve(Storage.storagePath, targetPath);

    // Ασφάλεια: αποτροπή path traversal εκτός του storage φακέλου
    if (!absolutePath.startsWith(Storage.storagePath + path.sep)) {
        throw new Error('Μη επιτρεπτό path');
    }

    await fs.rm(absolutePath, { recursive: true });
};

/**
 * Αποθηκεύει ένα αρχείο στο storage.
 * @param {string} destPath - Σχετικό path προορισμού ως προς το storagePath
 * @param {object} file - Αντικείμενο αρχείου (π.χ. από multer)
 */
Storage.store = async function(destPath, file) {
    return true;
};

/**
 * Επιστρέφει τα περιεχόμενα ενός φακέλου ως αρχείο ZIP.
 * @param {string} folderPath - Σχετικό path ως προς το storagePath
 */
Storage.getFolderAsZip = async function(folderPath) {
    return true;
};

export default Storage;
