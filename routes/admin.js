import express from 'express';
import Models from '../models/models.js';
import Cache from '../models/cache.js';
import { can, roles, permissions } from '../auth/roles.js';
import { hashPassword } from '../auth/auth.js';
import { Op, ForeignKeyConstraintError } from 'sequelize';
import log from '../lib/logger.js';

const admin = express.Router();





////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////       ROUTES ΓΙΑ ΔΙΑΧΕΙΡΙΣΗ ΧΡΗΣΤΩΝ       /////////////////////////////

// Middleware για έλεγχο admin δικαιωμάτων
admin.use(can('manage:platform'));



/**
 * GET /admin/users - Εμφάνιση λίστας όλων των χρηστών
 */
admin.get('/users', async (req, res) => {
    try {
        const users = await Models.User.findAll({
            attributes: ['id', 'email', 'name', 'role', 'organizationId', 'scope', 'createdAt', 'active'],
            include: [{ model: Models.Organization, as: 'organization', attributes: ['id', 'name'] }],
            order: [['role', 'ASC'], ['createdAt', 'ASC']],
        });
        
        res.render('admin/users', { 
            users,
            roles: roles,
            user: req.user,
            title: 'Διαχείριση Χρηστών'
        });
    } catch (error) {
        log.error(`Σφάλμα κατά την ανάκτηση χρηστών: ${error}`);
        res.status(500).render('errors/500', { message: 'Σφάλμα κατά την ανάκτηση χρηστών' });
    }
});

/**
 * GET /admin/users/new - Φόρμα δημιουργίας νέου χρήστη
 */
admin.get('/users/new', async (req, res) => {
    try {
        const organizations = await Cache.table.Organization;
        
        res.render('admin/single-user', {
            isNew: true,
            userDetails: {},
            roles: roles,
            organizations,
            user: req.user,
            title: 'Νέος Χρήστης'
        });
    } catch (error) {
        log.error(`Σφάλμα: ${error}`);
        res.status(500).render('errors/500', { message: 'Σφάλμα κατά την ανάκτηση φόρμας' });
    }
});

/**
 * GET /admin/users/:id - Εμφάνιση στοιχείων συγκεκριμένου χρήστη
 */
admin.get('/users/:id', async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const user = await Models.User.findByPk(userId, {
            attributes: ['id', 'email', 'name', 'role', 'organizationId', 'scope', 'active', 'createdAt', 'updatedAt'],
            raw: true       // JavaScript object χωρίς μεθόδους Sequelize
        });
        
        if (!user) {
            return res.status(404).render('errors/404', { message: 'Ο χρήστης δεν βρέθηκε' });
        }

        const organizations = await Cache.table.Organization;
        
        res.render('admin/single-user', { 
            isNew: false,
            userDetails: user,
            roles: roles,
            organizations: organizations,
            user: req.user,
            title: `Επεξεργασία Χρήστη: ${user.name || user.email}`
        });
    } catch (error) {
        log.error(`Σφάλμα κατά την ανάκτηση χρήστη: ${error}`);
        res.status(500).render('errors/500', { message: 'Σφάλμα κατά την ανάκτηση χρήστη' });
    }
});

/**
 * POST /admin/users - Δημιουργία νέου χρήστη
 */
admin.post('/users', async (req, res) => {
    try {
        const { email, name, password, role, organizationId, active } = req.body;
        
        // Βασικός έλεγχος δεδομένων
        if (!email) {
            return res.status(400).json({ 
                success: false, 
                message: 'Το πεδίο email είναι υποχρεωτικό' 
            });
        }
        
        // Έλεγχος αν υπάρχει ήδη χρήστης με το ίδιο email
        const existingUser = await Models.User.findOne({
            where: { email }
        });
        
        if (existingUser) {
            return res.status(400).json({ 
                success: false, 
                message: 'Υπάρχει ήδη χρήστης με αυτό το email' 
            });
        }
        
        const newUser = await Models.User.create({
            email,
            name: name || email.split('@')[0],
            password: await hashPassword(password),
            role: role || 'user',
            organizationId: organizationId || null,
            active: active !== 'false' && active !== false,
        });
        
        log.info(`Νέος χρήστης δημιουργήθηκε: ${newUser.email} (ID: ${newUser.id})`);
        
        res.status(201).json({ 
            success: true, 
            message: 'Ο χρήστης δημιουργήθηκε επιτυχώς',
            user: {
                id: newUser.id,
                email: newUser.email,
                name: newUser.name,
                role: newUser.role,
            }
        });
    } catch (error) {
        log.error(`Σφάλμα κατά τη δημιουργία χρήστη: ${error}`);
        res.status(500).json({ 
            success: false, 
            message: 'Σφάλμα κατά τη δημιουργία χρήστη' 
        });
    }
});

