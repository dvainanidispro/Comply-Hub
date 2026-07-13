/**
 * static.js
 * --------------------------------------------------------------------------
 * Αντιστοίχιση front-end paths σε αρχεία του server που σερβίρονται ως
 * στατικά. Χρήσιμο για αρχεία που χρησιμοποιούνται και στο back-end (π.χ.
 * lib/) ώστε να αποφεύγεται η αντιγραφή τους στο public/.
 *
 * Μορφή εγγραφής: '/front-end/path.js' → { path: <relative μονοπάτι>, contentType }
 * --------------------------------------------------------------------------
 */

import { resolve } from 'path';




const staticFiles = {
    '/js/questionnaire.js': {
        path: './lib/questionnaire.js',
        contentType: 'application/javascript',
    },
};




/** Προσθέτει το charset=utf-8 αν δεν υπάρχει. Απαραίτητο για σωστή εμφάνιση ελληνικών χαρακτήρων. */
function normalizeContentType(contentType) {
    if (!contentType) { return 'application/octet-stream; charset=utf-8'; }
    if (contentType.toLowerCase().includes('charset=')) { return contentType; }
    return `${contentType}; charset=utf-8`;
}

/**
 * Middleware που σερβίρει static αρχεία που χρησιμοποιούνται σε back-end και front-end.
 * Τοποθετείται στα ελεύθερα routes (χωρίς authentication).
 */
function staticMiddleware(req, res, next) {
    const file = staticFiles[req.path];
    if (!file) { return next(); }
    res.setHeader('Content-Type', normalizeContentType(file.contentType));
    res.sendFile(resolve(file.path));
}

export default staticMiddleware;
