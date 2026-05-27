import express from 'express';
import { managePoliciesRouter } from './modules/policies.js';
import { manageStorageRouter } from './modules/storage.js';
import { legislationRouter } from './modules/legislation.js';

const gdpr = express.Router();

// GDPR Policies
const gdprPolicies = managePoliciesRouter('GDPR', 'policy', 'GDPR - Πολιτικές');
gdprPolicies.use('/:resourceId/storage', manageStorageRouter('GDPR', 'policies'));
gdpr.use('/policies', gdprPolicies);

// GDPR Procedures
const gdprProcedures = managePoliciesRouter('GDPR', 'procedure', 'GDPR - Διαδικασίες');
gdprProcedures.use('/:resourceId/storage', manageStorageRouter('GDPR', 'procedures'));
gdpr.use('/procedures', gdprProcedures);

// GDPR Legislation
gdpr.use('/legislation', legislationRouter('GDPR', 'GDPR - Νομοθεσία'));

export default gdpr;
