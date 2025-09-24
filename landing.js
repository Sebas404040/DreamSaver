document.addEventListener('DOMContentLoaded', () => {
    const ctaButton = document.querySelector('.cta-button');

    if (ctaButton) {
        ctaButton.addEventListener('click', function(e) {
            e.preventDefault(); // Evita la navegación inmediata
            const destination = this.href; // Guarda la URL de destino

            document.body.classList.add('fade-out'); // Aplica la animación de salida

            setTimeout(() => { window.location.href = destination; }, 500); // Espera a que termine la animación para navegar
        });
    }
});