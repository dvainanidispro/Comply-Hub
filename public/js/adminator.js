// Adminator - Επιλεγμένες λειτουργίες σε vanilla JS

document.addEventListener('DOMContentLoaded', () => {

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
                dropdownMenu.style.display = 'none';
                li.classList.remove('open');
            } else {
                if (sidebarAccordion) {
                    parentUl.querySelectorAll(':scope > li.open').forEach(openLi => {
                        openLi.querySelector(':scope > .dropdown-menu').style.display = 'none';
                        openLi.classList.remove('open');
                    });
                }

                dropdownMenu.style.display = 'block';
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

    // Sidebar Active Link (έχω υλοποιήσει το δικό μου)
    // document.querySelectorAll('.sidebar .sidebar-link').forEach(link => {
    //     link.classList.remove('active');
    //     const href = link.getAttribute('href');
    //     if (!href) return;
    //     const pattern = href[0] === '/' ? href.substring(1) : href;
    //     if (pattern === window.location.pathname.substring(1)) {
    //         link.classList.add('active');
    //     }
    // });

});
