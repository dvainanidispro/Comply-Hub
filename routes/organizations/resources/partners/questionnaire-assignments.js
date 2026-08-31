import express from 'express';
import Models from '../../../../models/models.js';
import log from '../../../../lib/logger.js';
import { frameworksOf } from '../../../../auth/scopes.js';

const questionnaireAssignments = express.Router({ mergeParams: true });

async function findPartner(req) {
    return Models.Partner.findOne({
        where: {
            id: parseInt(req.params.partnerId),
            organizationId: req.org,
        },
        raw: true,
    });
}

/**
 * GET /organization/resources/partners/:partnerId/questionnaire-assignments/new - Φόρμα δημιουργίας νέας πρόσκλησης
 */
questionnaireAssignments.get('/new', async (req, res) => {
    try {
        const partnerRecord = await findPartner(req);

        if (!partnerRecord) {
            return res.status(404).render('errors/404', { message: 'Ο συνεργάτης δεν βρέθηκε' });
        }

        const availableQuestionnaires = await Models.Questionnaire.findAll({
            where: {
                public: true,
                active: true,
                framework: frameworksOf(req.user),
            },
            order: [['title', 'ASC']],
            raw: true,
        });

        res.render('organizations/partners/single-assignment', {
            isNew: true,
            partnerId: partnerRecord.id,
            partnerName: partnerRecord.profile?.name,
            availableQuestionnaires,
            title: 'Νέα Πρόσκληση Συμπλήρωσης Ερωτηματολογίου',
        });
    } catch (error) {
        log.error(`Σφάλμα κατά την ανάκτηση δεδομένων για νέα πρόσκληση: ${error}`);
        res.status(500).render('errors/500', { message: 'Σφάλμα κατά την ανάκτηση δεδομένων' });
    }
});

/**
 * POST /organization/resources/partners/:partnerId/questionnaire-assignments - Δημιουργία νέας πρόσκλησης
 */
questionnaireAssignments.post('/', async (req, res) => {
    try {
        const partnerRecord = await findPartner(req);

        if (!partnerRecord) {
            return res.status(404).json({ success: false, message: 'Ο συνεργάτης δεν βρέθηκε' });
        }

        const { questionnaireId } = req.body;
        if (!questionnaireId) {
            return res.status(400).json({ success: false, message: 'Το πεδίο Ερωτηματολόγιο είναι υποχρεωτικό' });
        }

        // Επιτρέπονται μόνο public και active questionnaires των frameworks του χρήστη
        const questionnaireRecord = await Models.Questionnaire.findOne({
            where: {
                id: questionnaireId,
                public: true,
                active: true,
                framework: frameworksOf(req.user),
            },
        });

        if (!questionnaireRecord) {
            return res.status(400).json({ success: false, message: 'Μη έγκυρο ερωτηματολόγιο' });
        }

        const newResponse = await Models.Response.create({
            questionnaireId: questionnaireRecord.id,
            organizationId: req.org,
            submittedByPartnerId: partnerRecord.id,
            status: 'assigned',
        });

        log.success(`Νέα πρόσκληση συμπλήρωσης ερωτηματολογίου δημιουργήθηκε: Response ${newResponse.id} (Partner ${partnerRecord.id}, Questionnaire ${questionnaireRecord.id})`);

        res.status(201).json({ success: true, message: 'Η πρόσκληση δημιουργήθηκε επιτυχώς', responseId: newResponse.id });
    } catch (error) {
        log.error(`Σφάλμα κατά τη δημιουργία πρόσκλησης: ${error}`);
        res.status(500).json({ success: false, message: 'Σφάλμα κατά τη δημιουργία πρόσκλησης' });
    }
});

/**
 * GET /organization/resources/partners/:partnerId/questionnaire-assignments/:responseId - Διαχείριση πρόσκλησης
 */
questionnaireAssignments.get('/:responseId', async (req, res) => {
    try {
        const partnerRecord = await findPartner(req);

        if (!partnerRecord) {
            return res.status(404).render('errors/404', { message: 'Ο συνεργάτης δεν βρέθηκε' });
        }

        const assignment = await Models.Response.findOne({
            where: {
                id: req.params.responseId,
                organizationId: req.org,
                submittedByPartnerId: partnerRecord.id,
            },
            include: [{ model: Models.Questionnaire, as: 'questionnaire' }],
        });

        if (!assignment) {
            return res.status(404).render('errors/404', { message: 'Η πρόσκληση δεν βρέθηκε' });
        }

        res.render('organizations/partners/single-assignment', {
            isNew: false,
            partnerId: partnerRecord.id,
            partnerName: partnerRecord.profile?.name,
            assignment,
            title: 'Διαχείριση Πρόσκλησης Συμπλήρωσης Ερωτηματολογίου',
        });
    } catch (error) {
        log.error(`Σφάλμα κατά την ανάκτηση πρόσκλησης: ${error}`);
        res.status(500).render('errors/500', { message: 'Σφάλμα κατά την ανάκτηση πρόσκλησης' });
    }
});

export default questionnaireAssignments;
