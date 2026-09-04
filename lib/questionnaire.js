/**
 * questionnaire.js
 * --------------------------------------------------------------------------
 * Ο ΕΠΑΝΑΧΡΗΣΙΜΟΠΟΙΗΣΙΜΟΣ πυρήνας του συστήματος δυναμικών ερωτηματολόγιων
 * αξιολόγησης. Δεν περιέχει δεδομένα κανενός συγκεκριμένου ερωτηματολογίου —
 * μεταφέρεται αυτούσιο σε οποιοδήποτε project.
 * 
 * Χρησιμοποιείται σε front-end (browser) και back-end (Node.js) — ES6 module, χωρίς εξαρτήσεις.
 *
 * ΑΡΧΙΤΕΚΤΟΝΙΚΗ (βλ. NOTES.md)
 *   - AnswerSet: πρότυπο πιθανών απαντήσεων ({id,label,value}) με παράγωγη
 *     λογική (maxValue, byId, isAnswered). Τα templates κάθε ερωτηματολογίου
 *     ορίζονται στο δικό του αρχείο (π.χ. cybersecurity.js).
 *   - ΟΡΙΣΜΟΣ ερωτηματολογίου: Questionnaire → Section[] → Question[].
 *     Χτίζεται από plain JSON-συμβατά αντικείμενα. ΔΕΝ κρατά απαντήσεις χρήστη.
 *     Περιλαμβάνει και τα `actions` (διατεταγμένο array κουμπιών της φόρμας:
 *     cancel/save/submit κ.λπ.) — default τα Questionnaire.defaultActions,
 *     όλα-ή-τίποτα (χωρίς merge ανά ενέργεια).
 *   - ΑΠΑΝΤΗΣΕΙΣ χρήστη: plain object (JSONB-ready για PostgreSQL), το οποίο
 *     τυλίγει η κλάση Response για methods/getters. Το toJSON() επιστρέφει
 *     πάντα το καθαρό plain object.
 *
 * ΤΥΠΟΙ ΕΡΩΤΗΣΗΣ
 *   choice (default) : επιλογή από AnswerSet — βαθμολογείται (score = weight × value)
 *   group            : επικεφαλίδα με υπο-ερωτήσεις (π.χ. 3.10) — δεν απαντιέται
 *   text             : ελεύθερο κείμενο — δεν βαθμολογείται. Προαιρετικό
 *                      `validation` (π.χ. "email", "number") για την HTML φόρμα.
 *
 * ΒΑΘΜΟΛΟΓΗΣΗ (κλειδωμένοι κανόνες — NOTES.md)
 *   score ερώτησης   = weight × value επιλεγμένης απάντησης
 *   maxScore ερώτησης = weight × answers.maxValue (παράγωγο, δεν αποθηκεύεται)
 *   Αναπάντητη ερώτηση (id:0 / χωρίς entry) ΔΕΝ μετρά ούτε σε score ούτε σε maxScore.
 *   percentage = Σ score / Σ maxScore (μόνο απαντημένων).
 * --------------------------------------------------------------------------
 */

/**
 * Κοινή προεπιλεγμένη/κενή απάντηση — δεσμευμένο sentinel σε ΟΛΑ τα sets.
 * value:null => ξεχωρίζει το «δεν απάντησε» από πραγματικό scored 0 (βλ. NOTES.md).
 */
const NOT_ANSWERED = { id: 0, label: "Δεν απαντήθηκε", value: null };

/**
 * AnswerSet — πρότυπο (template) πιθανών απαντήσεων.
 * Περιτύλιγμα ενός array επιλογών {id,label,value}, με παράγωγη λογική και
 * χώρο για μελλοντική επέκταση. Τα ίδια τα δεδομένα μένουν απλά αντικείμενα.
 *
 * Το sentinel NOT_ANSWERED (id:0) ΔΕΝ δηλώνεται στα δεδομένα — η κλάση το
 * προσθέτει πάντα μόνη της ως πρώτη επιλογή. Έτσι τα δεδομένα (JSON/JSONB)
 * περιέχουν μόνο τις πραγματικές απαντήσεις.
 */
class AnswerSet {
  /**
   * @param {string} name    Αναγνωριστικό set (π.χ. "YesNo").
   * @param {Array<{id:number,label:string,value:number|null}>} options
   *   ΜΟΝΟ οι πραγματικές επιλογές — χωρίς το id:0 (αγνοείται αν δοθεί).
   * @param {object} [notAnswered]  Προαιρετικό override του sentinel
   *   (π.χ. άλλο label). Τα id:0 και value:null παραμένουν κλειδωμένα.
   */
  constructor(name, options, notAnswered = NOT_ANSWERED) {
    this.name = name;
    this.options = [notAnswered, ...options.filter((o) => o.id !== 0)];
  }

  /** Το μέγιστο value των επιλογών (αγνοεί την κενή απάντηση value:null). */
  get maxValue() {
    return Math.max(...this.options.filter((o) => o.value !== null).map((o) => o.value));
  }

  /** Επιστρέφει την επιλογή με το δοθέν id (ή undefined). */
  byId(id) {
    return this.options.find((o) => o.id === id);
  }

