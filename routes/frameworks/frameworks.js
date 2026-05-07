import express from 'express';
import { can } from '../../auth/roles.js';
import nis2PoliciesRouter from './nis2-policies.js';

const frameworks = express.Router();

frameworks.use(can('manage:platform'));

frameworks.use('/nis2', nis2PoliciesRouter);

export default frameworks;
