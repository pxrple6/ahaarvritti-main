import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, firestore } from '../services/firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile 
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, collection, query, where, getDocs, limit as fsLimit } from 'firebase/firestore';
import toast from 'react-hot-toast';

const getUsersByRole = async (role, { max = 50 } = {}) => {
  try {
    const q = query(
      collection(firestore, 'users'),
      where('role', '==', role),
      fsLimit(max)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('getUsersByRole error:', error);
    return [];
  }
};

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // User roles
  const USER_ROLES = {
    RESTAURANT: 'restaurant',
    FOOD_BANK: 'foodbank',
    INDIVIDUAL: 'individual',
    ADMIN: 'admin',
    VOLUNTEER: 'volunteer'
  };

  const signup = async (email, password, userData) => {
    try {
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      
      const userProfileData = {
        uid: user.uid,
        email: user.email,
        role: userData.role,
        name: userData.name,
        phone: userData.phone,
        address: userData.address,
        coordinates: userData.coordinates || null,
        createdAt: new Date().toISOString(),
        isVerified: false,
        rating: 0,
        totalDonations: 0,
        totalRequests: 0,
        tokens: 0,
        ...userData
      };

      await setDoc(doc(firestore, 'users', user.uid), userProfileData);
      
      await updateProfile(user, {
        displayName: userData.name
      });

      setUserProfile(userProfileData);
      toast.success('Account created successfully!');
      
      return user;
    } catch (error) {
      console.error('Signup error:', error);
      toast.error(error.message);
      throw error;
    }
  };

  const login = async (email, password) => {
    try {
      const { user } = await signInWithEmailAndPassword(auth, email, password);
      toast.success('Welcome back!');
      return user;
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Invalid email or password');
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
      setUserProfile(null);
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Error logging out');
    }
  };

  const updateUserProfile = async (updates) => {
    try {
      const userRef = doc(firestore, 'users', currentUser.uid);
      await updateDoc(userRef, updates);
      
      setUserProfile(prev => ({ ...prev, ...updates }));
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Update profile error:', error);
      toast.error('Error updating profile');
      throw error;
    }
  };

  const fetchUserProfile = async (uid) => {
    try {
      const userDoc = await getDoc(doc(firestore, 'users', uid));
      if (userDoc.exists()) {
        return userDoc.data();
      }
      return null;
    } catch (error) {
      console.error('Fetch profile error:', error);
      return null;
    }
  };

  const hasRole = (requiredRole) => {
    if (!userProfile) return false;
    return userProfile.role === requiredRole;
  };

  const hasAnyRole = (requiredRoles) => {
    if (!userProfile) return false;
    return requiredRoles.includes(userProfile.role);
  };

  useEffect(() => {
   
    const unsubscribe = onAuthStateChanged(auth, user => {
      const updateUserState = async (authedUser) => {
        setCurrentUser(authedUser);
        if (authedUser) {
          const profile = await fetchUserProfile(authedUser.uid);
          setUserProfile(profile);
        } else {
          setUserProfile(null);
        }
        setLoading(false);
      };
      void updateUserState(user); 
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userProfile,
    loading,
    signup,
    login,
    logout,
    updateUserProfile,
    hasRole,
    hasAnyRole,
    USER_ROLES,
    getUsersByRole
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}; 