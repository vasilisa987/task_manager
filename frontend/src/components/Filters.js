import React, { useState } from 'react';
import { BsSearch } from 'react-icons/bs';

const Filters = ({ onFilter, tasks = [] }) => {
    const [filters, setFilters] = useState({
        search: '', department: '', responsible: '', status: '', period: '', priority: '', deadlineBefore: ''
    });

    const departments = [...new Set(tasks.map(t => t.department).filter(Boolean))];
    const responsibles = [...new Set(tasks.map(t => t.responsible).filter(Boolean))];

    const handleChange = (e) => {
        const newFilters = { ...filters, [e.target.name]: e.target.value };
        setFilters(newFilters);
        onFilter(newFilters);
    };

    return (
        <div className="filters-bar">
            <div className="filter-search">
                <BsSearch />
                <input name="search" placeholder="Поиск по названию..." value={filters.search} onChange={handleChange} />
            </div>
            <select name="department" value={filters.department} onChange={handleChange}>
                <option value="">Все отделы</option>
                {departments.map(d => <option key={d}>{d}</option>)}
            </select>
            <select name="responsible" value={filters.responsible} onChange={handleChange}>
                <option value="">Все ответственные</option>
                {responsibles.map(r => <option key={r}>{r}</option>)}
            </select>
            <select name="status" value={filters.status} onChange={handleChange}>
                <option value="">Все статусы</option>
                <option>новая</option>
                <option>запланирована</option>
                <option>в работе</option>
                <option>на согласовании</option>
                <option>выполнена</option>
                <option>просрочена</option>
            </select>
            <select name="period" value={filters.period} onChange={handleChange}>
                <option value="">Все периоды</option>
                <option>год</option>
                <option>квартал</option>
                <option>месяц</option>
                <option>неделя</option>
            </select>
            <select name="priority" value={filters.priority} onChange={handleChange}>
                <option value="">Все приоритеты</option>
                <option>низкий</option>
                <option>средний</option>
                <option>высокий</option>
            </select>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '16px' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Дедлайн до:</span>
                <input
                    type="date"
                    name="deadlineBefore"
                    value={filters.deadlineBefore}
                    onChange={handleChange}
                    style={{ padding: '6px 12px', borderRadius: '40px', border: '1px solid var(--border)', background: 'var(--bg-card)', fontSize: '0.85rem', cursor: 'pointer' }}
                />
            </div>
        </div>
    );
};

export default Filters;