import React from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { notyf } from '../utils/notyf'

export const UserLogout = () => {

    const token = localStorage.getItem('token')
    const navigate = useNavigate()

    axios.get(`${import.meta.env.VITE_BASE_URL}/users/logout`, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    }).then((response) => {
        if (response.status === 200) {
            localStorage.removeItem('token')
            notyf.success('Logged out successfully')
            navigate('/login')
        }
    }).catch((error) => {
        notyf.error(error.response?.data?.message || 'Logout failed')
    })

    return (
        <div>UserLogout</div>
    )
}

export default UserLogout
