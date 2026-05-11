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
        to_be_created: 'Προς δημιουργία',
        draft: 'Πρόχειρη',
        in_implementation: 'Υπό εφαρμογή',
        active: 'Ενεργή',
        non_applicable: 'Μη εφαρμόσιμη',
        // archived: 'Αρχειοθετημένη',
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

    general: {},
};

export { labels };