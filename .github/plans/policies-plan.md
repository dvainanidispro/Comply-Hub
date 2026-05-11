# Πλάνο για Upload και Διαχείριση Πολιτικών Οργανισμών

## Στόχος

Να υπάρχει ένας κεντρικός κατάλογος `policy_types`, τον οποίο διαχειρίζονται οι admins, και κάθε οργανισμός να διατηρεί το δικό του `policy register` μέσα από org-scoped flow. Ο admin δεν θα έχει ξεχωριστό CRUD για τις πολιτικές οργανισμών, αλλά θα επιλέγει οργανισμό και θα χρησιμοποιεί τα ίδια views με τον manager.

Για το MVP προτείνεται να **μην προδημιουργούνται εγγραφές `Policy` για όλα τα `policy_types`**. Η ενιαία λίστα πολιτικών του οργανισμού θα προκύπτει από τα διαθέσιμα `policy_types` μαζί με τα ήδη υπάρχοντα org policies. Έτσι, αν δεν υπάρχει εγγραφή, η policy εμφανίζεται ως μη ανατεθειμένη. Αν υπάρχει εγγραφή, αυτή καθορίζει το status και τα metadata της.

## Βασικοί Κανόνες Domain

- `PolicyType`: ο κεντρικός κατάλογος standard policy templates.
- `Policy`: η org-owned εγγραφή που αντιπροσωπεύει την πολιτική ενός συγκεκριμένου οργανισμού.
- `non_applicable`: αποθηκευμένο status, όχι απουσία εγγραφής.
- `custom policy`: `Policy` με `policyTypeId = null` και υποχρεωτικό `customName`.
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

Το route είναι το `routes\organizations\modules\policies.js`, το οποίο θα χρησιμοποιείται τόσο από τον manager όσο και από τον admin-as-manager. Αυτό θα είναι ένα Factory Pattern για τη διαχείριση πολιτικών (ώστε να χρησιμοποιείται και από gdpr και από nis2 κλπ). Έχει ήδη δημιουργηθεί η βασική υποδομή σε αυτό το αρχείο. 

Θα υπάρχουν 3 views: `policies`, `single-policy`, `mass-creation`. 
Η σελίδα `policies` θα εμφανίζει:

- τα ήδη υπάρχοντα `Policy` records του οργανισμού σε πίνακα μέσα σε card component, είτε αυτά ανήκουν σε `policy_types` είτε είναι custom policies (δεν χρειάζεται η ένδειξη στον πίνακα, ίσως το policy_type να μπει σε κρυφή στήλη). To query σίγουρα θα είναι left join των `policies` με τα `policy_types`. 
- Κουμπί πάνω δεξιά για δημιουργία νέας πολιτικής, το οποίο ανοίγει το `single-policy` view σε create mode (mode: create).
- Κουμπί πάνω δεξιά "Mαζική δημιουργία" για δημιουργία πολλών πολιτικών στον οργανισμό. Θα ανοίγει το `mass-creation` view, το οποίο θα εμφανίζει form με checkboxes για τα `policy_types`. Όσα τα έχει ήδη ο οργανισμός θα είναι disableds. Όσαν `policy_types` έχουν το πεδίο default true, θα είναι επιλεγμένα, και όσα έχουν default false, δεν θα είναι επιλεγμένα. Τέλος, κουμπί "Δημιουργία επιλεγμένων" (mode: mass-create). 


### 5. Policy Detail και File Management

Κάθε policy θα έχει create/edit page με:

- `name`
- `description`
- `version`
- `effectiveDate`
- `reviewDate`
- `status`
- `files`

Τα αρχεία θα αποθηκεύονται με ασφαλή δομή:

- `storage/organizations/{orgId}/policies/{policyId}/`

Απαιτούμενες ενέργειες:

- υλοποίηση του `Storage.store()`
- secure upload route
- secure download route
- secure delete route
- ownership checks πριν από κάθε file action

Στόχος:

- κανένας χρήστης να μην μπορεί να αποκτήσει πρόσβαση σε αρχεία άλλου οργανισμού,
- τα αρχεία να μη γίνουν public.

## Προτεινόμενη Σειρά Υλοποίησης

### Phase 1

- Κλείδωμα domain rules
- Οριστικοποίηση statuses
- Απόφαση για custom policy semantics

### Phase 2

- Επέκταση `PolicyType`
- Επέκταση `Policy`
- Ευθυγράμμιση associations και indexes

### Phase 3

- Org context switch για admin
- Κοινό org-scoped router για manager και admin

### Phase 4

- Admin CRUD για `policy_types`

### Phase 5

- Read-only org policy list
- Assign/edit/non-applicable/custom policy behavior

### Phase 6

- Secure upload/download/delete αρχείων πολιτικών

### Phase 7

- Προαιρετικό automation από defaults ή org creation hooks
- Αυτό προτείνεται να έρθει μετά το manual flow, όχι πριν

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
- `views/admin/organizations.hbs`
- `views/admin/single-organization.hbs`
- `views/partials/sidebar.hbs`
