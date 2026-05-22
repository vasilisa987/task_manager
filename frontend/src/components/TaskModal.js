import React, { useState, useEffect } from 'react';
import { createTask, updateTask } from '../api';

const TaskModal = ({ open, onClose, onSuccess, initialTask }) => {
    const [form, setForm] = useState({
        title: '', description: '', responsible: '', department: '', period: 'месяц',
        deadline: '', priority: 'средний', status: 'новая', parent_task_id: null, comment: ''
    });
    const [error, setError] = useState('');

    useEffect(() => {
        if (initialTask) {
            setForm({ ...initialTask, comment: initialTask.comment || '' });
        } else {
            setForm({ 
                title: '', description: '', responsible: '', department: '', 
                period: 'месяц', deadline: '', priority: 'средний', 
                status: 'новая', parent_task_id: null, comment: '' 
            });
        }
        setError('');
    }, [initialTask, open]);

    if (!open) return null;

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            if (initialTask) {
                await updateTask(initialTask.id, form);
            } else {
                await createTask({ 
                    ...form, 
                    created_at: new Date().toISOString().slice(0, 10) 
                });
            }
            onSuccess();
        } catch (err) {
            console.error(err);
            setError('Ошибка при сохранении задачи. Проверьте все поля.');
        }
    };

    const handleDeleteLocal = async () => {
        if (window.confirm('Удалить задачу?')) {
            await updateTask(initialTask.id, { status: 'удалена' });
            onSuccess();
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content two-columns" onClick={(e) => e.stopPropagation()}>
                <h3>{initialTask ? 'Редактирование задачи' : 'Новая задача'}</h3>
                {error && <div className="error-message">{error}</div>}
                <form onSubmit={handleSubmit}>
                    <div className="form-row">
                        <div className="form-col">
                            <input 
                                name="title" 
                                placeholder="Название" 
                                value={form.title} 
                                onChange={handleChange} 
                                required 
                            />
                            <textarea 
                                name="description" 
                                placeholder="Описание" 
                                value={form.description} 
                                onChange={handleChange} 
                                rows="3" 
                            />
                            <input 
                                name="responsible" 
                                placeholder="Ответственный" 
                                value={form.responsible} 
                                onChange={handleChange} 
                                required 
                            />
                            <input 
                                name="department" 
                                placeholder="Отдел / команда" 
                                value={form.department} 
                                onChange={handleChange} 
                                required 
                            />
                            <textarea 
                                name="comment" 
                                placeholder="Комментарий" 
                                value={form.comment} 
                                onChange={handleChange} 
                                rows="2" 
                            />
                        </div>
                        <div className="form-col">
                            <select name="period" value={form.period} onChange={handleChange}>
                                <option>год</option>
                                <option>квартал</option>
                                <option>месяц</option>
                                <option>неделя</option>
                            </select>
                            <input 
                                type="date" 
                                name="deadline" 
                                value={form.deadline} 
                                onChange={handleChange} 
                                required 
                            />
                            <select name="priority" value={form.priority} onChange={handleChange}>
                                <option>низкий</option>
                                <option>средний</option>
                                <option>высокий</option>
                            </select>
                            <select name="status" value={form.status} onChange={handleChange}>
                                <option>новая</option>
                                <option>запланирована</option>
                                <option>в работе</option>
                                <option>на согласовании</option>
                                <option>выполнена</option>
                                <option>просрочена</option>
                            </select>
                        
                        </div>
                    </div>
                    <div className="modal-buttons">
                        <button type="button" onClick={onClose}>Отмена</button>
                        {initialTask && (
                            <button type="button" className="delete-btn" onClick={handleDeleteLocal}>
                                Удалить
                            </button>
                        )}
                        <button type="submit">Сохранить</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default TaskModal;