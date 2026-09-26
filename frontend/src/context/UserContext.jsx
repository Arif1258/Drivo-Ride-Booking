import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';

export const UserDataContext = createContext();

const UserContext = ({ children }) => {
    const [user, setUserState] = useState(() => {
        try {
            const saved = localStorage.getItem('drivo_user');
            if (saved) return JSON.parse(saved);
        } catch {
            // ignore
        }
        return {
            email: '',
            fullName: {
                firstName: '',
                lastName: ''
            }
        };
    });

    const setUser = (userData) => {
        setUserState(userData);
        try {
            if (userData && (userData.email || userData._id)) {
                localStorage.setItem('drivo_user', JSON.stringify(userData));
            } else {
                localStorage.removeItem('drivo_user');
            }
        } catch (e) {
            console.error('Error persisting user to localStorage:', e);
        }
    };

    // If token exists but user profile is missing details, fetch once
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token && (!user.email || !user._id)) {
            axios.get(`${import.meta.env.VITE_BASE_URL}/users/profile`, {
                headers: { Authorization: `Bearer ${token}` },
                timeout: 5000
            }).then(res => {
                if (res.status === 200 && res.data) {
                    setUser(res.data);
                }
            }).catch(err => {
                console.log('Background profile check:', err.message);
            });
        }
    }, []);

    return (
        <UserDataContext.Provider value={{ user, setUser }}>
            {children}
        </UserDataContext.Provider>
    );
};

export default UserContext;