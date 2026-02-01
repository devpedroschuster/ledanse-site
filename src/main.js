import './style.css'
import emailjs from '@emailjs/browser';

// CONFIGURAÇÃO E ENV
const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;
const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

emailjs.init(PUBLIC_KEY);

// ========================================
// UTILITÁRIOS DE PERFORMANCE
// ========================================

// Debounce para eventos que disparam muito frequentemente
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

// Throttle para scroll (mais eficiente que debounce para scroll)
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

// RequestAnimationFrame otimizado para scroll
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

// ========================================
// PADRÃO TELEFONE FORM
// ========================================
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

// ========================================
// VIDEO AUTOPLAY
// ========================================
const heroVideo = document.querySelector('.hero-video');
if (heroVideo) {
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

// ========================================
// LIGHTBOX COM NAVEGAÇÃO (Otimizado)
// ========================================
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

// ========================================
// FORMULÁRIO
// ========================================
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

            try {
                if (typeof grecaptcha !== 'undefined') {
                    await new Promise(r => grecaptcha.ready(r));
                    token = await grecaptcha.execute('6LexHFUsAAAAALR2NZ9fFYRFwzb4qiw69kcLiQJZ', {action: 'submit'});
                } else {
                    throw new Error('Grecaptcha undefined');
                }
            } catch (err) {
                console.warn("⚠️ Google falhou/bloqueado. Usando BYPASS DE TESTE.");
                token = 'BYPASS_DEV_MODE'; 
            }

            const validation = await fetch('/api/validate_captcha', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token })
            });

            const result = await validation.json();

            if (!validation.ok || !result.success) {
                throw new Error('Segurança recusou o envio.');
            }

            btn.textContent = 'Enviando email...';
            
            const templateParams = {
                nome: document.getElementById('nome').value,
                email: document.getElementById('email').value,
                telefone: document.getElementById('telefone').value,
                tipo_evento: document.getElementById('tipo-evento').value,
                mensagem: document.getElementById('mensagem').value
            };

            await emailjs.send("service_xg1058k", "template_yczebv8", templateParams);
            
            alert('✅ Sucesso! Mensagem enviada.');
            contactForm.reset();

        } catch (error) {
            console.error(error);
            alert('❌ Erro: ' + error.message);
        } finally {
            btn.textContent = originalText;
            btn.disabled = false;
        }
    });
}

// ========================================
// MOBILE MENU
// ========================================
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

// ========================================
// WHATSAPP
// ========================================
const btnZap = document.querySelector('#btn-whatsapp');
if(btnZap) {
    btnZap.addEventListener('click', () => {
        window.open('https://wa.me/5551999598622', '_blank');
    });
}

// ========================================
// INSTAGRAM (OTIMIZADO)
// ========================================
const instagramContainer = document.getElementById('insta-feed');

