import './style.css'
import emailjs from '@emailjs/browser';
import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';

// CONFIGURAÇÃO E ENV
const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;
const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

emailjs.init(PUBLIC_KEY);

// UTILITÁRIOS DE PERFORMANCE

const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

const throttle = (func, limit) => {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
};

let ticking = false;
const requestTick = (callback) => {
    if (!ticking) {
        requestAnimationFrame(() => {
            callback();
            ticking = false;
        });
        ticking = true;
    }
};

// PADRÃO TELEFONE FORM

const phoneInput = document.getElementById('telefone');
if (phoneInput) {
    phoneInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, ""); 
        if (value.length > 11) value = value.slice(0, 11);
        value = value.replace(/^(\d{2})(\d)/g, "($1) $2");
        value = value.replace(/(\d)(\d{4})$/, "$1-$2");
        e.target.value = value;
    });
}

// VIDEO AUTOPLAY

const heroVideo = document.querySelector('.hero-video');
if (heroVideo && heroVideo.tagName === 'VIDEO') {
    const playVideo = () => {
        if (heroVideo.paused) {
            heroVideo.play().catch(e => console.log("Autoplay bloqueado:", e));
        }
    };
    window.addEventListener('load', playVideo);
    document.addEventListener('touchstart', function onFirstTouch() {
        playVideo();
        document.removeEventListener('touchstart', onFirstTouch);
    }, { passive: true });
}

// LIGHTBOX COM NAVEGAÇÃO

const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightbox-img');
const closeBtn = document.querySelector('.close-lightbox');
const prevBtn = document.querySelector('.lightbox-prev');
const nextBtn = document.querySelector('.lightbox-next');
const galleryItems = document.querySelectorAll('.gallery-item');

let currentIndex = 0;
const imagesSrc = Array.from(galleryItems).map(item => item.getAttribute('data-src'));

const openLightbox = (index) => {
    currentIndex = index;
    lightboxImg.src = imagesSrc[currentIndex];
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
};

const closeLightbox = () => {
    lightbox.classList.remove('active');
    document.body.style.overflow = 'auto';
};

const nextImage = (e) => {
    if(e) e.stopPropagation();
    currentIndex = (currentIndex + 1) % imagesSrc.length;
    lightboxImg.src = imagesSrc[currentIndex];
};

const prevImage = (e) => {
    if(e) e.stopPropagation();
    currentIndex = (currentIndex - 1 + imagesSrc.length) % imagesSrc.length;
    lightboxImg.src = imagesSrc[currentIndex];
};

galleryItems.forEach((item, index) => {
    item.addEventListener('click', () => openLightbox(index));
});

if(lightbox) {
    closeBtn.addEventListener('click', closeLightbox);
    nextBtn.addEventListener('click', nextImage);
    prevBtn.addEventListener('click', prevImage);
    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) closeLightbox();
    });
    document.addEventListener('keydown', (e) => {
        if (!lightbox.classList.contains('active')) return;
        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowRight') nextImage();
        if (e.key === 'ArrowLeft') prevImage();
    });
}

// FORMULÁRIO COM SWEETALERT E GA4

const contactForm = document.getElementById('contactForm');

if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = contactForm.querySelector('button[type="submit"]');
        const originalText = btn.textContent;
        
        try {
            btn.textContent = 'Processando...';
            btn.disabled = true;

            let token = null;

            if (typeof grecaptcha !== 'undefined') {
                await new Promise(r => grecaptcha.ready(r));
                token = await grecaptcha.execute(RECAPTCHA_SITE_KEY, {action: 'submit'});
            } else {
                throw new Error('Serviço de segurança indisponível. Recarregue a página e tente novamente.');
            }

            const validation = await fetch('/api/validate_captcha', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token })
            });

            const result = await validation.json();

            if (!validation.ok || !result.success) {
                throw new Error('Falha na validação de segurança.');
            }

            btn.textContent = 'Enviando email...';
            
            const templateParams = {
                nome: document.getElementById('nome').value,
                email: document.getElementById('email').value,
                telefone: document.getElementById('telefone').value,
                tipo_evento: document.getElementById('tipo-evento').value,
                mensagem: document.getElementById('mensagem').value
            };

            await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams);
            
            Swal.fire({
                title: 'Mensagem Enviada!',
                text: 'Entraremos em contato em breve para conversar sobre o seu evento.',
                icon: 'success',
                confirmButtonColor: '#F9A5CB',
                background: '#161925',
                color: '#fff'
            });

            if (typeof gtag === 'function') {
                gtag('event', 'generate_lead', {
                    event_category: 'Formulário',
                    event_label: 'Orçamento Enviado',
                    tipo_evento: templateParams.tipo_evento
                });
            }

            contactForm.reset();

        } catch (error) {
            console.error(error);
            Swal.fire({
                title: 'Ops! Algo deu errado.',
                text: error.message || 'Não foi possível enviar sua mensagem no momento.',
                icon: 'error',
                confirmButtonColor: '#F9A5CB',
                background: '#161925',
                color: '#fff'
            });
        } finally {
            btn.textContent = originalText;
            btn.disabled = false;
        }
    });
}

