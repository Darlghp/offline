/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Feed } from './components/Feed';
import { Profile } from './components/Profile';
import { CreatePost } from './components/CreatePost';
import { AdminPanel } from './components/AdminPanel';
import { Explore } from './components/Explore';
import { Notifications } from './components/Notifications';
import { Messages } from './components/Messages';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-black text-white font-sans transition-colors duration-200">
          <Navbar />
          <div className="md:ml-60 pt-4 md:pt-0 pb-16 md:pb-0">
             <Routes>
                <Route path="/" element={<Feed />} />
                <Route path="/explore" element={<Explore />} />
                <Route path="/profile/:id" element={<Profile />} />
                <Route path="/create" element={<CreatePost />} />
                <Route path="/admin" element={<AdminPanel />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/messages" element={<Messages />} />
                <Route path="*" element={<div className="p-8 text-center">Em desenvolvimento...</div>} />
             </Routes>
          </div>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

