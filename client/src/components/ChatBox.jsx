import React, { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import api from '../services/api';
import '../assets/ChatBox.css';
import { useChat } from './ChatContext';

const socket = io('http://localhost:5001');

const ChatBox = ({ currentUser }) => {
  const { activeConversationId, activePartner } = useChat();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const pollRef = useRef(null);
  const listRef = useRef(null);

  const scrollToBottom = () => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    if (activeConversationId) return;

    const loadHistory = async () => {
      try {
        const res = await fetch('http://localhost:5001/api/chat/messages');
        const data = await res.json();
        const normalized = data.map(m => ({
          sender: m.sender || 'User',
          content: m.text || '',
          createdAt: m.createdAt || m.timestamp || '',
        }));
        setMessages(normalized);
      } catch (e) {
        console.error('Error fetching global chat history', e);
      }
    };
    loadHistory();

    const onIncoming = (msg) => {
      setMessages(prev => [
        ...prev,
        {
          sender: msg.sender || 'User',
          content: msg.text || '',
          createdAt: msg.createdAt || msg.timestamp || new Date().toISOString(),
        },
      ]);
    };
    socket.on('chat message', onIncoming);

    return () => {
      socket.off('chat message', onIncoming);
    };
  }, [activeConversationId]);

  useEffect(() => {
    if (!activeConversationId) return;

    const loadDM = async () => {
      try {
        const { data } = await api.get(`/api/conversations/${activeConversationId}/messages`);
        setMessages(
          data.map(d => ({
            sender: d.sender?.name || 'User',
            content: d.content,
            createdAt: d.createdAt,
            fromMe: d.sender?.id === JSON.parse(localStorage.getItem('user'))?.id,
          }))
        );
      } catch (e) {
        console.error('Failed to load DM messages', e);
      }
    };

    loadDM();
    pollRef.current = setInterval(loadDM, 3000);
    return () => clearInterval(pollRef.current);
  }, [activeConversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;

    const me = JSON.parse(localStorage.getItem('user'));

    try {
      if (activeConversationId) {
        await api.post(`/api/conversations/${activeConversationId}/messages`, { content: text });
        setMessages(prev => [
          ...prev,
          {
            sender: me?.name || 'Me',
            content: text,
            createdAt: new Date().toISOString(),
            fromMe: true,
          },
        ]);
      } else {
        socket.emit('chat message', {
          sender: `${me?.name || 'User'} (${me?.role || 'user'})`,
          text,
          timestamp: new Date().toISOString(),
        });
      }
      setInput('');
    } catch (e) {
      console.error('Send failed', e);
    }
  };

  return (
    <div className="chatbox-container">
      <div className="chatbox-header">
        <strong>
          {activeConversationId
            ? `Chat with ${activePartner?.name || 'Partner'}`
            : 'Live Chat'}
        </strong>
      </div>

      <div className="chatbox-messages" ref={listRef}>
        {messages.map((m, i) => {
          const looksTutor =
            typeof m.sender === 'string' && m.sender.toLowerCase().includes('tutor');
          const mine = m.fromMe;
          const bubbleClass = mine ? 'tutor' : looksTutor ? 'tutor' : 'student';
          return (
            <div key={i} className={`message ${bubbleClass}`}>
              <div>
                <strong>{m.sender}:</strong> {m.content || '[No message]'}
              </div>
              <div className="timestamp">
                {m.createdAt ? new Date(m.createdAt).toLocaleTimeString() : ''}
              </div>
            </div>
          );
        })}
      </div>

      <form onSubmit={sendMessage} className="chat-input">
        <input
          type="text"
          value={input}
          placeholder="Type a message"
          onChange={(e) => setInput(e.target.value)}
        />
        <button type="submit">Send</button>
      </form>
    </div>
  );
};

export default ChatBox;
