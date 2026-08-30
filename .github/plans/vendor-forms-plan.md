# Vendor Forms Plan

## Γενική εικόνα

Ο οργανισμός δημιουργεί έναν `Partner` και στη συνέχεια αναθέτει σε αυτόν ένα συγκεκριμένο `Questionnaire`. Η ανάθεση εκφράζεται με ένα νέο `Response`, το οποίο είναι η κεντρική οντότητα που συνδέει οργανισμό, questionnaire και partner.

Ο partner ανοίγει τη δημόσια πρόσκληση από το route `/public/questionnaires/vendors/:questionnaireId/:responseId`. Το URL αναγνωρίζει την πρόσκληση, αλλά δεν αρκεί από μόνο του για πρόσβαση. Ο partner εισάγει το access token του συγκεκριμένου response, στη βάση υπάρχει μόνο το hash του ως `accessTokenHash`, και το ίδιο access token αποθηκεύεται αυτούσιο από τον browser ως short-lived public session cookie για αυτή την πρόσκληση. Έπειτα μπορεί να αποθηκεύει draft ή να υποβάλει οριστικά τη φόρμα.

Ο οργανισμός βλέπει και διαχειρίζεται τα responses μέσα από την authenticated περιοχή του αντίστοιχου partner, χωρίς να χρησιμοποιεί public links. Το `Response` παραμένει το μοναδικό σημείο αλήθειας για την κατάσταση της πρόσκλησης, τις απαντήσεις, το snapshot και το audit trail.

Οι καταστάσεις της ροής είναι:

- `assigned`: ο οργανισμός δημιούργησε και ανέθεσε το response σε partner.
- `draft`: ο partner έκανε τουλάχιστον μία προσωρινή αποθήκευση.
- `submitted`: ο partner έκανε οριστική υποβολή.

## Όσα έχουν ήδη υλοποιηθεί

1. Έχουν δημιουργηθεί τα `Partner`, `Questionnaire` και `Response` models, μαζί με τις απαραίτητες συσχετίσεις τους.
2. Το `Response` έχει ήδη τα πεδία `submittedByPartnerId`, `accessTokenHash`, `lockedAt`, `data`, `questionnaireSnapshot` και τα βασικά states της ροής.
3. Υπάρχει πλήρες organization-scoped CRUD για partners στο `/organization/resources/partners`.
4. Υπάρχει ο κοινός questionnaire engine και η κοινή Alpine φόρμα, άρα η partner ροή μπορεί να επαναχρησιμοποιήσει την υπάρχουσα λογική rendering, validation και scoring.
5. Έχουν δημιουργηθεί ο public router, το public layout, τα public partials και η κενή public questionnaire view ως σκελετός για τη νέα ροή.
6. Υπάρχει ήδη association `Questionnaire.hasMany(Response)` και `Response.belongsTo(Questionnaire)`, οπότε η βάση δεδομένων υποστηρίζει ήδη τη σύνδεση questionnaire-response.

Σημείωση: Τα questionnaires διαχειρίζονται κεντρικά και δεν θα υπάρχει organization-side μενού ή CRUD για αυτά. Κατά τη δημιουργία ανάθεσης ο οργανισμός θα επιλέγει μόνο από τα διαθέσιμα ενεργά και public questionnaires.

## Βήματα υλοποίησης

### 0. Αναδιάρθρωση της διαχείρισης partners - Done!

Επιθυμητό αποτέλεσμα: το `/organization/resources/partners/:partnerId` γίνεται η κεντρική σελίδα διαχείρισης του partner και εμφανίζει αρχικά τις αναθέσεις ερωτηματολογίων, η υπάρχουσα επεξεργασία μεταφέρεται στο `/:partnerId/edit` και ο πίνακας partners αποκτά τα αντίστοιχα διακριτά links επεξεργασίας και διαχείρισης, ώστε αργότερα να προστεθούν και άλλα παιδιά του partner. Δημιουργείται και συνδέεται κενός nested router στο `/:partnerId/questionnaire-assignments`, χωρίς λειτουργική υλοποίηση σε αυτό το βήμα.

### 1. Καθορισμός της ανάθεσης questionnaire σε partner και Δημιουργία invitation credentials

