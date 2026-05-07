/** Middleware που βάζει στο req.org το organizationId του χρήστη, είτε από το token είτε από το cookie */
const org = (req, res, next) => {
    const userOrg = parseInt(req.user?.org);
    if (!isNaN(userOrg)) {
        req.org = userOrg;
    } else {
        const cookieOrg = parseInt(req.cookies?.org);
        req.org = isNaN(cookieOrg) ? null : cookieOrg;
    }
    if (req.org === null) {
        return res.redirect(`/account/settings?redirect=${encodeURIComponent(req.originalUrl)}`);
    }
    next();
};

export default org;
