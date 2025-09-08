import React, { useState, useEffect, useRef } from 'react';
import './ChatbotPage.css'; 
const ChatbotPage = () => {
    const [messages, setMessages] = useState([
        { sender: 'bot', text: 'Hello! I am Annadatri Mitra. Please select your language and ask me any food donation-related questions.' }
    ]);
    const [input, setInput] = useState('');
    const [language, setLanguage] = useState('English');
    const [isLoading, setIsLoading] = useState(false);
    const chatWindowRef = useRef(null);

    useEffect(() => {
        if (chatWindowRef.current) {
            chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
        }
    }, [messages, isLoading]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage = { sender: 'user', text: input };
        setMessages(prevMessages => [...prevMessages, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await fetch('/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message: input, language: language }),
            });

            if (!response.ok) {
                const contentType = response.headers.get("content-type");
                let errorText = `API call failed with status: ${response.status}`;
                if (contentType && contentType.includes("application/json")) {
                    const errorData = await response.json();
                    errorText = errorData.error || 'An unknown API error occurred.';
                } else {
                    errorText = "Could not connect to the API server. Please ensure it's running.";
                }
                throw new Error(errorText);
            }

            const data = await response.json();
            const botMessage = { sender: 'bot', text: data.reply };
            setMessages(prevMessages => [...prevMessages, botMessage]);

        } catch (error) {
            console.error('Fetch error:', error);
            const errorMessage = { sender: 'bot', text: `Error: ${error.message}` };
            setMessages(prevMessages => [...prevMessages, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="chatbot-container">
            <div className="header">
                <h1>Annadatri Mitra </h1>
                <p>Your AI Food Donation Assistant</p>
            </div>
            <div className="chat-window" ref={chatWindowRef}>
                {messages.map((msg, index) => (
                    <div key={index} className={`message ${msg.sender}-message`}>
                        <p>{msg.text}</p>
                    </div>
                ))}
                {isLoading && (
                     <div className="message bot-message loading">
                        <p>...</p>
                    </div>
                )}
            </div>
            <form className="chat-input-form" onSubmit={handleSubmit}>
                <div className="input-group">
                    <label htmlFor="language-select">Language:</label>
                    <select id="language-select" value={language} onChange={(e) => setLanguage(e.target.value)}>
                        <option value="English">English</option>
                        <option value="Hindi">Hindi (हिन्दी)</option>
                        <option value="Telugu">Telugu (తెలుగు)</option>
                        <option value="Tamil">Tamil (தமிழ்)</option>
                        <option value="Kannada">Kannada (ಕನ್ನಡ)</option>
                        <option value="Marathi">Marathi (मराठी)</option>
                        <option value="Bengali">Bengali (বাংলা)</option>
                        <option value="Punjabi">Punjabi (ਪੰਜਾਬੀ)</option>
                    </select>
                </div>
                <div className="input-group">
                    <input type="text" id="message-input" placeholder="Type your message here..." autoComplete="off" value={input} onChange={(e) => setInput(e.target.value)} required />
                    <button type="submit" disabled={isLoading}>Send</button>
                </div>
            </form>
        </div>
    );
};

export default ChatbotPage; 
