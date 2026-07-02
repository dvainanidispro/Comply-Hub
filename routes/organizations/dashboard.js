import { Router } from 'express';
import Models from '../../models/models.js';
import Cache from '../../models/cache.js';
import log from '../../lib/logger.js';

import { currentKpiReport } from './modules/kpi.js';

const dashboard = Router();

// Βοηθητική συνάρτηση για υπολογισμό στατιστικών πολιτικών/διαδικασιών ανά framework και τύπο
const policyStats = (allPolicies, framework, type) => {
    const items = allPolicies.filter(p => p.framework === framework && p.type === type);
    return {
        active: items.filter(p => p.status === 'active').length,
        draft: items.filter(p => p.status === 'draft').length,
        total: items.length,
    };
};

// Βοηθητική συνάρτηση για την ετοιμασία των KPI
const kpiStats = (kpis) => {
    const applicableKpis = kpis.filter(kpi => kpi.applicable);

    return {
        applicable: applicableKpis.length,
        success: applicableKpis.filter(kpi => kpi.success === true).length,
        failed: applicableKpis.filter(kpi => kpi.success === false).length,
        pending: applicableKpis.filter(kpi => kpi.success !== true && kpi.success !== false).length,
    };
};


// Αρχική σελίδα (dashboard οργανισμού)
dashboard.get(['/', '/dashboard'], 
    async(req, res) => {
        try {

            const organization = (await Cache.map.Organization).get(req.org);

            const [allPolicies, Nis2Kpis] = await Promise.all([
                Models.Policy.findAll({
                    where: { organizationId: req.org },
                    attributes: ['framework', 'type', 'status'],
                    raw: true,
                }),
                currentKpiReport(req.org, "NIS2"),
            ]);

            res.render('organizations/dashboard', {
                layout: 'main',
                user: req.user,
                organization,
                nis2: {
                    policies: policyStats(allPolicies, 'NIS2', 'policy'),
                    procedures: policyStats(allPolicies, 'NIS2', 'procedure'),
                    kpis: kpiStats(Nis2Kpis),
                },
                gdpr: {
                    policies: policyStats(allPolicies, 'GDPR', 'policy'),
                    procedures: policyStats(allPolicies, 'GDPR', 'procedure'),
                },
            });
        } catch (error) {
            log(`Dashboard error: ${error.message}`);
            res.status(500).render('errors/500', { layout: 'basic' });
        }
    }
);



export default dashboard;