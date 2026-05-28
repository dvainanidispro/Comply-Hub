import { Router } from 'express';
import { validateUser } from '../auth/auth.js';

const dashboard = Router();

// Αρχική σελίδα (dashboard)
dashboard.get(['/', '/dashboard'], 
    validateUser, 
    (req, res) => {
        if (req.user.role=='admin') {
            res.redirect('/admin/dashboard');
        } else  {
            res.redirect('/organization/dashboard');
        }
});



export default dashboard;