# Πλάνο για Upload και Διαχείριση Πολιτικών Οργανισμών

## Στόχος

Να υπάρχει ένας κεντρικός κατάλογος `policy_types`, τον οποίο διαχειρίζονται οι admins, και κάθε οργανισμός να διατηρεί το δικό του `policy register` μέσα από org-scoped flow. Ο admin δεν θα έχει ξεχωριστό CRUD για τις πολιτικές οργανισμών, αλλά θα επιλέγει οργανισμό και θα χρησιμοποιεί τα ίδια views με τον manager.

Για το MVP προτείνεται να **μην προδημιουργούνται εγγραφές `Policy` για όλα τα `policy_types`**. Η ενιαία λίστα πολιτικών του οργανισμού θα προκύπτει από τα διαθέσιμα `policy_types` μαζί με τα ήδη υπάρχοντα org policies. Έτσι, αν δεν υπάρχει εγγραφή, η policy εμφανίζεται ως μη ανατεθειμένη. Αν υπάρχει εγγραφή, αυτή καθορίζει το status και τα metadata της.

## Βασικοί Κανόνες Domain

- `PolicyType`: ο κεντρικός κατάλογος standard policy templates.
- `Policy`: η org-owned εγγραφή που αντιπροσωπεύει την πολιτική ενός συγκεκριμένου οργανισμού.
- `non_applicable`: αποθηκευμένο status, όχι απουσία εγγραφής.
- `custom policy`: `Policy` με `policyTypeId = null` και υποχρεωτικό `name`.
- Στο MVP δεν υπάρχει admin review ή approval workflow.
- Κάθε policy του οργανισμού έχει **ένα μόνιμο record** που ενημερώνεται στον χρόνο και δεν δημιουργεί ξεχωριστές version rows.

### Προτεινόμενα stored statuses

- `to_be_created` - `Προς δημιουργία`
- `draft` - `Πρόχειρο`

- `in_implementation` - `Υπό εφαρμογή`
- `active` - `Ενεργή`
- `non_applicable` - `Μη εφαρμόσιμη`
- `archived` - `Αρχειοθετημένη`

Στη βάση θα αποθηκεύονται τα αγγλικά κλειδιά, ενώ στο UI θα γίνεται μετάφραση με βάση το handlebars descriptions (handelbars.js, utils.js).

## Προτεινόμενα computed UI states

- `not_assigned`: όταν δεν υπάρχει org policy record
- `review_due`: όταν έχει περάσει το `reviewDate`

## Ροή Χρήσης

1. Ο admin διαχειρίζεται τον κεντρικό κατάλογο `policy_types`.
2. Ο manager, ή ο admin αφού επιλέξει ενεργό οργανισμό, ανοίγει μία ενιαία λίστα πολιτικών του οργανισμού.
3. Η λίστα δείχνει όλα τα policy types που επιτρέπονται από το scope του χρήστη και, στην ίδια οθόνη, και τυχόν custom policies του οργανισμού.
4. Από κάθε γραμμή ο χρήστης μπορεί να:
   - δημιουργήσει ή να αναθέσει policy,
   - τη δηλώσει ως `non_applicable`,
   - την επεξεργαστεί,
   - δει ή διαχειριστεί τα αρχεία της.
5. Κάθε policy record περιλαμβάνει `version`, `description`, `effectiveDate`, `reviewDate`, `status` και `files`.
6. Στο MVP δεν υπάρχει review ή approval από admin.

## Τεχνική Αρχιτεκτονική

### 1. Data Model - Done

#### `PolicyType`

Προτεινόμενες προσθήκες:

- `active: boolean` με default `true`

Στόχος:

- να μπορείς να αποσύρεις policy types χωρίς να σπάνε οι υπάρχουσες εγγραφές οργανισμών,
- να λειτουργεί σωστά και το υπάρχον cache pattern που φιλτράρει active records.

#### `Policy`

Προτεινόμενες αλλαγές:

- unique index σε `organizationId + policyTypeId`
- προσθήκη `framework` για ευκολότερο filtering στα custom policies
- `policyTypeId` nullable για custom policies

Στόχος:

- μία standard policy ανά οργανισμό και policy type,
- σωστό filtering των custom policies βάσει scope/framework,
- καθαρό query model χωρίς πολύπλοκα joins μόνο και μόνο για framework filtering.

