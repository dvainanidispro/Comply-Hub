import express from 'express';
import Models from '../../../models/models.js';
import log from '../../../lib/logger.js';
import partnerRouter from './partners/partner.js';

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

partners.use('/:partnerId', partnerRouter);

export default partners;
