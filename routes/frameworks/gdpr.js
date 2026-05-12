import express from 'express';
import { managePoliciesRouter } from './policies.js';

const gdpr = express.Router();

gdpr.use('/policies', managePoliciesRouter('GDPR', 'policy', 'GDPR - Πολιτικές'));
gdpr.use('/procedures', managePoliciesRouter('GDPR', 'procedure', 'GDPR - Διαδικασίες'));

export default gdpr;
