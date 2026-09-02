/**
 * questionnaire-form.js
 * --------------------------------------------------------------------------
 * Ο Alpine adapter του πυρήνα questionnaire.js — κοινή λογική για ΚΑΘΕ view
 * που render-άρει φόρμα ερωτηματολογίου. Φορτώνεται στο layout (μετά το
 * alpine-ch.js, ΠΡΙΝ το Alpine), οπότε η factory είναι διαθέσιμη ως global
 * σε κάθε x-data expression. Εδώ μπορεί μελλοντικά να μπει και λογική
 * ερωτηματολογίων ΕΚΤΟΣ Alpine (κοινά JS helpers των views).
 *
 * Υλοποιεί τις ΚΛΕΙΔΩΜΕΝΕΣ συμβάσεις των Alpine μετατροπέων (βλ.
 * questionnaire.instructions.md):
 *   - Reactive γίνεται ΤΟ plain data object του Response — ΠΡΙΝ τυλιχτεί.
 *   - Το Response ΔΕΝ μπαίνει στο x-data (κυκλικές αναφορές → σιωπηλό
 *     stack overflow) — ζει σε closure της factory.
 *   - Groups χωρίς αναδρομικά templates: section.flattenQuestions().
 *   - Τα actions διασχίζονται ως διατεταγμένο array και αναγνωρίζονται από
 *     το action.name — η σειρά του array είναι η σειρά εμφάνισης των κουμπιών.
 */

/**
 * Factory x-data φόρμας ερωτηματολογίου. Κάθε view τη χρησιμοποιεί είτε
 * αυτούσια (x-data="questionnaireForm(rec, data)") είτε με spread για δικά
 * του extra state/methods (x-data="{ ...questionnaireForm(rec, data), … }").
 * Πολλά ερωτηματολόγια στην ίδια σελίδα = πολλές κλήσεις με διαφορετικά
 * ορίσματα.
 *
 * @param {object} questionnaireRecord  Το record του ερωτηματολογίου όπως
 *   έρχεται από τη βάση — χρειάζεται .definition (JSONB ορισμός) και
 *   .answers (answer sets). Στέλνεται και ως questionnaireSnapshot στο POST.
 * @param {object|null} responseData  Το αποθηκευμένο plain data ενός
 *   response (JSONB) — ή null/undefined για νέο, κενό response.
 * @param {object} [config]  Προαιρετικές ρυθμίσεις — ΟΛΕΣ με defaults:
 *   showQuestionScoreBadge  boolean (false)  badge βαθμολογίας ανά ερώτηση
 *   showOptionScore         boolean (false)  το value δίπλα στο label των options
 *   maxAnswersShown         number  (5)      πόσα ids αναπάντητων δείχνει το flag
 *   baseUrl                 string  (null)   βάση των action paths· default το
 *                                            τρέχον path (αφαιρεί το /form ή /fill αν υπάρχει).
 *   Η δεσμευμένη action με name "cancel" δεν χρησιμοποιεί path: εκτελεί history.back().
 */
