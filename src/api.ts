export const API_URL = '/api';

export const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  const currentUserId = localStorage.getItem('offlinegram_user_id');
  const headers = new Headers(options.headers || {});
  
  if (currentUserId) {
    headers.set('x-user-id', currentUserId);
  }
  
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_URL}${url}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    let errorMsg = 'An error occurred';
    try {
      const errorData = await response.json();
      errorMsg = errorData.error || errorMsg;
    } catch (e) {}
    throw new Error(errorMsg);
  }

  return response.json();
};

// Users
export const getUsers = () => fetchWithAuth('/users');
export const getUser = (id: number) => fetchWithAuth(`/users/${id}`);
export const createUser = (data: any) => fetchWithAuth('/users', { method: 'POST', body: JSON.stringify(data) });
export const updateUser = (id: number, data: any) => fetchWithAuth(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteUser = (id: number) => fetchWithAuth(`/users/${id}`, { method: 'DELETE' });

// Follows
export const followUser = (id: number) => fetchWithAuth(`/users/${id}/follow`, { method: 'POST' });
export const unfollowUser = (id: number) => fetchWithAuth(`/users/${id}/unfollow`, { method: 'POST' });
export const getFollowers = (id: number) => fetchWithAuth(`/users/${id}/followers`);
export const getFollowing = (id: number) => fetchWithAuth(`/users/${id}/following`);
export const updateMyProfile = (data: any) => fetchWithAuth('/users/me', { method: 'PUT', body: JSON.stringify(data) });

// Posts
export const getFeed = (type: 'all' | 'following' = 'all') => fetchWithAuth(`/posts?feed=${type}`);
export const getUserPosts = (userId: number) => fetchWithAuth(`/posts?userId=${userId}`);
export const createPost = (imageUrl: string, caption: string) => fetchWithAuth('/posts', { method: 'POST', body: JSON.stringify({ imageUrl, caption }) });
export const deletePost = (id: number) => fetchWithAuth(`/posts/${id}`, { method: 'DELETE' });
export const likePost = (id: number) => fetchWithAuth(`/posts/${id}/like`, { method: 'POST' });
export const unlikePost = (id: number) => fetchWithAuth(`/posts/${id}/unlike`, { method: 'POST' });
export const addComment = (id: number, content: string) => fetchWithAuth(`/posts/${id}/comments`, { method: 'POST', body: JSON.stringify({ content }) });

// Notifications
export const getNotifications = () => fetchWithAuth('/notifications');
export const markNotificationsRead = () => fetchWithAuth('/notifications/read', { method: 'POST' });

// Stories
export const getStories = () => fetchWithAuth('/stories');
export const createStory = (imageUrl: string) => fetchWithAuth('/stories', { method: 'POST', body: JSON.stringify({ imageUrl }) });
export const deleteStory = (id: number) => fetchWithAuth(`/stories/${id}`, { method: 'DELETE' });

// Messages
export const getConversations = () => fetchWithAuth('/messages/conversations');
export const getMessages = (userId: number) => fetchWithAuth(`/messages/${userId}`);
export const sendMessage = (userId: number, content: string) => fetchWithAuth(`/messages/${userId}`, { method: 'POST', body: JSON.stringify({ content }) });
export const deleteMessage = (id: number) => fetchWithAuth(`/messages/${id}`, { method: 'DELETE' });
