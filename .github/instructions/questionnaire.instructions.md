---
description: "Use when working on questionnaire functionality, questionnaire flows, answers, scoring, or files with questionnaire/questionaire in their path."
applyTo: "**/*questionnaire*,**/*questionaire*"
---


# Σημειώσεις σχεδιασμού — Σύστημα δυναμικών ερωτηματολογίων

Αρχείο εργασίας για αποφάσεις/συμβάσεις που πρέπει να θυμόμαστε, ειδικά όταν
γράψουμε τον JS κώδικα που μετατρέπει τα JSON αντικείμενα σε HTML (Bootstrap) φόρμες.

## Σύντομο checklist

- Κράτα το `questionnaire.js` ως γενικό, επαναχρησιμοποιήσιμο πυρήνα χωρίς questionnaire-specific data.
- To `questionnaire.js` είναι αρχείο που χρησιμοποιείται και στο node.js αλλά και σερβίρεται στον browser ως αρχείο JavaScript (ως ES6 module). 
- Το module κάνει default export ολόκληρη την κλάση: `import Questionnaire from "./questionnaire.js"`. Μην χρησιμοποιείς named import `{ Questionnaire }`.
- Χρησιμοποίησε τα δημόσια static μέλη `Questionnaire.validateAnswerSet`, `Questionnaire.defaultActions` και `Questionnaire.filterOutPrivate` — όχι ξεχωριστά imports ή globals.
- Βάλε τα δεδομένα κάθε ερωτηματολογίου σε ξεχωριστό αρχείο τύπου `cybersecurity.js`, `vendor-assessment.js` ή στη βάση δεδομένων.
- Χτίζε πάντα το questionnaire από καθαρό JSON definition + ξεχωριστά answer templates.
- Το `actions` είναι αποκλειστικά διατεταγμένο array. Η σειρά των στοιχείων είναι η σειρά εμφάνισης των κουμπιών και το `action.name` είναι το αναγνωριστικό της ενέργειας. Παλιό object δεν υποστηρίζεται.
- Θεώρησε το `id: 0` / `value: null` ως το μοναδικό sentinel για `not answered`.
- Μην προσθέτεις validation τύπων στον πυρήνα· το `validation` είναι hint μόνο για client-side HTML form validation.
- Για submit έλεγχε `response.status.isValidated()`· το draft save επιτρέπεται και χωρίς πλήρη κάλυψη.
- Στο Alpine, κάνε reactive το plain `response.data`, όχι το `Response` instance. Ως παράδειγμα χρήσης σε view, δες το `views\organizations\self-assessment\self-assessment.hbs`.
- Το προαιρετικό boolean `private` σε ενότητες και ερωτήσεις έχει default `false` και αποτελεί κανόνα ορατότητας του backend, όχι του front-end.
- Όταν ο χρήστης δεν πρέπει να βλέπει private περιεχόμενο, το backend στέλνει φιλτραρισμένο definition και αντίστοιχα φιλτραρισμένο response. Η φόρμα και τα στατιστικά λειτουργούν πάνω σε αυτά σαν οι private ερωτήσεις να μην υπήρξαν ποτέ.

## Οργάνωση αρχείων (κλειδωμένη)

| Αρχείο | Ρόλος |
|--------|-------|
| `questionnaire.js` | **Επαναχρησιμοποιήσιμος πυρήνας** — default export μόνο η `Questionnaire`. Οι υπόλοιπες κλάσεις και helpers (`AnswerSet`, `Section`, `Question`, `Response`, `ResponseStatus`, `ResponseResults`, sentinel και builders) είναι εσωτερικά στοιχεία του module. Τα δημόσια utilities εκτίθενται ως static μέλη της `Questionnaire`. Κανένα δεδομένο συγκεκριμένου ερωτηματολογίου. Μεταφέρεται αυτούσιο σε άλλα projects. |
| `public/js/questionnaire-form.js` | **Alpine adapter** (ComplyHub) — η κοινή x-data factory `questionnaireForm(record, responseData, config?)` για ΟΛΑ τα views με φόρμα ερωτηματολογίου. Φορτώνεται στο layout (μετά το alpine-ch.js, πριν το Alpine). Βλ. «Κοινή factory» παρακάτω. |

## Ροή δεδομένων (κλειδωμένη): καθαρό JSON → κλάσεις

Το αρχείο κάθε ερωτηματολογίου έχει ΤΡΙΑ μέρη — τα 2 πρώτα είναι ΣΚΕΤΑ
δεδομένα, όπως θα αποθηκεύονται στην PostgreSQL (JSONB/ARRAY) ή θα γίνονται
paste σε textarea:

1. **`cybersecurityAnswers`** — array με τα answer sets:
   `[{ name: "YesNo", options: [{id,label,value}, …] }, …]`
   - **ΧΩΡΙΣ το NOT_ANSWERED (id:0)** — το προσθέτει πάντα η `AnswerSet`
     αυτόματα ως πρώτη επιλογή (κι αν δοθεί id:0, αγνοείται).
   - Το `toJSON()` του set επιστρέφει επίσης χωρίς το sentinel → καθαρό
     round-trip: δεδομένα → κλάση → JSON → ίδια δεδομένα.