Σκοπός: μέσα από τη σελίδα συγκεκριμένου ενεργού partner, ο οργανισμός να μπορεί να επιλέγει ένα διαθέσιμο ενεργό και public questionnaire και να δημιουργεί μια συγκεκριμένη "πρόσκληση συμπλήρωσης" στο `/organization/resources/partners/:partnerId/questionnaire-assignments`.

Επιθυμητό αποτέλεσμα: δημιουργείται νέο `Response` με σωστά `organizationId`, `questionnaireId`, `submittedByPartnerId` και αρχική κατάσταση `assigned`, ώστε κάθε ανάθεση να είναι ανεξάρτητη και ανιχνεύσιμη.

Σκοπός: κάθε πρόσκληση να αποκτά δημόσιο URL και ισχυρό access token, ενώ στη βάση να αποθηκεύεται μόνο το hash του token.

Επιθυμητό αποτέλεσμα: το link από μόνο του δεν αρκεί για πρόσβαση, ο οργανισμός μπορεί να γνωστοποιήσει το token μία φορά στον partner και να το ανακαλέσει ή να το αντικαταστήσει αργότερα χωρίς να αλλάξει το ιστορικό του response. Το ίδιο access token θα χρησιμοποιείται και ως το προσωρινό public session secret, χωρίς δεύτερο token layer.

Ο οργανισμός, κατά την δημιουργία της "πρόσκλησης συμπλήρωσης" θα λαμβάνει το δημόσιο URL και το access token (μια φορά προβολή) για το νέο `Response`. Δυνατότητα για δημιουργία νέου Access Token και AccessTokenHash στη βάση δεδομένων. Το Access Token (είτε αρχική δημιουργία είτε ανανέωση) θα δημιουργείται στον browser (για απλότητα) και θα στένεται hashed στον server για αποθήκευση. Θα φτιάξουμε `hash` function στον browser (στο `public\js\script.js`). 

Όταν θα δημιουργείται και αποθηκεύεται η πρόσκληση (εγγραφή `response` στη βάση δεδομένων με αρχική κατάσταση `assigned`), δεν θα δημιουργείται AccessToken, αλλά στην οθόνη της επεξεργασίας της πρόσκλησης θα εμφανίζεται ένα μήνυμα "Δημιουργήστε ένα Token πρόσβασης ώστε να δώσετε πρόσβαση στον συνεργάτη". Με τη δημιουργία του Access Token, θα δημιουργείται το AccessToken στον browser και θα γίνεται `POST` το hashed στο route `/organization/resources/partners/:partnerId/questionnaire-assignments/:responseId/access-token`, έτοιμο προς αποθήκευση στη βάση. 

### 2. Ολοκλήρωση του public access flow, Δημιουργία public token gate και προσωρινού session και έλεγχοι ασφάλειας

Σκοπός: το route `/public/questionnaires/vendors/:questionnaireId/:responseId` να λειτουργεί ως entry gate, να κάνει validation του `responseId` και του `questionnaireId`, να επιβεβαιώνει ότι το response ανήκει πράγματι στο questionnaire του URL και να μην αποκαλύπτει τίποτα πριν από την επιτυχή ταυτοποίηση.

Επιθυμητό αποτέλεσμα: άκυρα IDs, λάθος συνδυασμός questionnaire-response, ανακλημένο token, inactive partner ή κλειδωμένο response δεν διαρρέουν περιεχόμενο και δεν επιτρέπουν επεξεργασία.

Σκοπός: αν δεν υπάρχει έγκυρο access token cookie, ο partner να βλέπει σε αυτό το entry gate μόνο μια μικρή φόρμα εισαγωγής `AccessToken`, χωρίς να απαιτείται account ή login. Το AccessToken θα γίνεται hash στον browser πριν σταλεί στον server για έλεγχο ή αποθήκευση του `accessTokenHash`, ενώ το ίδιο το access token θα αποθηκεύεται ως προσωρινό short-lived public session cookie για τη συγκεκριμένη πρόσκληση.

Επιθυμητό αποτέλεσμα: το token δεν παραμένει στο URL, δεν επιστρέφεται στο render payload και, μόλις ο χρήστης δώσει σωστό token ή υπάρχει ήδη έγκυρο cookie, γίνεται redirect στο canonical protected route `/public/questionnaires/vendors/:questionnaireId/:responseId/form`. Το `/fill` μπορεί να υπάρχει μόνο ως alias ή redirect προς το `/form`.

