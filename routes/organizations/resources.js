import express from 'express';
import partnersRouter from './resources/partners.js';

const resources = express.Router();

resources.use('/partners', partnersRouter);

export default resources;