/**
 * PUT /admin/users/:id - Ενημέρωση στοιχείων χρήστη
 */
admin.put('/users/:id', async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const { email, name, role, organizationId, password, active } = req.body;
        
        const user = await Models.User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'Ο χρήστης δεν βρέθηκε' 
            });
        }
        
        // Έλεγχος αν το νέο email υπάρχει ήδη σε άλλον χρήστη
        if (email !== user.email) {
            const existingUser = await Models.User.findOne({
                where: {
                    id: { [Op.ne]: userId },
                    email
                }
            });
            
            if (existingUser) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Υπάρχει ήδη άλλος χρήστης με αυτό το email' 
                });
            }
        }
        
        // Δημιουργία αντικειμένου ενημέρωσης
        const updateData = {
            email: email || user.email,
            name: name || user.name,
            role: role || user.role,
            organizationId: organizationId || null,
        };
        
        if (active !== undefined) {
            updateData.active = active === 'true' || active === true;
        }
        
        // Προσθήκη κωδικού μόνο αν έχει δοθεί νέος
        if (password && password.trim() !== '') {
            updateData.password = await hashPassword(password);
        }
        
        await user.update(updateData);
        
        log.info(`Ο Χρήστης ${user.email} ενημερώθηκε (ID: ${user.id})`);
        
        res.json({ 
            success: true, 
            message: 'Ο χρήστης ενημερώθηκε επιτυχώς',
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                active: user.active
            }
        });
    } catch (error) {
        log.error(`Σφάλμα κατά την ενημέρωση χρήστη: ${error}`);
        res.status(500).json({ 
            success: false, 
            message: 'Σφάλμα κατά την ενημέρωση χρήστη' 
        });
    }
});

/**
 * DELETE /admin/users/:id - Διαγραφή χρήστη
 */
admin.delete('/users/:id', async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        
        // Αποτροπή διαγραφής του ίδιου του admin
        if (userId === req.user.id) {
            return res.status(400).json({ 
                success: false, 
                message: 'Δεν μπορείτε να διαγράψετε τον δικό σας λογαριασμό' 
            });
        }
        
        const user = await Models.User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'Ο χρήστης δεν βρέθηκε' 
            });
        }
        
        await user.destroy();
        
        log.info(`Χρήστης διαγράφηκε: ${user.email} (ID: ${user.id})`);
        
        res.json({ 
            success: true, 
            message: 'Ο χρήστης διαγράφηκε επιτυχώς' 
        });
    } catch (error) {
        if (error instanceof ForeignKeyConstraintError) {
            return res.status(400).json({ 
                success: false, 
                message: 'Είναι αδύνατη η διαγραφή του χρήστη διότι συνδέεται με άλλες εγγραφές. Παρακαλώ, απενεργοποιήστε τον χρήστη.' 
            });
        }
        log.error(`Σφάλμα κατά τη διαγραφή χρήστη: ${error}`);
        res.status(500).json({ 
            success: false, 
            message: 'Σφάλμα κατά τη διαγραφή χρήστη' 
        });
    }
});


////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////    ROUTES ΓΙΑ ΔΙΑΧΕΙΡΙΣΗ ΟΡΓΑΝΙΣΜΩΝ       /////////////////////////////

/**
 * GET /admin/organizations - Εμφάνιση λίστας όλων των οργανισμών
 */
admin.get('/organizations', async (req, res) => {
    try {
        const organizations = await Models.Organization.findAll({
            attributes: ['id', 'name', 'active'],
        });

        res.render('admin/organizations', {
            organizations,
            user: req.user,
            title: 'Διαχείριση Οργανισμών'
        });
    } catch (error) {
        log.error(`Σφάλμα κατά την ανάκτηση οργανισμών: ${error}`);
        res.status(500).render('errors/500', { message: 'Σφάλμα κατά την ανάκτηση οργανισμών' });
    }
});

/**
 * GET /admin/organizations/new - Φόρμα δημιουργίας νέου οργανισμού
 */
admin.get('/organizations/new', (req, res) => {
    res.render('admin/single-organization', {
        isNew: true,
        orgDetails: {},
        user: req.user,
        title: 'Νέος Οργανισμός'
    });
});

