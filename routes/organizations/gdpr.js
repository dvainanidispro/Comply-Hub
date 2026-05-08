import express from 'express';
import { managePoliciesRouter } from './modules/policies.js';

const gdpr = express.Router();

gdpr.use('/policies', managePoliciesRouter('GDPR', 'GDPR — Πολιτικές'));

export default gdpr;
