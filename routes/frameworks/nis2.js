import express from 'express';
import { managePoliciesRouter } from './modules/policies.js';
import { manageLegislationRouter } from './modules/legislation.js';

const nis2 = express.Router();

nis2.use('/policies', managePoliciesRouter('NIS2', 'policy', 'NIS2 - Πρότυπα πολιτικών'));
nis2.use('/procedures', managePoliciesRouter('NIS2', 'procedure', 'NIS2 - Πρότυπα διαδικασιών'));
nis2.use('/legislation', manageLegislationRouter('NIS2', 'NIS2 - Νομοθεσία'));

export default nis2;
