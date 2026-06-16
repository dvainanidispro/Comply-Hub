/** Used in handlebars views */
let labels = {


    status: {
        submitted: 'Υποβλήθηκε',
        draft: 'Πρόχειρο',
        inactive: 'Ανενεργό',
        active: 'Ενεργό',
        pending: 'Σε εκκρεμότητα',
        pending_approval: 'Προς έγκριση',
        canceled: 'Ακυρωμένο',
        rejected: 'Απορρίφθηκε',
        approved: 'Εγκρίθηκε',
        completed: 'Ολοκληρωμένο',
        paid: 'Πληρωμένο',
        finalized: 'Οριστικοποιημένη',
    },

    policyStatus: {
        inactive: 'Ανενεργή',
        to_be_created: 'Προς δημιουργία',
        draft: 'Προσχέδιο',
        // in_implementation: 'Υπό εφαρμογή',
        active: 'Ενεργή',
        // non_applicable: 'Μη εφαρμόσιμη',
    },

    statusColor: {
        to_be_created: 'secondary',
        submitted: 'info',
        draft: 'info',
        in_implementation: 'warning',
        inactive: 'secondary',
        pending: 'warning',
        pending_approval: 'warning-caution',
        canceled: 'secondary',
        rejected: 'reject',
        approved: 'approve',
        completed: 'success',
        active: 'success',
        non_applicable: 'dark',
        archived: 'secondary',
        paid: 'primary',
        finalized: 'success',
    },

    classification: {
        public: 'Δημόσιο',
        internal: 'Εσωτερικό',
        confidential: 'Εμπιστευτικό',
    },

    month: {
        1: 'Ιανουάριος',
        2: 'Φεβρουάριος',
        3: 'Μάρτιος',
        4: 'Απρίλιος',
        5: 'Μάιος',
        6: 'Ιούνιος',
        7: 'Ιούλιος',
        8: 'Αύγουστος',
        9: 'Σεπτέμβριος',
        10: 'Οκτώβριος',
        11: 'Νοέμβριος',
        12: 'Δεκέμβριος',
    },

    frequency: {
        yearly: 'Ετήσια',
        semiannually: 'Εξαμηνιαία',
        quarterly: 'Τριμηνιαία',
        monthly: 'Μηνιαία',
    },

    unit: {
        amount: 'Πλήθος',
        hours: 'Ώρες',
        percentage: 'Ποσοστό',
    },

    /** Χρησιμοποιείται στο helper labels για μαζική μετάφραση arrays */
    general: {
        'nis2': 'NIS2',
        'gdpr': 'GDPR',
    },
};

export { labels };