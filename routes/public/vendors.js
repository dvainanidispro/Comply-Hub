import express from 'express';
import Models from '../../models/models.js';
import log from '../../lib/logger.js';
import Questionnaire from '../../lib/questionnaire.js';

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
 * Επιστρέφει το data του public response αφού αφαιρέσει private και άγνωστες απαντήσεις.
 * Το questionnaire code προέρχεται πάντα από τον πραγματικό ορισμό και όχι από το request.
 */
function buildPublicResponseData(questionnaire, submittedAnswers) {
    const { filteredSectionsArray, filteredAnswersObj } = Questionnaire.filterOutPrivate(
        questionnaire.definition.content,
        submittedAnswers,
    );
    const publicDefinition = {
        ...questionnaire.definition,
        content: filteredSectionsArray,
    };
    const publicQuestionnaire = new Questionnaire(publicDefinition, { templates: questionnaire.answers });
    const publicResponse = publicQuestionnaire.createResponse({
        questionnaire: questionnaire.definition.code,
        answers: filteredAnswersObj,
    });

    return { publicResponse, filteredSectionsArray };
}

/** Δημιουργεί το πλήρες questionnaire snapshot που αποθηκεύεται μόνο κατά την οριστική υποβολή. */
function buildQuestionnaireSnapshot(questionnaire) {
    return {
        id: questionnaire.id,
        definedBy: questionnaire.definedBy,
        framework: questionnaire.framework,
        organizationId: questionnaire.organizationId,
        code: questionnaire.code,
        public: questionnaire.public,
        active: questionnaire.active,
        title: questionnaire.title,
        definition: questionnaire.definition,
        answers: questionnaire.answers,
    };
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

        // Τα assigned/draft ακολουθούν τον τρέχοντα ορισμό. Μετά την υποβολή χρησιμοποιούμε το snapshot, αν υπάρχει.
        const questionnaire = invitation.status === 'submitted' && invitation.questionnaireSnapshot
            ? invitation.questionnaireSnapshot
            : invitation.questionnaire;
        const { definition } = questionnaire;
        const { filteredSectionsArray, filteredAnswersObj } = Questionnaire.filterOutPrivate(
            definition.content,
            invitation.publicAnswers ?? invitation.data?.answers ?? {},
        );

        // Στέλνουμε μόνο τα πεδία της φόρμας, χωρίς το πλήρες invitation ή το αφιλτράριστο virtual content του model.
        const publicQuestionnaire = {
            id: questionnaire.id,
            code: questionnaire.code,
            title: questionnaire.title,
            definition: {
                code: definition.code,
                title: definition.title,
                description: definition.description,
                actions: definition.actions,
                content: filteredSectionsArray,
            },
            answers: questionnaire.answers,
        };

        res.render('public/questionnaires/questionnaire', {
            layout: 'public',
            organizationName,
            title: publicQuestionnaire.title,
            questionnaire: publicQuestionnaire,
            response: {
                status: invitation.status,
                data: {
                    questionnaire: definition.code,
                    answers: filteredAnswersObj,
                },
            },
            baseUrl: `${req.baseUrl}/${req.params.questionnaireId}/${req.params.responseId}`,
        });
    } catch (error) {
        log.error(`Σφάλμα κατά την ανάκτηση φόρμας: ${error}`);
        res.status(500).render('errors/500', { layout: 'public' });
    }
});

/**
 * POST /public/questionnaires/vendors/:questionnaireId/:responseId/save
 * POST /public/questionnaires/vendors/:questionnaireId/:responseId/submit
 * Αποθηκεύει public draft ή κάνει οριστική υποβολή, πάντα πάνω στον τρέχοντα ορισμό της βάσης.
 */
vendorsRouter.post([
    '/:questionnaireId/:responseId/save',
    '/:questionnaireId/:responseId/submit',
], async (req, res) => {
    try {
        const { invitation, validToken } = await fetchAndValidateInvitation(req);

        //# Έλεγχοι

        if (!invitation) {
            return res.status(404).json({ success: false, message: 'Η πρόσκληση δεν είναι διαθέσιμη' });
        }
        if (!validToken) {
            return res.status(401).json({
                success: false,
                event: 'public-session-expired',
                message: 'Η πρόσβαση στην πρόσκληση έχει λήξει',
            });
        }

        const submittedAnswers = req.body?.data?.answers;
        if (!submittedAnswers || typeof submittedAnswers !== 'object' || Array.isArray(submittedAnswers)) {
            return res.status(400).json({ success: false, message: 'Μη έγκυρα δεδομένα απαντήσεων' });
        }

        const { publicResponse } = buildPublicResponseData(invitation.questionnaire, submittedAnswers);
        const isSubmit = req.path.endsWith('/submit');

        // Αν submit:
        if (isSubmit && !publicResponse.status.isValidated()) {
            return res.status(400).json({
                success: false,
                message: 'Το ερωτηματολόγιο δεν έχει συμπληρωθεί πλήρως ή σωστά για οριστική υποβολή.',
            });
        }
        // Αν draft:
        if (!isSubmit && !publicResponse.status.isPartiallyValidated()) {
            return res.status(400).json({ success: false, message: 'Οι απαντήσεις περιέχουν μη έγκυρες τιμές.' });
        }

        //# Προετοιμασία δεδομένων και αποθήκευση

        const validatedData = publicResponse.toJSON();

        // Οι public απαντήσεις διατηρούνται ξεχωριστά από το editable data του οργανισμού.
        invitation.publicAnswers = validatedData.answers;

        // Διατηρούνται οι private απαντήσεις και συγχωνεύονται με τις νέες validated απαντήσεις
        invitation.data = {
            questionnaire: invitation.questionnaire.definition.code,
            answers: {
                ...invitation.data?.answers,  // παλιές αποθηκευμένες απαντήσεις
                ...validatedData.answers,   // νέες απαντήσεις - με προτεραιότητα
            },
        };
        invitation.status = isSubmit ? 'submitted' : 'draft';

        if (isSubmit) {
            invitation.submittedAt = new Date();
            invitation.questionnaireSnapshot = buildQuestionnaireSnapshot(invitation.questionnaire);
        }

        await invitation.save();

        log.success(
            isSubmit
                ? `Η πρόσκληση υποβλήθηκε οριστικά: Response ${invitation.id} (Partner ${invitation.submittedByPartnerId})`
                : `Αποθηκεύτηκε draft της πρόσκλησης: Response ${invitation.id} (Partner ${invitation.submittedByPartnerId})`,
        );

        res.json({
            success: true,
            message: isSubmit
                ? 'Το ερωτηματολόγιο υποβλήθηκε επιτυχώς.'
                : 'Η πρόοδος αποθηκεύτηκε επιτυχώς.',
        });
    } catch (error) {
        log.error(`Σφάλμα κατά την αποθήκευση public questionnaire response: ${error}`);
        res.status(500).json({ success: false, message: 'Σφάλμα κατά την αποθήκευση του ερωτηματολογίου' });
    }
});

export default vendorsRouter;