// RASTREAMENTO GA4 - BOTÃO WHATSAPP

const btnZap = document.querySelector('#btn-whatsapp');

if(btnZap) {
    btnZap.addEventListener('click', () => {
        if (typeof gtag === 'function') {
            gtag('event', 'click_whatsapp', { event_category: 'Contato' });
        }
        window.open('https://wa.me/5551999598622', '_blank');
    });
}

// MOBILE MENU

const mobileBtn = document.querySelector('.mobile-menu-btn');
const navMenu = document.querySelector('.nav-menu');
const navLinks = document.querySelectorAll('.nav-menu a');

if (mobileBtn && navMenu) {
    mobileBtn.addEventListener('click', () => {
        navMenu.classList.toggle('active');
        const icon = mobileBtn.querySelector('i');
        const isExpanded = navMenu.classList.contains('active');
        
        mobileBtn.setAttribute('aria-expanded', isExpanded);
        if (isExpanded) {
            icon.classList.remove('fa-bars');
            icon.classList.add('fa-times');
        } else {
            icon.classList.remove('fa-times');
            icon.classList.add('fa-bars');
        }
    });

    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            navMenu.classList.remove('active');
            mobileBtn.setAttribute('aria-expanded', 'false');
            mobileBtn.querySelector('i').classList.replace('fa-times', 'fa-bars');
        });
    });
}

// SCROLL REVEAL

const revealElements = document.querySelectorAll('.service-card, .section-title, .about-text, .gallery-item, .contact-container');
revealElements.forEach(el => el.classList.add('reveal'));

const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) { 
            requestAnimationFrame(() => {
                entry.target.classList.add('active');
            });
            revealObserver.unobserve(entry.target); 
        }
    });
}, { 
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
});

revealElements.forEach(el => revealObserver.observe(el));

// INSTAGRAM FEED

const instagramContainer = document.getElementById('insta-feed');

if (instagramContainer) {
    instagramContainer.innerHTML = Array(6).fill('<div class="skeleton insta-item"></div>').join('');
    
    fetch('/api/instagram') 
        .then(res => res.json())
        .then(data => {
            instagramContainer.innerHTML = '';
            
            if (data.data) {
                const fragment = document.createDocumentFragment();
                
                data.data.slice(0, 6).forEach(post => {
                    const div = document.createElement('div');
                    div.className = 'insta-item reveal';
                    
                    if (post.media_type === 'VIDEO') {
                        div.innerHTML = `
                            <video 
                                poster="${post.thumbnail_url}" 
                                src="${post.media_url}" 
                                muted 
                                loop 
                                playsinline 
                                preload="none" 
                                class="insta-video"
                                onmouseover="this.play()" 
                                onmouseout="this.pause()"
                            ></video>
                            <i class="fas fa-play" style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); color:white; opacity:0.7; pointer-events:none;"></i>
                        `;
                    } else {
                        const img = document.createElement('img');
                        img.src = post.media_url;
                        img.alt = post.caption ? post.caption.slice(0, 80) : 'Instagram LeDanse';
                        img.loading = "lazy";
                        img.decoding = "async";
                        
                        div.appendChild(img);
                    }
                    
                    div.addEventListener('click', () => window.open(post.permalink, '_blank'));
                    fragment.appendChild(div);
                });
                
                instagramContainer.appendChild(fragment);
                requestAnimationFrame(() => {
                    document.querySelectorAll('#insta-feed .insta-item').forEach(el => {
                        revealObserver.observe(el); // Agora o revealObserver existe!
                    });
                });
            }
        })
        .catch((err) => {
            console.error(err);
            instagramContainer.innerHTML = '<div style="text-align:center;padding:20px"><a href="https://instagram.com/ledansecoreografias" target="_blank" class="btn-service">Ver Instagram</a></div>';
        });
}

// PARALLAX HERO

const heroContent = document.querySelector('.hero-content');

