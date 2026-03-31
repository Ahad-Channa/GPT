import { createContext, useContext, useEffect, useState } from 'react';
import { 
    onAuthStateChanged, 
    signInWithPopup, 
    signOut, 
    GoogleAuthProvider,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    sendEmailVerification
} from 'firebase/auth';
import { auth, googleProvider } from '../config/firebase';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [mongoUser, setMongoUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const syncWithMongo = async (user) => {
        try {
            const token = await user.getIdToken();
            const res = await fetch('http://localhost:5000/api/auth/sync', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await res.json();
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

    const registerWithEmail = async (email, password) => {
        try {
            const result = await createUserWithEmailAndPassword(auth, email, password);
            // Send verification email to ensure "email is real or not"
            await sendEmailVerification(result.user);
            await syncWithMongo(result.user);
            return result.user;
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

    const logout = () => {
        setMongoUser(null);
        return signOut(auth);
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setCurrentUser(user);
            if (user) {
                await syncWithMongo(user);
            } else {
                setMongoUser(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const value = {
        currentUser,
        mongoUser,
        loginWithGoogle,
        registerWithEmail,
        loginWithEmail,
        logout
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
