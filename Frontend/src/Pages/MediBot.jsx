import React, { useState, useEffect, useRef } from "react";
import "./MediBot.css";
import Aurora from "../Components/Backgrounds/Aurora";
import Header from "../Components/FixedComponents/Header";
import { auth, onAuthStateChanged } from "../firebase";

const API_BASE = import.meta.env.VITE_API_URL;

export default function MediBot() {
    const [messages, setMessages] = useState([
        {
            role: "assistant",
            text: "Hello! I am MediBot, your ARTIKA health assistant. How can I help you today?",
            severity: "low",
            timestamp: new Date().toISOString()
        }
    ]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [user, setUser] = useState(null);
    const chatEndRef = useRef(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            if (firebaseUser) {
                setUser(firebaseUser);
            } else {
                setUser(null);
            }
        });
        return () => unsubscribe();
    }, []);

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!input.trim() || loading) return;

        const userMessage = {
            role: "user",
            text: input.trim(),
            timestamp: new Date().toISOString()
        };

        setMessages(prev => [...prev, userMessage]);
        setInput("");
        setLoading(true);

        try {
            // Wait, we need a userId. If not logged in, we use 'guest'
            const userId = user?.email || "guest";

            const response = await fetch(`${API_BASE}/api/chat/chat`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    userId,
                    message: userMessage.text
                })
            });

            const data = await response.json();

            if (data.success) {
                setMessages(prev => [...prev, {
                    role: "assistant",
                    text: data.data.response,
                    severity: data.data.severity,
                    timestamp: data.data.timestamp
                }]);
            } else {
                setMessages(prev => [...prev, {
                    role: "assistant",
                    text: "Sorry, I encountered an error. Please try again later.",
                    severity: "low",
                    timestamp: new Date().toISOString()
                }]);
            }
        } catch (error) {
            console.error("Chat error:", error);
            setMessages(prev => [...prev, {
                role: "assistant",
                text: "I'm having trouble connecting to the server. Is the backend running?",
                severity: "low",
                timestamp: new Date().toISOString()
            }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="medibat-page">
            <Aurora
                colorStops={["#7cff67", "#B19EEF", "#5227FF"]}
                blend={0.25}
                amplitude={1.0}
                speed={1}
            />
            <Header />
            
            <div className="chat-container-wrapper">
                <div className="chat-header">
                    <div className="bot-info">
                        <div className="bot-avatar">🤖</div>
                        <div className="bot-details">
                            <h3>MediBot AI</h3>
                            <span className="status-online">Online</span>
                        </div>
                    </div>
                    <div className="chat-header-actions">
                         {/* We could add a clear chat button here later */}
                    </div>
                </div>

                <div className="chat-messages">
                    {messages.map((msg, index) => (
                        <div key={index} className={`message-row ${msg.role}`}>
                            <div className={`message-bubble ${msg.role} seve-${msg.severity || 'none'}`}>
                                <p>{msg.text}</p>
                                <span className="msg-time">
                                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        </div>
                    ))}
                    {loading && (
                        <div className="message-row assistant">
                            <div className="message-bubble assistant typing">
                                <span className="dot"></span>
                                <span className="dot"></span>
                                <span className="dot"></span>
                            </div>
                        </div>
                    )}
                    <div ref={chatEndRef} />
                </div>

                <div className="chat-input-wrapper">
                    <form className="chat-input-area" onSubmit={handleSendMessage}>
                        <div className="input-container">
                            <input
                                type="text"
                                placeholder="Ask MediBot about symptoms, nutrition, or health tips..."
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                disabled={loading}
                            />
                        </div>
                        <button type="submit" disabled={!input.trim() || loading} aria-label="Send message">
                            {loading ? (
                                <div className="typing mini-typing">
                                    <span className="dot"></span>
                                    <span className="dot"></span>
                                    <span className="dot"></span>
                                </div>
                            ) : (
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="22" y1="2" x2="11" y2="13"></line>
                                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                                </svg>
                            )}
                        </button>
                    </form>
                </div>
            </div>
            
            <div className="bot-disclaimer">
                <span className="disclaimer-icon">🛡️</span> ARTIKA MediBot provides general health information and is not a substitute for professional medical advice.
            </div>
        </div>
    );
}