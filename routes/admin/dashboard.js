import { Router } from 'express';

const dashboard = Router();

// Αρχική σελίδα (dashboard)
dashboard.get(['/', '/dashboard'], 
    (req, res) => {
    res.render('admin/dashboard', {
        layout: 'main',
        user: req.user,
    });
});



export default dashboard;