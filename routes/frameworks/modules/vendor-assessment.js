/**
 * Factory Pattern για τη διαχείριση του ερωτηματολογίου αξιολόγησης εξωτερικών συνεργατών ανά Framework.
 *
 * Χρήση:
 *   import { manageVendorAssessmentRouter } from './vendor-assessment.js';
 *   router.use('/vendor-assessment', manageVendorAssessmentRouter('GDPR', 'Αξιολόγηση Εξωτερικών Συνεργατών'));
 */

import express from 'express';

import Models from '../../../models/models.js';
import log from '../../../lib/logger.js';

const codes = {
    'NIS2': 'nis2-vendor-assessment',
    'GDPR': 'gdpr-vendor-assessment',
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
 * Δημιουργεί router για διαχείριση του ερωτηματολογίου αξιολόγησης εξωτερικών συνεργατών ενός συγκεκριμένου framework.
 * @param {string} framework - Το αναγνωριστικό του framework (π.χ. 'NIS2', 'GDPR').
 * @param {string} label - Τίτλος για το view.
 * @returns {express.Router}
 */
export function manageVendorAssessmentRouter(framework, label) {
    const vendorAssessment = express.Router();
    const code = codes[framework];

    /* GET / - Φόρμα ορισμού του ερωτηματολογίου αξιολόγησης εξωτερικών συνεργατών */
    vendorAssessment.get('/', async (req, res) => {
        try {
            const questionnaire = await fetchQuestionnaire(framework, code);

            res.render('frameworks/questionnaire', {
                framework,
                title: `${framework} - ${label}`,
                baseUrl: req.baseUrl,
                code,
                questionnaire,
            });
        } catch (error) {
            log.error(`Error fetching vendor-assessment questionnaire for framework ${framework}: ${error.message}`);
            res.status(500).render('errors/500');
        }
    });

    /* GET /preview - Φόρμα προεπισκόπησης του ερωτηματολογίου αξιολόγησης εξωτερικών συνεργατών */
    vendorAssessment.get('/preview', async (req, res) => {
        try {
            const questionnaire = await fetchQuestionnaire(framework, code);

            res.render('organizations/self-assessment/sa-form', {
                framework,
                title: `${framework} - ${label}`,
                code,
                questionnaire,
                preview: true,
                response: null,
                formUrl: null,
            });
        } catch (error) {
            log.error(`Error fetching vendor-assessment questionnaire for framework ${framework}: ${error.message}`);
            res.status(500).render('errors/500');
        }
    });

    /* POST / - Ενημέρωση-Αποθήκευση του ερωτηματολογίου αξιολόγησης εξωτερικών συνεργατών */
    vendorAssessment.post('/', async (req, res) => {
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
            log.error(`Error updating vendor-assessment questionnaire for framework ${framework}: ${error.message}`);
            res.json({ success: false, message: 'Σφάλμα κατά την ενημέρωση του ερωτηματολογίου.' });
        }
    });

    return vendorAssessment;
}