### 2. Access Model και Organization Context - Done

Το feature είναι org-centric, αλλά προς το παρόν η ορατότητα των frameworks μένει user-based:

- όλα τα frameworks είναι globally διαθέσιμα,
- κάθε manager βλέπει μόνο όσα επιτρέπει το `user.scope`.

Προτεινόμενη υλοποίηση:

- reuse του `auth/org.js` για να ορίζεται το ενεργό `req.org`,
- reuse του υπάρχοντος permission model με `manage:org:content` και `manage:any:content`,
- προσθήκη admin organization-switch mechanism που θα θέτει το org cookie.

Σημαντικό:

Ο admin δεν θα έχει ξεχωριστό interface για org policies. Θα λειτουργεί ως manager για τον επιλεγμένο οργανισμό.

### 3. Admin Master Data - Done

Νέο admin CRUD για `policy_types` με fields:

- `framework`
- `code`
- `name`
- `description`
- `default`
- `sequence`
- `active`

Μετά από create/update/delete:

- `Cache.refresh('PolicyType')`

### 4. Organization Policy UX

Νέο org-scoped policy index page για το active org.

Το route είναι το `routes\organizations\modules\policies.js`, το οποίο θα χρησιμοποιείται τόσο από τον manager όσο και από τον admin-as-manager. Αυτό θα είναι ένα Factory Pattern για τη διαχείριση πολιτικών (ώστε να χρησιμοποιείται και από gdpr και από nis2 κλπ). Έχει ήδη δημιουργηθεί η βασική υποδομή σε αυτό το αρχείο. Σε όλα τα paths, θα χρησιμοποιείται το `Cache.table('PolicyType')` ή `Cache.map('PolicyType')` (ανάλογα σε τι μορφή βολεύει τον κώδικα) φίλτραριμένο με βάση το framework (nis2, gdpr κλπ).

Θα υπάρχουν 3 views: `policies`, `single-policy`, `mass-creation`. 

Η σελίδα `policies` θα εμφανίζει:

- τα ήδη υπάρχοντα `Policy` records του οργανισμού σε πίνακα μέσα σε card component, είτε αυτά ανήκουν σε `policy_types` είτε είναι custom policies (δεν χρειάζεται η ένδειξη στον πίνακα, ίσως το policy_type να μπει σε κρυφή στήλη). To query σίγουρα θα είναι left join των `policies` με τα `policy_types`. 
- Κουμπί πάνω δεξιά για δημιουργία νέας πολιτικής, το οποίο ανοίγει το `single-policy` view σε create mode (mode: "create" κατά το res.render).
- Κουμπί πάνω δεξιά "Mαζική δημιουργία" για δημιουργία πολλών πολιτικών στον οργανισμό. Θα ανοίγει το `mass-creation` view, το οποίο θα εμφανίζει form με checkboxes για τα `policy_types`. Όσα τα έχει ήδη ο οργανισμός θα είναι disabled. Όσαν `policy_types` έχουν το πεδίο default true, θα είναι επιλεγμένα, και όσα έχουν default false, δεν θα είναι επιλεγμένα. Τέλος, κουμπί "Δημιουργία επιλεγμένων". Κατά την υποβολή, θα δημιουργούνται `Policy` records για κάθε επιλεγμένο `policyTypeId` με `organizationId` το `req.org` που έχει δημιουργηθεί από το προηγούμενο middleware, `policyTypeId` το id του policy_type, `name` το name του policy_type, `description` το description του policy_type, `status`: `to_be_created`, `framework` το framework του policy_type. Τα υπόλοιπα πεδία κενά. Μετά τη δημιουργία, ο χρήστης θα ανακατευθύνεται πίσω στο `policies` view.

