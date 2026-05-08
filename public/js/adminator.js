// Adminator - Επιλεγμένες λειτουργίες σε vanilla JS

    // Ρυθμίσεις Sidebar
    const sidebarAccordion = false; // αν true, το άνοιγμα dropdown κλείνει τα υπόλοιπα

    //# Sidebar Toggle (ανοίγει/κλείνει το sidebar)
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const app = document.querySelector('.app');
    sidebarToggle?.addEventListener('click', (e) => {
        e.preventDefault();
        app.classList.toggle('is-collapsed');
        // setTimeout(() => {
        //     window.dispatchEvent(new Event('resize'));
        // }, 300);
    });

    //# Sidebar Dropdown Menus
    document.querySelectorAll('.sidebar .sidebar-menu li a').forEach(link => {
        link.addEventListener('click', function (e) {
            const li = this.parentElement;
            const dropdownMenu = li.querySelector(':scope > .dropdown-menu');
            if (!dropdownMenu) return;

            e.preventDefault();
            const parentUl = li.parentElement;

            if (li.classList.contains('open')) {
                dropdownMenu.classList.add('d-none');
                li.classList.remove('open');
            } else {
                if (sidebarAccordion) {
                    parentUl.querySelectorAll(':scope > li.open').forEach(openLi => {
                        openLi.querySelector(':scope > .dropdown-menu').classList.add('d-none');
                        openLi.classList.remove('open');
                    });
                }

                dropdownMenu.classList.remove('d-none');
                li.classList.add('open');
            }
        });
    });


    //# Bootstrap-style Dropdown Menu (εκτός sidebar)
    document.querySelectorAll('[data-bs-toggle="dropdown"]').forEach(toggle => {
        const parent = toggle.parentElement;
        const menu = parent.querySelector('.dropdown-menu');
        if (!menu) return;

        toggle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const isOpen = toggle.classList.contains('show');

            // Κλείσιμο όλων των ανοιχτών dropdowns
            closeAllDropdowns();

            if (!isOpen) {
                toggle.classList.add('show');
                toggle.setAttribute('aria-expanded', 'true');
                menu.classList.add('show');
            }
        });
    });

    function closeAllDropdowns() {
        document.querySelectorAll('[data-bs-toggle="dropdown"].show').forEach(openToggle => {
            openToggle.classList.remove('show');
            openToggle.setAttribute('aria-expanded', 'false');
            const openMenu = openToggle.parentElement.querySelector('.dropdown-menu');
            if (openMenu) openMenu.classList.remove('show');
        });
    }

    // Κλείσιμο dropdown με κλικ εκτός
    document.addEventListener('click', () => {
        closeAllDropdowns();
    });

    
    //# Bootstrap Collapse / Accordion
    document.addEventListener('click', (e) => {
        const trigger = e.target.closest('[data-bs-toggle="collapse"]');
        if (!trigger) return;

        e.preventDefault();
        const target = document.querySelector(trigger.getAttribute('data-bs-target'));
        if (!target) return;

        const isShown = target.classList.contains('show');

        const parentSelector = target.getAttribute('data-bs-parent');
        if (parentSelector) {
            document.querySelector(parentSelector)?.querySelectorAll('.collapse.show').forEach(openPanel => {
                if (openPanel !== target) {
                    openPanel.classList.remove('show');
                    const otherTrigger = document.querySelector(`[data-bs-target="#${openPanel.id}"]`);
                    otherTrigger?.classList.add('collapsed');
                    otherTrigger?.setAttribute('aria-expanded', 'false');
                }
            });
        }

        target.classList.toggle('show', !isShown);
        trigger.classList.toggle('collapsed', isShown);
        trigger.setAttribute('aria-expanded', String(!isShown));
    });


    //# Ένδειξη ενεργού link στο sidebar, με βάση το URL, και άνοιγμα των γονικών dropdown
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

                // Άνοιγμα όλων των γονικών dropdown μενού (που περιέχουν το active link)
                let el = link.parentElement;
                while (el && !el.classList.contains('sidebar-menu')) {
                    if (el.tagName === 'UL' && el.classList.contains('dropdown-menu')) el.classList.remove('d-none');
                    if (el.tagName === 'LI' && el.classList.contains('dropdown')) el.classList.add('open');
                    el = el.parentElement;
                }

                return false; // σταματάμε το every
            } 
            return true; // συνεχίζουμε το every
        });
    })();