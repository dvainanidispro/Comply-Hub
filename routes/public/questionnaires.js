import express from 'express';
import vendorsRouter from './vendors.js';

const questionnairesRouter = express.Router();

questionnairesRouter.use('/vendors', vendorsRouter);

export default questionnairesRouter;