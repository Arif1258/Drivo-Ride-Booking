
import React from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { notyf } from '../utils/notyf'

export const CaptainLogout = () => {
    const token = localStorage.getItem('captain-token')
    const navigate = useNavigate()

    axios.get(`${import.meta.env.VITE_BASE_URL}/captains/logout`, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    }).then((response) => {
        if (response.status === 200) {
            localStorage.removeItem('captain-token')
            notyf.success('Captain logged out successfully')
            navigate('/captain-login')
        }
    }).catch((error) => {
        notyf.error(error.response?.data?.message || 'Logout failed')
    })

    return (
        <div>CaptainLogout</div>
    )
}

export default CaptainLogout