  /** True αν το id αντιστοιχεί σε πραγματική (απαντημένη) επιλογή. */
  isAnswered(id) {
    const opt = this.byId(id);
    return !!opt && opt.value !== null;
  }

  /** Iterable: επιτρέπει `for (const opt of set)` στον μετατροπέα φόρμας. */
  [Symbol.iterator]() {
    return this.options[Symbol.iterator]();
  }

  /** Σειριοποίηση σε καθαρό JSON — ΧΩΡΙΣ το sentinel (όπως τα πηγαία δεδομένα). */
  toJSON() {
    return this.options.filter((o) => o.id !== 0);
  }
}

/* Δεσμευμένο όνομα set για override του sentinel μέσα στα δεδομένα απαντήσεων. */
const NOT_ANSWERED_NAME = "not_answered";

/**
 * Προεπιλεγμένες ενέργειες (κουμπιά) της φόρμας ενός ερωτηματολογίου.
 * Κάθε στοιχείο = μία ενέργεια: { name, path, text, color } — name το όνομα
 * της ενέργειας, path το endpoint που θα χτυπήσει η φόρμα, text το λεκτικό
 * του κουμπιού και color το Bootstrap variant. Η δεσμευμένη ενέργεια με
 * name "cancel" δεν χρειάζεται path και επιστρέφει τον browser
 * στην προηγούμενη σελίδα.
 * Ισχύουν ΟΛΟΚΛΗΡΕΣ όταν ο ορισμός δεν δίνει δικό του `actions`.
 */
const DEFAULT_ACTIONS = [
  { name: "cancel", text: "Ακύρωση", color: "secondary" },
  { name: "save", path: "/save", text: "Προσωρινή Αποθήκευση", color: "success" },
  { name: "submit", path: "/submit", text: "Οριστική υποβολή", color: "primary" },
];

/**
 * Ενέργειες φόρμας: όλα-ή-τίποτα. Αν το def.actions λείπει, επιστρέφεται
 * αντίγραφο των Questionnaire.defaultActions (ώστε τα instances να μη μοιράζονται το κοινό
 * array). Αν δοθεί, πρέπει να είναι array και χρησιμοποιείται ΩΣ ΕΧΕΙ — ΧΩΡΙΣ
 * merge ανά ενέργεια με τα defaults (π.χ. array με μόνο action name "submit"
 * σημαίνει φόρμα χωρίς κουμπί save) και ΧΩΡΙΣ validation του περιεχομένου των
 * στοιχείων: κάθε ενέργεια μπορεί να έχει όποια keys χρειάζεται η φόρμα, και
 * επιπλέον των name/path/text/color. Το δεσμευμένο name "cancel" αντιμετωπίζεται
 * από τον browser ως ιστορική επιστροφή.
 */
function buildActions(defActions) {
  if (defActions == null)
    return Questionnaire.defaultActions.map((action) => ({ ...action }));
  if (!Array.isArray(defActions))
    throw new TypeError("Το actions πρέπει να είναι array.");
  return defActions;
}

/* Επιτρεπτές τιμές του πεδίου `comment` μιας choice ερώτησης — καθορίζουν
 * τον τύπο input που θα render-άρει η φόρμα (Bootstrap) για τα σχόλια. */
const COMMENT_TYPES = ["text", "textarea"];

/**
 * Χτίζει registry {name: AnswerSet} από καθαρά JSON δεδομένα.
 * Δέχεται:
 *   - array:  [{ name: "YesNo", options: [{id,label,value}, …] }, …]
 *   - object: { YesNo: [{id,label,value}, …], … }  ή  { YesNo: AnswerSet, … }
 * Υπάρχοντα AnswerSet instances περνούν ως έχουν.
 *
 * Override του NOT_ANSWERED: αν υπάρχει entry με name "not_answered", το
 * options[0] του γίνεται το sentinel ΟΛΩΝ των sets (π.χ. για άλλο label).
 * Τα id:0 και value:null επιβάλλονται πάντα — μόνο τα υπόλοιπα πεδία
 * (label κ.λπ.) παίρνονται από το override. Το entry αυτό ΔΕΝ γίνεται set.
 */
function buildAnswerTemplates(defs) {
  if (!defs) return null;

  // Κανονικοποίηση και των δύο μορφών σε [{name, value}].
  const list = Array.isArray(defs)
    ? defs.map((d) => ({ name: d && d.name, value: d instanceof AnswerSet ? d : d && d.options }))
    : Object.entries(defs).map(([name, value]) => ({ name, value }));

  // Προαιρετικό override του sentinel.
  let notAnswered = NOT_ANSWERED;
  const sentinelEntry = list.find((e) => e.name === NOT_ANSWERED_NAME);
  if (sentinelEntry) {
    const src = Array.isArray(sentinelEntry.value) ? sentinelEntry.value[0] : null;
    if (!src || !src.label)
      throw new Error(`Το "${NOT_ANSWERED_NAME}" χρειάζεται options με ένα στοιχείο που έχει label.`);
    notAnswered = { ...src, id: 0, value: null };
  }

  const registry = {};
  for (const e of list) {
    if (!e.name) throw new Error("Κάθε answer set χρειάζεται name.");
    if (e.name === NOT_ANSWERED_NAME) continue;
    registry[e.name] =
      e.value instanceof AnswerSet ? e.value : new AnswerSet(e.name, e.value || [], notAnswered);
  }
  return registry;
}

