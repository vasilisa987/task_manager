import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { BsCalendar3, BsDownload, BsFilter } from 'react-icons/bs';
import * as XLSX from 'xlsx';

const DashboardView = ({ tasks, loading, onSwitchToTask }) => {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedDateTasks, setSelectedDateTasks] = useState([]);
    const [dashboardData, setDashboardData] = useState(null);
    const [aiPrediction, setAiPrediction] = useState(null);
    const [selectedDepartment, setSelectedDepartment] = useState('все');
    const [selectedPeriod, setSelectedPeriod] = useState('все');
    const [departments, setDepartments] = useState([]);
    const [periods] = useState(['год', 'квартал', 'месяц', 'неделя']);

    const predictRisk = (task) => {
        if (task.status === 'выполнена') return 0;
        const daysLeft = (new Date(task.deadline) - new Date()) / (1000 * 3600 * 24);
        let risk = 0;
        if (daysLeft <= 1) risk = 95;
        else if (daysLeft <= 3) risk = 80;
        else if (daysLeft <= 7) risk = 50;
        else if (daysLeft <= 14) risk = 30;
        else risk = 10;
        if (task.priority === 'высокий') risk += 10;
        if (task.status === 'на согласовании') risk += 5;
        if (task.status === 'запланирована' && daysLeft <= 7) risk += 20;
        if (risk > 95) risk = 95;
        return risk;
    };

    useEffect(() => {
        if (!tasks.length) return;

        const uniqueDepts = [...new Set(tasks.map(t => t.department))];
        setDepartments(['все', ...uniqueDepts]);

        let filteredTasks = [...tasks];
        if (selectedDepartment !== 'все') filteredTasks = filteredTasks.filter(t => t.department === selectedDepartment);
        if (selectedPeriod !== 'все') filteredTasks = filteredTasks.filter(t => t.period === selectedPeriod);

        const total = filteredTasks.length;
        const overdue = filteredTasks.filter(t => t.status === 'просрочена').length;
        const completed = filteredTasks.filter(t => t.status === 'выполнена').length;
        const completedPercent = total ? Math.round((completed / total) * 100) : 0;
        const thisWeek = filteredTasks.filter(t => {
            const days = (new Date(t.deadline) - new Date()) / (1000 * 3600 * 24);
            return days >= 0 && days <= 7 && t.status !== 'выполнена';
        }).length;
        const risks = filteredTasks.filter(t => t.status !== 'выполнена' && predictRisk(t) > 70).length;

        const employeeLoad = {};
        filteredTasks.forEach(t => {
            if (t.status !== 'выполнена') {
                employeeLoad[t.responsible] = (employeeLoad[t.responsible] || 0) + 1;
            }
        });

        const heatmapData = Object.entries(employeeLoad).map(([name, count]) => ({
            name, count,
            riskColor: count > 4 ? '#EF4444' : count > 2 ? '#F59E0B' : '#10B981'
        }));

        const statusData = Object.entries(filteredTasks.reduce((acc, t) => {
            acc[t.status] = (acc[t.status] || 0) + 1;
            return acc;
        }, {})).map(([name, value]) => ({ name, value }));

        const deptData = Object.entries(filteredTasks.reduce((acc, t) => {
            acc[t.department] = (acc[t.department] || 0) + 1;
            return acc;
        }, {})).map(([dept, count]) => ({ dept, count }));

        const months = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
        const monthlyData = months.map((month, idx) => {
            const planned = 10;
            const actual = filteredTasks.filter(t => {
                if (t.status !== 'выполнена') return false;
                return new Date(t.deadline).getMonth() === idx;
            }).length;
            return { month, planned, actual };
        });

        // Выполнение по периодам
        const periodStats = ['год', 'квартал', 'месяц', 'неделя'].map(period => {
            const periodTasks = filteredTasks.filter(t => t.period === period);
            const periodCompleted = periodTasks.filter(t => t.status === 'выполнена').length;
            const periodOverdue = periodTasks.filter(t => t.status === 'просрочена').length;
            const periodTotal = periodTasks.length;
            const percent = periodTotal ? Math.round((periodCompleted / periodTotal) * 100) : 0;
            return { period, total: periodTotal, completed: periodCompleted, overdue: periodOverdue, percent };
        });

        // Задачи с высоким приоритетом
        const highPriorityTasks = filteredTasks
            .filter(t => t.priority === 'высокий' && t.status !== 'выполнена')
            .sort((a, b) => {
                if (a.status === 'просрочена') return -1;
                if (b.status === 'просрочена') return 1;
                return new Date(a.deadline) - new Date(b.deadline);
            });

        const tasksWithRisk = filteredTasks.map(t => ({
            ...t, risk: predictRisk(t)
        })).sort((a, b) => b.risk - a.risk).slice(0, 5);

        setAiPrediction(tasksWithRisk);

        const attentionTasks = filteredTasks.filter(t =>
            t.status === 'просрочена' || t.priority === 'высокий' || predictRisk(t) > 70
        ).slice(0, 5);

        setDashboardData({
            total, overdue, completedPercent, thisWeek, risks,
            heatmapData, statusData, deptData, monthlyData,
            attentionTasks, periodStats, highPriorityTasks
        });
    }, [tasks, selectedDepartment, selectedPeriod]);

    const handleDateClick = (date) => {
        const dateStr = date.toISOString().slice(0, 10);
        setSelectedDate(date);
        setSelectedDateTasks(tasks.filter(t => t.deadline === dateStr));
    };

    const exportToExcel = () => {
        const exportData = tasks.map(t => ({
            'Название': t.title,
            'Ответственный': t.responsible,
            'Отдел': t.department,
            'Период': t.period,
            'Дедлайн': t.deadline,
            'Приоритет': t.priority,
            'Статус': t.status,
            'Риск просрочки (%)': predictRisk(t)
        }));
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Задачи');
        XLSX.writeFile(wb, `tasks_report_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    if (loading || !dashboardData) return <div className="skeleton-dashboard">Загрузка...</div>;

    const COLORS = ['#3B4EFF', '#F59E0B', '#8B5CF6', '#10B981', '#EF4444'];
    const statusColors = {
        новая: '#64748B', запланирована: '#3B82F6', 'в работе': '#F59E0B',
        'на согласовании': '#8B5CF6', выполнена: '#10B981', просрочена: '#EF4444',
    };

    return (
        <div className="dashboard">
            <div className="dashboard-filters">
                <div className="filter-group">
                    <BsFilter />
                    <select value={selectedDepartment} onChange={(e) => setSelectedDepartment(e.target.value)}>
                        {departments.map(d => <option key={d} value={d}>{d === 'все' ? 'Все отделы' : d}</option>)}
                    </select>
                </div>
                <div className="filter-group">
                    <select value={selectedPeriod} onChange={(e) => setSelectedPeriod(e.target.value)}>
                        <option value="все">Все периоды</option>
                        {periods.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                </div>
                <button className="export-btn" onClick={exportToExcel}><BsDownload /> Экспорт в Excel</button>
            </div>

            <div className="kpi-grid">
                <div className="kpi-card"><div className="kpi-value">{dashboardData.total}</div><div className="kpi-label">Всего задач</div></div>
                <div className="kpi-card danger"><div className="kpi-value">{dashboardData.overdue}</div><div className="kpi-label">Просрочено</div></div>
                <div className="kpi-card"><div className="kpi-value">{dashboardData.completedPercent}%</div><div className="kpi-label">Выполнено</div></div>
                <div className="kpi-card"><div className="kpi-value">{dashboardData.thisWeek}</div><div className="kpi-label">Задач на этой неделе</div></div>
                <div className="kpi-card warning"><div className="kpi-value">{dashboardData.risks}</div><div className="kpi-label">Риски (AI)</div></div>
                <div className="kpi-card"><div className="kpi-value">{dashboardData.heatmapData.length}</div><div className="kpi-label">Активных сотрудников</div></div>
            </div>

            {/* Выполнение задач по периодам */}
            <div className="chart-card" style={{ marginBottom: '24px' }}>
                <h4>Выполнение задач по периодам</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginTop: '16px' }}>
                    {dashboardData.periodStats.map(p => (
                        <div key={p.period} style={{
                            background: 'var(--bg-page)',
                            borderRadius: '16px',
                            padding: '16px',
                            textAlign: 'center',
                            borderTop: `4px solid ${p.percent >= 70 ? '#10B981' : p.percent >= 30 ? '#F59E0B' : '#EF4444'}`
                        }}>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>{p.period}</div>
                            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--accent)' }}>{p.percent}%</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                {p.completed} из {p.total} выполнено
                            </div>
                            {p.overdue > 0 && (
                                <div style={{ fontSize: '0.75rem', color: '#EF4444', marginTop: '4px' }}>
                                    {p.overdue} просрочено
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            <div className="charts-row">
                <div className="chart-card">
                    <h4>Статусы задач</h4>
                    <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                            <Pie data={dashboardData.statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                                {dashboardData.statusData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                <div className="chart-card">
                    <h4>Задачи по отделам</h4>
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={dashboardData.deptData}>
                            <XAxis dataKey="dept" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="count" fill="#3B4EFF" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <div className="chart-card">
                    <h4>Выполнение по месяцам (факт vs план)</h4>
                    <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={dashboardData.monthlyData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="planned" stroke="#F59E0B" name="План" />
                            <Line type="monotone" dataKey="actual" stroke="#10B981" name="Факт" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="heatmap-card">
                <h4>Тепловая карта загрузки сотрудников{selectedPeriod !== 'все' ? ` (${selectedPeriod})` : ''}</h4>
                <div className="heatmap-grid">
                    {dashboardData.heatmapData.map(emp => (
                        <div key={emp.name} className="heatmap-cell" style={{ backgroundColor: emp.riskColor }}>
                            {emp.name}: {emp.count} задач
                        </div>
                    ))}
                </div>
            </div>

            {/* Задачи с высоким приоритетом */}
            <div className="attention-card full-width" style={{ marginBottom: '24px' }}>
                <h4>Задачи с высоким приоритетом</h4>
                <table className="attention-table">
                    <thead>
                        <tr><th>Задача</th><th>Ответственный</th><th>Отдел</th><th>Период</th><th>Дедлайн</th><th>Статус</th></tr>
                    </thead>
                    <tbody>
                        {dashboardData.highPriorityTasks.map(task => (
                            <tr key={task.id} style={{ cursor: 'pointer' }} onClick={() => onSwitchToTask && onSwitchToTask(task.id)}>
                                <td>{task.title}</td>
                                <td>{task.responsible}</td>
                                <td>{task.department}</td>
                                <td>{task.period}</td>
                                <td className={new Date(task.deadline) < new Date() ? 'overdue-date' : ''}>{task.deadline}</td>
                                <td>
                                    <span style={{
                                        padding: '2px 8px', borderRadius: '20px', fontSize: '0.75rem',
                                        color: 'white', backgroundColor: statusColors[task.status] || '#64748B'
                                    }}>
                                        {task.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                        {dashboardData.highPriorityTasks.length === 0 && (
                            <tr><td colSpan="6">Нет активных задач с высоким приоритетом</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {aiPrediction && (
                <div className="ai-prediction-card">
                    <h4>AI Прогноз: задачи с высоким риском просрочки</h4>
                    <table className="attention-table">
                        <thead>
                            <tr><th>Задача</th><th>Ответственный</th><th>Дедлайн</th><th>Риск (%)</th><th>Рекомендация</th></tr>
                        </thead>
                        <tbody>
                            {aiPrediction.filter(t => t.risk > 50 && t.status !== 'выполнена').map(task => (
                                <tr key={task.id} style={{ cursor: 'pointer' }} onClick={() => onSwitchToTask && onSwitchToTask(task.id)}>
                                    <td>{task.title}</td>
                                    <td>{task.responsible}</td>
                                    <td className={new Date(task.deadline) < new Date() ? 'overdue-date' : ''}>{task.deadline}</td>
                                    <td style={{ color: task.risk > 80 ? '#EF4444' : '#F59E0B', fontWeight: 'bold' }}>{task.risk}%</td>
                                    <td>{task.risk > 80 ? 'Срочно взять в работу!' : task.risk > 60 ? 'Требуется внимание' : 'Контролировать'}</td>
                                </tr>
                            ))}
                            {aiPrediction.filter(t => t.risk > 50 && t.status !== 'выполнена').length === 0 && (
                                <tr><td colSpan="5">Задач с высоким риском нет</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            <div className="dashboard-bottom">
                <div className="calendar-card">
                    <h4><BsCalendar3 /> Календарь дедлайнов</h4>
                    <Calendar
                        onChange={setSelectedDate}
                        value={selectedDate}
                        onClickDay={handleDateClick}
                        tileClassName={({ date }) => {
                            const dateStr = date.toISOString().slice(0, 10);
                            return tasks.some(t => t.deadline === dateStr && t.status !== 'выполнена') ? 'has-deadline' : null;
                        }}
                    />
                </div>
                <div className="calendar-tasks-list">
                    <h4>Задачи на {selectedDate.toLocaleDateString('ru-RU')}</h4>
                    {selectedDateTasks.length === 0 && <p className="no-tasks">Нет задач с дедлайном на этот день</p>}
                    <ul className="date-tasks-list">
                        {selectedDateTasks.map(task => (
                            <li key={task.id} onClick={() => onSwitchToTask && onSwitchToTask(task.id)}>
                                <strong>{task.title}</strong>
                                <span className="task-meta-info">{task.responsible} • {task.status}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            <div className="attention-card full-width">
                <h4>Задачи, требующие внимания руководителя</h4>
                <table className="attention-table">
                    <thead>
                        <tr><th>Задача</th><th>Ответственный</th><th>Дедлайн</th><th>Статус</th></tr>
                    </thead>
                    <tbody>
                        {dashboardData.attentionTasks.map(task => (
                            <tr key={task.id} style={{ cursor: 'pointer' }} onClick={() => onSwitchToTask && onSwitchToTask(task.id)}>
                                <td>{task.title}</td>
                                <td>{task.responsible}</td>
                                <td className={new Date(task.deadline) < new Date() ? 'overdue-date' : ''}>{task.deadline}</td>
                                <td>{task.status}</td>
                            </tr>
                        ))}
                        {dashboardData.attentionTasks.length === 0 && (
                            <tr><td colSpan="4">Нет задач, требующих внимания</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default DashboardView;