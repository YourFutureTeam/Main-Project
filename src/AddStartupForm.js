// src/App.js (ПОЛНЫЙ КОД с OpenSea Link вместо Invest)

import React, { useState, useEffect, useCallback } from 'react';
// Импорт CSS
import './App.css';

// --- Компонент AddStartupForm (определен здесь, можно вынести) ---
// --- Компонент AddStartupForm (определен здесь, можно вынести) ---
function AddStartupForm({ onAdd, onCancel, isLoading }) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [openseaLink, setOpenseaLink] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!name.trim() || !description.trim() || !openseaLink.trim()) {
            alert('Пожалуйста, заполните все поля: Название, Описание и Ссылка OpenSea.');
            return;
        }
        if (!openseaLink.trim().toLowerCase().startsWith('http://') && !openseaLink.trim().toLowerCase().startsWith('https://')) {
             alert('Ссылка OpenSea должна начинаться с http:// или https://');
             return;
        }
        onAdd({
            name: name.trim(),
            description: description.trim(),
            opensea_link: openseaLink.trim()
        });
        // Опционально очистить поля после успешного добавления
        // setName('');
        // setDescription('');
        // setOpenseaLink('');
    };

    return (
        <form onSubmit={handleSubmit} className="add-startup-form add-form">
            <h3>Добавить новый стартап</h3>
            <input
                type="text"
                placeholder="Название стартапа"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={isLoading}
            />
            <textarea
                placeholder="Описание стартапа"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                disabled={isLoading}
            />
            <input
                type="url"
                placeholder="Ссылка на коллекцию OpenSea (https://...)"
                value={openseaLink}
                onChange={(e) => setOpenseaLink(e.target.value)}
                required
                pattern="https?://.+"
                title="Введите корректный URL, начинающийся с http:// или https://"
                disabled={isLoading}
                className="input-opensea"
            />
            <div className="form-buttons">
                <button type="submit" disabled={isLoading}>
                    {isLoading ? 'Добавление...' : 'Добавить стартап'}
                </button>
                <button type="button" onClick={onCancel} className="cancel-button" disabled={isLoading}>
                    Отмена
                </button>
            </div>
        </form>
    );
}

export default AddStartupForm;
