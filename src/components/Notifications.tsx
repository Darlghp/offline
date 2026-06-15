import React, { useEffect, useState } from 'react';
import { getNotifications, markNotificationsRead } from '../api';
import { Link } from 'react-router-dom';
import { Heart, MessageCircle, UserPlus, Bell } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const Notifications = () => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const data = await getNotifications();
      setNotifications(data);
      if (data.some((n: any) => !n.isRead)) {
         await markNotificationsRead();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Carregando...</div>;

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="flex items-center space-x-3 mb-8 border-b border-[#262626] pb-4">
        <Bell className="w-8 h-8 text-white" />
        <h1 className="text-2xl font-bold text-white">Notificações</h1>
      </div>

      <div className="flex flex-col gap-4">
        {notifications.length === 0 ? (
           <div className="text-gray-500 text-center py-8">Você não tem novas notificações.</div>
        ) : (
          notifications.map(notif => (
            <div key={notif.id} className={`flex items-center gap-4 p-4 rounded-xl border border-[#262626] transition-colors ${notif.isRead ? 'bg-[#1a1a1a]' : 'bg-[#121212]'}`}>
               <Link to={`/profile/${notif.senderId}`} className="shrink-0">
                 <img src={notif.senderAvatar} alt={notif.senderName} className="w-12 h-12 rounded-full object-cover border border-[#262626] bg-neutral-900" />
               </Link>

               <div className="flex-1">
                 <div className="text-sm">
                   <Link to={`/profile/${notif.senderId}`} className="font-bold text-white hover:underline mr-1">
                     {notif.senderName}
                   </Link>
                   <span className="text-gray-300">
                     {notif.type === 'like' && 'curtiu sua publicação.'}
                     {notif.type === 'comment' && 'comentou na sua publicação.'}
                     {notif.type === 'follow' && 'começou a seguir você.'}
                   </span>
                 </div>
                 <div className="text-[10px] text-gray-500 uppercase font-mono mt-1">
                    {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true, locale: ptBR })}
                 </div>
               </div>

               <div className="shrink-0 text-gray-400">
                  {notif.type === 'like' && <Heart className="w-6 h-6 text-red-500 fill-red-500" />}
                  {notif.type === 'comment' && <MessageCircle className="w-6 h-6 text-blue-500" />}
                  {notif.type === 'follow' && <UserPlus className="w-6 h-6 text-white" />}
               </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
