import express from 'express';
import { hashPassword } from '../auth/auth.js';
import Models from '../models/models.js';
import { roles, can } from '../auth/roles.js';
import log from '../lib/logger.js';

const account = express.Router();

/**
 * GET /account/profile - Εμφάνιση προφίλ χρήστη
 */
account.get('/profile', async (req, res) => {
    try {
        const user = await Models.User.findByPk(req.user.sub, {
            attributes: ['id', 'email', 'name', 'role', 'createdAt', 'updatedAt'],
            raw: true
        });

        if (!user) {
            log.warn(`Ο χρήστης με ID ${req.user.sub} δεν βρέθηκε`);
            return res.status(404).render('errors/404');
        }

        res.render('account/profile', {
            user,
            title: 'Προφίλ Χρήστη',
            roles
        });
    } catch (error) {
        log.error('Σφάλμα κατά την ανάκτηση προφίλ χρήστη:', error);
        res.status(500).render('errors/500', { 
            message: 'Σφάλμα κατά την ανάκτηση των στοιχείων του προφίλ' 
        });
    }
});

/**
 * POST /account/profile - Ενημέρωση προφίλ χρήστη
 */
account.post('/profile', async (req, res) => {
    try {
        const { name, password } = req.body;
        const userId = req.user.sub;

        // Βασικός έλεγχος εισόδου
        if (!name) {
            const user = await Models.User.findByPk(userId, {
                attributes: ['id', 'email', 'name', 'role', 'createdAt', 'updatedAt'],
                raw: true
            });
            return res.status(400).render('account/profile', {
                user,
                title: 'Προφίλ Χρήστη',
                roles,
                error: 'Το όνομα είναι υποχρεωτικό'
            });
        }

        // Ο έλεγχος ομοιότητας password με confirmPassword γίνεται μόνο client-side
        // Server-side validation του password pattern
        const passwordPattern = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;
        if (password && !passwordPattern.test(password)) {
            const user = await Models.User.findByPk(userId, {
                attributes: ['id', 'email', 'name', 'role', 'createdAt', 'updatedAt'],
                raw: true
            });
            return res.status(400).render('account/profile', {
                user,
                title: 'Προφίλ Χρήστη',
                roles,
                error: 'Το password πρέπει να περιέχει τουλάχιστον 8 χαρακτήρες, ένα γράμμα, έναν αριθμό και ένα σύμβολο.'
            });
        }

        // Δημιουργία αντικειμένου ενημέρωσης
        const updateData = { name };
        if (password) {
            updateData.password = await hashPassword(password);
        }

        // Ενημέρωση χρήστη
        await Models.User.update(updateData, { where: { id: userId } });

        log.info(`Ο χρήστης ${req.user.email} ενημέρωσε το προφίλ του`);
        
        // Ανάκτηση ενημερωμένων στοιχείων
        const updatedUser = await Models.User.findByPk(userId, {
            attributes: ['id', 'email', 'name', 'role', 'createdAt', 'updatedAt'],
            raw: true
        });

        res.render('account/profile', {
            user: updatedUser,
            title: 'Προφίλ Χρήστη',
            roles,
            success: 'Το προφίλ σας ενημερώθηκε επιτυχώς'
        });

    } catch (error) {
        log.error('Σφάλμα κατά την ενημέρωση προφίλ χρήστη:', error);
        res.status(500).render('account/profile', { 
            user: req.user,
            title: 'Προφίλ Χρήστη',
            roles,
            error: 'Σφάλμα κατά την ενημέρωση του προφίλ. Προσπαθήστε ξανά.' 
        });
    }
});

/**
 * GET /account/settings - Εμφάνιση ρυθμίσεων χρήστη (δεν εφαρμόζεται)
 */
account.get('/settings', async (req, res) => {
    res.render('account/settings');
});


export default account;