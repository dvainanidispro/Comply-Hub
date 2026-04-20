import { Router } from 'express';
import { validateUser } from '../auth/auth.js';

const dashboard = Router();

// Αρχική σελίδα (dashboard)
dashboard.get(['/', '/dashboard'], 
    validateUser, 
    (req, res) => {
    res.render('dashboard', {
        layout: 'main',
        user: req.user,
    });
});



export default dashboard;