import express from 'express';
import { managePoliciesRouter } from './modules/policies.js';

const nis2 = express.Router();

nis2.use('/policies', managePoliciesRouter('NIS2', 'policy', 'NIS2 - Πολιτικές'));
nis2.use('/procedures', managePoliciesRouter('NIS2', 'procedure', 'NIS2 - Διαδικασίες'));

export default nis2;
