import Cache from "../models/cache.js";

/** Middleware που βάζει στο req.org το organizationId του χρήστη, είτε από το token είτε από το cookie */
const org = async (req, res, next) => {
    
    const userOrg = parseInt(req.user?.org);


    // Περίπτωση 1: Αν το επαληθευμένο req.user.org είναι ακέραιος, το βρήκαμε.
    if (!isNaN(userOrg)) {
        req.org = userOrg;
    } 

    // Περίπτωση 2: Αν org=="any" (πρόσβαση σε πολλούς οργανισμούς), πάρε το επιλεγμένο org από το cookie του
    else if (req.user?.org === 'any') {
        const cookieOrg = parseInt(req.cookies?.org);
        if (isNaN(cookieOrg)) {
            // Δεν έχει επιλέξει οργανισμό ακόμα, στείλε τον στις ρυθμίσεις
            return res.redirect(`/account/settings?redirect=${encodeURIComponent(req.originalUrl)}`);
        }
        req.org = cookieOrg;
    }

    const organization = (await Cache.map.Organization).get(req.org);
    res.locals.org = {
        id: req.org, 
        name: organization?.name || 'Οργανισμός',
        startDate: organization?.startDate || null,
    };
    res.locals.currentPath = req.originalUrl;
    
    next();
};

export default org;
