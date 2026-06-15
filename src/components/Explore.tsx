import React, { useState, useEffect } from 'react';
import { getFeed, getUsers } from '../api';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';

export const Explore = () => {
  const [posts, setPosts] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const p = await getFeed('all');
      setPosts(p);
      const u = await getUsers();
      setUsers(u);
    } catch(e) {}
  };

  const filteredUsers = query ? users.filter(u => u.username.toLowerCase().includes(query.toLowerCase()) || u.fullName.toLowerCase().includes(query.toLowerCase())) : [];

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-8 pb-24">
       {/* Search Bar */}
       <div className="mb-8 relative max-w-xl mx-auto">
         <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
           <Search className="h-5 w-5 text-gray-400" />
         </div>
         <input 
           type="text" 
           className="bg-[#121212] border border-[#262626] rounded-lg w-full py-3 pl-10 pr-4 text-sm outline-none focus:ring-1 focus:ring-white text-white"
           placeholder="Pesquisar usuários..."
           value={query}
           onChange={e => setQuery(e.target.value)}
         />

         {query && (
           <div className="absolute top-12 left-0 right-0 bg-[#121212] rounded-lg shadow-xl border border-[#262626] overflow-hidden z-20 max-h-64 overflow-y-auto">
             {filteredUsers.length === 0 ? (
               <div className="p-4 text-center text-sm text-gray-500">Nenhum resultado encontrado.</div>
             ) : (
               filteredUsers.map(u => (
                 <Link key={u.id} to={`/profile/${u.id}`} className="flex items-center space-x-3 p-3 hover:bg-white/5 transition-colors border-b border-[#262626] last:border-0">
                   <img src={u.avatar} alt="Avatar" className="w-10 h-10 rounded-full border border-[#262626] bg-neutral-900" />
                   <div>
                     <div className="font-semibold text-sm text-white">{u.username}</div>
                     <div className="text-xs text-gray-400">{u.fullName}</div>
                   </div>
                 </Link>
               ))
             )}
           </div>
         )}
       </div>

       {/* Explore Grid */}
       <div className="grid grid-cols-3 gap-1 md:gap-4">
        {posts.map(post => (
          <div key={post.id} className="relative aspect-square group cursor-pointer bg-neutral-900 border border-[#262626] overflow-hidden">
            <img src={post.imageUrl} alt="Post" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-center items-center text-white">
               <div className="flex space-x-6 font-bold text-lg">
                  <span>♥️ {post.likesCount}</span>
                  <span>💬 {post.commentsCount}</span>
               </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
