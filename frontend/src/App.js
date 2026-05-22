import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import TaskListView from './components/TaskListView';
import DashboardView from './components/DashboardView';
import AiAssistant from './components/AiAssistant';
import TaskModal from './components/TaskModal';
import { fetchTasks } from './api';

function App() {
  const [isAuth, setIsAuth] = useState(false);
  const [userRole, setUserRole] = useState('');
  const [activeTab, setActiveTab] = useState('tasks');
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editTask, setEditTask] = useState(null);

  // Проверка авторизации при загрузке
  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    if (token) {
      setIsAuth(true);
      setUserRole(role || 'employee');
    }
  }, []);

  // Загрузка задач только если авторизован
  useEffect(() => {
    if (isAuth) {
      loadTasks();
    }
  }, [refresh, isAuth]);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const { data } = await fetchTasks();
      setTasks(data);
    } catch (error) {
      console.error('Ошибка загрузки задач:', error);
    }
    setLoading(false);
  };

  const handleLogin = (token, role) => {
    setIsAuth(true);
    setUserRole(role);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('username');
    setIsAuth(false);
    setUserRole('');
  };

  const handleNewTask = () => {
    setEditTask(null);
    setIsModalOpen(true);
  };

  const handleEditTask = (taskId) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      setEditTask(task);
      setIsModalOpen(true);
      setActiveTab('tasks');
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditTask(null);
  };

  const handleTaskSuccess = () => {
    setRefresh(prev => !prev);
    handleModalClose();
  };

  useEffect(() => {
    const editHandler = (e) => {
      handleEditTask(e.detail.taskId);
    };
    window.addEventListener('editTask', editHandler);
    return () => window.removeEventListener('editTask', editHandler);
  }, [tasks]);

  // Если не авторизован — показываем страницу входа
  if (!isAuth) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="logo-area">
          <h1>TaskBoard</h1>
          <span className="badge">Суверенная система</span>
        </div>
        <div className="header-actions">
          <span className="user-role" style={{ marginRight: '15px', fontSize: '14px' }}>
            Роль: {userRole === 'admin' ? 'Администратор' : userRole === 'manager' ? 'Руководитель' : 'Сотрудник'}
          </span>
          {userRole !== 'employee' && (
            <button className="new-task-btn" onClick={handleNewTask}>
              + Новая задача
            </button>
          )}
          <button onClick={handleLogout} className="logout-btn" style={{ marginLeft: '10px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', padding: '5px 15px', cursor: 'pointer' }}>
            Выйти
          </button>
        </div>
      </header>

      <div className="main-tabs">
        <button className={`tab ${activeTab === 'tasks' ? 'active' : ''}`} onClick={() => setActiveTab('tasks')}>Список задач</button>
        {userRole !== 'employee' && (
          <>
            <button className={`tab ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>Дашборды</button>
            <button className={`tab ${activeTab === 'ai' ? 'active' : ''}`} onClick={() => setActiveTab('ai')}>AI помощник</button>
          </>
        )}
      </div>

      <div className="tab-content">
        {activeTab === 'tasks' && (
          <TaskListView
            tasks={tasks}
            loading={loading}
            onRefresh={() => setRefresh(prev => !prev)}
            onEditTask={handleEditTask}
          />
        )}
        {activeTab === 'dashboard' && userRole !== 'employee' && (
          <DashboardView
            tasks={tasks}
            loading={loading}
            onSwitchToTask={(taskId) => handleEditTask(taskId)}
          />
        )}
        {activeTab === 'ai' && userRole !== 'employee' && (
          <AiAssistant tasks={tasks} />
        )}
      </div>

      <TaskModal
        open={isModalOpen}
        onClose={handleModalClose}
        onSuccess={handleTaskSuccess}
        initialTask={editTask}
      />
    </div>
  );
}

export default App;