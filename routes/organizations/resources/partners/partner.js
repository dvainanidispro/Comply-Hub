import express from 'express';
import { ForeignKeyConstraintError } from 'sequelize';
import Models from '../../../../models/models.js';
import log from '../../../../lib/logger.js';
import questionnaireAssignmentsRouter from './questionnaire-assignments.js';

const partner = express.Router({ mergeParams: true });

partner.use('/questionnaire-assignments', questionnaireAssignmentsRouter);

async function findPartner(req, raw = false) {
    return Models.Partner.findOne({
        where: {
            id: parseInt(req.params.partnerId),
            organizationId: req.org,
        },
        raw,
    });
}

/**
 * GET /organization/resources/partners/:partnerId - Κεντρική σελίδα διαχείρισης συνεργάτη
 */
partner.get('/', async (req, res) => {
    try {
        const partnerRecord = await findPartner(req, true);

        if (!partnerRecord) {
            return res.status(404).render('errors/404', { message: 'Ο συνεργάτης δεν βρέθηκε' });
        }

        const assignments = await Models.Response.findAll({
            where: { submittedByPartnerId: partnerRecord.id },
            include: [{ model: Models.Questionnaire, as: 'questionnaire' }],
            order: [['createdAt', 'DESC']],
        });

        res.render('organizations/partners/manage-partner', {
            partnerDetails: {
                id: partnerRecord.id,
                active: partnerRecord.active,
                ...partnerRecord.profile,
            },
            assignments,
            title: `Διαχείριση Συνεργάτη: ${partnerRecord.profile?.name || ''}`,
        });
    } catch (error) {
        log.error(`Σφάλμα κατά την ανάκτηση συνεργάτη: ${error}`);
        res.status(500).render('errors/500', { message: 'Σφάλμα κατά την ανάκτηση συνεργάτη' });
    }
});

/**
 * GET /organization/resources/partners/:partnerId/edit - Φόρμα επεξεργασίας συνεργάτη
 */
partner.get('/edit', async (req, res) => {
    try {
        const partnerRecord = await findPartner(req, true);

        if (!partnerRecord) {
            return res.status(404).render('errors/404', { message: 'Ο συνεργάτης δεν βρέθηκε' });
        }

        res.render('organizations/partners/single-partner', {
            isNew: false,
            partnerDetails: {
                id: partnerRecord.id,
                uuid: partnerRecord.uuid,
                active: partnerRecord.active,
                ...partnerRecord.profile,
            },
            title: `Επεξεργασία Συνεργάτη: ${partnerRecord.profile?.name || ''}`,
        });
    } catch (error) {
        log.error(`Σφάλμα κατά την ανάκτηση συνεργάτη: ${error}`);
        res.status(500).render('errors/500', { message: 'Σφάλμα κατά την ανάκτηση συνεργάτη' });
    }
});

/**
 * PUT /organization/resources/partners/:partnerId - Ενημέρωση στοιχείων συνεργάτη
 */
partner.put('/', async (req, res) => {
    try {
        const { name, email, taxId, address, phone, active } = req.body;
        const partnerRecord = await findPartner(req);

        if (!partnerRecord) {
            return res.status(404).json({ success: false, message: 'Ο συνεργάτης δεν βρέθηκε' });
        }

        await partnerRecord.update({
            profile: { name, email, taxId, address, phone },
            active: active === 'true' || active === true,
        });

        log.success(`Ο συνεργάτης ενημερώθηκε: ${name} (ID: ${partnerRecord.id})`);

        res.json({ success: true, message: 'Ο συνεργάτης ενημερώθηκε επιτυχώς' });
    } catch (error) {
        log.error(`Σφάλμα κατά την ενημέρωση συνεργάτη: ${error}`);
        res.status(500).json({ success: false, message: 'Σφάλμα κατά την ενημέρωση συνεργάτη' });
    }
});

/**
 * DELETE /organization/resources/partners/:partnerId - Διαγραφή συνεργάτη
 */
partner.delete('/', async (req, res) => {
    try {
        const partnerRecord = await findPartner(req);

        if (!partnerRecord) {
            return res.status(404).json({ success: false, message: 'Ο συνεργάτης δεν βρέθηκε' });
        }

        await partnerRecord.destroy();

        log.success(`Συνεργάτης διαγράφηκε: ID ${partnerRecord.id}`);

        res.json({ success: true, message: 'Ο συνεργάτης διαγράφηκε επιτυχώς' });
    } catch (error) {
        if (error instanceof ForeignKeyConstraintError) {
            return res.status(400).json({ success: false, message: 'Είναι αδύνατη η διαγραφή του συνεργάτη διότι συνδέεται με άλλες εγγραφές. Παρακαλώ, απενεργοποιήστε τον συνεργάτη.' });
        }
        log.error(`Σφάλμα κατά τη διαγραφή συνεργάτη: ${error}`);
        res.status(500).json({ success: false, message: 'Σφάλμα κατά τη διαγραφή συνεργάτη' });
    }
});

export default partner;