Σκοπός: κάθε δημόσιο request να ελέγχει ownership, access state, `lockedAt`, ενεργό partner, ανακλημένη πρόσβαση και εγκυρότητα του public session.

Επιθυμητό αποτέλεσμα: ο browser δεν μπορεί να χειραγωγήσει IDs, status, snapshot ή access state και όλα τα κρίσιμα checks γίνονται ξανά στον server, τόσο στο entry gate όσο και στο `/form` και στα public save or submit routes.

### 3. Δημιουργία της public questionnaire φόρμας

Σκοπός: το protected route `/public/questionnaires/vendors/:questionnaireId/:responseId/form` να αποδίδει την κενή view του public questionnaire με τον υπάρχοντα κοινό form adapter και τις questionnaire partials, αλλά σε public περιβάλλον χωρίς organization controls.

Επιθυμητό αποτέλεσμα: ο partner βλέπει μόνο τη φόρμα της δικής του πρόσκλησης, με καθαρή public εμπειρία, save/submit actions και χωρίς πρόσβαση σε άλλα δεδομένα του οργανισμού.

Σκοπός: ο public partner να μη δει ούτε να μπορέσει να αποθηκεύσει απαντήσεις για private περιεχόμενο.

Επιθυμητό αποτέλεσμα: το backend στέλνει μόνο φιλτραρισμένο questionnaire definition και φιλτραρισμένα response answers, ώστε validation, progress και scores να υπολογίζονται μόνο στις ορατές ερωτήσεις.

### 4. Υλοποίηση draft save και final submit για partners

Σκοπός: ο partner να συνεχίζει εργασία στο ίδιο response και ο server να ανακατασκευάζει και να ελέγχει τις απαντήσεις με βάση τον πραγματικό questionnaire definition.

Επιθυμητό αποτέλεσμα: το save επιτρέπει ασφαλή μερική αποθήκευση και αλλάζει το state σε `draft`, ενώ το submit απαιτεί πλήρη `isValidated()` κατάσταση, αλλάζει το state σε `submitted` και αποθηκεύει σαφές audit trail.

### 5. Δημιουργία organization-side παρακολούθησης των partner responses

Σκοπός: ο οργανισμός να έχει authenticated λίστα και detail view των αναθέσεων κάθε partner, κάτω από το `/organization/resources/partners/:partnerId/questionnaire-assignments`.

Επιθυμητό αποτέλεσμα: μέσα από τη σελίδα διαχείρισης του συγκεκριμένου partner, ο οργανισμός βλέπει questionnaire, κατάσταση, ημερομηνίες, πρόοδο και τελική απάντηση, χωρίς να χρησιμοποιεί public links και χωρίς διαρροή δεδομένων μεταξύ οργανισμών ή partners.

### 6. Διαχείριση invitation lifecycle από τον οργανισμό

Σκοπός: ο οργανισμός να μπορεί να δημιουργεί νέες αναθέσεις, να αντιγράφει το link, να εκδίδει νέο token, να ανακαλεί public πρόσβαση και να κλειδώνει responses (`lockedAt`) σύμφωνα με τους κανόνες της ροής.

Επιθυμητό αποτέλεσμα: οι εξωτερικές προσκλήσεις διαχειρίζονται μέσα από την περιοχή αναθέσεων του συγκεκριμένου partner, χωρίς να χάνεται το ιστορικό των responses.

### 7. Σχεδιασμός ανάκαμψης από ληγμένο public session

Σκοπός: ο partner να μη χάνει τις απαντήσεις που έχει ήδη γράψει αν λήξει ή χαλάσει το temporary cookie πριν το save ή το submit.

Μέθοδος: Το save ή το submit, ούτως ή άλλως θα γίνονται με JavaScript fetch και όχι με html forms. Σε περίπτωση ληγμένου cookie, ο server θα επιστρέφει συγκεκριμένο μήνυμα σφάλματος και ο browser θα εμφανίζει popup εισαγωγής του Access Token ξανά. Το popup θα έχει και κουμπί `Άκυρο`, ώστε ο χρήστης να μπορεί να το κλείσει χωρίς συνέχεια. Κατά την επανεισαγωγή, το AccessToken θα γίνεται hash στον browser πριν σταλεί στον server. Αν ο server το επιβεβαιώσει, θα αποθηκεύει ξανά το cookie στον browser με την απάντησή του, χωρίς refresh της σελίδας και χωρίς να χάνονται τα συμπληρωμένα πεδία. Σε περίπτωση αποτυχίας, θα επαναλαμβάνεται η ίδια διαδικασία με εμφάνιση του ίδιου popup.


