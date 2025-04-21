// src/AddVacancyForm.js (ПОЛНЫЙ КОД - Исправлены пропсы и ВОССТАНОВЛЕН JSX)

import React, { useState, useEffect } from 'react';
import './App.css'; // Убедись, что стили подключены

// Принимаем availableStartups (отфильтрованный список)
function AddVacancyForm({ availableStartups, onAdd, onCancel, isLoading }) {

    // Безопасная инициализация состояния для выбранного стартапа
    const [selectedStartup, setSelectedStartup] = useState(
        availableStartups && availableStartups.length > 0 ? availableStartups[0].id.toString() : ''
    );
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [salary, setSalary] = useState('');
    const [requirements, setRequirements] = useState('');

    // Эффект для обновления selectedStartup, если список изменится
    useEffect(() => {
        if (!selectedStartup && availableStartups && availableStartups.length > 0) {
            setSelectedStartup(availableStartups[0].id.toString());
        }
        else if (selectedStartup && availableStartups && !availableStartups.some(s => s.id.toString() === selectedStartup)) {
             setSelectedStartup(availableStartups.length > 0 ? availableStartups[0].id.toString() : '');
        }
    }, [availableStartups, selectedStartup]);

    // Обработчик отправки формы
    const handleSubmit = (e) => {
        e.preventDefault();
        if (!selectedStartup || !title.trim() || !description.trim() || !requirements.trim()) {
            alert('Заполните все обязательные поля (Стартап, Название, Описание, Требования).');
            return;
        }
        onAdd({
            startup_id: parseInt(selectedStartup, 10),
            title: title.trim(),
            description: description.trim(),
            salary: salary.trim() || null,
            requirements: requirements.trim()
        });
    };

    // --- НАЧАЛО ВОССТАНОВЛЕННОГО JSX ДЛЯ ФОРМЫ ---
    return (
        <form onSubmit={handleSubmit} className="add-vacancy-form add-form">
            <h3>Добавить новую вакансию</h3>

            {/* Поле выбора стартапа */}
            <div className="form-field">
                <label htmlFor="startup-select">Стартап:</label>
                <select
                    id="startup-select"
                    value={selectedStartup}
                    onChange={(e) => setSelectedStartup(e.target.value)}
                    disabled={isLoading || !availableStartups || availableStartups.length === 0}
                    required
                >
                    <option value="" disabled>
                        {(!availableStartups || availableStartups.length === 0)
                            ? "Нет доступных стартапов"
                            : "-- Выберите стартап --"}
                    </option>
                    {availableStartups && availableStartups.map(startup => (
                        <option key={startup.id} value={startup.id.toString()}>
                            {startup.name}
                        </option>
                    ))}
                </select>
                 {(!availableStartups || availableStartups.length === 0) && !isLoading && (
                    <p style={{ fontSize: '0.8em', color: '#dc3545', marginTop: '5px' }}>
                        Не найдено одобренных стартапов, к которым вы можете добавить вакансию.
                    </p>
                 )}
            </div>

            {/* Поле Название вакансии */}
            <div className="form-field">
                <label htmlFor="vacancy-title">Название вакансии:</label>
                <input
                    type="text"
                    id="vacancy-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    disabled={isLoading}
                    placeholder="Напр., Frontend разработчик (React)"
                 />
            </div>

            {/* Поле Описание */}
            <div className="form-field">
                <label htmlFor="vacancy-description">Описание:</label>
                <textarea
                    id="vacancy-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                    disabled={isLoading}
                    rows={4}
                    placeholder="Опишите задачи и условия работы..."
                />
            </div>

            {/* Поле Требования */}
            <div className="form-field">
                <label htmlFor="vacancy-requirements">Требования:</label>
                <textarea
                    id="vacancy-requirements"
                    value={requirements}
                    onChange={(e) => setRequirements(e.target.value)}
                    required
                    disabled={isLoading}
                    rows={3}
                    placeholder="Перечислите необходимые навыки и опыт..."
                />
            </div>

             {/* Поле Зарплата (опционально) */}
             <div className="form-field">
                <label htmlFor="vacancy-salary">Зарплата (опционально):</label>
                <input
                    type="text"
                    id="vacancy-salary"
                    value={salary}
                    onChange={(e) => setSalary(e.target.value)}
                    placeholder="Напр., 100 000 - 150 000 руб. или 'По договоренности'"
                    disabled={isLoading}
                />
            </div>

            {/* Кнопки формы */}
            <div className="form-buttons">
                <button
                    type="submit"
                    disabled={isLoading || !selectedStartup}
                >
                    {isLoading ? 'Отправка...' : 'Добавить вакансию'}
                </button>
                <button
                    type="button"
                    onClick={onCancel}
                    className="cancel-button"
                    disabled={isLoading}
                >
                    Отмена
                </button>
            </div>
        </form>
    );
    // --- КОНЕЦ ВОССТАНОВЛЕННОГО JSX ---
}

export default AddVacancyForm;
