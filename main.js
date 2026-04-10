// Akin Landing Page Interactivity

document.addEventListener('DOMContentLoaded', () => {
    const header = document.querySelector('header');

    // Sticky Header effect
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.style.padding = '10px 0';
            header.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.05)';
        } else {
            header.style.padding = '0';
            header.style.boxShadow = 'none';
        }
    });

    // Smooth scroll for nav links
    document.querySelectorAll('nav a').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;

            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // FAQ Accordion
    const faqItems = document.querySelectorAll('.faq-item');
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        question.addEventListener('click', () => {
            // Close other items
            faqItems.forEach(otherItem => {
                if (otherItem !== item) {
                    otherItem.classList.remove('active');
                }
            });
            // Toggle current item
            item.classList.toggle('active');

            // Toggle icon (+ / -)
            const span = question.querySelector('span');
            if (item.classList.contains('active')) {
                span.textContent = '-';
            } else {
                span.textContent = '+';
            }
        });
    });

    // Generic Accordion Handler (handles both MB and GLP1)
    const allAccordions = document.querySelectorAll('.mb-acc-item');
    allAccordions.forEach(item => {
        const header = item.querySelector('.mb-acc-header');
        header.addEventListener('click', () => {
            const parent = item.parentElement;
            const siblingItems = parent.querySelectorAll('.mb-acc-item');

            siblingItems.forEach(otherItem => {
                if (otherItem !== item) {
                    otherItem.classList.remove('active');
                    const otherSpan = otherItem.querySelector('span');
                    if (otherSpan) otherSpan.textContent = '+';

                    // Specific for GLP1 section if inline style exists
                    const otherContent = otherItem.querySelector('.mb-acc-content');
                    if (otherContent && otherContent.style.display === 'block') {
                        otherContent.style.display = 'none';
                    }
                }
            });

            item.classList.toggle('active');
            const span = header.querySelector('span');
            if (span) span.textContent = item.classList.contains('active') ? '−' : '+';

            // Toggle visibility manually for items with inline display override
            const content = item.querySelector('.mb-acc-content');
            if (content) {
                content.style.display = item.classList.contains('active') ? 'block' : 'none';
            }
        });
    });

    // Mobile Menu Toggle
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mainNav = document.getElementById('main-nav');

    if (mobileMenuBtn && mainNav) {
        mobileMenuBtn.addEventListener('click', () => {
            mainNav.classList.toggle('active');
            mobileMenuBtn.classList.toggle('is-active');
        });

        // Close menu when clicking a link
        mainNav.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                mainNav.classList.remove('active');
                mobileMenuBtn.classList.remove('is-active');
            });
        });
    }

    // Hero Image Slider
    const heroSlider = document.getElementById('hero-img-slider');
    if (heroSlider) {
        let currentImg = 1;
        setInterval(() => {
            heroSlider.style.opacity = '0';
            setTimeout(() => {
                currentImg = currentImg === 1 ? 2 : 1;
                heroSlider.src = `assets/foto ${currentImg}.png`; // Alterado para .png conforme solicitado
                heroSlider.style.opacity = '1';
            }, 500); // tempo de transição
        }, 3000);
    }

    // Scroll Reveal Animation (Intersection Observer)
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                // Optional: stop observing once revealed
                // revealObserver.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.15 // Trigger when 15% of the element is visible
    });

    document.querySelectorAll('.reveal').forEach(el => {
        revealObserver.observe(el);
    });

    console.log('Maori site initialized successfully.');
});