/* Επίλυση answer template: δέχεται AnswerSet instance ή string όνομα
 * (π.χ. "YesNo") που αναζητείται στο registry (opts.templates του
 * Questionnaire — το δίνει το εκάστοτε ερωτηματολόγιο). */
function resolveAnswers(answers, templates) {
  if (answers == null) return null;
  if (typeof answers === "string") {
    const set = templates && templates[answers];
    if (!set)
      throw new Error(
        `Άγνωστο answer template: "${answers}" — δώσε το registry στο new Questionnaire(def, { templates }).`
      );
    return set;
  }
  return answers; // ήδη AnswerSet (ή συμβατό αντικείμενο)
}

/**
 * Question — μία ερώτηση (ή ομάδα ερωτήσεων, type:"group").
 */
class Question {
  /**
   * @param {object} def
   *   { id, text, description?, type?="choice", answers?, weight?=1,
   *     required?=false, comment?=false ("text"|"textarea"), files?=false,
   *     tags?=[], validation?, questions?=[] (μόνο για type:"group") }
   *   comment/files: δηλωτικά, ΜΟΝΟ σε choice — λένε στη φόρμα τι input να δείξει.
   * @param {object} [templates]  registry για επίλυση string answers
   */
  constructor(def, templates) {
    if (!def || def.id == null) throw new Error("Η ερώτηση χρειάζεται id.");
    this.id = String(def.id);
    this.text = def.text || "";
    this.type = def.type || "choice";
    this.weight = def.weight ?? 1;
    this.required = def.required ?? false;
    this.private = def.private ?? false;
    this.tags = def.tags || [];
    this.validation = def.validation ?? null; // hint για την HTML φόρμα (text)
    this.description = def.description || ""; // επεξήγηση ερώτησης (Bootstrap form-text)

    // comment/files: δηλωτικά πεδία ΜΟΝΟ για choice — καθορίζουν τι θα
    // render-άρει η φόρμα (πεδίο σχολίου & upload) δίπλα στην επιλογή.
    if (this.type !== "choice" && (def.comment || def.files))
      throw new Error(`Η ερώτηση "${this.id}" (${this.type}): τα comment/files επιτρέπονται μόνο σε type:"choice".`);
    if (def.comment && !COMMENT_TYPES.includes(def.comment))
      throw new Error(`Η ερώτηση "${this.id}": το comment πρέπει να είναι "text" ή "textarea" (δόθηκε "${def.comment}").`);
    this.comment = this.type === "choice" ? def.comment || false : false; // "text"|"textarea"|false
    this.files = this.type === "choice" ? def.files === true : false;

    this.answers = this.type === "choice" ? resolveAnswers(def.answers, templates) : null;
    this.questions = (def.questions || []).map((q) => new Question(q, templates));

    if (this.type === "choice" && !this.answers)
      throw new Error(`Η ερώτηση "${this.id}" (choice) χρειάζεται answers.`);
    if (this.type !== "group" && this.questions.length)
      throw new Error(`Η ερώτηση "${this.id}" έχει υπο-ερωτήσεις αλλά δεν είναι type:"group".`);
  }

  /** True αν η ερώτηση συμμετέχει στη βαθμολογία. */
  get isScorable() {
    return this.type === "choice";
  }

  /** Μέγιστο δυνατό score = weight × maxValue (null για μη βαθμολογούμενες). */
  get maxScore() {
    return this.isScorable ? this.weight * this.answers.maxValue : null;
  }

  /** True αν έχει tag. */
  hasTag(tag) {
    return this.tags.includes(tag);
  }

  /**
   * Score για ένα entry απάντησης ({answerId}) — null αν αναπάντητη/μη βαθμολογούμενη.
   */
  scoreFor(entry) {
    if (!this.isScorable || !entry) return null;
    const opt = this.answers.byId(entry.answerId);
    if (!opt || opt.value === null) return null;
    return this.weight * opt.value;
  }

  /** Σειριοποίηση ορισμού: το answers γίνεται όνομα template (JSON-φιλικό). */
  toJSON() {
    const json = { id: this.id, text: this.text, type: this.type };
    if (this.description) json.description = this.description;
    if (this.type === "choice") {
      json.answers = this.answers.name;
      json.weight = this.weight;
      json.required = this.required;
      if (this.comment) json.comment = this.comment;
      if (this.files) json.files = true;
    }
    if (this.private) json.private = true;
    if (this.tags.length) json.tags = this.tags;
    if (this.validation) json.validation = this.validation;
    if (this.questions.length) json.questions = this.questions;
    return json;
  }
}

/**
 * Section — θεματική ενότητα με ερωτήσεις.
 */
