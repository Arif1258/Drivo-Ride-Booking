import React, { useContext, useEffect, useState } from 'react'
import { UserDataContext } from '../context/UserContext'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const UserProtectWrapper = ({
    children
}) => {
    const token = localStorage.getItem('token')
    const navigate = useNavigate()
    const { user, setUser } = useContext(UserDataContext)
    const [ isLoading, setIsLoading ] = useState(true)

    useEffect(() => {
        if (!token) {
            navigate('/login');
            return;
        }

        axios.get(`${import.meta.env.VITE_BASE_URL}/users/profile`, {
            headers: {
                Authorization: `Bearer ${token}`
            },
            timeout: 8000
        }).then(response => {
            if (response.status === 200) {
                setUser(response.data);
                setIsLoading(false);
            }
        }).catch(err => {
            console.warn('Profile fetch failed:', err.message);
            localStorage.removeItem('token');
            setIsLoading(false);
            navigate('/login');
        });
    }, [ token ]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4">
                <div className="h-10 w-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-xs font-semibold text-slate-400">Verifying secure session...</p>
            </div>
        );
    }

    return (
        <>
            {children}
        </>
    )
}

export default UserProtectWrapper