if (instagramContainer) {
    instagramContainer.innerHTML = Array(6).fill('<div class="skeleton insta-item"></div>').join('');
    
    fetch('/api/instagram') 
        .then(res => res.json())
        .then(data => {
            instagramContainer.innerHTML = '';
            
            if (data.data) {
                // Usar DocumentFragment para melhor performance
                const fragment = document.createDocumentFragment();
                
                data.data.slice(0, 6).forEach(post => {
                    const div = document.createElement('div');
                    div.className = 'insta-item reveal';
                    
                    if (post.media_type === 'VIDEO') {
                        const video = document.createElement('video');
                        video.src = post.media_url;
                        video.poster = post.thumbnail_url;
                        video.muted = true;
                        video.loop = true;
                        video.playsInline = true;
                        video.preload = 'none'; // Não carregar até necessário
                        video.classList.add('insta-video');
                        
                        // Usar Intersection Observer para vídeos (mais eficiente)
                        const videoObserver = new IntersectionObserver((entries) => {
                            entries.forEach(entry => {
                                if (entry.isIntersecting) {
                                    video.preload = 'metadata';
                                }
                            });
                        }, { rootMargin: '50px' });
                        
                        videoObserver.observe(div);
                        
                        // Usar event delegation seria melhor, mas mantendo sua lógica
                        let hoverTimeout;
                        div.addEventListener('mouseenter', () => {
                            hoverTimeout = setTimeout(() => {
                                video.play().catch(e => console.log("Aguardando carregamento..."));
                            }, 100); // Pequeno delay para evitar plays acidentais
                        }, { passive: true });
                        
                        div.addEventListener('mouseleave', () => {
                            clearTimeout(hoverTimeout);
                            video.pause();
                            video.currentTime = 0;
                        }, { passive: true });
                        
                        const playIcon = document.createElement('i');
                        playIcon.className = 'fas fa-play';
                        playIcon.style.cssText = 'position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); color:white; opacity:0.7; pointer-events:none;';
                        
                        div.appendChild(video);
                        div.appendChild(playIcon);
                        
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
                
                // Observar elementos adicionados com RAF para melhor performance
                requestAnimationFrame(() => {
                    document.querySelectorAll('#insta-feed .insta-item').forEach(el => {
                        revealObserver.observe(el);
                    });
                });
            }
        })
        .catch((err) => {
            console.error(err);
            instagramContainer.innerHTML = '<div style="text-align:center;padding:20px"><a href="https://instagram.com/ledansecoreografias" target="_blank" class="btn-service">Ver Instagram</a></div>';
        });
}

// ========================================
// SCROLL REVEAL (OTIMIZADO)
// ========================================
const revealElements = document.querySelectorAll('.service-card, .section-title, .about-text, .gallery-item, .contact-container');
revealElements.forEach(el => el.classList.add('reveal'));

// Intersection Observer com configurações otimizadas
const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) { 
            // Usar RAF para animações suaves
            requestAnimationFrame(() => {
                entry.target.classList.add('active');
            });
            revealObserver.unobserve(entry.target); 
        }
    });
}, { 
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px' // Começar animação um pouco antes
});

revealElements.forEach(el => revealObserver.observe(el));

// ========================================
// PARALLAX HERO (OTIMIZADO COM THROTTLE + RAF)
// ========================================
const heroContent = document.querySelector('.hero-content');

if (heroContent) {
    const updateParallax = throttle(() => {
        requestTick(() => {
            const scroll = window.scrollY;
            if (scroll < window.innerHeight) {
                // Usar transform3d e will-change para GPU acceleration
                heroContent.style.transform = `translate3d(0, ${scroll * 0.4}px, 0)`;
                heroContent.style.opacity = Math.max(0, 1 - (scroll / 600));
            }
        });
    }, 16); // ~60fps

    document.addEventListener('scroll', updateParallax, { passive: true });
}

// ========================================
// SCROLL TO TOP BUTTON (OTIMIZADO)
// ========================================
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

// ========================================
// EFEITO DE DIGITAÇÃO
// ========================================
document.addEventListener("DOMContentLoaded", () => {
    const textTitle1 = "Tornando seu evento";
    const textTitle2 = "ainda mais especial!";
    const textSubtitle = "Coreografias personalizadas para casamentos, formaturas e 15 anos. Duas mulheres, muita arte e a dança que você sonha.";
    
    const typingSpeed = 50;
    const subtitleSpeed = 30;

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
        await new Promise(r => setTimeout(r, 300));
        await typeWriter("type-subtitle", textSubtitle, subtitleSpeed);
    };

    startAnimation();
});

// ========================================
// BOTÃO VEJA MAIS (OTIMIZADO)
// ========================================
const btnLoadMore = document.getElementById('btn-load-more');

if (btnLoadMore) {
    btnLoadMore.addEventListener('click', () => {
        const hiddenItems = document.querySelectorAll('.gallery-item.hidden');
        
        // Usar DocumentFragment para melhor performance
        requestAnimationFrame(() => {
            hiddenItems.forEach((item, index) => {
                setTimeout(() => {
                    requestAnimationFrame(() => {
                        item.classList.remove('hidden');
                        item.classList.add('fade-in');
                        revealObserver.observe(item);
                    });
                }, index * 50);
            });
        });

        btnLoadMore.style.display = 'none';
    });
}