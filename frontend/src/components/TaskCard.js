import React, { useState } from 'react';
import { updateTask, deleteTask } from '../api';
import { BsCalendar, BsFlag, BsPersonCircle, BsThreeDotsVertical, BsBuilding } from 'react-icons/bs';

const statusColors = {
    новая: '#64748B',
    запланирована: '#3B82F6',
    'в работе': '#F59E0B',
    'на согласовании': '#8B5CF6',
    выполнена: '#10B981',
    просрочена: '#EF4444',
};

const priorityLabels = {
    низкий: 'Низкий',
    средний: 'Средний',
    высокий: 'Высокий',
};

const TaskCard = ({ task, onUpdate, onEdit }) => {
    const [showMenu, setShowMenu] = useState(false);
    const isOverdue = new Date(task.deadline) < new Date() && task.status !== 'выполнена';

    const handleStatusChange = async (newStatus) => {
        await updateTask(task.id, { status: newStatus });
        onUpdate();
    };

    const handleDelete = async () => {
        if (window.confirm('Удалить задачу?')) {
            await deleteTask(task.id);
            onUpdate();
        }
    };

    return (
        <div className="task-card">
            <div className="task-card-left" style={{ background: task.priority === 'высокий' ? '#EF4444' : task.priority === 'средний' ? '#F59E0B' : '#94A3B8' }}></div>
            <div className="task-card-content" style={{ position: 'relative' }}>
                <div className="task-card-header">
                    <h3>{task.title}</h3>
                    <div className="task-badges">
                        <span className="period-badge">{task.period}</span>
                        <span className="status-badge" style={{ backgroundColor: statusColors[task.status] }}>{task.status}</span>
                        <div style={{ position: 'relative' }}>
                            <button className="menu-btn" onClick={() => setShowMenu(!showMenu)}>
                                <BsThreeDotsVertical />
                            </button>
                            {showMenu && (
                                <div className="menu-dropdown">
                                    <button onClick={() => { onEdit(task.id); setShowMenu(false); }}>Редактировать</button>
                                    <button onClick={handleDelete}>Удалить</button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <p className="task-description">{task.description}</p>
                <div className="task-meta">
                    <span className="meta-item"><BsPersonCircle /> {task.responsible}</span>
                    <span className="meta-item"><BsBuilding /> {task.department}</span>
                    <span className="meta-item"><BsCalendar /> <span className={isOverdue ? 'deadline-overdue' : ''}>{task.deadline}</span></span>
                    <span className="meta-item"><BsFlag /> {priorityLabels[task.priority]}</span>
                </div>
                <div className="task-actions">
                    <select value={task.status} onChange={(e) => handleStatusChange(e.target.value)}>
                        <option>новая</option>
                        <option>запланирована</option>
                        <option>в работе</option>
                        <option>на согласовании</option>
                        <option>выполнена</option>
                        <option>просрочена</option>
                    </select>
                </div>
            </div>
        </div>
    );
};

export default TaskCard;