2. **`cybersecurityQuestionnaire`** — object με ενότητες/ερωτήσεις:
   - top-level **`code`** (όχι id) — το domain αναγνωριστικό, βλ.
     «Ονοματολογία αναγνωριστικών» παρακάτω.
   - top-level **`content`** — το πραγματικό περιεχόμενο: array από plain
     section objects με τα `questions` τους. Χρησιμοποίησέ το σε νέα
     definitions, imports και exports. ΜΗ χρησιμοποιείς `sections` σε νέο
     definition. Το `sections` είναι η εσωτερική αναπαράσταση του
     `Questionnaire` με instances `Section`. Ο constructor το δέχεται ακόμη
     ως legacy alias εισόδου, αλλά αν δοθούν και τα δύο υπερισχύει το `content`.
   - `answers` = **STRING** (π.χ. `"YesNo"`) — ποτέ αναφορά σε αντικείμενο,
     αφού ερωτήσεις και απαντήσεις δηλώνονται/αποθηκεύονται ανεξάρτητα.
   - `required` υπάρχει σε κάθε ερώτηση (προς το παρόν παντού `true`).
3. **Ένωση**: `new Questionnaire(questionnaireDef, { templates: answersArray })`
   - Η `buildAnswerTemplates()` δέχεται array `[{name, options}]` ή object
     `{name: options}` και χτίζει το registry από AnswerSets.
   - Το resolved registry είναι διαθέσιμο ως `questionnaire.templates`.
   - Άγνωστο string στο `answers` μιας ερώτησης → σφάλμα στην κατασκευή.

### Ιδιωτικότητα (`private`) — ευθύνη του backend

- Κάθε ενότητα και κάθε ερώτηση μπορεί να έχει προαιρετικό boolean `private`.
  Αν το πεδίο λείπει, θεωρείται `false`.
- Ενότητα με `private: true` κάνει ιδιωτικό όλο το περιεχόμενό της. Αν μια
  ερώτηση ή ένα group είναι private, είναι ιδιωτικό και όλο το περιεχόμενο
  που βρίσκεται κάτω από αυτό. Το `private: false` σε παιδί δεν αναιρεί την
  ιδιωτικότητα ιδιωτικού γονέα.
- Η απόφαση αν θα εμφανιστούν όλα ή μόνο τα μη ιδιωτικά στοιχεία λαμβάνεται
  αποκλειστικά στο backend. Όταν δεν επιτρέπεται η προβολή private περιεχομένου,
  το backend το αφαιρεί αναδρομικά από το definition **πριν** το στείλει στον
  browser. Η απόκρυψη μόνο με JavaScript ή CSS δεν αποτελεί έλεγχο πρόσβασης.
- Μαζί με το definition, το backend φιλτράρει και το αποθηκευμένο
  `response.data.answers`, ώστε να μη σταλούν απαντήσεις private ερωτήσεων και
  να μη θεωρηθούν από το `Response` απαντήσεις σε άγνωστα IDs.
- Για αυτό το φιλτράρισμα χρησιμοποίησε τη static μέθοδο:

  ```js
  const {
    filteredSectionsArray,
    filteredAnswersObj,
  } = Questionnaire.filterOutPrivate(sectionsArray, response.data.answers);
  ```

  Το `sectionsArray` είναι το plain array ενοτήτων (π.χ. το `definition.content`)
  και το `answersObj` είναι μόνο το object `response.data.answers`, με κλειδιά
  τα IDs των ερωτήσεων — όχι JSON strings και όχι ολόκληρο το response.
- Η `filterOutPrivate()` δημιουργεί νέα sections, questions και answer entries,
  χωρίς να μεταβάλλει ή να επιστρέφει κοινές nested αναφορές με τα αρχικά
  δεδομένα. Αφαιρεί αναδρομικά private sections/questions/groups, θεωρεί private
  ολόκληρο το υποδέντρο private γονέα και κρατά answers μόνο για τις ορατές,
  απαντήσιμες ερωτήσεις. Άγνωστα answer IDs και entries για groups δεν περνούν.
- Αν το `private` υπάρχει με τιμή που δεν είναι boolean ή οι παράμετροι δεν
  έχουν την αναμενόμενη μορφή array/object, η μέθοδος αποτυγχάνει με `TypeError`
  αντί να κινδυνεύσει να εμφανίσει περιεχόμενο με ασαφή ιδιωτικότητα.
- Το front-end δημιουργεί το `Questionnaire` και το `Response` μόνο από το
  φιλτραρισμένο payload. Δεν φιλτράρει, δεν αποθηκεύει και δεν στέλνει το
  `private`. Έτσι validation, completion, progress, scores και όλα τα υπόλοιπα
  στατιστικά υπολογίζονται σαν οι ερωτήσεις που αφαιρέθηκαν να μην υπήρξαν ποτέ.
- Στο save/submit, το backend δέχεται απαντήσεις μόνο για ερωτήσεις που ο
  συγκεκριμένος χρήστης επιτρέπεται να βλέπει. Αν ενημερώνεται υπάρχον response,
  συγχωνεύει τις ορατές απαντήσεις χωρίς να διαγράφει τυχόν αποθηκευμένες
  απαντήσεις private ερωτήσεων που δεν περιλαμβάνονταν στο φιλτραρισμένο payload.
- Αν στο μέλλον χρειαστεί διαφορετική εμφάνιση των private ερωτήσεων όταν
  επιτρέπεται να σταλούν όλες, το front-end μπορεί κατ’ εξαίρεση να διαβάζει το
  `private` μόνο για παρουσίαση (π.χ. CSS class ή badge). Η λογική του
  `questionnaire.js`, του response και των στατιστικών δεν αλλάζει. Όταν το
  backend έχει αφαιρέσει τις private ερωτήσεις, το front-end δεν μπορεί και δεν
  πρέπει να γνωρίζει ότι υπήρχαν.