class Section {
  /** @param {object} def  { id, title, description?, questions: [] } */
  constructor(def, templates) {
    if (!def || def.id == null) throw new Error("Η ενότητα χρειάζεται id.");
    this.id = String(def.id);
    this.title = def.title || "";
    this.description = def.description || "";
    this.questions = (def.questions || []).map((q) => new Question(q, templates));
  }

  /** Iterable πάνω στις (top-level) ερωτήσεις — για render της φόρμας. */
  [Symbol.iterator]() {
    return this.questions[Symbol.iterator]();
  }

  /** Όλες οι ερωτήσεις της ενότητας, με βάθος (τα group + τα παιδιά τους). */
  *allQuestions() {
    function* walk(list) {
      for (const q of list) {
        yield q;
        if (q.questions.length) yield* walk(q.questions);
      }
    }
    yield* walk(this.questions);
  }

  /**
   * Οι ερωτήσεις της ενότητας ως ΕΠΙΠΕΔΗ λίστα [{q, depth}] — ίδια σειρά με το
   * allQuestions(), αλλά με depth που δίνει την εσοχή των υπο-ερωτήσεων
   * (type:"group"), ώστε το render της φόρμας (π.χ. x-for του Alpine) να μη
   * χρειάζεται αναδρομικά templates.
   */
  flattenQuestions() {
    const rows = [];
    (function walk(questions, depth) {
      for (const q of questions) {
        rows.push({ q, depth });
        walk(q.questions, depth + 1);
      }
    })(this.questions, 0);
    return rows;
  }

  toJSON() {
    const json = { id: this.id, title: this.title };
    if (this.description) json.description = this.description;
    json.questions = this.questions;
    return json;
  }
}

/**
 * Questionnaire — ο πλήρης ορισμός ενός ερωτηματολογίου.
 */
class Questionnaire {
  /** Προεπιλεγμένες ενέργειες φόρμας όταν ο ορισμός δεν δίνει δικό του `actions`. */
  static defaultActions = DEFAULT_ACTIONS;

  /**
   * Ελέγχει αν κάθε string αναφορά `answers` στις ερωτήσεις υπάρχει στα
   * JSON δεδομένα των answer sets. Δέχεται δύο JSON strings και επιστρέφει
   * null όταν δεν μπορούν να γίνουν parse ή δεν έχουν την αναμενόμενη δομή.
   */
  static validateAnswerSet(sectionsJsonText, answersJsonText) {
    if (typeof sectionsJsonText !== "string" || typeof answersJsonText !== "string") {
      return null;
    }

    let sectionsJson;
    let answersJson;
    try {
      sectionsJson = JSON.parse(sectionsJsonText);
      answersJson = JSON.parse(answersJsonText);
    } catch {
      return null;
    }

    if (!Array.isArray(sectionsJson) || !answersJson || typeof answersJson !== "object") {
      return null;
    }

    const answerSetNames = new Set(
      Array.isArray(answersJson)
        ? answersJson.map((answerSet) => answerSet?.name)
        : Object.keys(answersJson)
    );
    answerSetNames.delete(NOT_ANSWERED_NAME);

    function areQuestionsValid(questions) {
      for (const question of questions || []) {
        if (typeof question?.answers === "string" && !answerSetNames.has(question.answers)) {
          return false;
        }
        if (!areQuestionsValid(question?.questions)) return false;
      }
      return true;
    }

    return sectionsJson.every((section) => areQuestionsValid(section?.questions));
  }

