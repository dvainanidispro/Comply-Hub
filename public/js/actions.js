'use strict';

// Μεταβλητή για αποθήκευση του onClose callback
let currentOnCloseCallback = null;

/**
 * Εμφανίζει ένα success modal με μήνυμα
 * @param {string} message - Το μήνυμα προς εμφάνιση
 * @param {number} autoCloseDelay - Χρόνος σε ms για αυτόματο κλείσιμο (προαιρετικό)
 * @param {function} onClose - Callback function όταν κλείσει το modal (προαιρετικό)
 */
function showSuccessModal(message, autoCloseDelay = null, onClose = null) {
    const successModal = document.getElementById('successModal');
    const messageElement = document.getElementById('successMessage');
    
    if (!successModal || !messageElement) {
        console.error('Success modal elements not found');
        return;
    }
    
    // Αποθήκευση του onClose callback
    currentOnCloseCallback = onClose;
    
    messageElement.textContent = message;
    successModal.classList.add('show');
    successModal.style.display = 'block';
    document.body.classList.add('modal-open');
    
    if (autoCloseDelay && autoCloseDelay > 0) {
        setTimeout(() => {
            closeModal('successModal');
        }, autoCloseDelay);
    }
}

/**
 * Εμφανίζει ένα error modal με μήνυμα
 * @param {string} message - Το μήνυμα σφάλματος προς εμφάνιση
 */
function showErrorModal(message) {
    const errorModal = document.getElementById('errorModal');
    const messageElement = document.getElementById('errorMessage');
    
    if (!errorModal || !messageElement) {
        console.error('Error modal elements not found');
        return;
    }
    
    messageElement.textContent = message;
    errorModal.classList.add('show');
    errorModal.style.display = 'block';
    document.body.classList.add('modal-open');
}

/**
 * Κλείνει ένα modal
 * @param {string} modalId - Το ID του modal προς κλείσιμο
 */
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('show');
        modal.style.display = 'none';
        
        // Εκτέλεση του onClose callback αν υπάρχει και το modal είναι το success modal
        if (modalId === 'successModal' && currentOnCloseCallback && typeof currentOnCloseCallback === 'function') {
            currentOnCloseCallback();
            currentOnCloseCallback = null; // Καθαρισμός του callback
        }
    }
    
    // Αφαίρεση του modal-open class από το body ανεξάρτητα από το αν βρέθηκε το modal
    // για να εξασφαλίσουμε ότι η σελίδα δεν μένει blocked
    document.body.classList.remove('modal-open');
    
    // Αφαίρεση οποιουδήποτε backdrop element που μπορεί να έχει μείνει
    const backdrop = document.querySelector('.modal-backdrop');
    if (backdrop) {
        backdrop.remove();
    }
}

/**
 * Υποβάλλει δεδομένα με POST ή PUT μέθοδο
 * @param {HTMLFormElement|Object} formElementOrData - Το form element ή ένα JavaScript αντικείμενο με τα δεδομένα
 * @param {string} path - Το path για το API endpoint (π.χ. '/admin/users')
 * @param {string} method - Η HTTP μέθοδος: 'POST' ή 'PUT'
 * @param {string} redirectPath - Το path για redirect μετά την επιτυχία (προαιρετικό)
 */
async function submitData(formElementOrData, path, method, redirectPath = null) {
    Q('bootstrap-spinner').show();
    
    let data;
    if (formElementOrData instanceof HTMLFormElement) {
        const formData = new FormData(formElementOrData);
        data = Object.fromEntries(formData);
    } else {
        data = formElementOrData;
    }
    
    // Δημιουργία του endpoint URL
    let endpoint = path;
    if (method === 'PUT') {
        endpoint = `${path}/${data.id}`;
    }
    
    try {
        const response = await fetch(endpoint, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        Q('bootstrap-spinner').show(false);
        await Q.delay(0.1);
        
        if (result.success) {
            showSuccessModal(result.message, 2000, () => redirectOnSuccess(redirectPath));
        } else {
            showErrorModal(result.message);
        }
    } catch (error) {
        Q('bootstrap-spinner').show(false);
        showErrorModal("Σφάλμα δικτύου: " + error.message);
    }
}

/**
 * Διαγράφει ένα entity με επιβεβαίωση του χρήστη
 * @param {string} confirmationMessage - Το μήνυμα επιβεβαίωσης πριν τη διαγραφή
 * @param {string} redirectPath - Το path για redirect μετά την επιτυχία
 * @param {string} submitPath - Το path για το DELETE request (προαιρετικό). Αν δεν δοθεί, χρησιμοποιείται το τρέχον path.
 */
async function deleteEntity(confirmationMessage, redirectPath, submitPath = window.location.pathname) {
    let confimation = await Q.confirm(confirmationMessage, "Ναι, διαγραφή!", "Ακύρωση");
    if (!confimation) {
        return;
    }
    
    Q('bootstrap-spinner').show();
    
    try {
        const response = await fetch(submitPath, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        Q('bootstrap-spinner').show(false);
        
        if (result.success) {
            showSuccessModal(result.message, 2000, () => window.location.href = redirectPath);
        } else {
            showErrorModal(result.message);
        }
    } catch (error) {
        Q('bootstrap-spinner').show(false);
        showErrorModal("Σφάλμα δικτύου: " + error.message);
    }
}

/**
 * Σε περίπτωση επιτυχίας, ανακατευθύνει το χρήστη σε μια προεπιλεγμένη διαδρομή.
 * Αν τυχόν υπάρχει get request παράμετρος 'redirect', πχ ?redirect=/canteens/canteens/1
 * τότε ανακατευθύνει εκεί (αγνοώντας την προεπιλεγμένη διαδρομή).
 * Αν defaultPath = null, κάνει απλή ανανέωση της τρέχουσας σελίδας.
 */
function redirectOnSuccess(defaultPath = null) {
    const redirectPath = Q.url.get('redirect');
    
    if (redirectPath) {
        window.location.href = redirectPath;
    } else if (defaultPath) {
        window.location.href = defaultPath;
    } else {
        window.location.reload();
    }
}


// Αρχικοποίηση event listeners για τα modals όταν φορτώσει η σελίδα
document.addEventListener('DOMContentLoaded', function() {
    // Event listeners για κλείσιμο modals
    document.querySelectorAll('[data-bs-dismiss="modal"]').forEach(button => {
        button.addEventListener('click', function() {
            const modal = this.closest('.modal');
            if (modal) {
                closeModal(modal.id);
            }
        });
    });
    
    // Κλείσιμο modal με κλικ στο backdrop - διόρθωση για drag behavior
    document.querySelectorAll('.modal').forEach(modal => {
        let mouseDownTarget = null;
        
        modal.addEventListener('mousedown', function(e) {
            mouseDownTarget = e.target;
        });
        
        modal.addEventListener('click', function(e) {
            // Κλείσιμο μόνο αν το mousedown και το click έγιναν στο ίδιο element (το backdrop)
            if (e.target === this && mouseDownTarget === this) {
                closeModal(this.id);
            }
            mouseDownTarget = null;
        });
    });


});