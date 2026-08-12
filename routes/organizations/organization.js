import express from 'express';
import { can } from '../../auth/roles.js';
import org from '../../auth/org.js';

import dashboardRouter from './dashboard.js';
import nis2Router from './nis2.js';
import gdprRouter from './gdpr.js';
import resourcesRouter from './resources.js';

const organization = express.Router();

organization.use(can(['manage:org:content', 'manage:any:content']));
organization.use(org);

organization.use('/dashboard', dashboardRouter);
organization.use('/frameworks/nis2', nis2Router);
organization.use('/frameworks/gdpr', gdprRouter);
organization.use('/resources', resourcesRouter);

export default organization;