  /**
   * Χρήση: 
   * const { filteredSections, filteredAnswers } = Questionnaire.filterOutPrivate(sectionsArray, answersObj);
   * 
   * Αφαιρεί private ενότητες/ερωτήσεις και κρατά μόνο τις απαντήσεις των
   * ερωτήσεων που παραμένουν ορατές. Δέχεται plain δεδομένα, όπως έρχονται από
   * PostgreSQL: sectionsArray = array ορισμών ενοτήτων και answersObj = το
   * response.data.answers με κλειδιά τα ids των ερωτήσεων.
   *
   * Δεν μεταβάλλει τα αρχικά δεδομένα και δεν επιστρέφει κοινές nested
   * αναφορές με αυτά. Private section ή group αποκλείει ολόκληρο το υποδέντρο.
   */
  static filterOutPrivate(sectionsArray, answersObj) {
    if (!Array.isArray(sectionsArray)) {
      throw new TypeError("Το sectionsArray πρέπει να είναι array.");
    }
    if (!answersObj || typeof answersObj !== "object" || Array.isArray(answersObj)) {
      throw new TypeError("Το answersObj πρέπει να είναι object με κλειδιά τα ids των ερωτήσεων.");
    }

    const clone = (value) => {
      if (Array.isArray(value)) return value.map(clone);
      if (value && typeof value === "object")
        return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, clone(item)]));
      return value;
    };

    const isPrivate = (item, label) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        throw new TypeError(`${label} πρέπει να είναι object.`);
      }
      if (Object.hasOwn(item, "private") && typeof item.private !== "boolean") {
        throw new TypeError(`Το private στο ${label} πρέπει να είναι boolean.`);
      }
      return item.private === true;
    };

    const filteredAnswerEntries = [];

    const filterQuestions = (questions) => {
      if (!Array.isArray(questions)) {
        throw new TypeError("Το questions μιας ενότητας ή group πρέπει να είναι array.");
      }

      const filteredQuestions = [];
      for (const question of questions) {
        const label = `question${question?.id == null ? "" : ` \"${question.id}\"`}`;
        if (isPrivate(question, label)) continue;

        const { questions: childQuestions, ...questionWithoutChildren } = question;
        const filteredQuestion = clone(questionWithoutChildren);
        const hasChildren = childQuestions !== undefined;

        if (hasChildren) {
          filteredQuestion.questions = filterQuestions(childQuestions);
        }

        const isGroup = question.type === "group" || hasChildren;
        if (!isGroup && question.id != null) {
          const answerKey = String(question.id);
          if (Object.hasOwn(answersObj, answerKey)) {
            filteredAnswerEntries.push([answerKey, clone(answersObj[answerKey])]);
          }
        }

        filteredQuestions.push(filteredQuestion);
      }
      return filteredQuestions;
    };

    const filteredSectionsArray = [];
    for (const section of sectionsArray) {
      const label = `section${section?.id == null ? "" : ` \"${section.id}\"`}`;
      if (isPrivate(section, label)) continue;

      const { questions = [], ...sectionWithoutQuestions } = section;
      filteredSectionsArray.push({
        ...clone(sectionWithoutQuestions),
        questions: filterQuestions(questions),
      });
    }

    return {
      filteredSectionsArray,
      filteredAnswersObj: Object.fromEntries(filteredAnswerEntries),
    };
  }

  /**
  * @param {object} def  { code, title, description?, actions?, content?/sections: [] }
  *   code: το domain αναγνωριστικό του ερωτηματολογίου (string, π.χ.
  *   "cybersecurity-self-assessment") — ταυτίζεται με τη στήλη `code` του
  *   πίνακα questionnaires. ΔΕΝ λέγεται id: `id` είναι πάντα το τεχνικό
  *   κλειδί της βάσης. Τα ΕΣΩΤΕΡΙΚΑ αναγνωριστικά (ενότητες, ερωτήσεις,
  *   επιλογές) παραμένουν `id` — δεν αντιστοιχούν σε οντότητες βάσης.
   *   actions: [{ name, path?, text, color }] — διατεταγμένο array με τα κουμπιά
   *   ενεργειών της φόρμας. Αν λείπει, ισχύει ΟΛΟΚΛΗΡΟ το
   *   Questionnaire.defaultActions (cancel + save + submit).
   *   Αν δοθεί, χρησιμοποιείται ως έχει — χωρίς merge ανά ενέργεια
   *   (βλ. buildActions).
  *   content/sections: οι ενότητες και οι ερωτήσεις του ερωτηματολογίου.
  *   Το content υπερισχύει όταν δοθούν και τα δύο, ενώ εσωτερικά η κλάση
  *   διατηρεί πάντοτε instances Section στο sections.
  * @param {object} [opts]  { templates } — τα answer templates σε οποιαδήποτε
  *   μορφή δέχεται η buildAnswerTemplates (καθαρό JSON array/object ή AnswerSets).
  */
  constructor(def, opts = {}) {
    if (!def || !def.code) throw new Error("Το ερωτηματολόγιο χρειάζεται code.");
    this.code = def.code;
    this.title = def.title || "";
    this.description = def.description || "";
    this.actions = buildActions(def.actions);
    this.templates = buildAnswerTemplates(opts.templates);
    const sections = def.content ?? def.sections ?? [];
    this.sections = sections.map((s) => new Section(s, this.templates));

    // Ευρετήριο id → Question (όλα τα βάθη) + έλεγχος μοναδικότητας.
    this._index = new Map();
    for (const section of this.sections) {
      for (const q of section.allQuestions()) {
        if (this._index.has(q.id))
          throw new Error(`Διπλό id ερώτησης: "${q.id}"`);
        this._index.set(q.id, q);
      }
    }
  }

  /** Iterable πάνω στις ενότητες — για render της φόρμας. */
  [Symbol.iterator]() {
    return this.sections[Symbol.iterator]();
  }

  /** Το περιεχόμενο ως νέο array από plain JSON-compatible αντικείμενα. */
  get content() {
    return JSON.parse(JSON.stringify(this.sections));
  }

  /** Ερώτηση με βάση το id (ή undefined). */
  byId(id) {
    return this._index.get(String(id));
  }

  /** Όλες οι ερωτήσεις όλων των ενοτήτων (με βάθος). */
  *allQuestions() {
    for (const section of this.sections) yield* section.allQuestions();
  }

  /** Μόνο οι βαθμολογούμενες (choice) ερωτήσεις. */
  *scorableQuestions() {
    for (const q of this.allQuestions()) if (q.isScorable) yield q;
  }

  /**
   * Γλώσσα του ερωτηματολογίου βάσει του label του sentinel της πρώτης
   * διαθέσιμης απάντησης.
   */
  language() {
    const firstAnswerSet = Object.values(this.templates || {})[0];
    const firstOption = firstAnswerSet?.options?.[0];
    return typeof firstOption?.label === "string" && /\p{Script=Greek}/u.test(firstOption.label)
      ? "el"
      : "en";
  }

  /**
   * Συνοπτικά μεγέθη του ορισμού — όλα ακέραιοι, όλα ΠΑΡΑΓΩΓΑ (δεν
   * αποθηκεύονται πουθενά). Επεκτάσιμο: μελλοντικά μπορεί να προστεθούν
   * κι άλλα πεδία.
   *   questions  : πλήθος ΑΠΑΝΤΗΣΙΜΩΝ ερωτήσεων (choice + text — όχι groups)
   *   required   : πόσες από αυτές είναι required
   *   sections   : πλήθος ενοτήτων
   *   answerSets : πλήθος ΔΙΑΦΟΡΕΤΙΚΩΝ answer sets που χρησιμοποιούν οι
   *                ερωτήσεις (όχι το μέγεθος του registry — αυτό μπορεί να
   *                περιέχει και αχρησιμοποίητα sets)
   *   maxScore   : μέγιστο δυνατό συνολικό score όλων των βαθμολογούμενων —
   *                αντιστοιχεί στο maxScoreTotal των stats του Response (εδώ
   *                δεν υπάρχουν απαντήσεις, άρα ένα μόνο δυνατό μέγιστο)
   */
  get info() {
    let questions = 0;
    let required = 0;
    let maxScore = 0;
    const sets = new Set();
    for (const q of this.allQuestions()) {
      if (q.type === "group") continue;
      questions++;
      if (q.required) required++;
      if (q.isScorable) {
        maxScore += q.maxScore;
        sets.add(q.answers);
      }
    }
    return {
      questions,
      required,
      sections: this.sections.length,
      answerSets: sets.size,
      maxScore,
    };
  }

  /** Δημιουργεί νέο (κενό) Response για αυτό το ερωτηματολόγιο. */
  createResponse(data) {
    return new Response(this, data);
  }

  /** Σειριοποίηση ορισμού: το actions γράφεται πάντα (τα defaults
   *  υλοποιούνται ρητά — όπως τα weight/required της Question). */
  toJSON() {
    const json = { code: this.code, title: this.title };
    if (this.description) json.description = this.description;
    json.actions = this.actions;
    json.content = this.content;
    return json;
  }
}

