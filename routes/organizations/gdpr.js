import express from 'express';
import { managePoliciesRouter } from './modules/policies.js';
import { manageStorageRouter } from './modules/storage.js';

const gdpr = express.Router();

// GDPR Policies
const gdprPolicies = managePoliciesRouter('GDPR', 'policy', 'GDPR - Πολιτικές');
gdprPolicies.use('/:resourceId/storage', manageStorageRouter('GDPR', 'policies'));
gdpr.use('/policies', gdprPolicies);

// GDPR Procedures
const gdprProcedures = managePoliciesRouter('GDPR', 'procedure', 'GDPR - Διαδικασίες');
gdprProcedures.use('/:resourceId/storage', manageStorageRouter('GDPR', 'procedures'));
gdpr.use('/procedures', gdprProcedures);

export default gdpr;
