import express from 'express';
import { managePoliciesRouter } from './modules/policies.js';
import { manageStorageRouter } from './modules/storage.js';
import { legislationRouter } from './modules/legislation.js';
import { kpiRouter } from './modules/kpi.js';
import { selfAssessmentRouter } from './modules/self-assessment.js';

const nis2 = express.Router();

// NIS2 Policies
const nis2Policies = managePoliciesRouter('NIS2', 'policy', 'NIS2 - Πολιτικές');
nis2Policies.use('/:resourceId/storage', manageStorageRouter('NIS2', 'policies'));
nis2.use('/policies', nis2Policies);

// NIS2 Procedures
const nis2Procedures = managePoliciesRouter('NIS2', 'procedure', 'NIS2 - Διαδικασίες');
nis2Procedures.use('/:resourceId/storage', manageStorageRouter('NIS2', 'procedures'));
nis2.use('/procedures', nis2Procedures);

// NIS2 Legislation
nis2.use('/legislation', legislationRouter('NIS2', 'NIS2 - Νομοθεσία'));

// NIS2 KPI
nis2.use('/kpi', kpiRouter('NIS2', 'NIS2 - KPIs'));

// NIS2 Self-Assessment
nis2.use('/self-assessment', selfAssessmentRouter('NIS2', 'NIS2 - Αυτοαξιολόγηση'));

export default nis2;
