import { Router } from 'express';
import Models from '../../models/models.js';
import log from '../../lib/logger.js';

const dashboard = Router();

// Βοηθητική συνάρτηση για υπολογισμό στατιστικών πολιτικών ανά framework και τύπο
const buildStats = (allPolicies, framework, type) => {
    const items = allPolicies.filter(p => p.framework === framework && p.type === type);
    return {
        active: items.filter(p => p.status === 'active').length,
        draft: items.filter(p => p.status === 'draft').length,
        total: items.length,
    };
};


// Αρχική σελίδα (dashboard οργανισμού)
dashboard.get(['/', '/dashboard'], 
    async(req, res) => {
        try {
            const allPolicies = await Models.Policy.findAll({
                where: { organizationId: req.org },
                attributes: ['framework', 'type', 'status'],
                raw: true,
            });

            res.render('organizations/dashboard', {
                layout: 'main',
                user: req.user,
                nis2: {
                    policies: buildStats(allPolicies, 'NIS2', 'policy'),
                    procedures: buildStats(allPolicies, 'NIS2', 'procedure'),
                },
                gdpr: {
                    policies: buildStats(allPolicies, 'GDPR', 'policy'),
                    procedures: buildStats(allPolicies, 'GDPR', 'procedure'),
                },
            });
        } catch (error) {
            log(`Dashboard error: ${error.message}`);
            res.status(500).render('errors/500', { layout: 'basic' });
        }
    }
);



export default dashboard;