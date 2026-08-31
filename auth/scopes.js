import { roles } from './roles.js';

const scopes = {
    nis2: {
        name: 'nis2',
        displayName: 'NIS2',
        framework: 'NIS2',
        description: 'Πρόσβαση σε λειτουργίες που σχετίζονται με την συμμόρφωση NIS2',
    },
    gdpr: {
        name: 'gdpr',
        displayName: 'GDPR',
        framework: 'GDPR',
        description: 'Πρόσβαση σε λειτουργίες που σχετίζονται με την συμμόρφωση GDPR',
    },
}

const allScopesArray = Object.values(scopes).map(scope => scope.name);
const allFrameworksArray = Object.values(scopes).map(scope => scope.framework);

/** Middleware to check scopes for routes. Δέχεται string ή array (OR logic) */
let scope = (requiredScope) => {
    return (req, res, next) => {
        const userRole = req.user?.role;
        if (!roles?.[userRole]?.canHaveScope) { 
            return next();
        }   
        const userScopes = req.user?.scope || [];
        const requiredArr = Array.isArray(requiredScope) ? requiredScope : [requiredScope];
        if (requiredArr.some(s => userScopes.includes(s))) {
            return next();
        }
        return res.status(403).json({ message: 'Forbidden' });
    };
};

/** Used by Handlebars helpers to check user scopes. Δέχεται spread scopes (OR logic) */
let userHasScope = (user, ...requiredScopes) => {
    const userRole = user?.role;
    if (!roles?.[userRole]?.canHaveScope) return true;
    const userScopes = user?.scope || [];
    return requiredScopes.some(s => userScopes.includes(s));
};

/* Επιστρέφει τα frameworks που έχει ο χρήστης βάσει των scopes του */
let frameworksOf = (user) => {
    const userRole = user.role;
    if (!userRole) return [];
    if (!roles?.[userRole]?.canHaveScope) return allFrameworksArray;
    return user?.scope?.map(s => scopes[s]?.framework).filter(Boolean) || [];
};

export { scopes, scope, userHasScope, frameworksOf };