### Override του NOT_ANSWERED (προαιρετικό)

Το sentinel μπορεί να παραμετροποιηθεί **μέσα στο array των απαντήσεων**, με
entry που έχει το δεσμευμένο όνομα `"not_answered"` (σταθερά
`NOT_ANSWERED_NAME` στον πυρήνα):

```js
const answers = [
  { name: "not_answered", options: [{ label: "Άγνωστο / δεν απαντήθηκε" }] },
  { name: "YesNo", options: [ /* … */ ] },
  // …
];
```

- Το `options[0]` του γίνεται το sentinel ΟΛΩΝ των sets του ερωτηματολογίου.
- Τα `id: 0` και `value: null` **επιβάλλονται πάντα** (ακόμα κι αν δοθούν
  άλλα) — μόνο το label (και τυχόν extra πεδία) περνούν από το override.
  Έτσι η λογική «αναπάντητο = id 0 / value null» μένει άθικτη.
- Το entry αυτό ΔΕΝ γίνεται επιλέξιμο set (δεν μπαίνει στο registry).
- Χωρίς τέτοιο entry ισχύει το default: `Δεν απαντήθηκε`.
- Στην πράξη, το label του `not_answered` είναι αυτό που χρησιμοποιεί η
  `questionnaire.language()` για να καθορίσει τη γλώσσα. Ο απλούστερος τρόπος
  αλλαγής της γλώσσας ενός ερωτηματολογίου είναι να δηλωθεί το `not_answered`
  με label στην επιθυμητή γλώσσα. Αν παραλειφθεί, το παραπάνω ελληνικό fallback
  έχει ως αποτέλεσμα γλώσσα `el`.

## Ανασύσταση από αποθηκευμένα δεδομένα (PostgreSQL)

Όλα ξαναχτίζονται από τα 3 αποθηκευμένα JSON (ορισμός, απαντήσεις-sets,
response). Προσοχή: ο ορισμός ΜΟΝΟΣ του δεν αρκεί — επειδή τα `answers` των
ερωτήσεων είναι strings, χρειάζεται πάντα και το array των answer sets:

```js
const q = new Questionnaire(questionnaireJson, { templates: answersJson });
const r = q.createResponse(responseJson);   // ή new Response(q, responseJson)
const empty = q.createResponse();           // νέο, κενό response
```

Το `createResponse(data)` ελέγχει ότι `data.questionnaire === q.code` (σφάλμα αν
το response ανήκει σε άλλο ερωτηματολόγιο). Αποθήκευση: `JSON.stringify(r)` →
JSONB (μέσω του `toJSON()` βγαίνει πάντα το καθαρό plain object).

### Χρήσιμες μέθοδοι — κυρίως στατιστικά

Το API του Response είναι οργανωμένο σε **namespaces** (`.status`, `.results`)
— εσωτερικές κλάσεις `ResponseStatus`/`ResponseResults`, φτιάχνονται στον
constructor και ΔΕΝ σειριοποιούνται (το `toJSON()` βγάζει μόνο το data):

```js
r.scoreOf("1.8")                // score μίας ερώτησης (null = αναπάντητη)

r.results.all()                 // συνολικά stats
r.results.bySection()           // array stats ανά ενότητα (+ id, title)
r.results.byTag()               // array stats για ΟΛΑ τα tags (+ tag)
                                // συμμετρικό με το bySection (σειρά πρώτης εμφάνισης)

r.status.isStarted()            // ≥1 ΠΡΑΓΜΑΤΙΚΗ απάντηση: choice με id≠0 ή text μη κενό
                                // Όχι id:0, ΟΧΙ entry μόνο με comment/files
r.status.isCompleted()          // ΚΑΛΥΨΗ: όλες οι required απαντημένες 
                                // (με πραγματική απάντηση, πχ id≠0 ή text μη κενό)
r.status.pendingAnswers()       // flat array με τα ids των required που ΔΕΝ έχουν
                                // απαντηθεί ακόμη (χωρίς sections), με τη σειρά του
                                // ερωτηματολογίου. Κενό array ⟺ isCompleted()
r.status.isPartiallyValidated() // ΟΡΘΟΤΗΤΑ: οι απαντήσεις ανήκουν στις επιτρεπτές
                                // επιλογές του set (το id:0 ΠΑΝΤΑ επιτρεπτό — υπάρχει
                                // σε κάθε set). ΜΟΝΟ αυτό — όχι έλεγχος μορφής/τύπων.
r.status.validate()             // δίνει [] ή [{id, kind, reason}] για κάθε παράβαση
r.status.isValidated()          // ΟΛΑ: καμία παράβαση (validate().length===0) 
                                // isValidated() ⟺ isCompleted() && isPartiallyValidated()
                                // Μπορεί να υποβληθεί ως οριστική απάντηση
                                // (η αποθήκευση draft επιτρέπεται σε κάθε κατάσταση)
```

Τρεις άξονες, όλοι φίλτρα πάνω στο ίδιο `validate()` (typed problems με
`kind`):

- `isCompleted` = **κάλυψη** — καμία `kind:"required"` (απαντήθηκαν όλα τα required).
- `isPartiallyValidated` = **ορθότητα συμπληρωμένων** — καμία `kind:"invalid"`
  (ό,τι έχει απαντηθεί είναι έγκυρο, αγνοεί ό,τι λείπει).
