import React, { useState } from 'react';
import axios from 'axios';

const Login = ({ onLogin }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isRegister, setIsRegister] = useState(false);
    const [fullName, setFullName] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        
        try {
            if (isRegister) {
                // Регистрация
                const params = new URLSearchParams();
                params.append('username', username);
                params.append('password', password);
                params.append('full_name', fullName);
                params.append('role', 'employee');
                
                await axios.post('http://localhost:8000/api/register', params);
                setIsRegister(false);
                setError('Регистрация успешна! Теперь войдите.');
                setUsername('');
                setPassword('');
                setFullName('');
            } else {
                // Вход
                const formData = new FormData();
                formData.append('username', username);
                formData.append('password', password);
                
                const response = await axios.post('http://localhost:8000/api/login', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                
                localStorage.setItem('token', response.data.access_token);
                localStorage.setItem('role', response.data.role);
                localStorage.setItem('username', response.data.username);
                onLogin(response.data.access_token, response.data.role);
            }
        } catch (err) {
            setError(err.response?.data?.detail || 'Ошибка');
        }
    };

    return (
        <div style={{ maxWidth: '400px', margin: '100px auto', padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
            <h2>{isRegister ? 'Регистрация' : 'Вход в систему'}</h2>
            {error && <div style={{ color: 'red', marginBottom: '10px' }}>{error}</div>}
            <form onSubmit={handleSubmit}>
                <input
                    type="text"
                    placeholder="Логин"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    style={{ width: '100%', padding: '8px', marginBottom: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
                    required
                />
                {isRegister && (
                    <input
                        type="text"
                        placeholder="ФИО"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        style={{ width: '100%', padding: '8px', marginBottom: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
                    />
                )}
                <input
                    type="password"
                    placeholder="Пароль"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ width: '100%', padding: '8px', marginBottom: '20px', borderRadius: '4px', border: '1px solid #ccc' }}
                    required
                />
                <button type="submit" style={{ width: '100%', padding: '10px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                    {isRegister ? 'Зарегистрироваться' : 'Войти'}
                </button>
            </form>
            <button onClick={() => { setIsRegister(!isRegister); setError(''); }} style={{ width: '100%', marginTop: '10px', padding: '10px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#007bff' }}>
                {isRegister ? 'Уже есть аккаунт? Войти' : 'Нет аккаунта? Зарегистрироваться'}
            </button>
        </div>
    );
};

export default Login;