/**
 * GET /admin/organizations/:id - Εμφάνιση στοιχείων συγκεκριμένου οργανισμού
 */
admin.get('/organizations/:id', async (req, res) => {
    try {
        const orgId = parseInt(req.params.id);
        const org = await Models.Organization.findByPk(orgId, {
            attributes: ['id', 'name', 'active'],
            raw: true
        });

        if (!org) {
            return res.status(404).render('errors/404', { message: 'Ο οργανισμός δεν βρέθηκε' });
        }

        res.render('admin/single-organization', {
            isNew: false,
            orgDetails: org,
            user: req.user,
            title: `Επεξεργασία Οργανισμού: ${org.name}`
        });
    } catch (error) {
        log.error(`Σφάλμα κατά την ανάκτηση οργανισμού: ${error}`);
        res.status(500).render('errors/500', { message: 'Σφάλμα κατά την ανάκτηση οργανισμού' });
    }
});

/**
 * POST /admin/organizations - Δημιουργία νέου οργανισμού
 */
admin.post('/organizations', async (req, res) => {
    try {
        const { name, active } = req.body;

        if (!name) {
            return res.status(400).json({ success: false, message: 'Το πεδίο Όνομα είναι υποχρεωτικό' });
        }

        const existing = await Models.Organization.findOne({ where: { name } });
        if (existing) {
            return res.status(400).json({ success: false, message: 'Υπάρχει ήδη οργανισμός με αυτό το όνομα' });
        }

        const newOrg = await Models.Organization.create({
            name,
            active: active !== 'false' && active !== false,
        });

        Cache.refresh('Organization');
        log.info(`Νέος οργανισμός δημιουργήθηκε: ${newOrg.name} (ID: ${newOrg.id})`);

        res.status(201).json({ success: true, message: 'Ο οργανισμός δημιουργήθηκε επιτυχώς' });
    } catch (error) {
        log.error(`Σφάλμα κατά τη δημιουργία οργανισμού: ${error}`);
        res.status(500).json({ success: false, message: 'Σφάλμα κατά τη δημιουργία οργανισμού' });
    }
});

/**
 * PUT /admin/organizations/:id - Ενημέρωση στοιχείων οργανισμού
 */
admin.put('/organizations/:id', async (req, res) => {
    try {
        const orgId = parseInt(req.params.id);
        const { name, active } = req.body;

        const org = await Models.Organization.findByPk(orgId);
        if (!org) {
            return res.status(404).json({ success: false, message: 'Ο οργανισμός δεν βρέθηκε' });
        }

        if (name && name !== org.name) {
            const existing = await Models.Organization.findOne({
                where: { name, id: { [Op.ne]: orgId } }
            });
            if (existing) {
                return res.status(400).json({ success: false, message: 'Υπάρχει ήδη άλλος οργανισμός με αυτό το όνομα' });
            }
        }

        await org.update({
            name: name || org.name,
            active: active === 'true' || active === true,
        });

        Cache.refresh('Organization');
        log.info(`Οργανισμός ενημερώθηκε: ${org.name} (ID: ${org.id})`);

        res.json({ success: true, message: 'Ο οργανισμός ενημερώθηκε επιτυχώς' });
    } catch (error) {
        log.error(`Σφάλμα κατά την ενημέρωση οργανισμού: ${error}`);
        res.status(500).json({ success: false, message: 'Σφάλμα κατά την ενημέρωση οργανισμού' });
    }
});

/**
 * DELETE /admin/organizations/:id - Διαγραφή οργανισμού
 */
admin.delete('/organizations/:id', async (req, res) => {
    try {
        const orgId = parseInt(req.params.id);

        const org = await Models.Organization.findByPk(orgId);
        if (!org) {
            return res.status(404).json({ success: false, message: 'Ο οργανισμός δεν βρέθηκε' });
        }

        await org.destroy();

        Cache.refresh('Organization');
        log.info(`Οργανισμός διαγράφηκε: ${org.name} (ID: ${org.id})`);

        res.json({ success: true, message: 'Ο οργανισμός διαγράφηκε επιτυχώς' });
    } catch (error) {
        log.error(`Σφάλμα κατά τη διαγραφή οργανισμού: ${error}`);
        res.status(500).json({ success: false, message: 'Σφάλμα κατά τη διαγραφή οργανισμού' });
    }
});


admin.get('/roles', (req, res) => {
    res.render('admin/roles', { 
        roles: roles,
        permissions: permissions,
        user: req.user,
        title: 'Διαχείριση Ρόλων'
    });
});

export default admin;