- `isValidated` = **όλα** — `validate()` κενό. Ισχύει πάντα η ταυτότητα
  `isValidated() ⟺ isCompleted() && isPartiallyValidated()`, άρα το «έτοιμο για
  υποβολή» είναι το ίδιο το `isValidated()`.

Τι σημαίνει «ορθότητα» (κλειδωμένο): **η απάντηση ανήκει στις επιτρεπτές** —
κάθε choice entry με `answerId` να δείχνει σε υπαρκτή επιλογή του set (το
**id:0 ΠΑΝΤΑ επιτρεπτό** — η AnswerSet το προσθέτει σε κάθε set· απλώς μετράει
ως αναπάντητο στην κάλυψη), και κάθε entry να αντιστοιχεί σε ερώτηση του
ορισμού. Πιάνει αλλοιωμένα/ξεπερασμένα δεδομένα φορτωμένα από αποθήκευση (ο
constructor του `Response` ΔΕΝ ελέγχει το data)· για responses φτιαγμένα μέσω
`answer()` είναι πάντα κενό.

### ΑΠΟΦΑΣΗ — validation τύπων ΜΟΝΟ client-side

Ο πυρήνας του questionnaire ΔΕΝ ελέγχει (ούτε προγραμματίζεται να ελέγχει) μορφή/τύπο τιμών
(π.χ. email, number στα type:text). Το πεδίο `validation` της ερώτησης είναι
σκέτο **hint προς την HTML φόρμα**, η οποία θα κάνει τον έλεγχο στον client
(HTML/JavaScript) — για απλοποίηση του κώδικα. Σκοπός του: η **διευκόλυνση**
των συνεργατών που συμπληρώνουν (π.χ. να δουν ότι το email έχει λάθος μορφή),
ΟΧΙ η θωράκιση από παράτυπες απαντήσεις — τα ερωτηματολόγια απευθύνονται σε
συνεργάτες, όχι στο ευρύ κοινό.


Κάθε αντικείμενο stats περιέχει:

| Πεδίο | Σημασία |
|-------|---------|
| `score` | Σ (weight × value) των απαντημένων |
| `maxScore` | Σ maxScore **μόνο των απαντημένων** (ο κλειδωμένος κανόνας) |
| `maxScoreTotal` | Σ maxScore **όλων** των βαθμολογούμενων (όπως το Excel) |
| `answered` / `scorable` | πλήθη ερωτήσεων |
| `percentage` | `score / maxScore × 100` (null αν τίποτα απαντημένο) |
| `progress` | `answered / scorable` (πρόοδος συμπλήρωσης, 0..1) |

## Ορολογία (κλειδωμένη)

| Όρος     | Πού ανήκει   | Σημασία |
|----------|--------------|---------|
| `weight` | στην ερώτηση | βαρύτητα ερώτησης (1..3) |
| `value`  | στην απάντηση| πολλαπλασιαστής βαθμολογίας |
| `score`  | υπολογιζόμενο| `score = weight × value` |

- `maxScore` ερώτησης = `weight × answerSet.maxValue`.
  **Παράγωγο — ΔΕΝ αποθηκεύεται πουθενά.** Υπολογίζεται όταν χρειαστεί.
- Συνολικό score = άθροισμα των `score` όλων των απαντημένων ερωτήσεων.
- Ποσοστό = `Σ score / Σ maxScore`.

## Απαντήσεις

- Σχήμα απάντησης: `{ id, label, value }`.
  - Χρησιμοποιούμε `label` (όχι `text`) — ταιριάζει με την ορολογία φόρμας.
- Τα πρότυπα δηλώνονται ως καθαρά δεδομένα στο αρχείο του εκάστοτε
  ερωτηματολογίου και η ερώτηση τα επιλέγει με string: `answers: "YesNo"`
  (βλ. «Ροή δεδομένων» παραπάνω).
- Απόφαση Α (επιλεγμένη): **ένα template ανά λεκτικό**, ακόμη κι αν δύο
  template μοιράζονται την ίδια κλίμακα τιμών. Λόγος: αναγνωσιμότητα + απλός
  μετατροπέας. Η επανάληψη των value είναι ελεγχόμενη.

### Κλάση `AnswerSet` (επιλεγμένη)

Κάθε template απάντησης είναι instance της κλάσης `AnswerSet(name, options)`, 
όχι σκέτο array. Λόγος: καθαρός χώρος για παράγωγη λογική + μελλοντική 
επέκταση, ενώ τα δεδομένα (`options`) μένουν απλά αντικείμενα.

Δημόσια επιφάνεια (πάνω σε αυτήν να στηρίζεται ο μετατροπέας φόρμας):

| Μέλος            | Τι κάνει |
|------------------|----------|
| `.name`          | αναγνωριστικό set |
| `.options`       | το array επιλογών `{id,label,value}` |
| `.maxValue`      | getter: μέγιστο value (αγνοεί την κενή `value:null`) |
| `.byId(id)`      | επιλογή με το id (ή `undefined`) |
| `.isAnswered(id)`| `true` αν το id είναι πραγματική (απαντημένη) επιλογή |
| `for…of`         | iterable πάνω στις επιλογές (για render της φόρμας) |
| `.toJSON()`      | σειριοποίηση σε καθαρό array επιλογών |

> Ο μετατροπέας σε HTML να χρησιμοποιεί `.options` ή `for…of` — ΟΧΙ να υποθέτει
> ότι το set είναι array (δεν είναι· είναι instance με iterator).

