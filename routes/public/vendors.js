import express from 'express';

const vendorsRouter = express.Router();

vendorsRouter.get('/:questionnaireId/:responseId', (req, res) => {
    res.render('public/questionnaires/questionnaire', {
        layout: 'public',
    });
});

export default vendorsRouter;