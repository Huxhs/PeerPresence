import React, { createContext, useContext, useState } from 'react';

const ChatContext = createContext(null);

export const ChatProvider = ({ children }) => {
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [activePartner, setActivePartner] = useState(null); // {id,name,role} (optional UI)

  return (
    <ChatContext.Provider value={{ activeConversationId, setActiveConversationId, activePartner, setActivePartner }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => useContext(ChatContext);
