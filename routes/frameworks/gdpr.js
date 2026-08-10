import express from 'express';
import { managePoliciesRouter } from './modules/policies.js';
import { manageLegislationRouter } from './modules/legislation.js';
import { manageVendorAssessmentRouter } from './modules/vendor-assessment.js';

const gdpr = express.Router();

gdpr.use('/policies', managePoliciesRouter('GDPR', 'policy', 'GDPR - Πρότυπα πολιτικών'));
gdpr.use('/procedures', managePoliciesRouter('GDPR', 'procedure', 'GDPR - Πρότυπα διαδικασιών'));
gdpr.use('/legislation', manageLegislationRouter('GDPR', 'GDPR - Νομοθεσία'));
gdpr.use('/vendor-assessment', manageVendorAssessmentRouter('GDPR', 'GDPR - Ερωτηματολόγιο αξιολόγησης εξωτερικών συνεργατών'));

export default gdpr;
