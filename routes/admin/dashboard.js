import { Router } from 'express';
import Cache from '../../models/cache.js';
import log from '../../lib/logger.js';

const dashboard = Router();

// Αρχική σελίδα (dashboard)
dashboard.get(['/', '/dashboard'], 
    async (req, res) => {

        const users = await Cache.table.User;
        const usersByRole = Object.groupBy(users, user=>user.role);

        const organizations = await Cache.table.Organization;

        res.render('admin/dashboard', {
            layout: 'main',
            user: req.user,
            organizations,
            users,
            usersByRole
        });
});



export default dashboard;