/**
 * ResponseStatus — κατάσταση συμπλήρωσης/εγκυρότητας ενός Response.
 * Προσπελαύνεται ως namespace: `response.status.isStarted()` κ.λπ.
 * Όλα παράγωγα — ΔΕΝ αποθηκεύονται (η κατάσταση ζει στο response.data).
 */
class ResponseStatus {
  /** @param {Response} response */
  constructor(response) {
    this._r = response;
  }

  /** True αν υπάρχει έστω μία απαντημένη ερώτηση (κενό vs μισο-συμπληρωμένο). */
  isStarted() {
    for (const q of this._r.questionnaire.allQuestions())
      if (this._r.isAnswered(q.id)) return true;
    return false;
  }

  /** Ids υποχρεωτικών (required) ερωτήσεων χωρίς έγκυρη απάντηση. */
  _missingRequired() {
    const ids = [];
    for (const q of this._r.questionnaire.allQuestions()) {
      if (q.type === "group" || !q.required) continue;
      if (!this._r.isAnswered(q.id)) ids.push(q.id);
    }
    return ids;
  }

  /**
   * Entries ασύμβατα με τον ορισμό — «η απάντηση ανήκει στις επιτρεπτές»:
   * κάθε choice entry με answerId πρέπει να δείχνει σε υπαρκτή επιλογή του set
   * (το 0/NOT_ANSWERED είναι ΠΑΝΤΑ επιτρεπτό), και κάθε entry να αντιστοιχεί
   * σε ερώτηση του ορισμού. Πιάνει κυρίως αλλοιωμένα/ξεπερασμένα δεδομένα που
   * φορτώθηκαν από αποθήκευση (ο constructor του Response ΔΕΝ ελέγχει το data).
   * Για responses φτιαγμένα μέσω answer() είναι πάντα κενό (το answer() φρουρεί).
   *
   * ΔΕΝ ελέγχεται μορφή τιμών (π.χ. email/number στα type:text) — συνειδητή
   * απόφαση: το validation τύπων γίνεται ΜΟΝΟ client-side από την HTML φόρμα,
   * με βάση το hint `validation` της ερώτησης (βλ. NOTES.md).
   */
  _invalidEntries() {
    const problems = [];
    for (const [id, entry] of Object.entries(this._r.data.answers)) {
      const q = this._r.questionnaire.byId(id);
      if (!q) {
        problems.push({ id, kind: "invalid", reason: "Δεν αντιστοιχεί σε ερώτηση του ορισμού." });
        continue;
      }
      if (q.type === "choice" && entry && entry.answerId != null && !q.answers.byId(entry.answerId))
        problems.push({ id, kind: "invalid", reason: `Μη έγκυρο answerId ${entry.answerId}.` });
    }
    return problems;
  }

