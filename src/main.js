import './style.css'
import emailjs from '@emailjs/browser';


const SERVICE_ID = "service_xg1058k";
const TEMPLATE_ID = "template_yczebv8";
const PUBLIC_KEY = "toWvBJnokcWr3EUlK";


emailjs.init(PUBLIC_KEY);


const contactForm = document.getElementById('contactForm');

if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const recaptchaResponse = grecaptcha.getResponse();
        
        if (!recaptchaResponse) {
            alert('⚠️ Por favor, confirme que você não é um robô clicando na caixa.');
            return;
        }

        const btn = contactForm.querySelector('button[type="submit"]');
        const originalText = btn.textContent;

        btn.textContent = 'Enviando...';
        btn.disabled = true;

        const templateParams = {
            nome: document.getElementById('nome').value,
            email: document.getElementById('email').value,
            telefone: document.getElementById('telefone').value,
            tipo_evento: document.getElementById('tipo-evento').value,
            mensagem: document.getElementById('mensagem').value,
            'g-recaptcha-response': recaptchaResponse
        };

        emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams)
            .then(() => {
                alert('✅ Mensagem enviada com sucesso! Em breve entraremos em contato.');
                contactForm.reset();
                grecaptcha.reset();
            })
            .catch((error) => {
                console.error('Erro ao enviar email:', error);
                alert('❌ Ocorreu um erro ao enviar. Tente novamente.');
            })
            .finally(() => {
                btn.textContent = originalText;
                btn.disabled = false;
            });
    });
}


const btnZap = document.querySelector('#btn-whatsapp');
if(btnZap) {
    btnZap.addEventListener('click', () => {
        window.open('https://wa.me/5551999598622', '_blank');
    });
}

const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightbox-img');
const closeBtn = document.querySelector('.close-lightbox');
const galleryItems = document.querySelectorAll('.gallery-item');

if(lightbox && galleryItems.length > 0) {
    galleryItems.forEach(item => {
        item.addEventListener('click', () => {
            const fullSizeSrc = item.getAttribute('data-src');
            if(fullSizeSrc) {
                lightboxImg.src = fullSizeSrc;
                lightbox.classList.add('active');
                document.body.style.overflow = 'hidden';
            }
        });
    });

    const closeLightbox = () => {
        lightbox.classList.remove('active');
        document.body.style.overflow = 'auto';
    };

    closeBtn.addEventListener('click', closeLightbox);
    
    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) closeLightbox();
    });
}


// INTEGRAÇÃO INSTAGRAM

const instagramContainer = document.getElementById('insta-feed');

if (instagramContainer) {
    fetch('/api/instagram') 
        .then(response => {
            if (!response.ok) throw new Error('Erro na API');
            return response.json();
        })
        .then(data => {
            instagramContainer.innerHTML = '';

            if (!data.data) return;

            data.data.forEach(post => {
                const link = document.createElement('a');
                link.href = post.permalink;
                link.target = "_blank";
                link.rel = "noopener noreferrer";
                link.className = "insta-item";

                const imageUrl = post.media_type === 'VIDEO' ? post.thumbnail_url : post.media_url;

                const img = document.createElement('img');
                img.src = imageUrl;
                img.alt = post.caption ? post.caption.slice(0, 50) + '...' : 'Post Instagram Le Danse';
                img.loading = "lazy";
                
                link.appendChild(img);
                instagramContainer.appendChild(link);
            });
        })
        .catch(error => {
            console.error("Erro no feed:", error);
            instagramContainer.innerHTML = '<div style="text-align: center; width: 100%; padding: 20px;"><a href="https://instagram.com/ledansecoreografias" target="_blank" class="btn-service" style="border:none;">Ver no Instagram</a></div>';
        });
}