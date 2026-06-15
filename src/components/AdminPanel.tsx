import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { createUser, updateUser, deleteUser } from '../api';
import { Settings, UserPlus, Save, Trash2, Edit2, PlayCircle } from 'lucide-react';

export const AdminPanel = () => {
  const { users, refreshUsers, login, user: currentUser } = useAuth();
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ username: '', fullName: '', bio: '', avatar: '' });
  const [isCreating, setIsCreating] = useState(false);

  const startEdit = (user: any) => {
    setIsCreating(false);
    setEditingUserId(user.id);
    setFormData({ username: user.username, fullName: user.fullName, bio: user.bio, avatar: user.avatar });
  };

  const startCreate = () => {
    setEditingUserId(null);
    setIsCreating(true);
    setFormData({ username: '', fullName: '', bio: '', avatar: '' });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.username.trim() || !formData.fullName.trim()) {
      alert('Por favor, preencha o nome de usuário e o nome completo.');
      return;
    }

    try {
      let finalData = { ...formData };
      if (!finalData.avatar) {
        finalData.avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${finalData.username}`;
      }

      if (isCreating) {
        await createUser(finalData);
      } else if (editingUserId) {
        await updateUser(editingUserId, finalData);
      }
      setEditingUserId(null);
      setIsCreating(false);
      await refreshUsers();
    } catch (e: any) {
      alert("Erro ao salvar: " + e.message);
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Tem certeza que deseja excluir esta conta permanentemente?')) {
      await deleteUser(id);
      await refreshUsers();
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 pb-24">
      <div className="flex items-center space-x-3 mb-8 border-b border-[#262626] pb-4">
        <Settings className="w-8 h-8 text-white" />
        <h1 className="text-2xl font-bold text-white">Painel de Administração</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* User List */}
        <div className="lg:col-span-2">
           <div className="flex justify-between items-center mb-4">
             <h2 className="text-xl font-semibold text-gray-300">Contas ({users.length})</h2>
             <button 
               onClick={startCreate}
               className="flex items-center space-x-2 bg-white text-black px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-200 transition-colors"
             >
               <UserPlus className="w-4 h-4" /> <span>Nova Conta</span>
             </button>
           </div>

           <div className="bg-[#121212] rounded-xl border border-[#262626] overflow-hidden shadow-sm overflow-x-auto">
             <table className="w-full text-left text-sm text-gray-300">
               <thead className="bg-[#1a1a1a] text-gray-500 uppercase">
                 <tr>
                   <th className="px-4 py-3">ID</th>
                   <th className="px-4 py-3">Usuário</th>
                   <th className="px-4 py-3 text-right">Ações</th>
                 </tr>
               </thead>
               <tbody>
                 {users.map(u => (
                   <tr key={u.id} className="border-b border-[#262626] last:border-0 hover:bg-white/5 transition-colors">
                     <td className="px-4 py-3 font-mono text-xs text-gray-400">{u.id}</td>
                     <td className="px-4 py-3 flex items-center space-x-3">
                       <img src={u.avatar} className="w-8 h-8 rounded-full border border-[#262626] bg-neutral-900" alt={u.username} />
                       <div>
                         <div className="font-bold text-white">{u.username}</div>
                         <div className="text-xs text-gray-500">{u.fullName}</div>
                       </div>
                     </td>
                     <td className="px-4 py-3 text-right space-x-2">
                        <button 
                          title="Simular uso da conta"
                          onClick={() => login(u.id)}
                          className={`p-1.5 rounded-md ${currentUser?.id === u.id ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                        >
                          <PlayCircle className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => startEdit(u)}
                          className="bg-blue-500/10 text-blue-400 p-1.5 rounded-md hover:bg-blue-500/20"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(u.id)}
                          className="bg-red-500/10 text-red-400 p-1.5 rounded-md hover:bg-red-500/20"
                          disabled={u.id === 1}
                          title={u.id === 1 ? 'Admin cannot be deleted' : 'Excluir conta'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
        </div>

        {/* Edit / Create Form */}
        <div>
           {(editingUserId || isCreating) ? (
             <div className="bg-[#121212] rounded-xl border border-[#262626] shadow-sm p-4 sm:p-6 sticky top-8">
               <h3 className="text-lg font-semibold mb-6 text-white border-b border-[#262626] pb-2">
                 {isCreating ? 'Criar Nova Conta' : 'Editar Conta'}
               </h3>
               <form className="space-y-4" onSubmit={handleSave}>
                 <div>
                   <label className="block text-sm font-medium text-gray-400 mb-1">Nome de usuário</label>
                   <input 
                     className="w-full bg-[#1a1a1a] border border-[#262626] rounded-lg p-2.5 text-sm outline-none focus:ring-1 focus:ring-white text-white"
                     value={formData.username}
                     onChange={e => setFormData({...formData, username: e.target.value})}
                   />
                 </div>
                 <div>
                   <label className="block text-sm font-medium text-gray-400 mb-1">Nome Completo</label>
                   <input 
                     className="w-full bg-[#1a1a1a] border border-[#262626] rounded-lg p-2.5 text-sm outline-none focus:ring-1 focus:ring-white text-white"
                     value={formData.fullName}
                     onChange={e => setFormData({...formData, fullName: e.target.value})}
                   />
                 </div>
                 <div>
                   <label className="block text-sm font-medium text-gray-400 mb-1">Biografia</label>
                   <textarea 
                     className="w-full bg-[#1a1a1a] border border-[#262626] rounded-lg p-2.5 text-sm outline-none focus:ring-1 focus:ring-white text-white min-h-[80px]"
                     value={formData.bio}
                     onChange={e => setFormData({...formData, bio: e.target.value})}
                   />
                 </div>
                 <div>
                   <label className="block text-sm font-medium text-gray-400 mb-1">URL do Avatar</label>
                   <input 
                     className="w-full bg-[#1a1a1a] border border-[#262626] rounded-lg p-2.5 text-sm outline-none focus:ring-1 focus:ring-white text-white"
                     value={formData.avatar}
                     placeholder="https://..."
                     onChange={e => setFormData({...formData, avatar: e.target.value})}
                   />
                   <div className="text-xs text-gray-500 mt-1">Dica: Geração automática no servidor se vazio.</div>
                 </div>

                 <div className="pt-4 flex justify-end space-x-3 border-t border-[#262626]">
                    <button 
                      type="button"
                      onClick={() => { setEditingUserId(null); setIsCreating(false); }}
                      className="px-4 py-2 text-sm font-semibold text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                    >
                      Cancelar
                    </button>
                    <button 
                      type="submit"
                      className="flex items-center space-x-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 text-sm font-semibold rounded-lg transition-colors"
                    >
                      <Save className="w-4 h-4" /> <span>Salvar</span>
                    </button>
                 </div>
               </form>
             </div>
           ) : (
             <div className="bg-[#1a1a1a]/50 text-gray-500 rounded-xl border border-[#262626] border-dashed h-full min-h-[300px] flex items-center justify-center text-sm">
               Selecione uma conta para editar ou crie uma nova.
             </div>
           )}
        </div>

      </div>
    </div>
  );
};
