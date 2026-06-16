

const periodMonths = {
    'yearly': 12,
    'semiannually': 6,
    'quarterly': 3,
    'monthly': 1,
};
const frequencies = Object.keys(periodMonths);  // ['yearly', 'semiannually', 'quarterly', 'monthly']

/**
 * Επιστρέφει το όνομα της περιόδου για τη δοθείσα συχνότητα και ημερομηνία.
 * @param {string} frequency - 'yearly' | 'semiannually' | 'quarterly' | 'monthly'
 * @param {Date} [date=new Date()] - Η ημερομηνία αναφοράς
 * @returns {string} Το όνομα της περιόδου (πχ '2026', '2026-S1', '2026-Q3', '2026-M06')
 */
function periodName(frequency, date = new Date()) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1; // 1-12

    switch (frequency) {
        case 'yearly':       return `${year}`;
        case 'semiannually': return `${year}-S${month <= 6 ? 1 : 2}`;
        case 'quarterly':    return `${year}-Q${Math.ceil(month / 3)}`;
        case 'monthly':      return `${year}-M${String(month).padStart(2, '0')}`;
        default: throw new Error(`Unknown frequency: ${frequency}`);
    }
}

/**
 * Επιστρέφει το όνομα της τρέχουσας περιόδου με δυνατότητα μετατόπισης.
 * @param {string} frequency - 'yearly' | 'semiannually' | 'quarterly' | 'monthly'
 * @param {number} [offsetPeriods=0] - Αριθμός περιόδων μετατόπισης (αρνητικός για παρελθόν)
 * @param {Date} [currentDate=new Date()] - Η ημερομηνία αναφοράς
 * @returns {string} Το όνομα της περιόδου
 */
function currentPeriodName(frequency, offsetPeriods = 0, currentDate = new Date()) {
    const date = new Date(currentDate);
    date.setMonth(date.getMonth() + offsetPeriods * periodMonths[frequency]);
    return periodName(frequency, date);
}

/**
 * Επιστρέφει τα ονόματα όλων των τρεχουσών περιόδων για χρήση σε queries.
 * @param {Date} [currentDate=new Date()] - Η ημερομηνία αναφοράς
 * @returns {string[]} Τα ονόματα των τρεχουσών περιόδων
 */
function currentPeriods(currentDate = new Date()) {
    return frequencies.map((frequency) => currentPeriodName(frequency, 0, currentDate));
}






const monthNames = ['Ιανουάριος', 'Φεβρουάριος', 'Μάρτιος', 'Απρίλιος', 'Μάιος', 'Ιούνιος', 'Ιούλιος', 'Αύγουστος', 'Σεπτέμβριος', 'Οκτώβριος', 'Νοέμβριος', 'Δεκέμβριος'];

// Παράγει φιλική περιγραφή για ένα period name
function periodDescription(name) {
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

/**
 * Επιστρέφει πληροφορίες για μια περίοδο βάσει του ονόματός της.
 * @param {string} name - Το όνομα της περιόδου (πχ '2026', '2026-S1', '2026-Q3', '2026-M06')
 * @returns {{startDate: Date, endDate: Date, lastDate: Date, description: string}} startDate: πρώτη μέρα περιόδου, endDate: πρώτη μέρα εκτός περιόδου (exclusive, για χρήση σε range queries), lastDate: τελευταία μέρα εντός περιόδου
 */
function getPeriod(name) {
    let startDate, endDate;

    let lastDate;

    if (/^\d{4}$/.test(name)) {
        const year = parseInt(name);
        startDate = new Date(year, 0, 1);
        endDate = new Date(year + 1, 0, 1);     // 1η Ιανουαρίου επόμενου έτους (exclusive) μεσάνυχτα
        lastDate = new Date(year, 11, 31);
    } else if (name.includes('-S')) {
        const [year, part] = name.split('-');
        const half = parseInt(part.slice(1));
        const startMonth = (half - 1) * 6;
        startDate = new Date(parseInt(year), startMonth, 1);
        endDate = new Date(parseInt(year), startMonth + 6, 1);
        lastDate = new Date(parseInt(year), startMonth + 6, 0);     // 0th ημέρα του μήνα είναι η τελευτάια του προηγούμενου
    } else if (name.includes('-Q')) {
        const [year, part] = name.split('-');
        const quarter = parseInt(part.slice(1));
        const startMonth = (quarter - 1) * 3;
        startDate = new Date(parseInt(year), startMonth, 1);
        endDate = new Date(parseInt(year), startMonth + 3, 1);
        lastDate = new Date(parseInt(year), startMonth + 3, 0);
    } else if (name.includes('-M')) {
        const [year, part] = name.split('-');
        const month = parseInt(part.slice(1)) - 1; // 0-based
        startDate = new Date(parseInt(year), month, 1);
        endDate = new Date(parseInt(year), month + 1, 1);
        lastDate = new Date(parseInt(year), month + 1, 0);
    }

    return {
        startDate,
        endDate,
        lastDate,
        description: periodDescription(name),
    };
}

export { periodMonths, periodName, currentPeriodName, currentPeriods, getPeriod };