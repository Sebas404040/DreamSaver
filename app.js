document.addEventListener('DOMContentLoaded', () => {
    const goalForm = document.getElementById('goal-form');
    const goalsList = document.getElementById('goals-list');
    const latestJournalEntryContainer = document.getElementById('latest-journal-entry');
    const emotionModal = document.getElementById('emotion-modal');
    const sidebar = document.querySelector('.sidebar-content');
    const emotionChoices = document.getElementById('emotion-choices');
    const saveEmotionBtn = document.getElementById('save-emotion-btn');
    const deleteConfirmModal = document.getElementById('delete-confirm-modal');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    const cancelDeleteBtn = document.getElementById('cancel-delete-btn');

    // La animación de entrada se maneja principalmente con CSS

    let selectedEmotion = null;
    let emotionChart = null; // Variable para mantener la instancia del gráfico
    let goalCharts = {}; // Objeto para mantener las instancias de los gráficos de metas

    let goalToDelete = null; // Variable para guardar el ID de la meta a eliminar
    // Cargar metas desde localStorage o inicializar un array vacío
    let goals = JSON.parse(localStorage.getItem('goals')) || [];

    // --- LÓGICA DE NOTIFICACIONES TOAST ---
    const showToast = (message, type = 'error') => {
        const toastContainer = document.getElementById('toast-container');
        
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;

        toastContainer.appendChild(toast);

        // Forzar animación de entrada
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);

        // Ocultar y eliminar el toast después de 3 segundos
        setTimeout(() => {
            toast.classList.remove('show');
            toast.addEventListener('transitionend', () => toast.remove());
        }, 3000);
    };

    // Función para guardar las metas en localStorage
    const saveGoals = () => {
        localStorage.setItem('goals', JSON.stringify(goals));
    };

    // Función para renderizar (mostrar) las metas en la página
    const renderGoals = () => {
        goalsList.innerHTML = ''; // Limpiar la lista actual
        
        // Destruir gráficos antiguos para evitar fugas de memoria
        Object.values(goalCharts).forEach(chart => chart.destroy());
        goalCharts = {};

        if (goals.length === 0) {
            goalsList.innerHTML = '<p>Aún no tienes metas. ¡Crea una para empezar a ahorrar!</p>';
            return;
        }

        goals.forEach(goal => {
            const progress = (goal.saved / goal.target) * 100;
            const remaining = goal.target - goal.saved;
            const dailyTarget = goal.target / goal.timeframe;

            // Imagen por defecto si el usuario no proporciona una
            const imageUrl = goal.image || 'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?q=80&w=800&h=300&fit=crop';

            const goalCard = document.createElement('div');
            goalCard.className = `goal-card ${goal.completed ? 'completed' : ''}`;
            goalCard.dataset.id = goal.id;

            goalCard.innerHTML = `
                <button class="delete-goal-btn" title="Eliminar meta">&times;</button>
                <div class="goal-card-header" style="background-image: url('${imageUrl}')">
                    <h3>${goal.name}</h3>
                </div>
                <div class="goal-card-body">
                    <div class="goal-dashboard">
                        <div class="goal-chart-container">
                            <canvas id="chart-${goal.id}"></canvas>
                            <div class="chart-percentage">${progress.toFixed(1)}%</div>
                        </div>
                        <div class="goal-stats">
                            <div class="stat-item">
                                <label>Ahorrado</label>
                                <span class="stat-value">$${goal.saved.toFixed(2)}</span>
                            </div>
                            <div class="stat-item">
                                <label>Faltante</label>
                                <span class="stat-value">$${remaining.toFixed(2)}</span>
                            </div>
                        </div>
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

            // --- Crear el Gráfico de Anillo ---
            const ctx = document.getElementById(`chart-${goal.id}`).getContext('2d');
            if (ctx) {
                const chartData = {
                    datasets: [{
                        data: [goal.saved, Math.max(0, remaining)],
                        backgroundColor: [
                            goal.completed ? '#ffc300' : '#00f2ff', // Color del progreso
                            'rgba(255, 255, 255, 0.1)' // Color de lo que falta
                        ],
                        borderWidth: 0,
                        hoverBackgroundColor: [
                            goal.completed ? '#ffc300' : '#00f2ff',
                            'rgba(255, 255, 255, 0.1)'
                        ]
                    }]
                };

                goalCharts[goal.id] = new Chart(ctx, {
                    type: 'doughnut',
                    data: chartData,
                    options: {
                        responsive: true,
                        maintainAspectRatio: true,
                        cutout: '80%', // Grosor del anillo
                        plugins: {
                            legend: {
                                display: false
                            },
                            tooltip: {
                                enabled: false
                            }
                        },
                        animation: {
                            animateScale: true,
                            animateRotate: true
                        }
                    }
                });
            }
        });
    };

    // --- LÓGICA DEL ASISTENTE DE CREACIÓN DE METAS ---
    let currentStep = 1;
    const totalSteps = 3;

    const getFormValues = () => {
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
        return newGoal;
    };

    const updateFormStep = () => {
        document.querySelectorAll('.form-step').forEach(step => {
            step.classList.toggle('active', parseInt(step.dataset.step) === currentStep);
        });
        document.querySelectorAll('.progress-bar-step').forEach(step => {
            const stepNum = parseInt(step.dataset.step);
            step.classList.toggle('active', stepNum === currentStep);
            step.classList.toggle('completed', stepNum < currentStep);
        });
    };

    goalForm.addEventListener('click', (e) => {
        if (e.target.matches('.next-step-btn')) {
            // Validación simple antes de pasar al siguiente paso
            const currentStepElement = goalForm.querySelector(`.form-step[data-step="${currentStep}"]`);
            const inputs = currentStepElement.querySelectorAll('input[required], select[required]');
            let isValid = true;
            inputs.forEach(input => {
                if (!input.value) {
                    isValid = false;
                    input.focus();
                    showToast('Por favor, completa este campo.', 'warning');
                }
            });

            if (isValid && currentStep < totalSteps) {
                currentStep++;
                updateFormStep();
            }
        } else if (e.target.matches('.prev-step-btn')) {
            if (currentStep > 1) {
                currentStep--;
                updateFormStep();
            }
        }
    });

    // Manejar el envío del formulario para crear una nueva meta
    goalForm.addEventListener('submit', (e) => {
        e.preventDefault();

        // Validación final
        const timeframeSelect = document.getElementById('goal-timeframe');
        if (!timeframeSelect.value) {
            showToast('Por favor, selecciona un plazo.', 'warning');
            return;
        }

        const newGoal = getFormValues();
        goals.push(newGoal);
        saveGoals();
        renderGoals();

        goalForm.reset();
        currentStep = 1;
        updateFormStep();
        showToast('¡Nueva meta creada con éxito!', 'info');
    });

    // Manejar acciones dentro de las tarjetas de meta (añadir ahorro, eliminar)
    goalsList.addEventListener('click', (e) => {
        const target = e.target;
        const card = target.closest('.goal-card');
        if (!card) return;

        const goalId = parseInt(card.dataset.id, 10);

        // Si se hace clic en el botón de eliminar
        if (target.classList.contains('delete-goal-btn')) {
            goalToDelete = goalId;
            deleteConfirmModal.style.display = 'flex';
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
                    showToast('¡Felicidades! Ya has completado esta meta.', 'info');
                    return;
                }

                // Verificación 1: No permitir números negativos o cero.
                if (amount <= 0) {
                    showToast('Por favor, introduce una cantidad positiva.');
                    return;
                }

                // Verificación 2: No permitir que el ahorro total supere la meta.
                if (goal.saved + amount > goal.target) {
                    const overage = ((goal.saved + amount) - goal.target).toFixed(2);
                    showToast(`No puedes añadir esa cantidad. Te pasarías por $${overage}.`);
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

    // --- LÓGICA DEL ACORDEÓN DE ESTRATEGIAS ---
    if (sidebar) {
        sidebar.addEventListener('click', (e) => {
            const header = e.target.closest('.accordion-header');
            if (header) {
                const item = header.parentElement;
                const content = item.querySelector('.accordion-content');
                item.classList.toggle('active');
                content.style.maxHeight = item.classList.contains('active') ? `${content.scrollHeight}px` : null;
            }
        });
    }


    // --- LÓGICA DEL MODAL DE CONFIRMACIÓN DE ELIMINACIÓN ---
    confirmDeleteBtn.addEventListener('click', () => {
        if (goalToDelete !== null) {
            goals = goals.filter(goal => goal.id !== goalToDelete);
            saveGoals();
            renderGoals();
            deleteConfirmModal.style.display = 'none';
            goalToDelete = null;
            showToast('Meta eliminada.', 'info');
        }
    });

    cancelDeleteBtn.addEventListener('click', () => {
        deleteConfirmModal.style.display = 'none';
        goalToDelete = null;
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
        if (journalEntries.length === 0) {
            latestJournalEntryContainer.innerHTML = '<p>Aún no hay registros. Tu diario emocional aparecerá aquí.</p>';
            return;
        }

        // Mostrar la última entrada
        const latestEntry = journalEntries[journalEntries.length - 1];
        const latestEntryDate = new Date(latestEntry.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
        const emotionIcons = { 'Feliz': '😊', 'Neutral': '🙂', 'Preocupado': '😟' };

        latestJournalEntryContainer.innerHTML = `
            <div class="latest-journal-card">
                <div class="latest-journal-header">
                    <span class="latest-journal-icon">${emotionIcons[latestEntry.emotion] || '🤔'}</span>
                    <span class="latest-journal-emotion">${latestEntry.emotion}</span>
                </div>
                ${latestEntry.comment ? `<p class="latest-journal-comment">"${latestEntry.comment}"</p>` : '<p class="latest-journal-comment"><i>Sin comentarios.</i></p>'}
                <div class="latest-journal-date">${latestEntryDate}</div>
            </div>
        `;

        // Lógica para el gráfico
        const ctx = document.getElementById('emotion-chart').getContext('2d');
        
        // Mapear emociones a valores numéricos para el gráfico
        const emotionMap = { 'Feliz': 1, 'Neutral': 0, 'Preocupado': -1 };
        const labels = journalEntries.map(entry => new Date(entry.date).toLocaleDateString('es-ES'));
        const dataPoints = journalEntries.map(entry => emotionMap[entry.emotion]);

        if (emotionChart) {
            emotionChart.destroy(); // Destruir el gráfico anterior para redibujar
        }

        emotionChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Estado de Ánimo',
                    data: dataPoints,
                    borderColor: '#00f2ff',
                    backgroundColor: 'rgba(0, 242, 255, 0.2)',
                    tension: 0.3,
                    fill: true,
                    pointBackgroundColor: '#ffffff',
                    pointBorderColor: '#00f2ff',
                    pointHoverRadius: 7,
                    pointHoverBackgroundColor: '#00f2ff',
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        ticks: {
                            color: '#bdc3c7',
                            callback: function(value) {
                                for (let emotion in emotionMap) {
                                    if (emotionMap[emotion] === value) return emotion;
                                }
                            }
                        },
                        grid: { color: 'rgba(255, 255, 255, 0.1)' }
                    },
                    x: {
                        ticks: { color: '#bdc3c7' },
                        grid: { color: 'rgba(255, 255, 255, 0.1)' }
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const entry = journalEntries[context.dataIndex];
                                return `${entry.emotion}${entry.comment ? ': ' + entry.comment : ''}`;
                            }
                        }
                    }
                }
            }
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
            showToast('Por favor, selecciona cómo te sientes.', 'warning');
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