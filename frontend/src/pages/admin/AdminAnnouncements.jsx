import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { FiMessageSquare, FiSend } from 'react-icons/fi';
import toast from 'react-hot-toast';

const AdminAnnouncements = () => {
  const { currentUser } = useAuth();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      toast.error('Title and message are required.');
      return;
    }

    if (!window.confirm("Are you sure you want to send this announcement to ALL users?")) {
      return;
    }

    setLoading(true);
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/admin/announcements`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: title.trim(),
          message: message.trim(),
          targetAll: true
        })
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Global announcement sent successfully!");
        setTitle('');
        setMessage('');
      } else {
        toast.error(data.error || 'Failed to send announcement');
      }
    } catch (err) {
      console.error(err);
      toast.error('Server error');
    }
    setLoading(false);
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h1 className="admin-page-title">Global Announcements</h1>
          <p className="admin-page-sub">Send a broadcast notification to every user on the platform.</p>
        </div>
      </div>

      <div className="admin-card" style={{ maxWidth: '600px' }}>
        <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fff' }}>
          <FiMessageSquare />
          Compose Message
        </h3>
        <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: '#cbd5e1' }}>
              Notification Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Platform Update, Special Event!"
              className="admin-input"
              required
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: '#cbd5e1' }}>
              Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write your announcement details here..."
              className="admin-input"
              rows={5}
              style={{ resize: 'vertical' }}
              required
            />
          </div>

          <button 
            type="submit" 
            className="action-btn primary" 
            disabled={loading}
            style={{ alignSelf: 'flex-start', marginTop: '0.5rem' }}
          >
            {loading ? 'Sending...' : (
              <>
                <FiSend style={{ marginRight: '0.5rem' }} />
                Broadcast to All Users
              </>
            )}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#93c5fd', lineHeight: '1.4' }}>
            <strong>Note:</strong> This will create a push notification in the bell icon for <em>every</em> user. Use this feature sparingly to prevent notification fatigue.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminAnnouncements;
