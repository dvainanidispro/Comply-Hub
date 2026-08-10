/**
 * Factory Pattern για τη διαχείριση του ερωτηματολογίου αυτοαξιολόγησης ανά Framework.
 *
 * Χρήση:
 *   import { manageSelfAssessmentRouter } from './self-assessment.js';
 *   router.use('/self-assessment', manageSelfAssessmentRouter('NIS2', 'NIS2 - Ερωτηματολόγιο αυτοαξιολόγησης'));
 */

import express from 'express';

import Models from '../../../models/models.js';
import log from '../../../lib/logger.js';

const codes = {
    'NIS2': 'cybersecurity-self-assessment',
    'GDPR': 'gdpr-self-assessment',
};

async function fetchQuestionnaire(framework, code) {
    return Models.Questionnaire.findOne({
        where: {
            definedBy: 'system',
            framework,
            code,
        },
    });
}


/**
 * Δημιουργεί router για διαχείριση του ερωτηματολογίου αυτοαξιολόγησης ενός συγκεκριμένου framework.
 * @param {string} framework - Το αναγνωριστικό του framework (π.χ. 'NIS2', 'GDPR').
 * @param {string} label - Τίτλος για το view.
 * @returns {express.Router}
 */
export function manageSelfAssessmentRouter(framework, label) {
    const selfAssessment = express.Router();
    const code = codes[framework];

    /* GET / - Φόρμα ορισμού του ερωτηματολογίου αυτοαξιολόγησης */
    selfAssessment.get('/', async (req, res) => {
        try {
            const questionnaire = await fetchQuestionnaire(framework, code);

            // log.dev(questionnaire);

            res.render('frameworks/questionnaire', {
                framework,
                title: label,
                baseUrl: req.baseUrl,
                code,
                questionnaire,
            });
        } catch (error) {
            log.error(`Error fetching self-assessment questionnaire for framework ${framework}: ${error.message}`);
            res.status(500).render('errors/500');
        }
    });


    /* GET /preview - Φόρμα προεπισκόπησης του ερωτηματολογίου αυτοαξιολόγησης */
    selfAssessment.get('/preview', async (req, res) => {
        try {
            const questionnaire = await fetchQuestionnaire(framework, code);

            // log.dev(questionnaire);

            res.render('organizations/self-assessment/sa-form', {
                framework,
                title: label,
                code,
                questionnaire,
                preview: true,
                response: null,
                formUrl: null,
            });
        } catch (error) {
            log.error(`Error fetching self-assessment questionnaire for framework ${framework}: ${error.message}`);
            res.status(500).render('errors/500');
        }
    });



    /* POST / - Ενημέρωση-Αποθήκευση του ερωτηματολογίου αυτοαξιολόγησης */
    selfAssessment.post('/', async (req, res) => {
        try {
            const { title, public: isPublic, active, description, content, answers, actions } = req.body;

            let parsedSections;
            let parsedAnswers;
            let parsedActions;
            try {
                parsedSections = content ? JSON.parse(content) : [];
                parsedAnswers = answers ? JSON.parse(answers) : null;
                parsedActions = actions ? JSON.parse(actions) : undefined;
            } catch {
                return res.json({ success: false, message: 'Μη έγκυρη μορφή JSON στις ενότητες, τις απαντήσεις ή τις ενέργειες.' });
            }

            const definition = {
                code,
                title,
                description: description || '',
                actions: parsedActions,
                content: parsedSections,
            };

            const [affected] = await Models.Questionnaire.update({
                title,
                public: isPublic === 'true' || isPublic === true,
                active: active === undefined ? true : (active === 'true' || active === true),
                definition,
                answers: parsedAnswers,
            }, {
                where: {
                    definedBy: 'system',
                    framework,
                    code,
                },
            });

            if (!affected) {
                return res.json({ success: false, message: 'Δεν βρέθηκε το ερωτηματολόγιο προς ενημέρωση.' });
            }

            res.json({ success: true, message: 'Το ερωτηματολόγιο ενημερώθηκε επιτυχώς.' });
        } catch (error) {
            log.error(`Error updating self-assessment questionnaire for framework ${framework}: ${error.message}`);
            res.json({ success: false, message: 'Σφάλμα κατά την ενημέρωση του ερωτηματολογίου.' });
        }
    });

    return selfAssessment;
}

