import React, { useState } from 'react';
import API from '../api';

const AiAssistant = ({ tasks }) => {
    const [question, setQuestion] = useState('');
    const [messages, setMessages] = useState([
        { text: 'Здравствуйте! Я AI-ассистент. Задайте любой вопрос по задачам, сотрудникам или дедлайнам.', sender: 'ai' }
    ]);
    const [loading, setLoading] = useState(false);

    const sendQuestion = async () => {
        if (!question.trim()) return;

        setMessages(prev => [...prev, { text: question, sender: 'user' }]);
        setLoading(true);

        try {
            const response = await API.post('/api/ai/ask', {
                question: question
            });
            
            setMessages(prev => [...prev, { text: response.data.answer, sender: 'ai' }]);
        } catch (error) {
            console.error('AI ошибка:', error);
            setMessages(prev => [...prev, { text: 'Ошибка: не удалось получить ответ от AI', sender: 'ai' }]);
        }
        
        setQuestion('');
        setLoading(false);
    };

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
            <h2>AI помощник</h2>
            <p>Задайте вопрос о задачах, сотрудниках или дедлайнах</p>
            
            <div style={{ 
                height: '400px', 
                overflowY: 'auto', 
                border: '1px solid #ddd', 
                borderRadius: '8px', 
                padding: '15px',
                marginBottom: '15px',
                backgroundColor: '#f9f9f9'
            }}>
                {messages.map((msg, idx) => (
                    <div key={idx} style={{ 
                        textAlign: msg.sender === 'user' ? 'right' : 'left',
                        marginBottom: '10px'
                    }}>
                        <div style={{
                            display: 'inline-block',
                            padding: '8px 12px',
                            borderRadius: '12px',
                            backgroundColor: msg.sender === 'user' ? '#007bff' : '#e9ecef',
                            color: msg.sender === 'user' ? 'white' : 'black',
                            maxWidth: '70%',
                            whiteSpace: 'pre-wrap'
                        }}>
                            {msg.text}
                        </div>
                    </div>
                ))}
                {loading && <div style={{ textAlign: 'left' }}>AI печатает...</div>}
            </div>
            
            <div style={{ display: 'flex', gap: '10px' }}>
                <input
                    type="text"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendQuestion()}
                    placeholder="Например: Какие задачи просрочены? Кто перегружен?"
                    style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
                />
                <button onClick={sendQuestion} disabled={loading} style={{ padding: '10px 20px', borderRadius: '8px', backgroundColor: '#007bff', color: 'white', border: 'none' }}>
                    Отправить
                </button>
            </div>
        </div>
    );
};

export default AiAssistant;