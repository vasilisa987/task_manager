import React, { useState, useEffect } from 'react';
import TaskCard from './TaskCard';
import Filters from './Filters';
import { BsGrid, BsColumnsGap } from 'react-icons/bs';

const TaskListView = ({ tasks, loading, onRefresh, onEditTask }) => {
    const [filteredTasks, setFilteredTasks] = useState([]);
    const [viewMode, setViewMode] = useState('list');

    useEffect(() => {
        setFilteredTasks(tasks);
    }, [tasks]);

    const applyFilters = (filters) => {
        let filtered = [...tasks];
        if (filters.search) filtered = filtered.filter(t => t.title.toLowerCase().includes(filters.search.toLowerCase()));
        if (filters.department) filtered = filtered.filter(t => t.department === filters.department);
        if (filters.responsible) filtered = filtered.filter(t => t.responsible === filters.responsible);
        if (filters.status) filtered = filtered.filter(t => t.status === filters.status);
        if (filters.period) filtered = filtered.filter(t => t.period === filters.period);
        if (filters.priority) filtered = filtered.filter(t => t.priority === filters.priority);
        if (filters.deadlineBefore) filtered = filtered.filter(t => t.deadline && t.deadline <= filters.deadlineBefore);
        setFilteredTasks(filtered);
    };

    if (loading) {
        return <div className="skeleton-list">Загрузка...</div>;
    }

    const kanbanColumns = {
        'новая': filteredTasks.filter(t => t.status === 'новая'),
        'запланирована': filteredTasks.filter(t => t.status === 'запланирована'),
        'в работе': filteredTasks.filter(t => t.status === 'в работе'),
        'на согласовании': filteredTasks.filter(t => t.status === 'на согласовании'),
        'выполнена': filteredTasks.filter(t => t.status === 'выполнена'),
        'просрочена': filteredTasks.filter(t => t.status === 'просрочена'),
    };

    const statusNames = {
        'новая': 'Новая',
        'запланирована': 'Запланирована',
        'в работе': 'В работе',
        'на согласовании': 'На согласовании',
        'выполнена': 'Выполнена',
        'просрочена': 'Просрочена',
    };

    return (
        <div className="task-list-view">
            <div className="view-controls">
                <div className="view-toggle">
                    <button className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')}><BsGrid /> Список</button>
                    <button className={viewMode === 'kanban' ? 'active' : ''} onClick={() => setViewMode('kanban')}><BsColumnsGap /> Канбан</button>
                </div>
            </div>
            <Filters onFilter={applyFilters} tasks={tasks} />

            {viewMode === 'list' && (
                <div className="tasks-list">
                    {filteredTasks.length === 0 && <div className="empty-state">Нет задач</div>}
                    {filteredTasks.map(task => <TaskCard key={task.id} task={task} onUpdate={onRefresh} onEdit={onEditTask} />)}
                </div>
            )}

            {viewMode === 'kanban' && (
                <div className="kanban-board">
                    {Object.entries(kanbanColumns).map(([status, tasksInCol]) => (
                        <div key={status} className="kanban-column">
                            <h3 className="column-title">{statusNames[status] || status} ({tasksInCol.length})</h3>
                            <div className="kanban-cards">
                                {tasksInCol.map(task => <TaskCard key={task.id} task={task} onUpdate={onRefresh} onEdit={onEditTask} />)}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default TaskListView;