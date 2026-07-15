/**
 * Ελέγχει αν ένα string είναι έγκυρο JSON. Ένα κενό string θεωρείται έγκυρο (καμία τιμή).
 */
function isValidJSON(text) {
    if (!text?.trim().length) { return true; }
    if (invalidSequencesOf(text).length) { return false; }

    try {
        JSON.parse(text);
        return true;
    } catch {
        return false;
    }
}
// Επιστρέφει τους απαγορευμένους χαρακτήρες ή που μπορεί να χαλάσουν κάποια JSON.parse ή άλλες JavaScript εκφράσεις.
function invalidSequencesOf(text) {
    if (!text?.trim().length) { return []; }
    const invalidSequences = ['`', '${', '<script'];    // Δυστυχώς, θα ήθελα να βάλω και το \ ως '\\' αλλά υπάρχει στα ερωτηματολόγια. 
    return invalidSequences.filter(seq => text.includes(seq));
}

/**
 * Παρουσιάζει ένα JSON string με μορφοποιημένο τρόπο (indentation) για ευκολότερη ανάγνωση.
 * Αν το string δεν είναι έγκυρο JSON, επιστρέφει το ίδιο string χωρίς αλλαγές.
 */
function formatJSON(text) {
    if (!text?.trim().length) { return ''; }
    try {
        const obj = JSON.parse(text);
        return JSON.stringify(obj, null, 4);
    } catch {
        return text;
    }
}

// Στο φόρτωμα της σελίδας, όμορφαίνει όλα τα .json στοιχεία με το formatJSON.
Q('.json').forEach(el => {
    if (el.tagName === 'TEXTAREA') {
        if (!isValidJSON(el.value)) { return }
        el.value = formatJSON(el.value);
    } else {
        if (!isValidJSON(el.textContent)) { return }
        el.textContent = formatJSON(el.textContent);
    }
});

/**
 * Επιστρέφει τα αρχικά γράμματα (κεφαλαία) των πρώτων 3 λέξεων ενός string.
 */
function createCodeFromName(name) {
    return name
        .trim()
        .split(/\s+/)
        .filter(w => w.length)
        .slice(0, 3)
        .map(word => word[0].toUpperCase())
        .join('');
}

// Ορίζουμε τα αρχικά για όλα τα sl-avatar στοιχεία στη σελίδα από το name τους.
Q("wa-avatar").forEach(el => {
    el.setAttribute('initials', createCodeFromName(el.getAttribute('name') || ''));
});


/** Παράγει φιλική περιγραφή για ένα period name */ 
function periodDescription(name='') {

    const monthNames = ['Ιανουάριος', 'Φεβρουάριος', 'Μάρτιος', 'Απρίλιος', 'Μάιος', 'Ιούνιος', 'Ιούλιος', 'Αύγουστος', 'Σεπτέμβριος', 'Οκτώβριος', 'Νοέμβριος', 'Δεκέμβριος'];
    
    if (/^\d{4}$/.test(name)) {
        return `Έτος ${name}`;
    }

    if (name.includes('-S')) {
        const [year, part] = name.split('-');
        const half = parseInt(part.slice(1));
        const startMonth = (half - 1) * 6; // 0-based index
        const endMonth = startMonth + 5;
        return `${half}ο Εξάμηνο ${year} (${monthNames[startMonth]}-${monthNames[endMonth]})`;
    }

    if (name.includes('-Q')) {
        const [year, part] = name.split('-');
        const quarter = parseInt(part.slice(1));
        const startMonth = (quarter - 1) * 3; // 0-based index
        const endMonth = startMonth + 2;
        return `${quarter}ο Τρίμηνο ${year} (${monthNames[startMonth]}-${monthNames[endMonth]})`;
    }

    if (name.includes('-M')) {
        const [year, part] = name.split('-');
        const month = parseInt(part.slice(1)); // 1-based
        return `${monthNames[month - 1]} ${year}`;
    }
}


/** Επιστρέφει την κατάσταση επιτυχίας ενός KPI
 * Δυνατές τιμές: 
 * {value: true, color: 'success', deviation: null}, 
 * {value: false, color: 'danger', deviation: "number"} ή 
 * {value: null, color: 'light', deviation: null} αν δεν εφαρμόζεται */
function kpiSuccessStatus(kpi) {
    if (!kpi.applicable) { return { value: null, color: 'light', deviation: null }; }
    if (kpi.value == null) { return { value: null, color: 'light', deviation: null }; }

    const rule = kpi.template?.successRule;
    if (!rule) { return { value: null, color: 'light', deviation: null }; }

    const success = rule.direction === 'up'
        ? Number(kpi.value) >= rule.target
        : Number(kpi.value) <= rule.target;

    return { value: success, 
        color: success ? 'success' : 'danger', 
        deviation: success ? null : Math.abs( Number(kpi.value) - rule.target )
    };
}
