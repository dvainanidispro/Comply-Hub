

const permissions = {
    'edit:users': 'Προβολή και επεξεργασία χρηστών',
    'view:content': 'Προβολή περιεχομένου',
    'edit:content': 'Επεξεργασία περιεχομένου',
    'post:content': 'Δημοσίευση περιεχομένου',
};

const roles = {
    admin: {
        name: 'admin',
        user: true,
        description: 'Διαχειριστής συστήματος με πλήρη δικαιώματα',
        permissions: ['edit:users', 'view:content', 'edit:content', 'post:content'],
        color: 'danger'
    },
    editor: {
        name: 'editor',
        user: true,
        description: 'Χρήστης με δικαιώματα επεξεργασίας και δημοσίευσης περιεχομένου',
        permissions: ['view:content', 'edit:content', 'post:content'],
        color: 'success'
    },
    viewer: {
        name: 'viewer',
        user: true,
        description: 'Χρήστης με δικαιώματα μόνο προβολής',
        permissions: ['view:content'],
        color: 'info'
    },

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