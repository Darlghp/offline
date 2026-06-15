import React, { useState, useRef } from 'react';
import { createPost, createStory } from '../api';
import { useNavigate } from 'react-router-dom';
import { Image as ImageIcon, Type } from 'lucide-react';

export const CreatePost = () => {
  const [image, setImage] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [storyText, setStoryText] = useState('');
  const [textPosition, setTextPosition] = useState<'top' | 'center' | 'bottom'>('center');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const renderImageWithText = async (): Promise<string> => {
    if (!image) return '';
    if (!storyText.trim()) return image;

    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(image);
        
        ctx.drawImage(img, 0, 0);
        
        const fontSize = Math.max(30, img.width / 15);
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        ctx.shadowColor = 'black';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        ctx.lineWidth = 3;

        const maxTextWidth = img.width * 0.9;
        const words = storyText.split(' ');
        let line = '';
        const lines = [];
        for (let n = 0; n < words.length; n++) {
          const testLine = line + words[n] + ' ';
          const metrics = ctx.measureText(testLine);
          if (metrics.width > maxTextWidth && n > 0) {
            lines.push(line);
            line = words[n] + ' ';
          } else {
            line = testLine;
          }
        }
        lines.push(line);

        let startY = img.height / 2 - ((lines.length - 1) * fontSize * 1.2) / 2;
        if (textPosition === 'top') {
           startY = img.height * 0.15;
        } else if (textPosition === 'bottom') {
           startY = img.height * 0.85 - ((lines.length - 1) * fontSize * 1.2);
        }
        
        let y = startY;
        for (let i = 0; i < lines.length; i++) {
          ctx.fillText(lines[i], img.width / 2, y);
          y += fontSize * 1.2;
        }

        resolve(canvas.toDataURL('image/jpeg', 0.9));
      };
      img.src = image;
    });
  };

  const handleSubmit = async (asStory: boolean) => {
    if (!image) return;
    setLoading(true);
    try {
      let finalImage = image;
      if (asStory && storyText.trim()) {
         finalImage = await renderImageWithText();
      }
      
      if (asStory) {
        await createStory(finalImage);
      } else {
        await createPost(finalImage, caption);
      }
      navigate('/');
    } catch(e) {
      console.error(e);
      alert('Erro ao criar conteúdo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="bg-[#121212] border border-[#262626] rounded-xl overflow-hidden shadow-sm">
        <div className="border-b border-[#262626] p-4 font-semibold text-center text-white">
          Criar nova publicação ou Story
        </div>
        
        <div className="flex flex-col md:flex-row">
          {/* Image Preview / Upload */}
          <div className="w-full md:w-[60%] border-r border-[#262626] min-h-[400px] flex items-center justify-center bg-neutral-900 group relative">
            {image ? (
              <>
                 <img src={image} alt="Preview" className="w-full h-full object-cover" />
                 <button onClick={() => setImage(null)} className="absolute top-2 right-2 bg-black/50 border border-[#262626] text-white px-3 py-1 rounded-full text-sm hover:bg-black/70">X</button>
              </>
            ) : (
              <div className="text-center p-8 flex flex-col items-center">
                <ImageIcon className="w-16 h-16 text-neutral-600 mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">Arraste as fotos para cá</h3>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                >
                  Selecionar do computador
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleImageChange} 
                  accept="image/*" 
                  className="hidden" 
                />
              </div>
            )}
          </div>

          {/* Caption Area */}
          <div className="w-full md:w-[40%] flex flex-col p-4">
            <textarea
              className="flex-1 w-full outline-none resize-none bg-transparent text-white placeholder-gray-500 min-h-[100px] mb-4"
              placeholder="Escreva uma legenda..."
              value={caption}
              onChange={e => setCaption(e.target.value)}
              disabled={!image}
            />
            
            <div className="flex flex-col gap-2 mb-4 border-t border-[#262626] pt-4">
               <label className="text-sm text-gray-400 font-bold flex items-center gap-2">
                 <Type className="w-4 h-4" /> Texto/Emoji no Story
               </label>
               <input 
                 type="text" 
                 placeholder="Digite emoji ou texto para o story..." 
                 value={storyText}
                 onChange={e => setStoryText(e.target.value)}
                 className="w-full bg-[#1a1a1a] border border-[#262626] rounded-lg p-2.5 text-sm outline-none focus:border-white text-white transition-colors"
                 disabled={!image}
               />
               <div className="flex gap-2 mt-1">
                 <button disabled={!image} className={`flex-1 py-1 rounded text-xs font-semibold ${textPosition === 'top' ? 'bg-white/20 text-white' : 'bg-[#1a1a1a] text-gray-400'}`} onClick={() => setTextPosition('top')}>Topo</button>
                 <button disabled={!image} className={`flex-1 py-1 rounded text-xs font-semibold ${textPosition === 'center' ? 'bg-white/20 text-white' : 'bg-[#1a1a1a] text-gray-400'}`} onClick={() => setTextPosition('center')}>Meio</button>
                 <button disabled={!image} className={`flex-1 py-1 rounded text-xs font-semibold ${textPosition === 'bottom' ? 'bg-white/20 text-white' : 'bg-[#1a1a1a] text-gray-400'}`} onClick={() => setTextPosition('bottom')}>Fundo</button>
               </div>
               <p className="text-xs text-gray-500 mt-1">Este texto será gravado na foto ao enviar como Story.</p>
            </div>
            
            <div className="pt-4 border-t border-[#262626] flex flex-col gap-2">
              <button 
                onClick={() => handleSubmit(false)} 
                disabled={!image || loading}
                className="w-full bg-blue-500 text-white font-semibold rounded-lg py-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-600 transition-colors"
              >
                {loading ? 'Compartilhando...' : 'Publicar no Feed'}
              </button>
              <button 
                onClick={() => handleSubmit(true)} 
                disabled={!image || loading}
                className="w-full bg-transparent border border-[#262626] text-white font-semibold rounded-lg py-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/5 transition-colors"
              >
                {loading ? 'Compartilhando...' : 'Adicionar ao Story'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