  /**
   * ΚΑΛΥΨΗ: true αν ΟΛΕΣ οι υποχρεωτικές (required) ερωτήσεις έχουν απαντηθεί.
   * Σκόπιμα ΜΟΝΟ παρουσία απάντησης — δεν κοιτά ορθότητα.
   */
  isCompleted() {
    return this._missingRequired().length === 0;
  }

  /**
   * Flat array με τα ids των υποχρεωτικών (required) ερωτήσεων που δεν έχουν
   * απαντηθεί ακόμη — με τη σειρά των ερωτήσεων στο ερωτηματολόγιο. Κενό array
   * ⟺ isCompleted().
   */
  pendingAnswers() {
    return this._missingRequired();
  }

  /**
   * ΟΡΘΟΤΗΤΑ ΤΩΝ ΣΥΜΠΛΗΡΩΜΕΝΩΝ: true αν κάθε απάντηση ανήκει στις επιτρεπτές
   * επιλογές (αγνοεί ό,τι λείπει — βλ. _invalidEntries). Το id:0 περνά πάντα —
   * είναι επιτρεπτή επιλογή, απλώς μετράει ως «αναπάντητο» στην κάλυψη.
   * Μορφή τιμών (email κ.λπ.) ΔΕΝ ελέγχεται εδώ — client-side μόνο.
   */
  isPartiallyValidated() {
    return this._invalidEntries().length === 0;
  }

  /**
   * ΟΛΑ: επιστρέφει [] αν όλα εντάξει, αλλιώς [{ id, kind, reason }] για κάθε
   * παράβαση — kind:"required" (κάλυψη) ή kind:"invalid" (ορθότητα).
   */
  validate() {
    return [
      ...this._missingRequired().map((id) => ({
        id,
        kind: "required",
        reason: "Η ερώτηση είναι υποχρεωτική.",
      })),
      ...this._invalidEntries(),
    ];
  }

  /**
   * True αν δεν υπάρχει καμία παράβαση (== validate().length===0). «Έτοιμο για
   * υποβολή» — ισοδύναμο με isCompleted() && isPartiallyValidated().
   */
  isValidated() {
    return this.validate().length === 0;
  }
}

/**
 * ResponseResults — στατιστικά ενός Response.
 * Προσπελαύνεται ως namespace: `response.results.all()`, `.bySection()`, `.byTag()`.
 * Κάθε αντικείμενο stats: { score, maxScore (μόνο απαντημένων — ο κλειδωμένος
 * κανόνας), maxScoreTotal (όλων), answered, scorable, percentage, progress }.
 */
class ResponseResults {
  /** @param {Response} response */
  constructor(response) {
    this._r = response;
  }

  /**
   * Στατιστικά για ένα σύνολο ερωτήσεων.
   * ΚΑΝΟΝΑΣ: μόνο οι απαντημένες μετρούν σε score & maxScore (βλ. NOTES.md).
   * Το maxScoreTotal (όλες οι βαθμολογούμενες) δίνεται για πληρότητα.
   */
  _stats(questions) {
    const stats = {
      score: 0,
      maxScore: 0,       // μόνο απαντημένων
      maxScoreTotal: 0,  // όλων των βαθμολογούμενων
      answered: 0,
      scorable: 0,
      percentage: null,  // score / maxScore (απαντημένων)
      progress: null,    // answered / scorable
    };
    for (const q of questions) {
      if (!q.isScorable) continue;
      stats.scorable++;
      stats.maxScoreTotal += q.maxScore;
      const score = q.scoreFor(this._r.entry(q.id));
      if (score !== null) {
        stats.answered++;
        stats.score += score;
        stats.maxScore += q.maxScore;
      }
    }
    if (stats.maxScore > 0) stats.percentage = (stats.score / stats.maxScore) * 100;
    if (stats.scorable > 0) {
        stats.progress = stats.answered / stats.scorable;
        stats.progressPercent = Math.ceil(stats.progress * 100);
    }
    return stats;
  }

  /** Συνολικά αποτελέσματα. */
  all() {
    return this._stats(this._r.questionnaire.allQuestions());
  }

  /** Αποτελέσματα ανά ενότητα: [{ id, title, ...stats }]. */
  bySection() {
    return this._r.questionnaire.sections.map((s) => ({
      id: s.id,
      title: s.title,
      ...this._stats(s.allQuestions()),
    }));
  }

  /**
   * Αποτελέσματα ανά tag — ΟΛΑ τα tags του ερωτηματολογίου (με σειρά πρώτης
   * εμφάνισης): [{ tag, ...stats }]. Συμμετρικό με το bySection().
   */
  byTag() {
    const questions = [...this._r.questionnaire.allQuestions()];
    const tags = [];
    for (const q of questions)
      for (const t of q.tags) if (!tags.includes(t)) tags.push(t);
    return tags.map((tag) => ({
      tag,
      ...this._stats(questions.filter((q) => q.hasTag(tag))),
    }));
  }
}

