// src/AddVacancyForm.js
import React, { useState, useEffect } from 'react';

function AddVacancyForm({ userStartups, onAdd, onCancel, isLoading }) { // Принимаем список стартапов пользователя
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [salary, setSalary] = useState('');
    const [requirements, setRequirements] = useState('');
    const [selectedStartupId, setSelectedStartupId] = useState(''); // ID выбранного стартапа

    // Устанавливаем первый стартап по умолчанию, если список есть и ID еще не выбран
    useEffect(() => {
        if (userStartups && userStartups.length > 0 && !selectedStartupId) {
            setSelectedStartupId(userStartups[0].id.toString());
        }
        // Если список стартапов изменился и текущий выбранный ID больше не валиден, сбрасываем его
        else if (userStartups && selectedStartupId && !userStartups.some(s => s.id.toString() === selectedStartupId)) {
             setSelectedStartupId(userStartups.length > 0 ? userStartups[0].id.toString() : '');
        }
    }, [userStartups, selectedStartupId]);


    const handleSubmit = (e) => {
        e.preventDefault(); // Предотвращаем стандартную отправку формы

        // ---> ЛОГ 1: Форма отправлена <---
        console.log('[AddVacancyForm] handleSubmit вызван. isLoading:', isLoading);
        console.log('[AddVacancyForm] Данные формы:', { selectedStartupId, title, description, salary, requirements });
        // ---------------------------------

        // Проверка isLoading перед продолжением (хотя кнопка должна быть заблокирована)
        if (isLoading) {
            console.warn('[AddVacancyForm] Попытка отправки во время загрузки.');
            return;
        }

        // Валидация
        if (!selectedStartupId || !title.trim() || !description.trim() || !requirements.trim()) {
            // ---> ЛОГ 2: Ошибка валидации <---
            console.error('[AddVacancyForm] Ошибка валидации: Не все обязательные поля заполнены или стартап не выбран.');
            // -------------------------------
            alert('Пожалуйста, выберите стартап и заполните название, описание и требования вакансии.');
            return; // Прерываем выполнение
        }

        // Подготовка данных для отправки
        const vacancyData = {
            startup_id: parseInt(selectedStartupId), // Отправляем как число
            title: title.trim(),
            description: description.trim(),
            salary: salary.trim() || null, // Отправляем null, если зарплата пустая
            requirements: requirements.trim()
        };

        // ---> ЛОГ 3: Вызов onAdd <---
        console.log('[AddVacancyForm] Валидация пройдена. Вызов onAdd с данными:', vacancyData);
        // ---------------------------

        // Вызов колбэка (handleAddVacancy из родительского компонента VacanciesTabContent)
        onAdd(vacancyData);
    };

    return (
        <form onSubmit={handleSubmit} className="add-vacancy-form add-form">
            <h3>Добавить новую вакансию</h3>

            <label htmlFor="startup-select">Для стартапа:</label>
            <select
                id="startup-select"
                value={selectedStartupId}
                onChange={(e) => setSelectedStartupId(e.target.value)}
                required // HTML5 валидация
                disabled={isLoading || !userStartups || userStartups.length === 0}
            >
                {/* Пустой вариант для плейсхолдера/обязательного выбора */}
                <option value="" disabled>-- Выберите стартап --</option>

                {/* Отображение доступных стартапов */}
                {userStartups && userStartups.map(startup => (
                    <option key={startup.id} value={startup.id.toString()}>
                        {startup.name}
                    </option>
                ))}

                {/* Сообщение, если стартапов нет */}
                 {(!userStartups || userStartups.length === 0) && (
                    <option value="" disabled>У вас нет доступных стартапов для добавления вакансии</option>
                 )}
            </select>


            <input type="text" placeholder="Название вакансии (должность)" value={title} onChange={(e) => setTitle(e.target.value)} required disabled={isLoading} />
            <textarea placeholder="Описание вакансии" value={description} onChange={(e) => setDescription(e.target.value)} required disabled={isLoading} />
            <input type="text" placeholder="Зарплата (например, 100000 руб. или 'По договоренности')" value={salary} onChange={(e) => setSalary(e.target.value)} disabled={isLoading} />
            <textarea placeholder="Требования к кандидату" value={requirements} onChange={(e) => setRequirements(e.target.value)} required disabled={isLoading} />

            <div className="form-buttons">
                {/* Кнопка отправки формы */}
                <button
                    type="submit"
                    disabled={isLoading || !selectedStartupId} // Блокируем, если идет загрузка или стартап не выбран
                >
                    {isLoading ? 'Добавление...' : 'Добавить вакансию'}
                </button>
                {/* Кнопка отмены */}
                <button
                    type="button"
                    onClick={onCancel} // Вызывает setShowAddVacancyForm(false) в родителе
                    className="cancel-button"
                    disabled={isLoading} // Блокируем во время загрузки
                >
                    Отмена
                </button>
            </div>
        </form>
    );
}
export default AddVacancyForm;