## Κλειδωμένες αποφάσεις και Διευκρινίσεις

### 1. Snapshot timing για assigned και draft responses

Σήμερα η υπάρχουσα λογική χρησιμοποιεί snapshot κυρίως όταν το response έχει υποβληθεί. Για τα partner invitations πρέπει να αποφασιστεί αν θα κρατιέται snapshot ήδη από την ανάθεση, ώστε μελλοντικές αλλαγές σε ερωτήσεις, answer options, required flags ή private visibility να μην αλλάζουν τη φόρμα που έχει ήδη σταλεί σε εξωτερικό συνεργάτη.

Πρακτικά οι δύο επιλογές είναι:

- να ισχύει πάντα ο τρέχων definition μέχρι το submit,
- ή να παγώνει το questionnaire από τη στιγμή της ανάθεσης.

Απάντηση: Μόνο στην Οριστική Υποβολή θα αποθηκεύεται το snapshot του ερωμηατολόγιου. Αν δεν έχει γίνει οριστική υποβολή, θέλουμε οι αλλαγές στο questionnaire να επηρεάζουν live τις ερωτήσεις/απαντήσεις της φόρμας. 

### 2. Κλείδωμα μετά το submit

Πρέπει να αποφασιστεί αν το final submit θα κλειδώνει αυτόματα το response ή αν ο partner θα μπορεί να ξαναμπεί και να το αλλάξει μέχρι να το κλειδώσει ο οργανισμός με `lockedAt`.
Απάντηση: Δεν θα κλειδώνεται αυτόματα. Θα μπορεί να το κλειδώσει ο οργανισμός με `lockedAt`.

### 3. Recovery της ληγμένης public session

Έχει κλειδωθεί η απαίτηση να μην χαθούν οι ήδη συμπληρωμένες απαντήσεις της ανοιχτής φόρμας. Παραμένει προς απόφαση το αν θα καλυφθεί μόνο η ανοιχτή σελίδα ή και το refresh/κλείσιμο tab, π.χ. με προσωρινή browser-side αποθήκευση ή συχνότερο server-side draft save.
Απάντηση: Δεν θα γίνεται αυτόματη αποθήκευση. Αν τυχόν ο browser αποθηκεύσει προσωρινά τα δεδομένα, αυτό είναι ΟΚ, αλλά δεν θα υλοποιηθεί ειδική λειτουργία για αυτό.

### 4. Σημασία του `Questionnaire.public`

Χρειάζεται να αποσαφηνιστεί αν το `Questionnaire.public` είναι προϋπόθεση για partner assignment και public route ή αν η response-scoped πρόσκληση με token αρκεί και το πεδίο θα χρησιμοποιείται για άλλη μορφή δημόσιου questionnaire.
Απάντηση: Το `Questionnaire.public` είναι απαραίτητο ώστε να μπορεί να γίνει ανάθεση σε partner. 

### 5. Παράδοση invitation credentials

Το παρόν πλάνο καλύπτει τη δημιουργία και one-time εμφάνιση ή αντιγραφή link και token. Η αυτοματοποιημένη αποστολή email ή άλλου καναλιού προς partner δεν έχει ακόμη αποφασιστεί και μένει εκτός του τρέχοντος scope.
Απάντηση: Θα γίνεται χειροκίνητα. 

## Ίσως

### 1. Ταυτόχρονα διαφορετικά partner responses στον ίδιο browser

Αν ο ίδιος browser ανοίξει ταυτόχρονα δύο διαφορετικά partner responses, ένα ενιαίο public cookie μπορεί να δημιουργήσει σύγχυση ή overwrite μεταξύ των δύο προσκλήσεων.

Δεν αποτελεί μέρος της αρχικής υλοποίησης, αλλά αξίζει να μείνει ορατό ως πιθανό conflict για μελλοντική βελτίωση, αν δούμε ότι χρειάζεται response-scoped cookie naming ή αυστηρότερη response-aware διαχείριση του public session.
