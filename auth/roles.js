

const permissions = {
    'manage:platform': 'Κεντρική διαχείριση πλατφόρμας',
    'edit:any:content': 'Επεξεργασία περιεχομένου για οποιονδήποτε οργανισμό',
    'view:any:content': 'Προβολή περιεχομένου για οποιονδήποτε οργανισμό',
    'edit:org:content': 'Επεξεργασία περιεχομένου για τον οργανισμό του',
    'view:org:content': 'Προβολή περιεχομένου για τον οργανισμό του',
};

const roles = {
    admin: {
        name: 'admin',
        displayName: 'Διαχειριστής',
        user: true,
        description: 'Διαχειριστής πλατφόρμας με πλήρη δικαιώματα',
        permissions: ['manage:platform', 'view:any:content', 'edit:any:content'],
        canHaveOrganization: false,
        color: 'danger'
    },
    manager: {
        name: 'manager',
        displayName: 'Υπεύθυνος Οργανισμού',
        user: true,
        description: 'Χρήστης με δικαιώματα επεξεργασίας και δημοσίευσης περιεχομένου',
        permissions: ['view:org:content', 'edit:org:content'],
        canHaveOrganization: true,
        color: 'success'
    },
    // viewer: {
    //     name: 'viewer',
    //     displayName: 'Απλός Χρήστης',
    //     user: true,
    //     description: 'Χρήστης με δικαιώματα μόνο προβολής',
    //     permissions: ['view:org:content'],
    //     canHaveOrganization: true,
    //     color: 'info'
    // },

};

const extendedRoles = {};

const allRoles = { ...roles, ...extendedRoles };


/** Middleware to check permissions for routes */
let can = (permission) => {
    return (req, res, next) => {
        const userRole = req.user?.role;
        const userPermissions = allRoles?.[userRole]?.permissions || [];
        if (userPermissions.includes(permission)) {
            return next();
        }
        return res.status(403).json({ message: 'Forbidden' });
    };
};

/** Used by Handlebars helpers to check user permissions */
let userHasPermission = (user, permission) => {
    const userRole = user?.role;
    const userPermissions = allRoles?.[userRole]?.permissions || [];
    return userPermissions.includes(permission);
};



export { roles, permissions, can, userHasPermission };