/**
 * Response — οι απαντήσεις ενός χρήστη σε ένα Questionnaire.
 *
 * Τα δεδομένα ζουν σε ΕΝΑ plain object (this.data), έτοιμο για JSONB:
 *   {
 *     questionnaire: "cybersecurity-self-assessment",   // το code του Questionnaire
 *     answers: {
 *       "1.1": { answerId: 2, comment: "...", files: ["a.pdf"] }, // choice
 *       "9.4": { text: "..." }                                    // text
 *     }
 *   }
 * Η κλάση προσφέρει μόνο συμπεριφορά — ΟΛΗ η κατάσταση είναι στο this.data.
 *
 * Το API είναι οργανωμένο σε τρία επίπεδα:
 *   - top-level: εγγραφή & core — answer(), setText(), setComment(),
 *     setFiles(), entry(), isAnswered(), scoreOf(), toJSON()
 *   - .status  : isStarted(), isCompleted(), pendingAnswers(),
 *                isPartiallyValidated(), validate(), isValidated()
 *   - .results : all(), bySection(), byTag()
 */
class Response {
  /**
   * @param {Questionnaire} questionnaire
   * @param {object} [data]  υπάρχον plain object (π.χ. από PostgreSQL/JSON.parse)
   */
  constructor(questionnaire, data) {
    this.questionnaire = questionnaire;
    this.data = data || { questionnaire: questionnaire.code, answers: {} };
    if (!this.data.answers) this.data.answers = {};
    if (this.data.questionnaire !== questionnaire.code)
      throw new Error(
        `Το response ανήκει στο "${this.data.questionnaire}", όχι στο "${questionnaire.code}".`
      );
    this.status = new ResponseStatus(this);
    this.results = new ResponseResults(this);
  }

  /** Η ερώτηση για ένα id — με έλεγχο ύπαρξης. */
  _question(questionId) {
    const q = this.questionnaire.byId(questionId);
    if (!q) throw new Error(`Άγνωστη ερώτηση: "${questionId}"`);
    return q;
  }

  /** Το entry απάντησης μιας ερώτησης (ή undefined). */
  entry(questionId) {
    return this.data.answers[String(questionId)];
  }

  _entryFor(questionId) {
    const key = String(questionId);
    return (this.data.answers[key] = this.data.answers[key] || {});
  }

  /** Απάντηση σε choice ερώτηση με answerId από το AnswerSet της. */
  answer(questionId, answerId) {
    const q = this._question(questionId);
    if (q.type !== "choice")
      throw new Error(`Η ερώτηση "${q.id}" (${q.type}) δεν δέχεται answerId.`);
    if (!q.answers.byId(answerId))
      throw new Error(`Μη έγκυρο answerId ${answerId} για την ερώτηση "${q.id}".`);
    this._entryFor(questionId).answerId = answerId;
    return this;
  }

  /** Απάντηση σε text ερώτηση. */
  setText(questionId, text) {
    const q = this._question(questionId);
    if (q.type !== "text")
      throw new Error(`Η ερώτηση "${q.id}" (${q.type}) δεν δέχεται ελεύθερο κείμενο.`);
    this._entryFor(questionId).text = text;
    return this;
  }

  /** Παρατηρήσεις Οργανισμού — μόνο αν η ερώτηση δηλώνει πεδίο `comment`. */
  setComment(questionId, comment) {
    const q = this._question(questionId);
    if (!q.comment)
      throw new Error(`Η ερώτηση "${q.id}" δεν δηλώνει πεδίο comment.`);
    this._entryFor(questionId).comment = comment;
    return this;
  }

  /** Ονόματα ανεβασμένων αρχείων — μόνο αν η ερώτηση δηλώνει `files:true`. */
  setFiles(questionId, filenames) {
    const q = this._question(questionId);
    if (!q.files)
      throw new Error(`Η ερώτηση "${q.id}" δεν δηλώνει πεδίο files.`);
    if (!Array.isArray(filenames) || !filenames.every((f) => typeof f === "string"))
      throw new Error(`Τα files της ερώτησης "${q.id}" πρέπει να είναι array από filenames (strings).`);
    this._entryFor(questionId).files = filenames;
    return this;
  }

  /** True αν η ερώτηση έχει πραγματική απάντηση (όχι id:0 / κενό κείμενο). */
  isAnswered(questionId) {
    const q = this._question(questionId);
    const e = this.entry(questionId);
    if (!e) return false;
    if (q.type === "choice") return q.answers.isAnswered(e.answerId);
    if (q.type === "text") return typeof e.text === "string" && e.text.trim() !== "";
    return false;
  }

  /** Score μιας ερώτησης (null αν αναπάντητη/μη βαθμολογούμενη). */
  scoreOf(questionId) {
    return this._question(questionId).scoreFor(this.entry(questionId));
  }

  /** Το JSONB-ready plain object — αυτό αποθηκεύεται στην PostgreSQL. */
  toJSON() {
    return this.data;
  }
}

// Expose global variables for browser usage
if (typeof window !== "undefined" && globalThis == window) {
  globalThis.Questionnaire = Questionnaire;
}

export default Questionnaire;