### Διαθέσιμα templates και κλίμακες

| Template           | Επίπεδα | values (πέρα από το id:0) | max value |
|--------------------|---------|---------------------------|-----------|
| `YesNo`            | 2       | Όχι=0, Ναι=3              | 3 |
| `ImplementationApplications` | 4       | 0,1,2,3                   | 3 |
| `ImplementationSystems`      | 4       | 0,1,2,3                   | 3 |
| `Degree`           | 4       | 0,1,2,3                   | 3 |
| `Policy`           | 5       | 0,1,2,3,4                 | 4 |
| `PolicyProcedure`       | 5       | 0,1,2,3,4                 | 4 |

> Προσοχή: το **max value ΔΕΝ είναι σταθερό** (3 για τα περισσότερα, 4 για τα
> Policy). Άρα ο υπολογισμός maxScore πρέπει να διαβάζει το πραγματικό μέγιστο
> value του template — να ΜΗΝ θεωρηθεί σταθερά π.χ. ×3.

## Προεπιλεγμένη / κενή απάντηση — `{ id: 0, value: null }`

- Δεσμευμένο sentinel `id: 0` σε **όλα** τα templates = "δεν απαντήθηκε /
  έλλειψη / άγνωστη απάντηση".
- `value: null` (όχι 0) ώστε να ξεχωρίζει το «δεν απάντησε» από πραγματικό
  scored 0 (π.χ. «Όχι»).
- Στον υπολογισμό score: το `id:0` (value null) **δεν προσμετράται** ούτε στο
  score ούτε στο maxScore (η ερώτηση θεωρείται αναπάντητη).

### Κανόνας validation για required

- Αν `required: true` στην ερώτηση, η επιλογή `id:0` **δεν** είναι έγκυρη
  υποβολή → η φόρμα πρέπει να μπλοκάρει/σημαίνει σφάλμα.
- Αν `required: false`, το `id:0` επιτρέπεται και η ερώτηση αγνοείται στο score.

## Δομή ερωτηματολογίου (questionnaire.js) — ΚΛΕΙΔΩΜΕΝΗ

Κλάσεις: `Questionnaire` → `Section[]` → `Question[]`, συν `Response`.
Όλες χτίζονται από plain JSON-συμβατά αντικείμενα (ο constructor δέχεται defs).
Το public `definition.content` είναι array από plain section objects, ενώ το
`questionnaire.sections` είναι το εσωτερικό array από `Section` instances.
Το `questionnaire.content` δίνει facade ως νέο array από plain JSON-compatible
objects. Το `content` είναι το canonical πεδίο του definition: χρησιμοποιείται
σε κάθε νέο definition και σε κάθε εγγραφή/serialization (`Questionnaire.toJSON()`
γράφει `content`). Το `sections` δεν χρησιμοποιείται για write σε definitions,
αλλά παραμένει το φυσικό runtime όνομα για ανάγνωση και loops στον κώδικα του
front-end, π.χ. `questionnaire.sections`, όταν αυτό είναι πιο κατανοητό. Ο
constructor δέχεται ακόμη `sections` ως legacy alias εισόδου, με προτεραιότητα
στο `content` όταν υπάρχουν και τα δύο.

Διάσχιση ερωτήσεων μιας ενότητας (`Section`) — ίδια σειρά (depth-first, όπως
στον ορισμό) και στις δύο:

- `section.allQuestions()` — generator με ΟΛΕΣ τις ερωτήσεις (groups + παιδιά).
- `section.flattenQuestions()` — επίπεδη λίστα `[{q, depth}]` για render της
  φόρμας (το depth δίνει την εσοχή των υπο-ερωτήσεων των groups) — έτοιμη για
  `x-for` του Alpine χωρίς αναδρομικά templates (βλ. συμβάσεις μετατροπέα).

### Ονοματολογία αναγνωριστικών: `code` vs `id` (κλειδωμένη)

- Το ερωτηματολόγιο έχει **`code`** (string, π.χ.
  `"cybersecurity-self-assessment"`) — ΟΧΙ id. Ταυτίζεται με τη στήλη `code`
  του πίνακα `questionnaires` (βλ. `notes-for-database-tables.md`). Η λέξη
  `id` σημαίνει πάντα το τεχνικό (ακέραιο) κλειδί της βάσης — ο πυρήνας δεν
  το γνωρίζει καν.
- Ενότητες/ερωτήσεις/επιλογές κρατούν **`id`** — ΕΣΩΤΕΡΙΚΑ αναγνωριστικά του
  ορισμού (π.χ. `"1.1"`), δεν αντιστοιχούν σε οντότητες βάσης.
- Το `data.questionnaire` κάθε response κρατά το **code**· ο constructor του
  `Response` ελέγχει `data.questionnaire === questionnaire.code`.
- ΚΑΜΙΑ μεταβατική συμβατότητα με παλιό `id` σε ορισμούς (το σύστημα
  χτίζεται τώρα) — ορισμός χωρίς `code` είναι σφάλμα κατασκευής.

### Ενέργειες φόρμας (`actions`) — στον ΟΡΙΣΜΟ, όχι στα opts

Ο ορισμός του ερωτηματολογίου (το `def`, πρώτο όρισμα) δέχεται προαιρετικό
πεδίο `actions` — διατεταγμένο array με τα κουμπιά ενεργειών που θα render-άρει
η φόρμα. H default μέθοδος για τα κουμπια είναι `POST`. Η σειρά των στοιχείων του array είναι η σειρά εμφάνισης των κουμπιών:

