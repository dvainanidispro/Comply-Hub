import express from 'express';
import { managePoliciesRouter } from './modules/policies.js';
import { manageLegislationRouter } from './modules/legislation.js';

const gdpr = express.Router();

gdpr.use('/policies', managePoliciesRouter('GDPR', 'policy', 'GDPR - Πρότυπα πολιτικών'));
gdpr.use('/procedures', managePoliciesRouter('GDPR', 'procedure', 'GDPR - Πρότυπα διαδικασιών'));
gdpr.use('/legislation', manageLegislationRouter('GDPR', 'GDPR - Νομοθεσία'));

export default gdpr;
