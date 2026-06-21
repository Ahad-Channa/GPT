import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { 
    onAuthStateChanged, 
    signInWithPopup, 
    signOut, 
    GoogleAuthProvider,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    sendEmailVerification,
    sendPasswordResetEmail,
    confirmPasswordReset,
    verifyPasswordResetCode,
    updateProfile
} from 'firebase/auth';
import { auth, googleProvider } from '../config/firebase';
import { io } from 'socket.io-client';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [mongoUser, setMongoUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const socketRef = useRef(null);

    const syncWithMongo = async (user) => {
        try {
            const token = await user.getIdToken();
            const ref = localStorage.getItem('ref');
            const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/sync`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(ref ? { ref } : {})
            });
            const data = await res.json();
            if (data.isBanned || (data.success && data.user?.isBanned)) {
                alert("Your account has been banned due to violations of our terms. Please contact support.");
                await signOut(auth);
                setMongoUser(null);
                setCurrentUser(null);
                return;
            }
            if (data.success) {
                setMongoUser(data.user);
            }
        } catch (error) {
            console.error("MongoDB Sync Failed:", error);
        }
    };

    const loginWithGoogle = async () => {
        try {
            const result = await signInWithPopup(auth, googleProvider);
            await syncWithMongo(result.user);
            return result.user;
        } catch (error) {
            console.error("Google Sign In Error", error);
            throw error;
        }
    };

    const registerWithEmail = async (email, password, displayName) => {
        try {
            const result = await createUserWithEmailAndPassword(auth, email, password);
            
            if (displayName) {
                await updateProfile(result.user, { displayName });
                // Reload to reflect changes before sync
                await result.user.reload();
            }

            // Send verification email to ensure "email is real or not"
            await sendEmailVerification(auth.currentUser);
            await syncWithMongo(auth.currentUser);
            return auth.currentUser;
        } catch (error) {
            console.error("Email Registration Error", error);
            throw error;
        }
    };

    const loginWithEmail = async (email, password) => {
        try {
            const result = await signInWithEmailAndPassword(auth, email, password);
            await syncWithMongo(result.user);
            return result.user;
        } catch (error) {
            console.error("Email Login Error", error);
            throw error;
        }
    };

    const resetPassword = async (email) => {
        try {
            await sendPasswordResetEmail(auth, email);
        } catch (error) {
            console.error("Password Reset Error", error);
            throw error;
        }
    };

    const confirmResetPassword = async (oobCode, newPassword) => {
        try {
            // Optional: verify the code first if needed, but confirm directly does both
            await confirmPasswordReset(auth, oobCode, newPassword);
        } catch (error) {
            console.error("Confirm Password Reset Error", error);
            throw error;
        }
    };

    const logout = () => {
        setMongoUser(null);
        return signOut(auth);
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setCurrentUser(user);
            if (user) {
                await syncWithMongo(user);

                // ── Socket: identify this browser tab so the server can push balance updates ──
                const socketUrl = import.meta.env.VITE_API_URL
                    ? import.meta.env.VITE_API_URL.replace('/api', '')
                    : 'http://localhost:5000';

                // Re-use existing socket if still connected
                if (!socketRef.current || !socketRef.current.connected) {
                    socketRef.current = io(socketUrl, { transports: ['websocket', 'polling'] });
                }

                socketRef.current.emit('identify', { firebaseUid: user.uid });

                socketRef.current.off('walletUpdate'); // remove any stale listener first
                socketRef.current.on('walletUpdate', ({ walletBalance }) => {
                    setMongoUser(prev => prev ? { ...prev, walletBalance } : prev);
                });

                socketRef.current.off('vipLevelUp');
                socketRef.current.on('vipLevelUp', ({ label, rewardAmount, tier, rank }) => {
                    import('react-hot-toast').then(({ default: toast }) => {
                        const msg = rewardAmount > 0
                            ? `🎉 You reached ${label}! Claim your ${rewardAmount.toLocaleString()} coin bonus on the VIP page.`
                            : `🎉 You reached ${label} VIP status! Check your progress on the VIP page.`;
                        toast(
                            (t) => (
                                <span
                                    style={{ cursor: 'pointer', display: 'block' }}
                                    onClick={() => {
                                        toast.dismiss(t.id);
                                        window.location.href = '/dashboard/vip';
                                    }}
                                >
                                    {msg}
                                    <span style={{ display: 'block', fontSize: '0.75rem', marginTop: '4px', color: '#a5b4fc', fontWeight: 700 }}>
                                        → Open VIP page
                                    </span>
                                </span>
                            ),
                            {
                                duration: 12000,
                                icon: '⭐',
                                style: {
                                    cursor: 'pointer',
                                    background: '#0b101e',
                                    border: '1px solid rgba(99,102,241,0.5)',
                                    color: '#f1f5f9',
                                    fontWeight: 600,
                                    boxShadow: '0 0 20px rgba(99,102,241,0.3)',
                                    maxWidth: '360px',
                                },
                            }
                        );
                    });
                });

                // ── Real-time notification push (leaderboard rewards, etc.) ──────────
                socketRef.current.off('newNotification');
                socketRef.current.on('newNotification', ({ type, title, message }) => {
                    // Trigger a toast for important earning notifications
                    import('react-hot-toast').then(({ default: toast }) => {
                        toast.success(`${title}: ${message}`, {
                            duration: 8000,
                            style: {
                                background: '#0b101e',
                                border: '1px solid rgba(139,92,246,0.5)',
                                color: '#f1f5f9',
                                fontWeight: 600,
                                boxShadow: '0 0 20px rgba(139,92,246,0.3)',
                                maxWidth: '400px',
                            },
                        });
                    });
                });
            } else {
                setMongoUser(null);
                // Disconnect socket on logout
                if (socketRef.current) {
                    socketRef.current.disconnect();
                    socketRef.current = null;
                }
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);


    const isAdmin = mongoUser?.role === 'admin';
    const isPrimaryAdmin = mongoUser?.email === import.meta.env.VITE_PRIMARY_ADMIN_EMAIL;
    const isChatMod = mongoUser?.role === 'chat_mod' || mongoUser?.role === 'moderator';
    const isSupportAgent = mongoUser?.role === 'support_agent';
    // Any role that gets admin panel access
    const hasAdminAccess = isAdmin || isSupportAgent;
    // Any role that can moderate the live chat
    const canModerateChat = isAdmin || isChatMod || (mongoUser?.adminPermissions?.includes('manage_chat'));

    const value = {
        currentUser,
        mongoUser,
        setMongoUser,
        isAdmin,
        isPrimaryAdmin,
        isChatMod,
        isSupportAgent,
        hasAdminAccess,
        canModerateChat,
        loginWithGoogle,
        registerWithEmail,
        loginWithEmail,
        resetPassword,
        confirmResetPassword,
        logout,
        getSocket: () => socketRef.current
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
