/**
 * Γενική διαχείριση system questionnaires ανά framework.
 *
 */

import express from 'express';
import { UniqueConstraintError } from 'sequelize';

import Models from '../../../../models/models.js';
import log from '../../../../lib/logger.js';
import Questionnaire from '../../../../lib/questionnaire.js';

async function fetchQuestionnaire(framework, id) {
    return Models.Questionnaire.findOne({
        where: {
            id,
            // definedBy: 'system',
            framework,
        },
    });
}

/**
 * Δημιουργεί router για διαχείριση των system questionnaires ενός framework.
 * @param {string} framework - Το αναγνωριστικό του framework (π.χ. 'NIS2', 'GDPR').
 * @param {string} label - Τίτλος για τα views.
 * @returns {express.Router}
 */
export function manageQuestionnairesRouter(framework, label) {
    const questionnaires = express.Router();

    /* GET / - Λίστα ερωτηματολογίων του framework */
    questionnaires.get('/', async (req, res) => {
        try {
            const items = await Models.Questionnaire.findAll({
                where: {
                    // definedBy: 'system',
                    framework,
                },
                order: [['title', 'ASC']],
                raw: true,
            });

            res.render('frameworks/questionnaires/questionnaires', {
                questionnaires: items,
                framework,
                title: label,
                baseUrl: req.baseUrl,
            });
        } catch (error) {
            log.error(`${framework} questionnaires GET error: ${error}`);
            res.status(500).render('errors/500');
        }
    });

    /* POST / - Δημιουργία νέου ερωτηματολογίου */
    questionnaires.post('/', async (req, res) => {
        try {
            const { code, title } = req.body;

            await Models.Questionnaire.create({
                definedBy: 'central',
                framework,
                organizationId: null,
                code,
                public: false,
                active: false,
                title,
                definition: {
                    code,
                    title,
                    description: '',
                    content: [],
                },
            });

            res.json({ success: true, message: 'Το ερωτηματολόγιο δημιουργήθηκε επιτυχώς.' });
        } catch (error) {
            if (error instanceof UniqueConstraintError || error.name === 'SequelizeUniqueConstraintError') {
                return res.status(400).json({ success: false, message: 'Υπάρχει ήδη ερωτηματολόγιο με τον ίδιο κωδικό.' });
            }

            log.error(`${framework} questionnaire POST error: ${error}`);
            res.status(500).json({ success: false, message: 'Σφάλμα κατά τη δημιουργία του ερωτηματολογίου.' });
        }
    });

    /* GET /:id - Φόρμα επεξεργασίας ερωτηματολογίου */
    questionnaires.get('/:id', async (req, res) => {
        try {
            const questionnaire = await fetchQuestionnaire(framework, req.params.id);
            if (!questionnaire) {
                return res.status(404).render('errors/404');
            }

            res.render('frameworks/questionnaires/questionnaire-form', {
                framework,
                title: `${label} - ${questionnaire.title}`,
                baseUrl: req.baseUrl,
                code: questionnaire.code,
                questionnaire,
            });
        } catch (error) {
            log.error(`${framework} questionnaire GET ${req.params.id} error: ${error}`);
            res.status(500).render('errors/500');
        }
    });

    /* GET /:id/preview - Προεπισκόπηση ερωτηματολογίου */
    questionnaires.get(['/:id/preview', '/:id/preview/public', '/:id/preview/private'], async (req, res) => {
        try {
            const questionnaire = await fetchQuestionnaire(framework, req.params.id);
            if (!questionnaire) {
                return res.status(404).render('errors/404');
            }

            const isPublicPreview = !req.path.includes('/preview/private');
            const previewQuestionnaire = questionnaire.get({ plain: true });

            if (isPublicPreview) {
                const { filteredSectionsArray } = Questionnaire.filterOutPrivate(
                    previewQuestionnaire.definition.content,
                    {},
                );
                previewQuestionnaire.definition = {
                    ...previewQuestionnaire.definition,
                    content: filteredSectionsArray,
                };
            }

            const view = isPublicPreview ? 'organizations/vendor-forms/va-form-public' : 'organizations/vendor-forms/va-form-private';

            res.render(view, {
                framework,
                title: `${label} - ${questionnaire.title}`,
                code: questionnaire.code,
                questionnaire: previewQuestionnaire,
                preview: true,
                response: null,
                formUrl: null,
            });
        } catch (error) {
            log.error(`${framework} questionnaire preview ${req.params.id} error: ${error}`);
            res.status(500).render('errors/500');
        }
    });

    /* PUT /:id - Ενημέρωση ερωτηματολογίου */
    questionnaires.put('/:id', async (req, res) => {
        try {
            const questionnaire = await fetchQuestionnaire(framework, req.params.id);
            if (!questionnaire) {
                return res.status(404).json({ success: false, message: 'Δεν βρέθηκε το ερωτηματολόγιο προς ενημέρωση.' });
            }

            const { code, title, public: isPublic, active, description, content, answers, actions } = req.body;
            // Το code να μην ενημερώνεται αν το ερωτηματολόγιο είναι system-defined.
            const questionnaireCode = questionnaire.definedBy === 'system' ? questionnaire.code : code;
            let parsedSections;
            let parsedAnswers;
            let parsedActions;

            try {
                parsedSections = content ? JSON.parse(content) : [];
                parsedAnswers = answers ? JSON.parse(answers) : null;
                parsedActions = actions ? JSON.parse(actions) : undefined;
            } catch {
                return res.status(400).json({ success: false, message: 'Μη έγκυρη μορφή JSON στις ενότητες, τις απαντήσεις ή τις ενέργειες.' });
            }

            const definition = {
                code: questionnaireCode,
                title,
                description: description || '',
                actions: parsedActions,
                content: parsedSections,
            };

            await questionnaire.update({
                code: questionnaireCode,
                title,
                public: isPublic === 'true' || isPublic === true,
                active: active === undefined ? true : (active === 'true' || active === true),
                definition,
                answers: parsedAnswers,
            });

            res.json({ success: true, message: 'Το ερωτηματολόγιο ενημερώθηκε επιτυχώς.' });
        } catch (error) {
            log.error(`${framework} questionnaire PUT ${req.params.id} error: ${error}`);
            res.status(500).json({ success: false, message: 'Σφάλμα κατά την ενημέρωση του ερωτηματολογίου.' });
        }
    });

    /* DELETE /:id - Διαγραφή ερωτηματολογίου */
    questionnaires.delete('/:id', async (req, res) => {
        try {
            const questionnaire = await fetchQuestionnaire(framework, req.params.id);
            if (!questionnaire) {
                return res.status(404).json({ success: false, message: 'Δεν βρέθηκε το ερωτηματολόγιο προς διαγραφή.' });
            }

            await questionnaire.destroy();
            res.json({ success: true, message: 'Το ερωτηματολόγιο διαγράφηκε επιτυχώς.' });
        } catch (error) {
            log.error(`${framework} questionnaire DELETE ${req.params.id} error: ${error}`);
            res.status(500).json({ success: false, message: 'Σφάλμα κατά τη διαγραφή του ερωτηματολογίου.' });
        }
    });

    return questionnaires;
}