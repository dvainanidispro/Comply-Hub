/** Middleware που βάζει στο req.org το organizationId του χρήστη, είτε από το token είτε από το cookie */
const org = (req, res, next) => {
    const userOrg = parseInt(req.user?.org);
    if (!isNaN(userOrg)) {
        req.org = userOrg;
    } else {
        const cookieOrg = parseInt(req.cookies?.org);
        req.org = isNaN(cookieOrg) ? null : cookieOrg;
    }
    //TODO: Αν τελικά είναι null, τότε να οδηγεί σε σελίδα επιλογής οργανισμού αν είναι υπεύθυνος 
    // (ή σελίδα login αν είναι admin). 
    next();
};

export default org;
