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