function questionnaireForm(questionnaireRecord, responseData = null, config = {}) {
    const {
        showQuestionScoreBadge = false,
        showOptionScore = false,
        maxAnswersShown = 5,
        baseUrl = null,
    } = config;

    const questionnaire = new Questionnaire(questionnaireRecord.definition, { templates: questionnaireRecord.answers });
    const data = Alpine.reactive(responseData || { questionnaire: questionnaire.code, answers: {} });
    const response = questionnaire.createResponse(data);

    // Debug διευκόλυνση για την κονσόλα — με πολλές φόρμες στη σελίδα - επικρατεί η τελευταία (last-one-wins). 
    window.questionnaire = questionnaire;
    window.response = response;

    function pendingAnswers() {
        const pending = response.status.pendingAnswers();
        let text;
        if (pending.length === 0) {
            text = "—";
        } else if (pending.length > maxAnswersShown) {
            text = pending.slice(0, maxAnswersShown).join(', ') + ` ... (Πλήθος: ${pending.length})`;
        } else {
            text = pending.join(', ');
        }
        return text;
    }

    function answerProgress() {
        const questions = [...questionnaire.allQuestions()].filter((q) => q.type !== "group");
        const answered = questions.filter((q) => response.isAnswered(q.id)).length;
        return `${answered}/${questions.length}`;
    }

    /* Τιμές των choice ερωτήσεων ΕΚΤΟΣ του response.data, ειδικά για x-model στα
     * <select> — το Alpine δεν επιλέγει σωστά ένα :value όταν τα <option> του
     * render-άρονται δυναμικά (x-for)· το x-model λύνει το πρόβλημα, αλλά χρειάζεται
     * assignable path, όχι κλήση συνάρτησης — γι' αυτό το ξεχωριστό reactive object,
     * αρχικοποιημένο από τις ήδη αποθηκευμένες απαντήσεις. */
    const values = Alpine.reactive({});
    for (const q of questionnaire.allQuestions()) {
        if (q.type === "choice") values[q.id] = response.entry(q.id)?.answerId ?? 0;
    }

    //# Το αντικείμενο που στέλνεται στο x-data
    /**
     * Το αντικείμενο που στέλνεται στο x-data.
     */
    const xData = {
        questionnaire,
        actions: questionnaire.actions,
        sections: questionnaire.sections.map((s) => ({
            id: s.id,
            title: s.title,
            description: s.description,
            rows: s.flattenQuestions(),
        })),

        // response,    
        // ΠΡΟΣΟΧΗ: Αν μπει εδώ το response, θα κάνει κυκλική αναφορά. Η λύση είναι να γίνει non enumerable property (παρακάτω) 
        // ώστε να μην προσπελαύνεται κατά την αρχικοποίηση του alpine state, αλλά να λειτουργεί αν κληθεί.

        showQuestionScoreBadge,
        showOptionScore,

        problems: [],
        saving: false,
        values,

        /* ---- Εγγραφή απάντησης choice ερώτησης — ενημερώνει response ΚΑΙ values ---- */
        setChoice(q, answerId) {
            response.answer(q.id, Number(answerId));
            this.values[q.id] = Number(answerId);
        },

        /* ---- Ανάγνωση απαντήσεων (για τα bindings) ---- */
        textOf(q) {
            const e = response.entry(q.id);
            return (e && e.text) || "";
        },
        commentOf(q) {
            const e = response.entry(q.id);
            return (e && e.comment) || "";
        },
        filesOf(q) {
            const e = response.entry(q.id);
            return (e && e.files) || [];
        },
        optionLabel(opt) {
            return (opt.value == null || !this.showOptionScore) ? opt.label : `${opt.label} (${opt.value})`;
        },
        hasScore(q) {
            return response.scoreOf(q.id) !== null;
        },
        scoreBadge(q) {
            const score = response.scoreOf(q.id);
            return (score === null ? "-" : score) + " / " + q.maxScore;
        },
        isProblem(id) {
            return this.problems.some((p) => p.id === id);
        },

        /* ---- Εγγραφή απαντήσεων — πάντα μέσω του Response API ---- */
        setText(q, value) {
            response.setText(q.id, value);
        },
        setComment(q, value) {
            response.setComment(q.id, value);
        },
        setFiles(q, fileList) {
            response.setFiles(q.id, Array.from(fileList).map((f) => f.name));
        },

        /* ---- Κατάσταση & αποτελέσματα (ζωντανά) ---- */
        flags() {
            const s = response.status;
            return [
                { label: "Ξεκίνησε η συμπλήρωση", ok: s.isStarted() },
                { label: "Απαντημένες ερωτήσεις", text: answerProgress() },
                { label: "Οι απαντήσεις που δόθηκαν είναι έγκυρες", ok: s.isPartiallyValidated() },
                { label: "Καλύπτονται οι υποχρεωτικές ερωτήσεις", ok: s.isCompleted() },
                { label: "Υποχρεωτικές ερωτήσεις που δεν έχουν απαντηθεί", text: pendingAnswers() },
                { label: "Έτοιμο για οριστική υποβολή", ok: s.isValidated() },
            ];
        },
        overall() {
            return response.results.all();
        },
        perSection() {
            return response.results.bySection();
        },
        perTag() {
            return response.results.byTag();
        },
        pct(x) {
            return x === null ? "—" : x.toFixed(1) + "%";
        },
        /* Ποσοστό βάσει της ΜΕΓΙΣΤΗΣ δυνατής βαθμολογίας (score/maxScoreTotal),
         * σε αντίθεση με το stats.percentage (score/maxScore μόνο απαντημένων). */
        pctOfMax(stats) {
            return stats.maxScoreTotal > 0 ? this.pct((stats.score / stats.maxScoreTotal) * 100) : "—";
        },

        /* ---- Ενέργειες φόρμας (cancel/save/submit, δυναμικά από questionnaire.actions) ---- */
        async performAction(action) {
            if (action.name === "cancel") {
                window.history.back();
                return;
            }
            if (window.theFormIsPreview) {
                Q.alert("Η φόρμα είναι σε mode προεπισκόπησης. Δεν επιτρέπεται καμία ενέργεια.");
                return;
            }
            if (action.name === "submit") {
                this.problems = response.status.validate();
            } else if (action.name === "save") {
                this.problems = response.status.validate().filter((p) => p.kind === "invalid");
            } else {
                this.problems = [];
            }
            if (this.problems.length) { return; }

            this.saving = true;
            const url = (baseUrl ?? window.location.pathname.replace(/\/(form|fill)$/, "")) + action.path;
            await submitData(
                { data: response.toJSON(), questionnaireSnapshot: questionnaireRecord },
                url,
                "POST"
            );
            this.saving = false;
        },
    };

    Object.defineProperty(xData, 'response', {
        value: response,
        enumerable: false,
        configurable: true,
    });

    return xData;
}
