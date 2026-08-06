const API = {
  base: (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:3000/api' : '/api',

  token() { return localStorage.getItem('fsr_token'); },

  headers() {
    return {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + this.token()
    };
  },

  async request(method, path, body) {
    const opts = { method, headers: this.headers() };
    if (body) opts.body = JSON.stringify(body);
    try {
      const res = await fetch(this.base + path, opts);
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          localStorage.removeItem('fsr_token');
          localStorage.removeItem('fsr_user');
          window.location.href = 'login.html';
          return;
        }
        throw new Error(data.error || 'Request failed');
      }
      return data;
    } catch (err) {
      if (err.message === 'Failed to fetch') {
        console.warn('API unavailable, using fallback');
        return null;
      }
      throw err;
    }
  },

  get(path) { return this.request('GET', path); },
  post(path, body) { return this.request('POST', path, body); },
  put(path, body) { return this.request('PUT', path, body); },
  del(path) { return this.request('DELETE', path); },

  auth: {
    login(email, password) { return API.post('/auth/login', { email, password }); },
    verify() { return API.get('/auth/me'); },
    changePassword(currentPassword, newPassword) {
      return API.post('/auth/change-password', { currentPassword, newPassword });
    }
  },

  organizations: {
    list() { return API.get('/organizations'); },
    get(id) { return API.get('/organizations/' + id); },
    create(data) { return API.post('/organizations', data); },
    update(id, data) { return API.put('/organizations/' + id, data); },
    delete(id) { return API.del('/organizations/' + id); }
  },

  users: {
    list() { return API.get('/users'); },
    create(data) { return API.post('/users', data); },
    update(id, data) { return API.put('/users/' + id, data); },
    delete(id) { return API.del('/users/' + id); }
  },

  audits: {
    list() { return API.get('/audits'); },
    create(data) { return API.post('/audits', data); },
    update(id, data) { return API.put('/audits/' + id, data); },
    delete(id) { return API.del('/audits/' + id); }
  },

  incidents: {
    list() { return API.get('/incidents'); },
    create(data) { return API.post('/incidents', data); },
    update(id, data) { return API.put('/incidents/' + id, data); },
    delete(id) { return API.del('/incidents/' + id); }
  },

  capa: {
    list() { return API.get('/capa'); },
    create(data) { return API.post('/capa', data); },
    update(id, data) { return API.put('/capa/' + id, data); },
    delete(id) { return API.del('/capa/' + id); }
  },

  dashboard: {
    stats() { return API.get('/dashboard'); }
  },

  invite: {
    list() { return API.get('/invite'); },
    send(email, role, organization_id, name) { return API.post('/invite', { email, role, organization_id, name }); },
    remove(id) { return API.del('/invite/' + id); },
    updateRole(id, role) { return API.put('/invite/' + id + '/role', { role }); }
  },

  messages: {
    conversations() { return API.get('/messages/conversations'); },
    get(userId) { return API.get('/messages/' + userId); },
    send(receiver_id, message) { return API.post('/messages', { receiver_id, message }); }
  },

  assistant: {
    async chat(messages, onChunk, onDone, onError) {
      try {
        const res = await fetch(API.base + '/assistant/chat', {
          method: 'POST',
          headers: API.headers(),
          body: JSON.stringify({ messages })
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Request failed');
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop();
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') { if (onDone) onDone(); return; }
              try {
                const parsed = JSON.parse(data);
                if (parsed.error) { if (onError) onError(parsed.error); return; }
                if (parsed.content && onChunk) onChunk(parsed.content);
              } catch(e) {}
            }
          }
        }
        if (onDone) onDone();
      } catch (err) {
        if (onError) onError(err.message);
      }
    }
  }
};