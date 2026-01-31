import './style.css'
import emailjs from '@emailjs/browser';

// CONFIGURAÇÃO E ENV

const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;
const RECAPTCHA_SITE_KEY = '6LexHFUsAAAAALR2NZ9fFYRFwzb4qiw69kcLiQJZ';

emailjs.init(PUBLIC_KEY);

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
if (heroVideo) {
    const playVideo = () => {
        if (heroVideo.paused) {
            heroVideo.play().catch(e => console.log("Autoplay bloqueado (aguardando interação):", e));
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

// FORMULÁRIO

const contactForm = document.getElementById('contactForm');

if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const btn = contactForm.querySelector('button[type="submit"]');
        const originalText = btn.textContent;
        
        const loadRecaptcha = () => {
            return new Promise((resolve, reject) => {
                if (typeof grecaptcha !== 'undefined') {
                    resolve();
                    return;
                }
                
                const script = document.createElement('script');
                script.src = `https://www.google.com/recaptcha/api.js?render=${RECAPTCHA_SITE_KEY}`;
                script.async = true;
                script.defer = true;
                script.onload = resolve;
                script.onerror = () => reject(new Error('Bloqueador detectado.'));
                document.head.appendChild(script);
            });
        };

        const submitForm = async () => {
            try {
                btn.textContent = 'Verificando segurança...';
                btn.disabled = true;

                await loadRecaptcha();

                await new Promise(r => grecaptcha.ready(r));

                console.log('Tentando gerar token...');

                const token = await grecaptcha.execute('6LexHFUsAAAAALR2NZ9fFYRFwzb4qiw69kcLiQJZ', {action: 'submit'});

                console.log('TOKEN GERADO:', token);

                if (!token) {
            throw new Error('O Google não gerou o token. Verifique a Chave do Site.');
        }

                const validation = await fetch('/api/validate_captcha', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token })
                });
                
                const validationResult = await validation.json();

                if (!validation.ok || !validationResult.success) {
                    throw new Error('Falha na verificação de robô.');
                }

                btn.textContent = 'Enviando...';
                
                const templateParams = {
                    nome: document.getElementById('nome').value,
                    email: document.getElementById('email').value,
                    telefone: document.getElementById('telefone').value,
                    tipo_evento: document.getElementById('tipo-evento').value,
                    mensagem: document.getElementById('mensagem').value
                };

                await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams);
                
                alert('✅ Mensagem enviada com sucesso! Em breve entraremos em contato.');
                contactForm.reset();

            } catch (error) {
                console.error('Erro:', error);
                let msg = 'Erro ao enviar. Tente novamente.';
                if (error.message.includes('Bloqueador')) {
                    msg = 'Erro de conexão com o Google. Se você usa bloqueadores de anúncio, tente desativar temporariamente.';
                }
                alert('❌ ' + msg);
            } finally {
                btn.textContent = originalText;
                btn.disabled = false;
            }
        };

        submitForm();
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

// WHATSAPP

const btnZap = document.querySelector('#btn-whatsapp');
if(btnZap) {
    btnZap.addEventListener('click', () => {
        window.open('https://wa.me/5551999598622', '_blank');
    });
}

// INSTAGRAM

const instagramContainer = document.getElementById('insta-feed');

if (instagramContainer) {
    instagramContainer.innerHTML = Array(6).fill('<div class="skeleton insta-item"></div>').join('');
    
    fetch('/api/instagram') 
        .then(res => res.json())
        .then(data => {
            instagramContainer.innerHTML = '';
            
            if (data.data) {
                data.data.forEach(post => {
                    const link = document.createElement('a');
                    link.className = "insta-item reveal";
                    link.href = post.permalink; 
                    link.target = "_blank"; 
                    link.rel = "noopener";
                    
                    // LÓGICA DE MÍDIA
                    if (post.media_type === 'VIDEO') {
                        const video = document.createElement('video');
                        video.src = post.media_url;
                        video.poster = post.thumbnail_url;
                        video.muted = true;
                        video.loop = true;
                        video.playsInline = true;
                        
                        link.addEventListener('mouseenter', () => {
                            video.play().catch(e => console.log("Aguardando carregamento..."));
                        });
                        
                        link.addEventListener('mouseleave', () => {
                            video.pause();
                            video.currentTime = 0;
                        });

                        link.appendChild(video);

                    } else {
                        const img = document.createElement('img');
                        img.src = post.media_url;
                        img.alt = post.caption ? post.caption.slice(0, 80) : 'Instagram LeDanse';
                        img.loading = "lazy";
                        
                        link.appendChild(img);
                    }
                    
                    instagramContainer.appendChild(link);
                });

                requestAnimationFrame(() => {
                    document.querySelectorAll('.insta-item').forEach(el => revealObserver.observe(el));
                });
            }
        })
        .catch((err) => {
            console.error(err);
            instagramContainer.innerHTML = '<div style="text-align:center;padding:20px"><a href="https://instagram.com/ledansecoreografias" target="_blank" class="btn-service">Ver Instagram</a></div>';
        });
}

// SCROLL

const revealElements = document.querySelectorAll('.service-card, .section-title, .about-text, .gallery-item, .contact-container');
revealElements.forEach(el => el.classList.add('reveal'));

const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) { 
            entry.target.classList.add('active'); 
            revealObserver.unobserve(entry.target); 
        }
    });
}, { threshold: 0.1 });

revealElements.forEach(el => revealObserver.observe(el));

document.addEventListener('scroll', () => {
    const scroll = window.scrollY;
    const heroContent = document.querySelector('.hero-content');
    if (heroContent && scroll < window.innerHeight) {
        heroContent.style.transform = `translateY(${scroll * 0.4}px)`;
        heroContent.style.opacity = 1 - (scroll / 600);
    }
});

// SCROLL TO TOP BUTTON

const scrollTopBtn = document.createElement('button');
scrollTopBtn.innerHTML = '<i class="fas fa-arrow-up"></i>';
scrollTopBtn.className = 'scroll-top-btn';
scrollTopBtn.ariaLabel = "Voltar ao topo";
document.body.appendChild(scrollTopBtn);

window.addEventListener('scroll', () => {
    if (window.scrollY > 300) {
        scrollTopBtn.classList.add('visible');
    } else {
        scrollTopBtn.classList.remove('visible');
    }
});

scrollTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
});