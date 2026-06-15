import React, { useEffect, useState, useRef } from 'react';
import { getConversations, getMessages, sendMessage, getUser, deleteMessage } from '../api';
import { Link, useSearchParams } from 'react-router-dom';
import { Mail, Send, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '../context/AuthContext';

export const Messages = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeChat, setActiveChat] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchConversations().then(async (convs) => {
      const queryUserId = searchParams.get('userId');
      if (queryUserId) {
        const uid = parseInt(queryUserId);
        const existing = convs.find((c: any) => c.id === uid);
        if (existing) {
           setActiveChat(existing);
        } else {
           // We need to fetch this user's details and start a new chat locally
           try {
              const newChatUser = await getUser(uid);
              const fakeConv = {
                id: newChatUser.id,
                username: newChatUser.username,
                avatar: newChatUser.avatar,
                lastMsg: { content: 'Iniciar nova conversa...' }
              };
              setConversations(prev => [fakeConv, ...prev]);
              setActiveChat(fakeConv);
           } catch(e) {}
        }
        // clear query param
        setSearchParams({});
      }
    });
  }, []);

  useEffect(() => {
    if (activeChat) {
      fetchMessages(activeChat.id);
    }
  }, [activeChat]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchConversations = async () => {
    try {
      const data = await getConversations();
      setConversations(data);
      return data;
    } catch (e) {
      console.error(e);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (userId: number) => {
    try {
      const data = await getMessages(userId);
      setMessages(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChat) return;

    const content = newMessage;
    setNewMessage('');
    try {
      const msg = await sendMessage(activeChat.id, content);
      setMessages(prev => [...prev, msg]);
      fetchConversations(); // refresh last msg
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteMessage = async (msgId: number) => {
    if (window.confirm('Excluir esta mensagem?')) {
      try {
        await deleteMessage(msgId);
        setMessages(prev => prev.filter(m => m.id !== msgId));
      } catch(e) {
        alert('Erro ao excluir mensagem');
      }
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Carregando...</div>;

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 h-[calc(100vh-80px)]">
      <div className="bg-[#121212] border border-[#262626] rounded-xl overflow-hidden shadow-sm flex h-full">
        {/* Sidebar - Conversations */}
        <div className="w-full md:w-1/3 border-r border-[#262626] flex flex-col h-full bg-[#1a1a1a]">
          <div className="p-4 border-b border-[#262626] flex items-center space-x-3">
             <Mail className="w-6 h-6 text-white" />
             <h2 className="text-xl font-bold text-white">Mensagens</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
             {conversations.length === 0 ? (
               <div className="p-8 text-center text-gray-500 text-sm">Nenhuma conversa encontrada.</div>
             ) : (
               conversations.map(conv => (
                 <div 
                   key={conv.id} 
                   onClick={() => setActiveChat(conv)}
                   className={`flex items-center gap-3 p-4 cursor-pointer hover:bg-white/5 transition-colors border-b border-[#262626] ${activeChat?.id === conv.id ? 'bg-white/5' : ''}`}
                 >
                   <img src={conv.avatar} alt={conv.username} className="w-12 h-12 rounded-full border border-[#262626] object-cover bg-neutral-900" />
                   <div className="flex-1 min-w-0">
                     <div className="font-bold text-white text-sm truncate">{conv.username}</div>
                     <div className="text-sm text-gray-500 truncate mt-0.5">
                       {conv.lastMsg.content}
                     </div>
                   </div>
                 </div>
               ))
             )}
          </div>
        </div>

        {/* Main Chat Area */}
        <div className={`w-full md:w-2/3 flex flex-col h-full ${!activeChat ? 'hidden md:flex' : 'flex'}`}>
           {!activeChat ? (
             <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
               <Mail className="w-16 h-16 mb-4 text-neutral-700" />
               <p className="text-lg">Selecione uma mensagem</p>
               <p className="text-sm">Escolha uma conversa entre as suas existentes.</p>
             </div>
           ) : (
             <>
               <div className="p-4 border-b border-[#262626] flex items-center gap-3 bg-[#1a1a1a]">
                 <button className="md:hidden text-white mr-2" onClick={() => setActiveChat(null)}>Voltar</button>
                 <img src={activeChat.avatar} alt={activeChat.username} className="w-10 h-10 rounded-full border border-[#262626] object-cover bg-neutral-900" />
                 <Link to={`/profile/${activeChat.id}`} className="font-bold text-white hover:underline">{activeChat.username}</Link>
               </div>
               
               <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.map(msg => {
                    const isMine = msg.senderId === user?.id;
                    return (
                      <div key={msg.id} className={`flex flex-col group ${isMine ? 'items-end' : 'items-start'}`}>
                        <div className="flex items-center gap-2">
                           {isMine && (
                             <button onClick={() => handleDeleteMessage(msg.id)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-500 hover:text-red-500">
                               <Trash2 className="w-4 h-4" />
                             </button>
                           )}
                           <div className={`max-w-[70%] rounded-2xl px-4 py-2 ${isMine ? 'bg-blue-600 text-white' : 'bg-[#262626] text-white'}`}>
                             {msg.content}
                           </div>
                        </div>
                        <div className="text-[10px] text-gray-500 mt-1 font-mono">
                           {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true, locale: ptBR })}
                        </div>
                      </div>
                    )
                  })}
                  <div ref={messagesEndRef} />
               </div>

               <form onSubmit={handleSend} className="p-4 border-t border-[#262626] bg-[#1a1a1a]">
                 <div className="relative flex items-center">
                   <input
                     type="text"
                     value={newMessage}
                     onChange={e => setNewMessage(e.target.value)}
                     placeholder="Mensagem..."
                     className="w-full bg-transparent border border-[#333] rounded-full py-3 px-6 pr-12 text-white outline-none focus:border-gray-500 transition-colors"
                   />
                   <button type="submit" disabled={!newMessage.trim()} className="absolute right-4 text-blue-500 disabled:opacity-50 disabled:cursor-not-allowed">
                     <Send className="w-5 h-5 pointer-events-none" />
                   </button>
                 </div>
               </form>
             </>
           )}
        </div>
      </div>
    </div>
  );
};
