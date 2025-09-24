document.addEventListener('DOMContentLoaded', () => {
    const goalForm = document.getElementById('goal-form');
    const goalsList = document.getElementById('goals-list');
    const journalList = document.getElementById('journal-list');
    const emotionModal = document.getElementById('emotion-modal');
    const emotionChoices = document.getElementById('emotion-choices');
    const saveEmotionBtn = document.getElementById('save-emotion-btn');

    // La animación de entrada se maneja principalmente con CSS

    let selectedEmotion = null;

    // Cargar metas desde localStorage o inicializar un array vacío
    let goals = JSON.parse(localStorage.getItem('goals')) || [];

    // Función para guardar las metas en localStorage
    const saveGoals = () => {
        localStorage.setItem('goals', JSON.stringify(goals));
    };

    // Función para renderizar (mostrar) las metas en la página
    const renderGoals = () => {
        goalsList.innerHTML = ''; // Limpiar la lista actual

        if (goals.length === 0) {
            goalsList.innerHTML = '<p>Aún no tienes metas. ¡Crea una para empezar a ahorrar!</p>';
            return;
        }

        goals.forEach(goal => {
            const progress = (goal.saved / goal.target) * 100;
            const dailyTarget = goal.target / goal.timeframe;

            // Imagen por defecto si el usuario no proporciona una
            const imageUrl = goal.image || 'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?q=80&w=800&h=300&fit=crop';

            const goalCard = document.createElement('div');
            goalCard.className = 'goal-card';
            goalCard.dataset.id = goal.id;

            // Lógica para el color dinámico de la barra de progreso
            let progressBarGradient = 'linear-gradient(90deg, #00f2ff, #3854e9)'; // Azul/Cyan (inicio)
            if (progress > 50) {
                progressBarGradient = 'linear-gradient(90deg, #00bf72, #a8eb12)'; // Verde (a mitad)
            }
            if (goal.completed || progress >= 100) {
                progressBarGradient = 'linear-gradient(90deg, #ffc300, #ff5733)'; // Dorado/Naranja (completado)
            }

            goalCard.innerHTML = `
                <button class="delete-goal-btn" title="Eliminar meta">&times;</button>
                <div class="goal-card-header" style="background-image: url('${imageUrl}')">
                    <h3>${goal.name}</h3>
                </div>
                <div class="goal-card-body">
                    <div class="goal-info">
                        Ahorrado: <span>$${goal.saved.toFixed(2)}</span> de <span>$${goal.target.toFixed(2)}</span>
                    </div>
                    <div class="progress-bar-container">
                        <div class="progress-bar" style="width: ${progress.toFixed(2)}%; background: ${progressBarGradient};">${progress.toFixed(2)}%</div>
                    </div>
                    <div class="goal-info">
                        Ahorro diario sugerido: <span>$${dailyTarget.toFixed(2)}</span>
                    </div>
                    ${!goal.completed ? `
                        <form class="add-saving-form">
                            <input type="number" placeholder="Añadir ahorro" min="0.01" step="0.01" required>
                            <button type="submit">Añadir</button>
                        </form>
                    ` : '<p style="text-align: center; color: #ffc300; font-weight: bold;">¡Meta Completada! 🎉</p>'}
                </div>
            `;
            goalsList.appendChild(goalCard);
        });
    };

    // Manejar el envío del formulario para crear una nueva meta
    goalForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const name = document.getElementById('goal-name').value;
        const target = parseFloat(document.getElementById('goal-target').value);
        const timeframe = parseInt(document.getElementById('goal-timeframe').value, 10);
        const image = document.getElementById('goal-image').value;

        const newGoal = {
            id: Date.now(), // ID único basado en la fecha actual
            name,
            target,
            timeframe,
            image,
            completed: false,
            saved: 0,
            createdAt: new Date()
        };

        goals.push(newGoal);
        saveGoals();
        renderGoals();

        goalForm.reset();
    });

    // Manejar acciones dentro de las tarjetas de meta (añadir ahorro, eliminar)
    goalsList.addEventListener('click', (e) => {
        const target = e.target;
        const card = target.closest('.goal-card');
        if (!card) return;

        const goalId = parseInt(card.dataset.id, 10);

        // Si se hace clic en el botón de eliminar
        if (target.classList.contains('delete-goal-btn')) {
            if (confirm('¿Estás seguro de que quieres eliminar esta meta?')) {
                goals = goals.filter(goal => goal.id !== goalId);
                saveGoals();
                renderGoals();
            }
        }
    });

    goalsList.addEventListener('submit', (e) => {
        e.preventDefault();
        const target = e.target;

        // Si se envía el formulario de añadir ahorro
        if (target.classList.contains('add-saving-form')) {
            const card = target.closest('.goal-card');
            const goalId = parseInt(card.dataset.id, 10);
            const inputElement = target.querySelector('input');
            const amount = parseFloat(inputElement.value);

            const goal = goals.find(g => g.id === goalId);

            if (goal) {
                // Verificación 0: No añadir a metas completadas.
                if (goal.completed) {
                    alert('¡Felicidades! Ya has completado esta meta.');
                    return;
                }

                // Verificación 1: No permitir números negativos o cero.
                if (amount <= 0) {
                    alert('Por favor, introduce una cantidad positiva.');
                    return;
                }

                // Verificación 2: No permitir que el ahorro total supere la meta.
                if (goal.saved + amount > goal.target) {
                    alert(`No puedes añadir esa cantidad. Te pasarías de tu meta por $${((goal.saved + amount) - goal.target).toFixed(2)}.`);
                    return;
                }

                // Si todo está bien, añade el ahorro.
                goal.saved = Math.min(goal.target, goal.saved + amount);

                // Verificación 3: ¡Comprobar si la meta se ha completado!
                if (goal.saved >= goal.target && !goal.completed) {
                    goal.completed = true;
                    // ¡Lanzar confeti!
                    confetti({
                        particleCount: 150,
                        spread: 90,
                        origin: { y: 0.6 }
                    });
                }

                saveGoals();
                renderGoals();
            }
        }
    });

    // --- LÓGICA DEL DIARIO EMOCIONAL ---

    // Cargar entradas del diario
    let journalEntries = JSON.parse(localStorage.getItem('journalEntries')) || [];

    // Guardar entradas del diario
    const saveJournal = () => {
        localStorage.setItem('journalEntries', JSON.stringify(journalEntries));
    };

    // Renderizar entradas del diario
    const renderJournal = () => {
        journalList.innerHTML = '';
        if (journalEntries.length === 0) {
            journalList.innerHTML = '<p>Aún no hay registros. Tu diario emocional aparecerá aquí.</p>';
            return;
        }

        // Mostrar en orden cronológico inverso (el más nuevo primero)
        [...journalEntries].reverse().forEach(entry => {
            const entryCard = document.createElement('div');
            entryCard.className = 'journal-entry';
            const entryDate = new Date(entry.date).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });

            entryCard.innerHTML = `
                <div class="date">${entryDate}</div>
                <div class="emotion">${entry.emotion}</div>
                ${entry.comment ? `<p class="comment">"${entry.comment}"</p>` : ''}
            `;
            journalList.appendChild(entryCard);
        });
    };

    // Comprobar si se debe mostrar el modal de check-in
    const checkWeeklyPrompt = () => {
        const lastPrompt = localStorage.getItem('lastEmotionPrompt');
        const now = new Date();
        const oneWeek = 7 * 24 * 60 * 60 * 1000;

        // Solo preguntar si hay al menos una meta creada
        if (goals.length > 0 && (!lastPrompt || (now.getTime() - new Date(lastPrompt).getTime()) > oneWeek)) {
            emotionModal.style.display = 'flex';
        }
    };

    // Manejar la selección de emoción
    emotionChoices.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            // Quitar selección previa
            document.querySelectorAll('.emotion-choices button').forEach(btn => btn.style.borderColor = 'rgba(255,255,255,0.2)');
            // Resaltar selección actual
            e.target.style.borderColor = '#00f2ff';
            selectedEmotion = e.target.dataset.emotion;
        }
    });

    // Guardar la emoción
    saveEmotionBtn.addEventListener('click', () => {
        if (!selectedEmotion) {
            alert('Por favor, selecciona cómo te sientes.');
            return;
        }
        const comment = document.getElementById('emotion-comment').value;
        journalEntries.push({
            date: new Date(),
            emotion: selectedEmotion,
            comment: comment
        });
        saveJournal();
        renderJournal();

        localStorage.setItem('lastEmotionPrompt', new Date().toISOString());
        emotionModal.style.display = 'none';
        selectedEmotion = null; // Reset
    });

    // Renderizar las metas al cargar la página por primera vez
    renderGoals();
    renderJournal();
    checkWeeklyPrompt();
});