```js
actions: [
  { name: "cancel", text: "Ακύρωση", color: "secondary" },
  { name: "save", path: "/save", text: "Προσωρινή Αποθήκευση", color: "success" },
  { name: "submit", path: "/submit", text: "Οριστική υποβολή", color: "primary" },
]
```

- Κάθε στοιχείο του array = μία ενέργεια/κουμπί. Το `name` είναι το αναγνωριστικό
  της ενέργειας και ακολουθούν συνήθως `path` (endpoint που χτυπά η φόρμα),
  `text` (λεκτικό κουμπιού) και `color` (Bootstrap variant). Η δεσμευμένη action
  με `name: "cancel"` δεν χρειάζεται `path`: εκτελεί `history.back()` στον
  browser, χωρίς validation ή POST. Πέρα από την υποχρεωτική array μορφή, ο
  πυρήνας δεν κάνει validation του περιεχομένου των στοιχείων — κάθε ενέργεια
  μπορεί να έχει όποια επιπλέον keys χρειάζεται η φόρμα (π.χ. `icon`, `confirm`).
- **Καμία μεταβατική συμβατότητα**: object με ονόματα ενεργειών ως κλειδιά δεν
  υποστηρίζεται. Το `buildActions()` απαιτεί array και αποτυγχάνει με `TypeError`
  όταν το `def.actions` έχει την παλιά object μορφή.
- **Απόφαση — ζει στο `def`**, όχι στο δεύτερο όρισμα (`opts`): είναι δηλωτικό
  περιεχόμενο της φόρμας (όπως τα `validation`/`comment`/`files`) και
  αποθηκεύεται μαζί με τον ορισμό στην JSONB — η ανασύσταση από την PostgreSQL
  δίνει τα ίδια κουμπιά χωρίς τρίτο αποθηκευμένο αντικείμενο. Το `opts` μένει
  για ό,τι δηλώνεται/αποθηκεύεται ανεξάρτητα (templates).
- **Όλα-ή-τίποτα (κλειδωμένο)**: αν το `actions` λείψει, ισχύει ΟΛΟΚΛΗΡΟ το
  default (`Questionnaire.defaultActions`: cancel + save + submit, όπως
  παραπάνω). Αν δοθεί, χρησιμοποιείται ΩΣ ΕΧΕΙ — **χωρίς merge ανά ενέργεια**:
  array μόνο με στοιχείο `name: "submit"` σημαίνει φόρμα ΧΩΡΙΣ κουμπιά
  cancel/save. Κενό array = κανένα κουμπί.
- Επεκτάσιμο: ελεύθερα ονόματα ενεργειών στο `name` (π.χ. `print`, `export`) —
  η φόρμα render-άρει ένα κουμπί ανά στοιχείο, ακριβώς με τη σειρά του array.
  Αλλαγή της σειράς των στοιχείων αλλάζει σκόπιμα τη σειρά των κουμπιών.
- Το resolved array είναι διαθέσιμο ως `questionnaire.actions`. Το
  `toJSON()` το γράφει **πάντα** (τα defaults υλοποιούνται ρητά — όπως τα
  `weight`/`required` της Question), ώστε ο αποθηκευμένος ορισμός να είναι
  αυτοτελής και ανεξάρτητος από μελλοντική αλλαγή των defaults του πυρήνα.

### Question

| Πεδίο | Τύπος | Σημείωση |
|-------|-------|----------|
| `id` | string | μοναδικό σε όλο το ερωτηματολόγιο (π.χ. `"1.1"`) — ελέγχεται |
| `text` | string | το κείμενο της ερώτησης |
| `description` | string | επεξήγηση ερώτησης (πχ Bootstrap form-text) — κάθε type, δεν επηρεάζει το answer |
| `type` | `"choice"` (default) / `"group"` / `"text"` | βλ. παρακάτω |
| `answers` | AnswerSet **ή** string όνομα template | μόνο choice· string → επίλυση από `answerTemplates` |
| `weight` | number (default 1) | μόνο choice |
| `required` | boolean (default false) | id:0/κενό κείμενο = άκυρη υποβολή |
| `private` | boolean (default false) | προαιρετικός κανόνας ορατότητας για φιλτράρισμα από το backend· δεν επηρεάζει required, scoring ή άλλη λογική της ερώτησης |
| `comment` | `"text"` / `"textarea"` / false | μόνο choice — δηλώνει πεδίο σχολίου & τύπο input (default false) |
| `files` | boolean (default false) | μόνο choice — δηλώνει upload αρχείων (το entry κρατά `files: [filenames]`) |
| `tags` | string[] | π.χ. `["policies"]` για υπο-scores |
| `validation` | string | hint για HTML φόρμα σε type text (`"email"`, `"number"`…). Αν δεν υπάρχει, τότε χρησιμοποιείται `<textarea>`. |
| `questions` | Question[] | μόνο type group (π.χ. 3.10 → 3.10.1…) |

- **choice**: βαθμολογείται (`score = weight × value`).
- **group**: επικεφαλίδα με υπο-ερωτήσεις, ΔΕΝ απαντιέται/βαθμολογείται.
- **text**: ελεύθερο κείμενο, ΔΕΝ βαθμολογείται.
- Σειριοποίηση ορισμού: το `toJSON()` γράφει το `answers` ως **όνομα** template.

