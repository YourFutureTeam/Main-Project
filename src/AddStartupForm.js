// src/App.js (ПОЛНЫЙ КОД с OpenSea Link вместо Invest)

import React, { useState, useEffect, useCallback } from 'react';
// Импорт CSS
import './App.css';

// --- Компонент AddStartupForm (Определение или импорт) ---
function AddStartupForm({ onAdd, onCancel, isLoading }) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const handleSubmit = (e) => { e.preventDefault(); if (!name.trim() || !description.trim()){ alert('Заполните имя и описание'); return; } onAdd({ name, description });};
    return (
        <form onSubmit={handleSubmit} className="add-startup-form add-form">
            <h3>Добавить новый стартап</h3>
            <input type="text" placeholder="Название" value={name} onChange={(e) => setName(e.target.value)} required disabled={isLoading} />
            <textarea placeholder="Описание" value={description} onChange={(e) => setDescription(e.target.value)} required disabled={isLoading} />
            <div className="form-buttons">
                <button type="submit" disabled={isLoading}>{isLoading ? 'Добавление...' : 'Добавить стартап'}</button>
                <button type="button" onClick={onCancel} className="cancel-button" disabled={isLoading}>Отмена</button>
            </div>
        </form>
    );
}

export default AddStartupForm;
