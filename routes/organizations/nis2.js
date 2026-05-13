import express from 'express';
import { managePoliciesRouter } from './modules/policies.js';
import { manageStorageRouter } from './modules/storage.js';

const nis2 = express.Router();

// NIS2 Policies
const nis2Policies = managePoliciesRouter('NIS2', 'policy', 'NIS2 - Πολιτικές');
nis2Policies.use('/:resourceId/storage', manageStorageRouter('NIS2', 'policies'));
nis2.use('/policies', nis2Policies);

// NIS2 Procedures
const nis2Procedures = managePoliciesRouter('NIS2', 'procedure', 'NIS2 - Διαδικασίες');
nis2Procedures.use('/:resourceId/storage', manageStorageRouter('NIS2', 'procedures'));
nis2.use('/procedures', nis2Procedures);

export default nis2;
