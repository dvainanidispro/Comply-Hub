import express from 'express';
import { ForeignKeyConstraintError } from 'sequelize';
import Models from '../../../models/models.js';
import log from '../../../lib/logger.js';

const partners = express.Router();

/**
 * GET /organization/resources/partners - Λίστα συνεργατών του οργανισμού
 */
partners.get('/', async (req, res) => {
    try {
        const partnersList = await Models.Partner.findAll({
            where: { organizationId: req.org },
            order: [['createdAt', 'ASC']],
        });

        res.render('organizations/partners/partners', {
            partners: partnersList,
            title: 'Συνεργάτες',
        });
    } catch (error) {
        log.error(`Σφάλμα κατά την ανάκτηση συνεργατών: ${error}`);
        res.status(500).render('errors/500', { message: 'Σφάλμα κατά την ανάκτηση συνεργατών' });
    }
});

/**
 * GET /organization/resources/partners/new - Φόρμα δημιουργίας νέου συνεργάτη
 */
partners.get('/new', (req, res) => {
    res.render('organizations/partners/single-partner', {
        isNew: true,
        partnerDetails: {},
        title: 'Νέος Συνεργάτης',
    });
});

/**
 * GET /organization/resources/partners/:id - Εμφάνιση στοιχείων συγκεκριμένου συνεργάτη
 */
partners.get('/:id', async (req, res) => {
    try {
        const partnerId = parseInt(req.params.id);
        const partner = await Models.Partner.findOne({
            where: { id: partnerId, organizationId: req.org },
            raw: true,
        });

        if (!partner) {
            return res.status(404).render('errors/404', { message: 'Ο συνεργάτης δεν βρέθηκε' });
        }

        res.render('organizations/partners/single-partner', {
            isNew: false,
            partnerDetails: { id: partner.id, uuid: partner.uuid, active: partner.active, ...partner.profile },
            title: `Επεξεργασία Συνεργάτη: ${partner.profile?.name || ''}`,
        });
    } catch (error) {
        log.error(`Σφάλμα κατά την ανάκτηση συνεργάτη: ${error}`);
        res.status(500).render('errors/500', { message: 'Σφάλμα κατά την ανάκτηση συνεργάτη' });
    }
});

/**
 * POST /organization/resources/partners - Δημιουργία νέου συνεργάτη
 */
partners.post('/', async (req, res) => {
    try {
        const { name, email, taxId, address, phone, active } = req.body;

        if (!name) {
            return res.status(400).json({ success: false, message: 'Το πεδίο Όνομα είναι υποχρεωτικό' });
        }

        const newPartner = await Models.Partner.create({
            organizationId: req.org,
            profile: { name, email, taxId, address, phone },
            active: active !== 'false' && active !== false,
        });

        log.success(`Νέος συνεργάτης δημιουργήθηκε: ${name} (ID: ${newPartner.id})`);

        res.status(201).json({ success: true, message: 'Ο συνεργάτης δημιουργήθηκε επιτυχώς' });
    } catch (error) {
        log.error(`Σφάλμα κατά τη δημιουργία συνεργάτη: ${error}`);
        res.status(500).json({ success: false, message: 'Σφάλμα κατά τη δημιουργία συνεργάτη' });
    }
});

/**
 * PUT /organization/resources/partners/:id - Ενημέρωση στοιχείων συνεργάτη
 */
partners.put('/:id', async (req, res) => {
    try {
        const partnerId = parseInt(req.params.id);
        const { name, email, taxId, address, phone, active } = req.body;

        const partner = await Models.Partner.findOne({ where: { id: partnerId, organizationId: req.org } });
        if (!partner) {
            return res.status(404).json({ success: false, message: 'Ο συνεργάτης δεν βρέθηκε' });
        }

        await partner.update({
            profile: { name, email, taxId, address, phone },
            active: active === 'true' || active === true,
        });

        log.success(`Ο συνεργάτης ενημερώθηκε: ${name} (ID: ${partner.id})`);

        res.json({ success: true, message: 'Ο συνεργάτης ενημερώθηκε επιτυχώς' });
    } catch (error) {
        log.error(`Σφάλμα κατά την ενημέρωση συνεργάτη: ${error}`);
        res.status(500).json({ success: false, message: 'Σφάλμα κατά την ενημέρωση συνεργάτη' });
    }
});

/**
 * DELETE /organization/resources/partners/:id - Διαγραφή συνεργάτη
 */
partners.delete('/:id', async (req, res) => {
    try {
        const partnerId = parseInt(req.params.id);

        const partner = await Models.Partner.findOne({ where: { id: partnerId, organizationId: req.org } });
        if (!partner) {
            return res.status(404).json({ success: false, message: 'Ο συνεργάτης δεν βρέθηκε' });
        }

        await partner.destroy();

        log.success(`Συνεργάτης διαγράφηκε: ID ${partner.id}`);

        res.json({ success: true, message: 'Ο συνεργάτης διαγράφηκε επιτυχώς' });
    } catch (error) {
        if (error instanceof ForeignKeyConstraintError) {
            return res.status(400).json({ success: false, message: 'Είναι αδύνατη η διαγραφή του συνεργάτη διότι συνδέεται με άλλες εγγραφές. Παρακαλώ, απενεργοποιήστε τον συνεργάτη.' });
        }
        log.error(`Σφάλμα κατά τη διαγραφή συνεργάτη: ${error}`);
        res.status(500).json({ success: false, message: 'Σφάλμα κατά τη διαγραφή συνεργάτη' });
    }
});

export default partners;
