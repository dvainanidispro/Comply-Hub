import express from 'express';
import Models from '../../models/models.js';
import log from '../../lib/logger.js';

const vendorsRouter = express.Router();

/** Το όνομα του cookie που κρατά το hashed access token της τρέχουσας πρόσκλησης, ως προσωρινό public session. */
const INVITATION_TOKEN_COOKIE = 'invitationAccessToken';

/** Οι επιλογές του προσωρινού public session cookie της πρόσκλησης. */
const invitationCookieOptions = {
    httpOnly: true,
    secure: (process.env.TOKENHTTPS === 'false') ? false : true,
    sameSite: 'lax',
    maxAge: undefined, // Session cookie: Το cookie θα διαγραφεί όταν κλείσει ο browser.
};

/**
 * Φέρνει από τη βάση το response της πρόσκλησης (μαζί με το questionnaire και τον partner) με βάση τα params
 * του request και επαληθεύει ότι η δημόσια πρόσβαση επιτρέπεται (ενεργό/public questionnaire, ενεργός partner,
 * μη ανακλημένο token, μη κλειδωμένο response). Επιστρέφει invitation μόνο αν όλα τα παραπάνω ισχύουν, αλλιώς null,
 * χωρίς να διακρίνει τον λόγο στον καλούντα. Επιπλέον, ελέγχει αν το session cookie του browser αντιστοιχεί ήδη
 * στο accessTokenHash της πρόσκλησης. Το organizationName επιστρέφεται πάντα, ανεξάρτητα από την εγκυρότητα του invitation.
 * @returns {Promise<{invitation: object|null, validToken: boolean, organizationName: string|null}>}
 */
async function fetchAndValidateInvitation(req) {
    const { questionnaireId, responseId } = req.params;
    
    //* Έλεγχος 1: Δεν υπάρχει invitation (response)

    // Το responseId είναι UUID: αποφεύγουμε SequelizeDatabaseError για μη έγκυρη μορφή, πριν φτάσει στο query.
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidPattern.test(responseId)) {
        return { invitation: null, validToken: false, organizationName: null };
    }

    const invitation = await Models.Response.findOne({
        where: { id: responseId, questionnaireId },
        attributes: { include: ['accessTokenHash'] },
        include: [
            { model: Models.Questionnaire, as: 'questionnaire' },
            { model: Models.Partner, as: 'submittedByPartner' },
            { model: Models.Organization, as: 'organization' },
        ],
    });

    if (!invitation) {
        return { invitation: null, validToken: false, organizationName: null };
    }

    // Θα στέλνεται πάντα (ανεξαρτήτων των επόμενων ελέγχων)
    const organizationName = invitation.organization?.name ?? null;

    //* Έλεγχος 2: Η πρόσκληση δεν είναι έγκυρη
    if (invitation.lockedAt) {
        log.warn(`Άκυρη πρόσκληση: το response είναι κλειδωμένο (Response ${invitation.id})`);
    }
    if (!invitation.questionnaire?.public || !invitation.questionnaire?.active) {
        log.warn(`Άκυρη πρόσκληση: το questionnaire δεν είναι public ή active (Response ${invitation.id})`);
    }
    if (!invitation.submittedByPartner?.active) {
        log.warn(`Άκυρη πρόσκληση: ο partner δεν είναι ενεργός (Response ${invitation.id})`);
    }

    const isValid = !invitation.lockedAt
        && invitation.questionnaire?.public
        && invitation.questionnaire?.active
        && invitation.submittedByPartner?.active;

    if (!isValid) {
        return { invitation: null, validToken: false, organizationName };
    }

    //* Έλεγχος 3: Αccess token
    const validToken = !!invitation.accessTokenHash && req.cookies?.[INVITATION_TOKEN_COOKIE] === invitation.accessTokenHash;

    return { invitation, validToken, organizationName };
}

/**
 * GET /public/questionnaires/vendors/:questionnaireId/:responseId - Entry gate της πρόσκλησης.
 * Αν υπάρχει ήδη έγκυρο session cookie, προωθεί κατευθείαν στη φόρμα. Αλλιώς, εμφανίζει τη φόρμα εισαγωγής του access token.
 */
vendorsRouter.get('/:questionnaireId/:responseId', async (req, res) => {
    try {
        const { invitation, validToken, organizationName } = await fetchAndValidateInvitation(req);

        if (!invitation) {
            return res.status(404).render('errors/404', { layout: 'public', organizationName, message: 'Η πρόσκληση δεν είναι διαθέσιμη' });
        }

        if (validToken) {
            return res.redirect(`${req.baseUrl}${req.path}/form`);
        }

        res.render('public/questionnaires/gate', 
            { 
                layout: 'public', 
                organizationName 
            }
        );
    } catch (error) {
        log.error(`Σφάλμα κατά την ανάκτηση πρόσκλησης: ${error}`);
        res.status(500).render('errors/500', { layout: 'public' });
    }
});

/**
 * POST /public/questionnaires/vendors/:questionnaireId/:responseId - Επαλήθευση access token και δημιουργία public session cookie.
 */
vendorsRouter.post('/:questionnaireId/:responseId', async (req, res) => {
    try {
        const { invitation } = await fetchAndValidateInvitation(req);

        if (!invitation) {
            return res.status(404).json({ success: false, message: 'Η πρόσκληση δεν είναι διαθέσιμη' });
        }

        const { accessTokenHash } = req.body;
        if (!accessTokenHash || accessTokenHash !== invitation.accessTokenHash) {
            return res.status(401).json({ success: false, message: 'Λανθασμένο token πρόσβασης' });
        }

        res.cookie(INVITATION_TOKEN_COOKIE, accessTokenHash, invitationCookieOptions);

        res.json({ success: true });
    } catch (error) {
        log.error(`Σφάλμα κατά την επαλήθευση access token: ${error}`);
        res.status(500).json({ success: false, message: 'Σφάλμα κατά την επαλήθευση' });
    }
});

/**
 * GET /public/questionnaires/vendors/:questionnaireId/:responseId/form - Η φόρμα του ερωτηματολογίου.
 * Απαιτεί έγκυρο public session cookie, αλλιώς προωθεί πίσω στο entry gate.
 */
vendorsRouter.get('/:questionnaireId/:responseId/form', async (req, res) => {
    try {
        const { invitation, validToken, organizationName } = await fetchAndValidateInvitation(req);

        if (!invitation || !validToken) {
            return res.redirect(`${req.baseUrl}/${req.params.questionnaireId}/${req.params.responseId}`);
        }

        res.render('public/questionnaires/questionnaire', 
            { 
                layout: 'public', 
                organizationName 
            }
        );
    } catch (error) {
        log.error(`Σφάλμα κατά την ανάκτηση φόρμας: ${error}`);
        res.status(500).render('errors/500', { layout: 'public' });
    }
});

export default vendorsRouter;