import express from 'express';
import { managePoliciesRouter } from './modules/policies.js';

const nis2 = express.Router();

nis2.use('/policies', managePoliciesRouter('NIS2', 'NIS2 — Πολιτικές'));

export default nis2;
