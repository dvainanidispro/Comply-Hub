/** Used in handlebars views */
let labels = {


    status: {
        submitted: 'Υποβλήθηκε',
        draft: 'Πρόχειρο',
        inactive: 'Ανενεργό',
        active: 'Ενεργό',
        pending: 'Σε εκκρεμότητα',
        'pending-approval': 'Προς έγκριση',
        canceled: 'Ακυρωμένο',
        rejected: 'Απορρίφθηκε',
        approved: 'Εγκρίθηκε',
        completed: 'Ολοκληρωμένο',
        paid: 'Πληρωμένο',
        finalized: 'Οριστικοποιημένη',
    },

    policyStatus: {
        'to-be-created': 'Προς δημιουργία',
        draft: 'Πρόχειρο',
        'pending-approval': 'Προς έγκριση',
        approved: 'Εγκεκριμένη', 
        active: 'Σε εφαρμογή',
        inactive: 'Ανενεργή',
        'not-applicable': 'Μη εφαρμοστέα',
    },

    statusColor: {
        'to-be-created': 'secondary',
        submitted: 'info',
        draft: 'info',
        inactive: 'secondary',
        pending: 'warning',
        'pending-approval': 'warning-caution',
        canceled: 'secondary',
        rejected: 'reject',
        approved: 'approve',
        completed: 'success',
        active: 'success',
        paid: 'primary',
        'not-applicable': 'dark',
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