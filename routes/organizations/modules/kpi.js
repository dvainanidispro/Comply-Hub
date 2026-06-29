import express from 'express';
import Cache from '../../../models/cache.js';
import Models from '../../../models/models.js';
import { expectedCurrentKpis, expectedKpisInRange } from '../../../lib/kpi.js';
import { successRule } from '../../../models/kpi_template.js';
import { currentPeriods, periodsInRange } from '../../../lib/periods.js';
import jsonView from './json.js';
import log from '../../../lib/logger.js';



// Συγκεντρώνει τα αναμενόμενα και υποβληθέντα KPI για την τρέχουσα περίοδο, παράλληλα.
async function gatherCurrentKpis(org, framework) {
    const periods = currentPeriods(new Date(), -1);
    const [expectedKpis, submittedKpis] = await Promise.all([
        expectedCurrentKpis(org, framework),
        Models.Kpi.findAll({
            where: { organizationId: org, framework, period: periods },
        }).then((rows) => rows.map((k) => k.toJSON())),
    ]);
    return [expectedKpis, submittedKpis, periods];
}

// Συγκεντρώνει τα αναμενόμενα και υποβληθέντα KPI για ένα range ημερομηνιών, παράλληλα.
async function gatherKpisInRange(org, framework, dateRange) {
    const periods = periodsInRange(dateRange);
    const [expectedKpis, submittedKpis] = await Promise.all([
        expectedKpisInRange(org, framework, dateRange),
        Models.Kpi.findAll({
            where: { organizationId: org, framework, period: periods },
        }).then((rows) => rows.map((k) => k.toJSON())),
    ]);
    return [expectedKpis, submittedKpis, periods];
}



// Συγχωνεύει τα αναμενόμενα KPI με τα υποβληθέντα από τη βάση.
function mergeKpis(expectedKpis, submittedKpis) {
    expectedKpis.forEach((k) => { 
        k.submitted = false; 
        k.id = 0;
    });
    submittedKpis.forEach((k) => { k.submitted = true; });

    // Έχοντας αφετηρία τα ενεργά KPI Templates, τα αντικαθιστούμε με τα υποβληθέντα αν υπάρχουν.
    const submittedMap = new Map(submittedKpis.map((k) => [`${k.period}:${k.code}`, k]));
    const kpis = expectedKpis.map((e) => submittedMap.get(`${e.period}:${e.code}`) ?? e);

    // Υποβληθέντα KPI των οποίων το template έχει καταργηθεί (δεν είναι στα expected, παρά μόνο στα submitted).
    const expectedKeys = new Set(expectedKpis.map((k) => `${k.period}:${k.code}`));
    submittedKpis.filter((k) => !expectedKeys.has(`${k.period}:${k.code}`)) .forEach((k) => { k.deprecated = true; kpis.push(k); });
    // = Όσα υπήρχαν μόνο στα submitted και όχι στα expected, τα προσθέτουμε στο τέλος της λίστας, με flag deprecated.

    kpis.forEach((k) => {
        switch (true) {
            // περίπτωση που δεν εφαρμόζεται το KPI
            case !k.applicable:       k.color = 'light'; break;
            // Επιτυχία
            case k.success === true:  k.color = 'success'; break;
            // Αποτυχία
            case k.success === false: k.color = 'danger'; break;
            // Μη υποβλημένο, υποβληθέν KPI χωρίς τιμή, default περίπτωση
            default:                  k.color = 'warning';
        }
    });
    return kpis;
}



/**
 * Δημιουργεί router για διαχείριση KPI δεδομένων οργανισμού.
 * @param {string} framework - Το αναγνωριστικό του framework.
 * @param {string} label - Τίτλος για το view.
 * @returns {express.Router}
 */
export function kpiRouter(framework, label) {
	const kpi = express.Router();

	kpi.get(['/','/current'], async (req, res) => {
        const [expectedKpis, submittedKpis, periods] = await gatherCurrentKpis(req.org, framework);

        const kpis = mergeKpis(expectedKpis, submittedKpis);
        const pendingKpis = kpis.filter((k) => !k.submitted);
        // const deprecatedKpis = kpis.filter((k) => k.deprecated);

        res.render('organizations/kpi/kpi', { 
            title: `${label}`,
            kpis,
            pendingKpis,
            framework,
            periods,
        });
    });

    kpi.post('/', async (req, res) => {
        const { id, code, period, template, applicable, value, comments } = req.body;

        try {
            if (id == 0) {
                // Δημιουργία νέου KPI. Τα μη υποβληθέντα KPI παίρνουν id=0 στην mergeKpis παραπάνω
                await Models.Kpi.create({
                    organizationId: req.org,
                    framework,
                    code,
                    period,
                    template,
                    applicable: applicable ?? true,
                    value: applicable ? (value ?? null) : null,
                    comments: comments || null,
                });
                // Σημείωση. Η βάση αποτρέπει δημιουργία διπλότυπου KPI, απλώς δεν επιστρέφουμε το σφάλμα σον χρήστη.
            } else {
                // Ενημέρωση υπάρχοντος KPI
                await Models.Kpi.update(
                    {
                        template,   // χρειάζεται για να μην προκύπτει sequelize error
                        applicable: applicable ?? true,
                        value: applicable ? (value ?? null) : null,
                        comments: comments || null,
                    },
                    { where: { id, organizationId: req.org } },
                );
            }
            res.sendStatus(200);
        } catch (error) {
            log.error(`KPI POST error: ${error.message}`);
            res.sendStatus(500);
        }
    });

    kpi.get(['/all', '/past'], async (req, res) => {
        const dateRange = [res.locals.org.startDate, new Date()];
        const [expectedKpis, submittedKpis, periods] = await gatherKpisInRange(req.org, framework, dateRange);

        const kpis = mergeKpis(expectedKpis, submittedKpis);
        const pendingKpis = kpis.filter((k) => !k.submitted);

        res.render('organizations/kpi/kpi', { 
            title: `${label}`,
            kpis,
            pendingKpis,
            framework,
            periods,
        });
    });

	return kpi;
}