if (heroContent) {
    const updateParallax = throttle(() => {
        requestTick(() => {
            const scroll = window.scrollY;
            if (scroll < window.innerHeight) {
                heroContent.style.transform = `translate3d(0, ${scroll * 0.4}px, 0)`;
                heroContent.style.opacity = Math.max(0, 1 - (scroll / 600));
            }
        });
    }, 16);

    document.addEventListener('scroll', updateParallax, { passive: true });
}

// SCROLL TO TOP BUTTON

const scrollTopBtn = document.createElement('button');
scrollTopBtn.innerHTML = '<i class="fas fa-arrow-up"></i>';
scrollTopBtn.className = 'scroll-top-btn';
scrollTopBtn.ariaLabel = "Voltar ao topo";
document.body.appendChild(scrollTopBtn);

const toggleScrollBtn = throttle(() => {
    requestTick(() => {
        if (window.scrollY > 300) {
            scrollTopBtn.classList.add('visible');
        } else {
            scrollTopBtn.classList.remove('visible');
        }
    });
}, 100);

window.addEventListener('scroll', toggleScrollBtn, { passive: true });

scrollTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

// EFEITO DE DIGITAÇÃO (HERO)

document.addEventListener("DOMContentLoaded", () => {
    const textTitle1 = "Tornando seu evento";
    const textTitle2 = "ainda mais especial!";
    
    const typingSpeed = 50;

    const typeWriter = (elementId, text, speed) => {
        return new Promise((resolve) => {
            const element = document.getElementById(elementId);
            if (!element) return resolve();
            
            element.innerHTML = "";
            let i = 0;

            function type() {
                if (i < text.length) {
                    element.innerHTML += text.charAt(i);
                    i++;
                    setTimeout(type, speed);
                } else {
                    resolve();
                }
            }
            type();
        });
    };

    const startAnimation = async () => {
        await typeWriter("type-title-1", textTitle1, typingSpeed);
        await typeWriter("type-title-2", textTitle2, typingSpeed);
    };

    startAnimation();
});

// BOTÃO VEJA MAIS / VER MENOS

const btnLoadMore = document.getElementById('btn-load-more');
const btnShowLess = document.getElementById('btn-show-less');

if (btnLoadMore && btnShowLess) {
    btnLoadMore.addEventListener('click', () => {
        const hiddenItems = document.querySelectorAll('.gallery-item.hidden');
        
        requestAnimationFrame(() => {
            hiddenItems.forEach((item, index) => {
                item.classList.remove('hidden');
                
                setTimeout(() => {
                    requestAnimationFrame(() => {
                        item.classList.add('fade-in');
                        if (typeof revealObserver !== 'undefined') {
                            revealObserver.observe(item);
                        }
                    });
                }, index * 50);
            });
        });

        btnLoadMore.style.display = 'none';
        btnShowLess.style.display = 'inline-block';
    });

    btnShowLess.addEventListener('click', () => {
        const extraItems = document.querySelectorAll('.gallery-item.extra-item');
        
        extraItems.forEach(item => {
            item.classList.add('hidden');
            item.classList.remove('fade-in');
            item.classList.remove('active');
        });

        btnShowLess.style.display = 'none';
        btnLoadMore.style.display = 'inline-block';

        const gallerySection = document.getElementById('galeria');
        if (gallerySection) {
            gallerySection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
}

// SISTEMA MODAL (SAIBA MAIS - SERVICE)

document.querySelectorAll('.btn-learn-more').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const modalId = btn.getAttribute('data-modal');
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    });
});

window.closeAllModals = () => {
    document.querySelectorAll('.service-modal').forEach(modal => {
        modal.classList.remove('active');
    });
    document.body.style.overflow = 'auto';
};

document.querySelectorAll('.close-modal').forEach(btn => {
    btn.addEventListener('click', closeAllModals);
});

document.querySelectorAll('.service-modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeAllModals();
        }
    });
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeAllModals();
    }
});

// LGPD COOKIE CONSENT

const cookieBanner = document.getElementById('cookie-banner');
const acceptCookiesBtn = document.getElementById('accept-cookies');

if (cookieBanner && acceptCookiesBtn) {
    const hasAcceptedCookies = localStorage.getItem('ledanse_cookies_accepted');

    if (!hasAcceptedCookies) {
        setTimeout(() => {
            cookieBanner.classList.add('show');
        }, 2000);
    }

    acceptCookiesBtn.addEventListener('click', () => {
        localStorage.setItem('ledanse_cookies_accepted', 'true');
        cookieBanner.classList.remove('show');
    });
}