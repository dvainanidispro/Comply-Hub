

const permissions = {
    'manage:platform': 'Κεντρική διαχείριση πλατφόρμας',
    'manage:any:content': 'Διαχείριση περιεχομένου για οποιονδήποτε οργανισμό',
    // 'edit:any:content': 'Επεξεργασία περιεχομένου για οποιονδήποτε οργανισμό',
    // 'view:any:content': 'Προβολή περιεχομένου για οποιονδήποτε οργανισμό',
    // 'edit:org:content': 'Επεξεργασία περιεχομένου για τον οργανισμό του',
    // 'view:org:content': 'Προβολή περιεχομένου για τον οργανισμό του',
    'manage:org:content': 'Διαχείριση περιεχομένου για τον οργανισμό του',
};

const roles = {
    admin: {
        name: 'admin',
        displayName: 'Διαχειριστής',
        description: 'Διαχειριστής πλατφόρμας με πλήρη δικαιώματα',
        permissions: ['manage:platform', 'manage:any:content'],
        hasOrganization: false,
        canHaveScope: false,
        color: 'danger'
    },
    central: {
        name: 'central',
        displayName: 'Κεντρικός Υπεύθυνος',
        description: 'Χρήστης με δικαιώματα διαχείρισης περιεχομένου για όλους τους οργανισμούς',
        permissions: ['manage:any:content'],
        hasOrganization: false,
        canHaveScope: true,
        color: 'success'
    },
    manager: {
        name: 'manager',
        displayName: 'Υπεύθυνος Οργανισμού',
        description: 'Χρήστης με δικαιώματα δημοσίευσης και επεξεργασίας περιεχομένου',
        permissions: ['manage:org:content'],
        hasOrganization: true,
        canHaveScope: true,
        color: 'info'
    },
    // viewer: {
    //     name: 'viewer',
    //     displayName: 'Απλός Χρήστης',
    //     user: true,
    //     description: 'Χρήστης με δικαιώματα μόνο προβολής',
    //     permissions: ['view:org:content'],
    //     hasOrganization: true,
    //     canHaveScope: true,
    //     color: 'info'
    // },

};

const extendedRoles = {};

const allRoles = { ...roles, ...extendedRoles };


/** Middleware to check permissions for routes. Δέχεται string ή array (OR logic) */
let can = (permission) => {
    return (req, res, next) => {
        const userRole = req.user?.role;
        const userPermissions = allRoles?.[userRole]?.permissions || [];
        const required = Array.isArray(permission) ? permission : [permission];
        if (required.some(p => userPermissions.includes(p))) {
            return next();
        }
        return res.status(403).json({ message: 'Forbidden' });
    };
};

/** Used by Handlebars helpers to check user permissions. Δέχεται spread permissions (OR logic) */
let userHasPermission = (user, ...permissions) => {
    const userRole = user?.role;
    const userPermissions = allRoles?.[userRole]?.permissions || [];
    return permissions.some(p => userPermissions.includes(p));
};



export { roles, permissions, can, userHasPermission };