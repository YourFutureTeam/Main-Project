// src/AddVacancyForm.js
import React, { useState, useEffect } from 'react';

function AddVacancyForm({ userStartups, onAdd, onCancel, isLoading }) {
    const [selectedStartup, setSelectedStartup] = useState(userStartups[0]?.id.toString() || '');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [salary, setSalary] = useState('');
    const [requirements, setRequirements] = useState('');

    useEffect(() => {
        if (!selectedStartup && userStartups.length > 0) {
            setSelectedStartup(userStartups[0].id.toString());
        }
    }, [userStartups, selectedStartup]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!selectedStartup || !title.trim() || !description.trim() || !requirements.trim()) {
            alert('Заполните все поля (Стартап, Название, Описание, Требования).'); return; }
        onAdd({ startup_id: parseInt(selectedStartup, 10), title: title.trim(), description: description.trim(), salary: salary.trim() || null, requirements: requirements.trim() });
    };

    return (
        <form onSubmit={handleSubmit} className="add-vacancy-form add-form">
            <h3>Добавить вакансию</h3>
            <select value={selectedStartup} onChange={e => setSelectedStartup(e.target.value)} required disabled={isLoading || userStartups.length === 0}>
                {userStartups.length === 0 && <option value="">Нет доступных стартапов</option>}
                {userStartups.map(startup => <option key={startup.id} value={startup.id.toString()}>{startup.name}</option>)}
            </select>
            <input type="text" placeholder="Название вакансии" value={title} onChange={e => setTitle(e.target.value)} required disabled={isLoading} />
            <textarea placeholder="Описание вакансии" value={description} onChange={e => setDescription(e.target.value)} required disabled={isLoading} />
            <input type="text" placeholder="Зарплата (например, 100 000 руб.)" value={salary} onChange={e => setSalary(e.target.value)} disabled={isLoading} />
            <textarea placeholder="Требования" value={requirements} onChange={e => setRequirements(e.target.value)} required disabled={isLoading} />
            <div className="form-buttons">
                <button type="submit" disabled={isLoading || !selectedStartup}>{isLoading ? '...' : 'Добавить'}</button>
                <button type="button" onClick={onCancel} className="cancel-button" disabled={isLoading}>Отмена</button>
            </div>
        </form>
    );
}

export default AddVacancyForm;
