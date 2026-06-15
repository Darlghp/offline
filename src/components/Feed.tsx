import React, { useEffect, useState } from 'react';
import { getFeed, getStories, likePost, unlikePost, addComment, getFollowing, sendMessage, unfollowUser, deletePost } from '../api';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Heart, MessageCircle, Send, MoreHorizontal, X, Copy, Flag, UserMinus, Play, Pause, Trash2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import clsx from 'clsx';

export const Feed = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<any[]>([]);
  const [storiesGroups, setStoriesGroups] = useState<any[]>([]);
  
  // Modals state
  const [activeStoryGroup, setActiveStoryGroup] = useState<any>(null);
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);
  
  const [optionsPost, setOptionsPost] = useState<any>(null);
  
  const [sharePost, setSharePost] = useState<any>(null);
  const [shareUsers, setShareUsers] = useState<any[]>([]);
  const [loadingShare, setLoadingShare] = useState(false);

  const [storyReply, setStoryReply] = useState('');

  useEffect(() => {
    fetchPosts();
    fetchStories();
  }, []);

  const fetchPosts = async () => {
    try {
      const data = await getFeed('following'); // Only following + self by default
      if (data.length === 0) {
          const allPosts = await getFeed('all');
          setPosts(allPosts);
      } else {
          setPosts(data);
      }
    } catch(e) {
      console.error(e);
    }
  };

  const fetchStories = async () => {
    try {
      const data = await getStories();
      setStoriesGroups(data);
    } catch(e) {
      console.error(e);
    }
  };

  const handleLike = async (postId: number, isLiked: boolean) => {
    // optimistic update
    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        return { ...p, isLiked: !isLiked, likesCount: p.likesCount + (isLiked ? -1 : 1) };
      }
      return p;
    }));
    try {
      if (isLiked) await unlikePost(postId);
      else await likePost(postId);
    } catch(e) {
      // revert on error
      setPosts(prev => prev.map(p => {
        if (p.id === postId) {
          return { ...p, isLiked: isLiked, likesCount: p.likesCount + (isLiked ? 1 : -1) };
        }
        return p;
      }));
    }
  };

  const handleComment = async (postId: number, content: string, e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newComment = await addComment(postId, content);
      setPosts(posts.map(p => {
        if (p.id === postId) {
          return { ...p, recentComments: [...(p.recentComments || []), newComment], commentsCount: p.commentsCount + 1 };
        }
        return p;
      }));
      (e.target as HTMLFormElement).reset();
    } catch(e) {}
  };

  // Story Navigation
  const nextStory = () => {
    if (!activeStoryGroup) return;
    if (activeStoryIndex < activeStoryGroup.items.length - 1) {
      setActiveStoryIndex(prev => prev + 1);
    } else {
      closeStory();
    }
  };

  const prevStory = () => {
    if (activeStoryIndex > 0) {
      setActiveStoryIndex(prev => prev - 1);
    }
  };

  const closeStory = () => {
    setActiveStoryGroup(null);
    setActiveStoryIndex(0);
  };
  
  const [isStoryPaused, setIsStoryPaused] = useState(false);
  const [likedStoryIds, setLikedStoryIds] = useState<number[]>([]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (activeStoryGroup && !isStoryPaused) {
      timer = setTimeout(() => {
        nextStory();
      }, 5000); // 5 sec per story
    }
    return () => clearTimeout(timer);
  }, [activeStoryGroup, activeStoryIndex, isStoryPaused]);

  // Options Menu Actions
  const handleUnfollow = async () => {
    if (!optionsPost) return;
    try {
      await unfollowUser(optionsPost.userId);
      setOptionsPost(null);
      // refetch posts to remove unfollowed
      fetchPosts();
    } catch(e) {}
  };

  const handleCopyLink = () => {
     navigator.clipboard.writeText(window.location.origin + `/posts/${optionsPost.id}`);
     alert("Link copiado!");
     setOptionsPost(null);
  };

  // Share Actions
  const openShare = async (post: any) => {
    setSharePost(post);
    setLoadingShare(true);
    try {
      const users = await getFollowing(user?.id || 0); // we assume it gets our following
      setShareUsers(users);
    } catch(e) {}
    setLoadingShare(false);
  };
  
  const handleSendShare = async (targetUserId: number) => {
    try {
      if (sharePost.type === 'story') {
        await sendMessage(targetUserId, `Veja este story de ${sharePost.username}`);
      } else {
        await sendMessage(targetUserId, `Veja esta publicação: ${window.location.origin}/posts/${sharePost.id}`);
      }
      setSharePost(null);
      alert("Enviado com sucesso!");
    } catch(e) {}
  };

  const handleStoryReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storyReply.trim() || !activeStoryGroup) return;
    try {
      await sendMessage(activeStoryGroup.userId, `Respondeu ao seu story: ${storyReply}`);
      setStoryReply('');
      alert('Mensagem enviada!');
    } catch(e) {}
  };

  const handleLikeStory = async () => {
    if (!activeStoryGroup) return;
    const currentStoryId = activeStoryGroup.items[activeStoryIndex].id;
    if (likedStoryIds.includes(currentStoryId)) return; // Already liked
    
    setLikedStoryIds(prev => [...prev, currentStoryId]);
    try {
      await sendMessage(activeStoryGroup.userId, `❤️ Curtiu seu story`);
    } catch(e) {}
  };

  const openShareStory = () => {
    if (!activeStoryGroup) return;
    openShare({ id: activeStoryGroup.items[activeStoryIndex].id, type: 'story', username: activeStoryGroup.username });
  };

  const handleDeleteStory = async () => {
    if (!activeStoryGroup) return;
    const currentStoryId = activeStoryGroup.items[activeStoryIndex].id;
    if (window.confirm('Excluir este story?')) {
      try {
        await deleteStory(currentStoryId);
        closeStory();
        fetchStories();
      } catch(e) {
        alert('Erro ao excluir story');
      }
    }
  };

  const handleDeletePost = async () => {
    if (!optionsPost) return;
    try {
      await deletePost(optionsPost.id);
      setOptionsPost(null);
      fetchPosts();
    } catch(e) {
      alert('Erro ao excluir');
    }
  };

  return (
    <div className="w-full flex h-full">
      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        <div className="w-full sm:w-[480px] mx-auto pt-6 flex flex-col gap-6 overflow-y-auto pb-24 md:pb-8 relative">
          
          {/* Stories Bar */}
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide px-2">
            {storiesGroups.map(group => (
               <div key={group.userId} onClick={() => { setActiveStoryGroup(group); setActiveStoryIndex(0); }} className="flex flex-col items-center gap-1 cursor-pointer shrink-0">
                 <div className="w-16 h-16 rounded-full p-[2px] story-gradient overflow-hidden">
                   <div className="w-full h-full rounded-full border-2 border-black overflow-hidden bg-neutral-900">
                     <img src={group.items[0]?.imageUrl} alt={group.username} className="w-full h-full object-cover opacity-80" />
                   </div>
                 </div>
                 <span className="text-[10px] text-white font-medium max-w-[64px] truncate">{group.username}</span>
               </div>
            ))}
            {storiesGroups.length === 0 && (
              <div className="text-gray-600 text-[10px] p-4 text-center w-full uppercase font-mono tracking-widest border border-dashed border-[#262626] rounded-xl self-center">
                Sem Stories no momento
              </div>
            )}
          </div>

          {posts.length === 0 && <div className="p-8 text-center text-gray-500">Nenhuma publicação encontrada. Siga algumas contas!</div>}
          
          {posts.map(post => (
            <div key={post.id} className="bg-[#121212] border border-[#262626] rounded-xl flex flex-col shrink-0">
              {/* Header */}
              <div className="p-3 flex items-center justify-between">
                <Link to={`/profile/${post.userId}`} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full border border-[#262626] bg-gray-800 shrink-0 overflow-hidden">
                     <img src={post.avatar} alt={post.username} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex flex-col leading-tight">
                    <span className="text-sm font-bold text-white">{post.username}</span>
                    <span className="text-[10px] text-gray-400 font-mono">App Content • Local Database</span>
                  </div>
                </Link>
                <button onClick={() => setOptionsPost(post)}><MoreHorizontal className="w-5 h-5 text-gray-500 hover:text-white transition-colors" /></button>
              </div>

              {/* Image */}
              <div className="w-full bg-neutral-900 border-y border-[#262626] flex items-center justify-center overflow-hidden">
                <img src={post.imageUrl} alt="Post" className="w-full object-cover max-h-[600px]" />
              </div>

              {/* Actions */}
              <div className="p-3 flex flex-col gap-2">
                <div className="flex items-center gap-4">
                  <button onClick={() => handleLike(post.id, post.isLiked)}>
                    <Heart className={`w-6 h-6 transition-colors stroke-[2px] ${post.isLiked ? 'fill-red-500 text-red-500' : 'text-white hover:text-gray-400'}`} />
                  </button>
                  <button onClick={() => {
                     // In a full app, focus comment input
                  }}>
                    <MessageCircle className="w-6 h-6 text-white stroke-[2px] hover:text-gray-400" />
                  </button>
                  <button onClick={() => openShare(post)}>
                    <Send className="w-6 h-6 text-white stroke-[2px] hover:text-gray-400" />
                  </button>
                </div>
                
                <div className="text-sm font-bold text-white">{post.likesCount} curtidas</div>
                
                <div className="text-sm">
                  <span className="font-bold mr-2 text-white">{post.username}</span>
                  <span className="text-gray-200">{post.caption}</span>
                </div>

                {post.commentsCount > 0 && (
                  <div className="text-gray-500 text-sm mt-1 cursor-pointer hover:text-gray-400 transition-colors">
                    Ver todos os {post.commentsCount} comentários
                  </div>
                )}

                {post.recentComments && post.recentComments.map((c: any) => (
                  <div key={c.id} className="text-sm mt-1 text-gray-200">
                    <span className="font-bold mr-2 text-white">{c.username}</span>
                    {c.content}
                  </div>
                ))}

                <div className="text-[10px] text-gray-500 uppercase font-mono mt-1">
                  Há {formatDistanceToNow(new Date(post.createdAt), { locale: ptBR })} • Servidor Local
                </div>
              </div>

              {/* Add Comment */}
              <form onSubmit={(e) => handleComment(post.id, (e.target as any).elements.comment.value, e)} className="px-3 pb-3 pt-1 flex items-center border-t border-[#262626]/50 mt-1">
                <input 
                  name="comment"
                  type="text" 
                  placeholder="Adicione um comentário..." 
                  className="flex-1 text-sm outline-none bg-transparent text-white placeholder-gray-500 py-2"
                  autoComplete="off"
                />
                <button type="submit" className="text-blue-500 font-bold text-sm hover:text-blue-400 ml-2 transition-colors">Publicar</button>
              </form>
            </div>
          ))}
        </div>
      </div>

      {/* Story Viewer Overlay */}
      {activeStoryGroup && (
        <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
           <div className="w-full max-w-md h-full md:h-[90vh] md:rounded-xl relative bg-neutral-900 border border-[#262626] overflow-hidden flex flex-col">
              
              {/* Progress Bars */}
              <div className="absolute top-0 left-0 right-0 z-20 flex gap-1 p-2 pt-4">
                 {activeStoryGroup.items.map((_: any, idx: number) => (
                    <div key={idx} className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
                       <div 
                         className="h-full bg-white transition-all duration-100 ease-linear"
                         style={{ 
                            width: idx < activeStoryIndex ? '100%' : (idx === activeStoryIndex ? '100%' : '0%'),
                            transitionDuration: idx === activeStoryIndex ? '5000ms' : '0ms'
                         }} 
                       />
                    </div>
                 ))}
              </div>

              {/* Header */}
              <div className="absolute top-6 left-0 right-0 z-20 flex items-center justify-between p-4">
                 <div className="flex items-center gap-3">
                   <img src={activeStoryGroup.avatar} className="w-8 h-8 rounded-full border border-white/20" alt="avatar" />
                   <span className="text-sm font-bold text-white drop-shadow-md">{activeStoryGroup.username}</span>
                   <span className="text-xs text-white/70 drop-shadow-md">
                     {formatDistanceToNow(new Date(activeStoryGroup.items[activeStoryIndex].createdAt), { locale: ptBR })}
                   </span>
                 </div>
                 <div className="flex items-center gap-3">
                   <button onClick={() => setIsStoryPaused(!isStoryPaused)} className="p-2">
                     {isStoryPaused ? <Play className="w-6 h-6 text-white drop-shadow-md" /> : <Pause className="w-6 h-6 text-white drop-shadow-md" />}
                   </button>
                   {activeStoryGroup.userId === user?.id && (
                     <button onClick={handleDeleteStory} className="p-2"><Trash2 className="w-6 h-6 text-white drop-shadow-md hover:text-red-500 transition-colors" /></button>
                   )}
                   <button onClick={closeStory} className="p-2"><X className="w-6 h-6 text-white drop-shadow-md" /></button>
                 </div>
              </div>

              {/* Image */}
              <div className="flex-1 w-full bg-neutral-900 relative">
                 <img src={activeStoryGroup.items[activeStoryIndex].imageUrl} className="w-full h-full object-cover" alt="story" />
                 
                 {/* Navigation Hitboxes */}
                 <div className="absolute inset-y-0 left-0 w-1/3 z-10" onClick={prevStory} onPointerDown={() => setIsStoryPaused(true)} onPointerUp={() => setIsStoryPaused(false)} onPointerLeave={() => setIsStoryPaused(false)} />
                 <div className="absolute inset-y-0 right-0 w-2/3 z-10" onClick={nextStory} onPointerDown={() => setIsStoryPaused(true)} onPointerUp={() => setIsStoryPaused(false)} onPointerLeave={() => setIsStoryPaused(false)} />
              </div>

              {/* Footer */}
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent z-20">
                 <form onSubmit={handleStoryReply} className="flex items-center gap-4">
                   <input type="text" value={storyReply} onChange={e => setStoryReply(e.target.value)} placeholder={`Responder para ${activeStoryGroup.username}...`} className="flex-1 bg-transparent border border-white/40 rounded-full px-4 py-2 text-white placeholder-white/60 outline-none focus:border-white focus:bg-black/40 transition-colors" />
                   {storyReply.trim() ? (
                      <button type="submit"><Send className="w-7 h-7 text-white cursor-pointer hover:text-gray-300" /></button>
                   ) : (
                      <>
                        <button type="button" onClick={handleLikeStory}>
                          <Heart className={`w-7 h-7 transition-colors cursor-pointer ${likedStoryIds.includes(activeStoryGroup.items[activeStoryIndex].id) ? 'fill-red-500 text-red-500' : 'text-white hover:text-gray-300'}`} />
                        </button>
                        <button type="button" onClick={openShareStory}><Send className="w-7 h-7 text-white cursor-pointer hover:text-gray-300 transform -rotate-45" /></button>
                      </>
                   )}
                 </form>
              </div>
           </div>
        </div>
      )}

      {/* Options Post Overlay */}
      {optionsPost && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
           <div className="bg-[#262626] rounded-xl w-full max-w-sm flex flex-col overflow-hidden text-sm">
             {optionsPost.userId === user?.id ? (
               <button className="p-4 text-red-500 font-bold border-b border-[#333] hover:bg-white/5 active:bg-white/10" onClick={handleDeletePost}>Excluir publicação</button>
             ) : (
               <button className="p-4 text-red-500 font-bold border-b border-[#333] hover:bg-white/5 active:bg-white/10" onClick={() => { alert('Post denunciado'); setOptionsPost(null); }}>Denunciar</button>
             )}
             
             {optionsPost.userId !== user?.id && (
               <button className="p-4 text-red-500 font-bold border-b border-[#333] hover:bg-white/5 active:bg-white/10" onClick={handleUnfollow}>Deixar de seguir</button>
             )}
             <button className="p-4 text-white border-b border-[#333] hover:bg-white/5 active:bg-white/10" onClick={() => { navigate(`/profile/${optionsPost.userId}`); setOptionsPost(null); }}>Ir para perfil</button>
             <button className="p-4 text-white border-b border-[#333] hover:bg-white/5 active:bg-white/10" onClick={handleCopyLink}>Copiar link</button>
             <button className="p-4 text-white hover:bg-white/5 active:bg-white/10" onClick={() => setOptionsPost(null)}>Cancelar</button>
           </div>
        </div>
      )}

      {/* Share Post Overlay */}
      {sharePost && (
         <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
           <div className="bg-[#121212] border border-[#262626] rounded-xl w-full max-w-sm flex flex-col h-[60vh]">
              <div className="flex items-center justify-between p-4 border-b border-[#262626]">
                 <div className="w-6"></div>
                 <h3 className="font-bold text-white text-base">Compartilhar</h3>
                 <button onClick={() => setSharePost(null)}><X className="w-6 h-6 text-white" /></button>
              </div>
              <div className="p-2 border-b border-[#262626]">
                 <input type="text" placeholder="Pesquisar..." className="w-full bg-[#1a1a1a] rounded-xl px-4 py-2 outline-none text-white focus:ring-1 focus:ring-gray-500" />
              </div>
              <div className="overflow-y-auto flex-1 p-2">
                 {loadingShare ? (
                    <div className="p-4 text-center text-gray-500">Carregando...</div>
                 ) : (
                    shareUsers.length === 0 ? (
                       <div className="p-4 text-center text-gray-500">Nenhum sugerido encontrado.</div>
                    ) : (
                       shareUsers.map(u => (
                          <div key={u.id} className="flex items-center justify-between p-2 hover:bg-white/5 rounded-lg transition-colors cursor-pointer" onClick={() => handleSendShare(u.id)}>
                             <div className="flex items-center gap-3">
                               <img src={u.avatar} className="w-10 h-10 rounded-full border border-[#262626] bg-neutral-900" alt={u.username} />
                               <div>
                                  <div className="font-bold text-white text-sm">{u.username}</div>
                                  <div className="text-gray-400 text-xs">{u.fullName}</div>
                               </div>
                             </div>
                             <button className="bg-blue-500 px-4 py-1.5 rounded-lg text-white font-bold text-xs hover:bg-blue-600">Enviar</button>
                          </div>
                       ))
                    )
                 )}
              </div>
           </div>
         </div>
      )}

    </div>
  );
};
