import express from 'express';
import { managePoliciesRouter } from './policies.js';

const nis2 = express.Router();

nis2.use('/policies', managePoliciesRouter('NIS2', 'policy', 'NIS2 - Πρότυπα πολιτικών'));
nis2.use('/procedures', managePoliciesRouter('NIS2', 'procedure', 'NIS2 - Πρότυπα διαδικασιών'));

export default nis2;
