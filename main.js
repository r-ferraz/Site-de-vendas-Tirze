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

    // MeuBeme Accordion
    const accItems = document.querySelectorAll('.mb-acc-item');
    accItems.forEach(item => {
        const header = item.querySelector('.mb-acc-header');
        header.addEventListener('click', () => {
            accItems.forEach(otherItem => {
                if (otherItem !== item) {
                    otherItem.classList.remove('active');
                    otherItem.querySelector('span').textContent = '+';
                }
            });
            item.classList.toggle('active');
            const span = header.querySelector('span');
            span.textContent = item.classList.contains('active') ? '−' : '+';
        });
    });

    console.log('Akin site initialized successfully.');
});
