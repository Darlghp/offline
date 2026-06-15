import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getUser, getUserPosts, followUser, unfollowUser, getFollowers, getFollowing, updateMyProfile } from '../api';
import { useAuth } from '../context/AuthContext';
import { Grid, Bookmark, User as UserIcon, Mail, X } from 'lucide-react';
import clsx from 'clsx';

export const Profile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser, login } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);

  // Modals state
  const [showEdit, setShowEdit] = useState(false);
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);
  
  const [followersList, setFollowersList] = useState<any[]>([]);
  const [followingList, setFollowingList] = useState<any[]>([]);
  
  // Edit form state
  const [editForm, setEditForm] = useState({ username: '', fullName: '', bio: '', avatar: '' });

  useEffect(() => {
    if (id) {
      loadProfile(parseInt(id));
    }
  }, [id, currentUser]);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleAvatarChange = (e: any) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditForm({ ...editForm, avatar: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const loadProfile = async (userId: number) => {
    try {
      const data = await getUser(userId);
      setProfile(data);
      setEditForm({ username: data.username, fullName: data.fullName, bio: data.bio, avatar: data.avatar });
      const postData = await getUserPosts(userId);
      setPosts(postData);
    } catch(e) {
      console.error(e);
    }
  };

  const handleFollow = async () => {
    if (!profile) return;
    try {
      if (profile.isFollowing) {
        await unfollowUser(profile.id);
        setProfile({...profile, isFollowing: false, followers: profile.followers - 1});
      } else {
        await followUser(profile.id);
        setProfile({...profile, isFollowing: true, followers: profile.followers + 1});
      }
    } catch(e) {}
  };

  const handleMessage = () => {
    navigate(`/messages?userId=${profile.id}`);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updated = await updateMyProfile(editForm);
      setProfile({ ...profile, ...updated });
      setShowEdit(false);
      // Update global context user
      // Simple way: re-login to update context
      if (currentUser?.id) login(currentUser.id);
    } catch (e) {
      console.error(e);
    }
  };

  const openFollowers = async () => {
    if (!profile) return;
    try {
      const data = await getFollowers(profile.id);
      setFollowersList(data);
      setShowFollowers(true);
    } catch (e) {}
  };

  const openFollowing = async () => {
    if (!profile) return;
    try {
      const data = await getFollowing(profile.id);
      setFollowingList(data);
      setShowFollowing(true);
    } catch (e) {}
  };

  if (!profile) return null;

  const isOwnProfile = currentUser?.id === profile.id;

  const UserListModal = ({ title, users, onClose }: { title: string, users: any[], onClose: () => void }) => (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-[#121212] border border-[#262626] rounded-xl w-full max-w-sm flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between p-4 border-b border-[#262626]">
          <div className="w-6"></div>
          <h3 className="font-bold text-white text-base">{title}</h3>
          <button onClick={onClose}><X className="w-6 h-6 text-white" /></button>
        </div>
        <div className="overflow-y-auto flex-1 p-2">
          {users.length === 0 ? <div className="text-gray-500 text-center p-4">Nenhum usuário encontrado.</div> : null}
          {users.map(u => (
            <Link key={u.id} to={`/profile/${u.id}`} onClick={onClose} className="flex items-center justify-between p-2 hover:bg-white/5 rounded-lg transition-colors">
               <div className="flex items-center gap-3">
                 <img src={u.avatar} className="w-10 h-10 rounded-full bg-neutral-900 border border-[#262626]" alt={u.username} />
                 <div>
                   <div className="font-bold text-white text-sm">{u.username}</div>
                   <div className="text-gray-400 text-xs">{u.fullName}</div>
                 </div>
               </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-8 pb-24">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-center md:items-start gap-8 mb-12">
        <div className="w-32 h-32 md:w-40 md:h-40 shrink-0">
          <img src={profile.avatar} alt={profile.username} className="w-full h-full rounded-full border border-[#262626] object-cover bg-neutral-900 p-1" />
        </div>
        
        <div className="flex-1 text-center md:text-left">
          <div className="flex flex-col md:flex-row items-center gap-4 mb-4">
            <h2 className="text-xl font-normal text-white">{profile.username}</h2>
            <div className="flex gap-2">
              {isOwnProfile ? (
                 <button onClick={() => setShowEdit(true)} className="bg-white/10 hover:bg-white/20 text-white text-sm font-semibold py-1.5 px-4 rounded-lg transition-colors">
                   Editar perfil
                 </button>
              ) : (
                 <>
                   <button 
                     onClick={handleFollow}
                     className={clsx(
                       "text-sm font-semibold py-1.5 px-6 rounded-lg transition-colors border",
                       profile.isFollowing 
                         ? "bg-transparent hover:bg-white/5 text-white border-[#262626]"
                         : "bg-blue-500 hover:bg-blue-600 text-white border-transparent"
                     )}
                   >
                     {profile.isFollowing ? 'Seguindo' : 'Seguir'}
                   </button>
                   <button 
                     onClick={handleMessage}
                     className="bg-white/10 hover:bg-white/20 text-white text-sm font-semibold py-1.5 px-4 rounded-lg transition-colors flex items-center gap-2"
                   >
                     <Mail className="w-4 h-4" /> Mensagem
                   </button>
                 </>
              )}
            </div>
          </div>
          
          <div className="flex justify-center md:justify-start gap-6 mb-4 text-base text-gray-300">
            <div><span className="font-semibold text-white">{profile.posts}</span> publicações</div>
            <div className="cursor-pointer" onClick={openFollowers}><span className="font-semibold text-white">{profile.followers}</span> seguidores</div>
            <div className="cursor-pointer" onClick={openFollowing}><span className="font-semibold text-white">{profile.following}</span> seguindo</div>
          </div>
          
          <div>
            <div className="font-semibold text-white">{profile.fullName}</div>
            <div className="whitespace-pre-line text-gray-300 text-sm mt-1">{profile.bio}</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-t border-[#262626] flex justify-center uppercase text-xs font-semibold tracking-widest">
        <div className="flex items-center gap-2 py-4 border-t border-white text-white cursor-pointer mr-12">
          <Grid className="w-4 h-4" /> Publicações
        </div>
        <div className="flex items-center gap-2 py-4 text-gray-500 hover:text-white cursor-pointer">
          <Bookmark className="w-4 h-4" /> Salvos
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-3 gap-1 md:gap-4">
        {posts.map(post => (
          <div key={post.id} className="relative aspect-square group cursor-pointer bg-neutral-900 border border-[#262626]">
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

      {/* Modals */}
      {showFollowers && <UserListModal title="Seguidores" users={followersList} onClose={() => setShowFollowers(false)} />}
      {showFollowing && <UserListModal title="Seguindo" users={followingList} onClose={() => setShowFollowing(false)} />}
      
      {showEdit && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-[#262626] rounded-xl w-full max-w-md flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-[#262626]">
              <h3 className="font-bold text-white text-base">Editar perfil</h3>
              <button onClick={() => setShowEdit(false)}><X className="w-6 h-6 text-white" /></button>
            </div>
            <form onSubmit={handleSaveEdit} className="p-4 space-y-4">
               <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Nome de usuário</label>
                  <input required className="w-full bg-[#1a1a1a] border border-[#262626] rounded-lg p-2.5 text-sm outline-none focus:border-white text-white transition-colors" value={editForm.username} onChange={e => setEditForm({...editForm, username: e.target.value})} />
               </div>
               <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Nome</label>
                  <input required className="w-full bg-[#1a1a1a] border border-[#262626] rounded-lg p-2.5 text-sm outline-none focus:border-white text-white transition-colors" value={editForm.fullName} onChange={e => setEditForm({...editForm, fullName: e.target.value})} />
               </div>
               <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Biografia</label>
                  <textarea className="w-full bg-[#1a1a1a] border border-[#262626] rounded-lg p-2.5 text-sm outline-none focus:border-white text-white transition-colors min-h-[80px]" value={editForm.bio} onChange={e => setEditForm({...editForm, bio: e.target.value})} />
               </div>
               <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Avatar</label>
                  <div className="flex items-center gap-4 mt-2">
                     <img src={editForm.avatar} className="w-12 h-12 rounded-full border border-[#262626] bg-neutral-900 object-cover" />
                     <button type="button" className="text-blue-500 font-bold text-sm" onClick={() => fileInputRef.current?.click()}>Alterar foto</button>
                     <input type="file" className="hidden" ref={fileInputRef} accept="image/*" onChange={handleAvatarChange} />
                  </div>
               </div>
               <button type="submit" className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2.5 rounded-lg transition-colors mt-4">
                 Salvar alterações
               </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
