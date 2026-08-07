/**
 * Factory Pattern για τη διαχείριση του ερωτηματολογίου αυτοαξιολόγησης ανά Framework, στην πλευρά του οργανισμού.
 *
 * Χρήση:
 *   import { selfAssessmentRouter } from './modules/self-assessment.js';
 *   nis2.use('/self-assessment', selfAssessmentRouter('NIS2', 'NIS2 - Εργαλείο Αυτοαξιολόγησης'));
 */

import express from 'express';
import Models from '../../../models/models.js';
import log from '../../../lib/logger.js';
import Questionnaire from '../../../lib/questionnaire.js';
import { can } from '../../../auth/roles.js';

const codes = {
    'NIS2': 'cybersecurity-self-assessment',
    'GDPR': 'gdpr-self-assessment',
};

/**
 * Φέρνει τον ορισμό του ερωτηματολογίου (θεωρείται ότι υπάρχει πάντα) μαζί με το
 * τυχόν response του οργανισμού, με ένα μόνο query (μέσω του association).
 * @param {string} framework
 * @param {string} code
 * @param {number} organizationId
 * @returns {Promise<{questionnaire: object, response: object|null}>}
 */
async function fetchQuestionnaireWithResponse(framework, code, organizationId) {
    //TODO: Ο πίνακας questionnaire να μπει στην cache
    const questionnaire = await Models.Questionnaire.findOne({
        where: {
            definedBy: 'system',
            framework,
            code,
        },
        include: [{
            model: Models.Response,
            as: 'responses',
            where: { organizationId },
            required: false,
        }],
    });

    return { questionnaire, response: questionnaire.responses[0] || null };
}

/**
 * Δημιουργεί router για τη συμπλήρωση του ερωτηματολογίου αυτοαξιολόγησης ενός συγκεκριμένου framework από τον οργανισμό.
 * @param {string} framework - Το αναγνωριστικό του framework (π.χ. 'NIS2', 'GDPR').
 * @param {string} title - Τίτλος για το view.
 * @returns {express.Router}
 */
export function selfAssessmentRouter(framework, title) {
    const router = express.Router();
    const code = codes[framework];

    /* GET / - Ενδιάμεση οθόνη επισκόπησης (κατάσταση + αποτελέσματα)
     * GET /form, /fill - Φόρμα συμπλήρωσης του ερωτηματολογίου αυτοαξιολόγησης */
    router.get(['/', '/form', '/fill'], async (req, res) => {
        try {
            const { questionnaire, response } = await fetchQuestionnaireWithResponse(framework, code, req.org);
            const view = (req.path === '/') ? 'sa-overview' : 'sa-form';

            res.render(`organizations/self-assessment/${view}`, {
                title,
                framework,
                code,
                questionnaire: response?.questionnaireSnapshot?.status === 'submitted'
                    ? response.questionnaireSnapshot
                    : questionnaire,
                response,
                formUrl: `${req.baseUrl}/form`,
            });
        } catch (error) {
            log.error(`Error fetching self-assessment questionnaire for framework ${framework}: ${error.message}`);
            res.status(500).render('errors/500');
        }
    });

    /* POST /save, /submit - Προσωρινή αποθήκευση ή οριστική υποβολή του response */
    router.post(['/save', '/submit'], async (req, res) => {
        try {
            const action = (req.path === '/submit') ? 'submit' : (req.path === '/save') ? 'save' : '';

            //#1 Συλλογή δεδομένων
            const { questionnaire, response: existingResponse } = await fetchQuestionnaireWithResponse(framework, code, req.org);

            const { data, questionnaireSnapshot } = req.body;

            //#2 Επαλήθευση των απαντήσεων πάνω στον πραγματικό ορισμό του ερωτηματολογίου.
            const q = new Questionnaire(questionnaire.definition, { templates: questionnaire.answers });
            const validationResponse = q.createResponse(data);

            if (action === 'submit' && !validationResponse.status.isValidated()) {
                return res.json({ success: false, message: 'Το ερωτηματολόγιο δεν έχει συμπληρωθεί πλήρως ή σωστά για οριστική υποβολή.' });
            }
            if (action === 'save' && !validationResponse.status.isPartiallyValidated()) {
                return res.json({ success: false, message: 'Οι απαντήσεις περιέχουν μη έγκυρες τιμές.' });
            }

            //#3 Αποθήκευση ή υποβολή του response
            const response = existingResponse || Models.Response.build({
                organizationId: req.org,
                questionnaireId: questionnaire.id,
            });

            response.data = data;
            response.questionnaireSnapshot = questionnaireSnapshot;
            if (action === 'submit') {
                response.status = 'submitted';
                response.submittedAt = new Date();
                response.submittedByUserId = req.user.id;
            } else if (action === 'save') {
                response.status = 'draft';
            }
            await response.save();

            //#4 Επιστροφή επιτυχούς αποτελέσματος
            res.json({
                success: true,
                message: (action === 'submit') ? 'Το ερωτηματολόγιο υποβλήθηκε επιτυχώς.' : 
                         (action === 'save') ? 'Η πρόοδος αποθηκεύτηκε επιτυχώς.' : '',
            });
        } catch (error) {
            log.error(`Error saving self-assessment response for framework ${framework}: ${error.message}`);
            res.json({ success: false, message: 'Σφάλμα κατά την αποθήκευση του ερωτηματολογίου.' });
        }
    });

    /* POST /approve - Έγκριση του υποβεβλημένου response */
    router.post('/approve', async (req, res) => {
        try {
            const { response } = await fetchQuestionnaireWithResponse(framework, code, req.org);

            if (!response) {
                return res.json({ success: false, message: 'Δεν βρέθηκε απαντημένο ερωτηματολόγιο προς έγκριση.' });
            }
            if (response.status !== 'submitted') {
                return res.json({ success: false, message: 'Το response δεν έχει υποβληθεί οριστικά ακόμα.' });
            }

            response.approvedAt = new Date();
            response.approvedBy = req.user.id;
            await response.save();

            res.json({ success: true, message: 'Το ερωτηματολόγιο εγκρίθηκε επιτυχώς.' });
        } catch (error) {
            log.error(`Error approving self-assessment response for framework ${framework}: ${error.message}`);
            res.json({ success: false, message: 'Σφάλμα κατά την έγκριση του ερωτηματολογίου.' });
        }
    });

    return router;
}
