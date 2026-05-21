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