### Response — απαντήσεις χρήστη (χωριστά από τον ορισμό)

Απόφαση: η κατάσταση ζει σε **ένα plain object**, έτοιμο για PostgreSQL
**JSONB**. Η κλάση `Response(questionnaire, data?)` το τυλίγει με
συμπεριφορά — `toJSON()` επιστρέφει πάντα το καθαρό plain object. Το πεδίο
`questionnaire` του data κρατά το **code** του ερωτηματολογίου:

```json
{
  "questionnaire": "cybersecurity-self-assessment",
  "answers": {
    "1.1": { "answerId": 2, "comment": "παρατηρήσεις", "files": ["policy.pdf"] },
    "9.4": { "text": "ελεύθερο κείμενο για type:text" }
  }
}
```

API — top-level μόνο εγγραφή & core, τα υπόλοιπα στα namespaces:

- top-level: `answer(qId, answerId)`, `setText`, `setComment` (Παρατηρήσεις
  Οργανισμού — μόνο αν η ερώτηση δηλώνει `comment`), `setFiles` (ονόματα
  αρχείων — μόνο αν δηλώνει `files:true`), `entry`, `isAnswered`, `scoreOf`,
  `toJSON()`.
- `.status`: `isStarted()`, `isCompleted()`, `pendingAnswers()` (→ flat array
  ids αναπάντητων required, με τη σειρά του ερωτηματολογίου),
  `isPartiallyValidated()`, `validate()` (→ `[{id, kind, reason}]`),
  `isValidated()`.
- `.results`: `all()`, `bySection()`, `byTag()`.

Τα stats (`results()` κ.λπ.) επιστρέφουν: `score`, `maxScore` (μόνο
απαντημένων — ο κλειδωμένος κανόνας), `maxScoreTotal` (όλων, όπως το Excel),
`answered`, `scorable`, `percentage` (score/maxScore), `progress`.

## Αντιστοίχιση με το .xlsm (πηγή αλήθειας)

- Template ανά ερώτηση = το list source του dropdown (στήλες J–O):
  J=YesNo, K=ImplementationApplications, L=ImplementationSystems, M=Degree,
  N=Policy, O=PolicyProcedure.
- «score πολιτικών» (φύλλο Αποτελέσματα) = οι ερωτήσεις Policy/PolicyProcedure
  → `tags: ["policies"]`. Στις ενότητες 1–2: **1.8, 2.1, 2.2**.
- Το `cybersecurity.js` περιέχει πλέον ΚΑΙ ΤΙΣ 19 ενότητες του .xlsm.
- Επιβεβαιωμένα max (test σε Node, 2026-07-10): **σύνολο 1683** — ενότητες:
  1=156, 2=87, 3=129, 4=72, 5=102, 6=69, 7=150, 8=75, 9=114, 10=156, 11=48,
  12=60, 13=54, 14=51, 15=60, 16=81, 17=60, 18=84, 19=75. Tag
  `policies` = 240.

## Demo φόρμα — `cybersecurity.html`