Όσο για το `single-policy` view, θα χρησιμοποιείται τόσο για create όσο και για edit. Θα περιλαμβάνει form με τα πεδία `name`, `description`, `version`, `effectiveDate`, `reviewDate`, `status` και επιλογή αρχείων. Το form θα υποβάλλεται σε route που θα δημιουργεί ή θα ενημερώνει την εγγραφή `Policy` του οργανισμού. Κατά το create, θα εμφανίζεται ένα πρώτο πεδίο επιλογής `policyTypeId` με dropdown που θα δείχνει μόνο τα `policy_types` που δεν έχει ήδη ο οργανισμός (θα έρχεται από το route με query για να βρεθούν τα διαθέσιμα policy_types). Αν επιλεγεί κάποιο `policyType`, τότε τα πεδία `name`, `description`, `framework` θα συμπληρώνονται αυτόματα με βάση το επιλεγμένο `policyType`. Αν δεν επιλεγεί κάποιο `policyType` (δηλαδή παραμείνει κενό), τότε θεωρείται custom policy. Αν το mode είναι "edit", τότε το πεδίο επιλογής `policyTypeId` θα είναι κρυφό, αλλά τα υπόλοιπα πεδία συμπληρώνονται με βάση την υπάρχουσα εγγραφή `Policy`.

Προς το παρόν, μην ασχοληθείς με file management. Βάλε ένα άδειο card με τίτλο "Αρχεία" κάτω από το main card των πεδίων. 

Να ξέρεις όμως ότι το πάνω card και το κάτω card θα έχουν το δικό τους ανεξάρτητο save button. Το πάνω card θα αποθηκεύει τα πεδία της πολιτικής, ενώ το κάτω card θα είναι για upload και διαχείριση αρχείων (θα υλοποιηθεί στο επόμενο βήμα).

Όσον αφορά την εμφάνιση των views, πάρε για παράδειγμα το `views\admin\users.hbs` και το `views\admin\single-user.hbs`. Όσον αφορά τα `<select>` τα badges τον πίνακα, κυρίως για το status, υπάρχουν τα handlebar helpers `label` (κυρίως για badges) και `labelEntries` κυρίως για χρήση σε #each σε select options. 


### 5. File Management

#### Θέση αρχείων

- `/storage/organizations/:organizationId/modules/:framework/:resourcetype/:resourceId/name`
- Παράδειγμα: `/storage/organizations/123/modules/gdpr/policies/456/policy-document.pdf`

### Αποθήκευση αρχείων

Τα αρχεία θέλουμε ιδανικά να αποθηκεύονται με το original όνομά τους, ακόμα κι αν περιέχουν κενά. 
- Αυτό μπορεί να γίνει πχ ένα απλό sanitization που να αντικαθιστά τα κενά με tilde (~). Θα είναι ενσωματωμένο στο `Storage.store()` και `Storage.path()`. Θα εφαρμόζεται σε όλα τα αρχεία που ανεβαίνουν, όχι μόνο σε αυτά των πολιτικών. Το sanitization θα εφαρμόζεται μόνο στα αρχεία κι όχι στους φάκελους, οι οποίοι θα καθορίζονται από τον κώδικα, οπότε θα είναι πάντα με "καθαρά" ονόματα.
- Θα γίνεται έλεγχος για διπλότυπα ονόματα αρχείων στην ίδια πολιτική, και αν υπάρχει ήδη αρχείο με το ίδιο όνομα, θα ενημερώνει το χρήστη να μετονομάσει το νέο αρχείο ή να διαγράψει πρώτα το παλιό. 

#### Factory router

- Επειδή το file management θα χρησιμοποιηθεί και σε άλλα modules εκτός από τις πολιτικές, καλό είναι να δημιουργηθεί ένα factory router `routes/organizations/modules/storage.js` που θα δέχεται παραμέτρους όπως `framework`, `resourceType` και `resourceId` (ή έστω το `storagePath` μόνο) για να διαχειρίζεται τα αρχεία με βάση το context. Αυτός ο router θα έχει routes για upload, download, delete και list files, και θα χρησιμοποιεί το `Storage` module για όλες τις λειτουργίες. Ο σκοπός είναι οποιοδήποτε router να μπορεί να το χρησιμοποιήσει ως sub-router για να προσθέσει file management σε οποιοδήποτε resource. Για παράδειγμα στο router που διαχειρίζεται το path `/organization/frameworks/nis2/policies` να μπορεί εύκολα να μπει το `storageRouter` στο path `/organization/frameworks/nis2/policies/:policyId/storage` με μια απλή εντολή `thisRouter.use('/:policyId/storage', storageRouter(parameters))`. 

### Αρχεία πολιτικών στο view

