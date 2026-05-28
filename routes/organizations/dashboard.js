import { Router } from 'express';

const dashboard = Router();

// Αρχική σελίδα (dashboard οργανισμού)
dashboard.get(['/', '/dashboard'], 
    (req, res) => {
    res.render('organizations/dashboard', {
        layout: 'main',
        user: req.user,
    });
});



export default dashboard;