Ο πρώτος μετατροπέας ορισμού → HTML φόρμας. ΕΝΑ αρχείο (χωρίς ξεχωριστά
css/js), Bootstrap 5.3.8 (μόνο CSS) + Alpine.js 3.x από CDN. Ανοίγει και
σκέτο (file://) — δεν χρειάζεται server. Σειρά φόρτωσης: `questionnaire.js`
→ `cybersecurity.js` → inline `<script>` προετοιμασίας → Alpine (defer,
ΤΕΛΕΥΤΑΙΟ). Η λογική ζει στο inline script — τα x-* μένουν απλά bindings.

### Κοινή factory — `public/js/questionnaire-form.js` (ComplyHub)

Στο ComplyHub οι παρακάτω συμβάσεις υλοποιούνται ΜΙΑ φορά, στην κοινή
factory `questionnaireForm(questionnaireRecord, responseData, config?)` —
τα views ΔΕΝ ξαναγράφουν τη λογική:

- `questionnaireRecord`: το record από τη βάση (`.definition` + `.answers`) —
  στέλνεται και ως `questionnaireSnapshot` στα POST των actions.
- `responseData`: το αποθηκευμένο plain data του response, ή `null` για νέο.
- `config` (όλα προαιρετικά, με defaults): `language`
  (`questionnaire.language()`· ρητή τιμή `el`/`en` κάνει override),
  `disablePublicAnswers` (false), `showQuestionScoreBadge` (false),
  `showOptionScore` (false), `maxAnswersShown` (5), `baseUrl` (default: το
  τρέχον path χωρίς κατάληξη `/form` ή `/fill`).
- Χρήση: `x-data="questionnaireForm(rec, data, {…})"` — ή με spread για
  view-specific extras: `x-data="{ ...questionnaireForm(rec, data), … }"`.
  Πολλά ερωτηματολόγια στην ίδια σελίδα = πολλές κλήσεις.
- Παρέχει: `sections` (flattened rows ανά ενότητα), read/write helpers
  (`setChoice`/`setText`/`setComment`/`setFiles`, `textOf`/`commentOf`/
  `filesOf`/`optionLabel`/`hasScore`/`scoreBadge`), validation state
  (`problems`/`isProblem`), status/results (`flags`/`overall`/`perSection`/
  `perTag`/`pct`/`pctOfMax`) και `performAction(action)` (cancel/save/submit από τα
  στοιχεία του διατεταγμένου array `questionnaire.actions`, με αναγνωριστικό το
  `action.name`). Το αν θα γίνουν tabs οι ενότητες είναι θέμα markup του view —
  η factory δεν αλλάζει.
- Debug: εκθέτει `window.questionnaire`/`window.response` (last-one-wins).

### ΚΛΕΙΔΩΜΕΝΕΣ συμβάσεις για κάθε Alpine μετατροπέα

1. **Reactive γίνεται ΤΟ plain data object του Response — ΠΡΙΝ τυλιχτεί**:
   ```js
   const data = Alpine.reactive({ questionnaire: q.code, answers: {} });
   const response = q.createResponse(data);
   ```
   Κάθε εγγραφή μέσω του Response API περνά από το proxy → η φόρμα και τα
   στατιστικά (`.status`/`.results` — παράγωγα) ενημερώνονται αυτόματα,
   χωρίς χειροκίνητο «tick».
2. **Το Response ΔΕΝ μπαίνει στο x-data.** Έχει κυκλικές αναφορές
   (`response.status._r → response`) και το x-data του Alpine κάνει βαθύ
   περπάτημα του αντικειμένου ΧΩΡΙΣ προστασία κύκλων (initInterceptors) →
   stack overflow και το component αποτυγχάνει ΣΙΩΠΗΛΑ (κενή σελίδα, χωρίς
   σφάλμα στην κονσόλα). Το response ζει σε closure του x-data factory. Ο
   ΟΡΙΣΜΟΣ (Questionnaire/Section/Question/AnswerSet) είναι ακυκλικός και
   μπαίνει άφοβα.
3. **Groups χωρίς αναδρομικά templates**: οι ερωτήσεις κάθε ενότητας
   γίνονται επίπεδη λίστα `[{q, depth}]` με τη μέθοδο του πυρήνα
   `section.flattenQuestions()` (κλάση `Section`) — το depth δίνει την
   εσοχή των υπο-ερωτήσεων. ΜΗΝ ξαναγράφεις τοπικό helper στον μετατροπέα.
4. **Reset ΕΠΙΤΟΠΟΥ** (delete των keys του `data.answers` μέσω του proxy),
   ΟΧΙ νέο Response — τα υπάρχοντα bindings παρακολουθούν το παλιό proxy
   και δεν θα έβλεπαν την αντικατάσταση.
5. Στα `<select>` το sentinel id:0 είναι η ΠΡΩΤΗ επιλογή κάθε set — άρα και
   το φυσικό default του browser· τα κουμπιά ενεργειών βγαίνουν δυναμικά από
   το `questionnaire.actions`, με απευθείας διάσχιση του array
   (`x-for="action in actions"`, `:key="action.name"`) και καλούν
   `performAction(action)` με ολόκληρο το στοιχείο. Μην χρησιμοποιείς
   `Object.entries()`, μην περιμένεις το όνομα ως δεύτερη τιμή του `x-for` και
   μην καλείς το factory με σκέτο `action.name`.

Συμπεριφορά ενεργειών στο demo: το `action.name === "cancel"` εκτελεί browser
back χωρίς validation ή POST. Οι υπόλοιπες ενέργειες δεν κάνουν πραγματικό
POST — εμφανίζεται το payload που ΘΑ στελνόταν στο `action.path`. Μόνο το
`action.name === "submit"` απαιτεί `isValidated()` — το draft save επιτρέπεται
σε κάθε κατάσταση.

Επαληθευμένο σε browser (Chromium, 2026-07-10, με τις 19 ενότητες):
1683/1683 με μέγιστες απαντήσεις (234 ερωτήσεις), tag policies 240/240,
κενή υποβολή → 234 προβλήματα `required`, override sentinel
(«Άγνωστο / δεν απαντήθηκε») ορατό στα dropdowns, το `data.questionnaire`
του payload κρατά το code.

## Σύμβαση εξαγωγής

- Το `questionnaire.js` είναι ES module και κάνει default export μόνο την κλάση:

  ```js
  import Questionnaire from "./questionnaire.js";
  ```

  Δεν κάνει named export `{ Questionnaire }` και δεν εξάγει χωριστά helpers,
  constants ή εσωτερικές κλάσεις.
- Στον browser εκθέτει μόνο το `globalThis.Questionnaire`. Δεν υπάρχουν
  χωριστά globals όπως `globalThis.validateAnswerSet`.
- Δημόσια instance method `questionnaire.language()` — επιστρέφει `el` αν το label του sentinel του πρώτου διαθέσιμου answer set (δηλαδή το `Object.values(questionnaire.templates)[0].options[0].label`) περιέχει έστω έναν ελληνικό χαρακτήρα, διαφορετικά `en`.
- Δημόσια static επιφάνεια της κλάσης:
  - `Questionnaire.validateAnswerSet(sectionsJsonText, answersJsonText)` —
    ελέγχει τις string αναφορές answer sets σε δύο JSON strings και επιστρέφει
    `true`, `false` ή `null` για μη αναγνώσιμη/μη αναμενόμενη είσοδο.
  - `Questionnaire.defaultActions` — το διατεταγμένο array των προεπιλεγμένων
    `cancel`, `save` και `submit` actions. Η σειρά του array είναι η σειρά
    εμφάνισης και κάθε στοιχείο φέρει το αναγνωριστικό του στο `name`.
  - `Questionnaire.filterOutPrivate(sectionsArray, answersObj)` — δημιουργεί
    το non-private definition/answers snapshot που επιτρέπεται να σταλεί στον
    browser.
