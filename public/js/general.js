'use strict';

/** Reload the page if it was restored from the back/forward cache */
window.addEventListener('pageshow', function (event) {
    if (event.persisted) {
        window.location.reload();
    }
});

/**
 * Ένδειξη στο sidebar για το link που αντιστοιχεί στην τρέχουσα σελίδα.
 * Χρησιμοποιούμε every αντί για forEach γιατι το forEach δεν έχει break, 
 * ενώ το every σταματάει όταν επιστραφεί false.
 */
(() => {
    const nav = Q.url.get('nav');
    const path = Q.url.path;
    Q(".sidebar .sidebar-link").every(link => {
        const href = link.getAttribute("href");
        const baseHref = href.split('?')[0];    // χωρίς get parameters
        if (!href || href.length < 3) {
            return true; // συνεχίζουμε το every
        }
        
        if ((nav && baseHref === nav) || (!nav && path.startsWith(baseHref))) {
            link.classList.add("active");
            return false; // σταματάμε το every
        } 
        return true; // συνεχίζουμε το every
    });
})();

/**
 * Προσθήκη validation classes (is-valid, is-invalid) σε input πεδία με pattern ή minlength
 * καθώς ο χρήστης πληκτρολογεί
 */
document.addEventListener("DOMContentLoaded", () => {
  const inputs = document.querySelectorAll("input[pattern], input[minlength]");

  inputs.forEach(input => {
    input.addEventListener("input", () => {
      if (input.value === "") {
        input.classList.remove("is-valid", "is-invalid");
      } else if (input.checkValidity()) {
        input.classList.add("is-valid");
        input.classList.remove("is-invalid");
      } else {
        input.classList.add("is-invalid");
        input.classList.remove("is-valid");
      }
    });
  });
});


/**
 * Όταν υπάρχει κάποιο get parameter που αντιστοιχεί σε πεδιο φόρμας (με το ίδιο name),
 * τότε συμπληρώνει αυτόματα το πεδίο με την τιμή του parameter και το πεδίο γίνεται readonly.
 * Χρήσιμο για φόρμες αναζήτησης/φιλτραρίσματος.
 */
document.addEventListener("DOMContentLoaded", () => {
    const urlParams = new URLSearchParams(window.location.search);
    const formFields = document.querySelectorAll("input[name], select[name], textarea[name]");

   formFields.forEach(field => {
       const paramValue = urlParams.get(field.name);
       if (paramValue) {
           field.value = paramValue;
           field.readOnly = true;
       }
   });
});

/**
 * Toggle password visibility για input πεδία τύπου password που έχουν το class "password-toggle"
 * Προσθέτει ένα εικονίδιο (eye) που όταν πατηθεί, αλλάζει το type του input σε text και το εικονίδιο σε eye-slash, και αντίστροφα.
 */
document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".password-toggle").forEach(toggle => {
        const input = toggle.parentElement?.querySelector("input[type='password']");    // sibling input με type password
        if (input) {
            toggle.addEventListener("click", () => {
                if (input.type === "password") {
                    input.type = "text";
                    toggle.querySelector("i")?.classList.replace("bi-eye", "bi-eye-slash");
                } else {
                    input.type = "password";
                    toggle.querySelector("i")?.classList.replace("bi-eye-slash", "bi-eye");
                }
            });
        }
    });
});



/**
 * Ελέγχει αν το JWT token είναι έγκυρο και αν δεν έχει λήξει
 * @param {string} token - Το JWT token προς έλεγχο
 * @returns {object} - {valid: boolean, reason: string}
 */
function isValidJWT(token) {
    try {
        // Διαχωρισμός του JWT σε header, payload, signature
        const parts = token.split('.');
        if (parts.length !== 3) {
            return { valid: false, reason: 'invalid' };
        }

        // Αποκωδικοποίηση του payload (base64url)
        let payload;
        try {
            const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
            payload = JSON.parse(atob(base64));
        } catch (decodeError) {
            return { valid: false, reason: 'invalid' };
        }
        
        // Έλεγχος αν το token έχει λήξει
        const currentTime = Math.floor(Date.now() / 1000);
        if (payload.exp && payload.exp < currentTime) {
            return { valid: false, reason: 'expired' };
        }

        return { valid: true, reason: null };
    } catch (error) {
        console.error('Σφάλμα κατά τον έλεγχο του JWT token:', error);
        return { valid: false, reason: 'invalid' };
    }
}



/**
 * Κατεβάζει έναν HTML πίνακα ως αρχείο Excel
 * Απαιτεί το SheetJS (xlsx) library - https://docs.sheetjs.com/docs/getting-started/installation/standalone
 * @param {string} tableID - Το ID του HTML table στοιχείου
 * @param {string} filename - Το όνομα του αρχείου Excel που θα δημιουργηθεί (προαιρετικό)
 */
function downloadTableAsExcel(tableID, filename = 'table.xlsx', sheetname = 'Sheet1') {
    const table = document.getElementById(tableID);
    if (!table) { console.error('Table not found:', tableID); return; }
    
    // Αφαίρεση μη έγκυρων χαρακτήρων και περιορισμός μήκους
    sheetname = sheetname.substring(0,31).replace(/[/\\?%*:|"<>]/g, '_');
    filename = filename.replace(/[/\\?%*:|"<>]/g, '_'); 

    // Clone για να μην πειραχτεί το DOM
    const clone = table.cloneNode(true);

    // Αν υπάρχει data-value ή data-sort-value, να χρησιμοποιείται αυτό, αλλιώς, να χρησιμοποιείται το textContent
    clone.querySelectorAll('td, th').forEach(cell => {
      const dataValue = cell.getAttribute('data-value') ?? cell.getAttribute('data-sort-value');
      if (dataValue !== null && dataValue !== "") {
        cell.textContent = dataValue;
      } else {
        cell.textContent = cell.textContent;
      }
    });

    const wb = XLSX.utils.table_to_book(clone, { sheet: sheetname });
    XLSX.writeFile(wb, filename);
}


function sumOfElements(selector,attribute=null) {
    const elements = Q(selector);
    let sum = 0;
    elements.forEach(el => {
        sum += parseFloat(el.dataset?.[attribute] 
            ?? el.dataset?.["data-value"] 
            ?? el.dataset?.["data-sort-value"] 
            ?? el.textContent ?? 0) ?? 0;
    });
    return sum;
}