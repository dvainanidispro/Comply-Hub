import express from 'express';
import { can } from '../../auth/roles.js';
import nis2Router from './nis2.js';
import gdprRouter from './gdpr.js';

const frameworks = express.Router();

frameworks.use(can('manage:platform'));

frameworks.use('/nis2', nis2Router);
frameworks.use('/gdpr', gdprRouter);

export default frameworks;