Τα αρχεία στις πολιτικές θα αποθηκεύονται με ξεχωριστό save σε ήδη υπάρχουνσα πολιτική (δεν θα ανεβαίνουν αρχεία κατά τη δημιουργία πολιτικής). Υπάρχει ήδη χώρος στο `single-policy` view για να τοποθετηθεί η καινούργια φόρμα. 
Κάθε αρχείο θα έχει τη δική του γραμμή στο Card "Αρχεία".
Προς συζήτηση αν θα φορτώνονται τα αρχεία κατά το φόρτωμα της σελίδας ή αν θα γίνεται populate με alpine fetch μετά το φόρτωμα. προτείνεται το δεύτερο για καλύτερη απόδοση. Για να είναι πιο απλός ο κώδικας του alpine, έχω δημιουργήσει το `alpine-fetch.js` που έχει υλοποιήσει το `$fetch` helper. 

Κάθε γραμμή θα έχει κουμπί για download και delete. Το upload θα γίνεται με ξεχωριστό form κάτω από τον πίνακα των αρχείων. Δεν θα υπάρχει κουμπί αντικατάστασης/update αρχείου. 

Προς συζήτηση αν θα αποθηκεύεται κάτι στο πεδίο files του `Policy`, αν θα είναι απλά virtual ή αν δεν θα χρησιμοποιηθεί καθόλου. Προς το παρόν, ας μην χρησιμοποιηθεί καθόλου, εφόσον τα αρχεία έχουν ημερομηνία δημιουργίας.

#### Απαιτούμενες ενέργειες:

- Στο `storage.js` υλοποίηση sanitize, desanitize (ας μπουν σε ένα object με δύο μεθόδους για καθαρό κώδικα) και υλοποίηση του `Storage.store()` που θα χρησιμοποιεί το sanitize. Στο `Storage.list()`, ας προστεθεί ένα δεύτερο όρισμα `sanitize=false` που αν είναι true, θα κάνει desanitization στα ονόματα των αρχείων πριν τα επιστρέψει.
- Δημιουργία factory router `routes/organizations/storage.js` με routes για upload, download, delete και list files. Θα χρησιμοποιεί το `Storage` module για όλες τις λειτουργίες. Θα περιέχει middleware check για το org. 
- Υλοποίηση του UI για διαχείριση αρχείων στο `single-policy` view, με alpine.js για το dynamic μέρος (fetching, delete, upload).

Στόχος:

- κανένας χρήστης να μην μπορεί να αποκτήσει πρόσβαση σε αρχεία άλλου οργανισμού,
- τα αρχεία να μη γίνουν public.


## Included στο MVP

- central catalog `policy_types`
- org-scoped policy register
- κοινό flow για manager και admin-as-manager
- custom policies
- `non_applicable` ως stored status
- secure file storage

## Excluded από το MVP

- admin review workflow
- automated assignment κατά τη δημιουργία οργανισμού
- version-history tables
- public file URLs

## Σημαντική Υλοποιητική Απόφαση

Προτείνεται να **μη δημιουργούνται `Policy` rows για όλα τα `policy_types` στο MVP**.

Αντί γι' αυτό:

- τα unassigned rows να υπολογίζονται στην index view,
- εγγραφή να αποθηκεύεται μόνο όταν μια policy δημιουργείται ή δηλώνεται ρητά ως `non_applicable`.

Αυτό κρατά το schema πιο καθαρό, αποφεύγει άχρηστες εγγραφές και επιτρέπει να εξελιχθεί αργότερα το automation χωρίς migration του βασικού μοντέλου.

## Μελλοντικές Επεκτάσεις

1. Αν αργότερα θελήσεις το compliance να γίνει πραγματικά organization-level και όχι user-level, μπορεί να μεταφερθεί η επιλογή framework από το `User.scope` στο `Organization`.
2. Αν το reporting γίνει νωρίς σημαντικό, μπορεί να προστεθεί audit metadata όπως `assignedByUserId` και `updatedByUserId`.

## Σχετικά Αρχεία του Project

- `models/policy_type.js`
- `models/policy.js`
- `models/models.js`
- `models/cache.js`
- `auth/roles.js`
- `auth/org.js`
- `routes/admin.js`
- `lib/storage.js`
