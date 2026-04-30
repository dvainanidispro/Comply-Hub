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

export default Storage;
