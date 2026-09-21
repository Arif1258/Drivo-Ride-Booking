import React, { useContext, useEffect, useState } from 'react'
import { CaptainDataContext } from '../context/CapatainContext'
import { Link } from 'react-router-dom'
import axios from 'axios'

const CaptainDetails = () => {

    const { captain } = useContext(CaptainDataContext)
    const [totalEarned, setTotalEarned] = useState(0)
    const [tripsCount, setTripsCount] = useState(0)

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const response = await axios.get(`${import.meta.env.VITE_BASE_URL}/payments/captain-history`, {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('captain-token')}`
                    }
                })
                if (response.status === 200) {
                    const total = response.data.reduce((acc, curr) => acc + curr.amount, 0)
                    setTotalEarned(total)
                    setTripsCount(response.data.length)
                }
            } catch (err) {
                console.error(err)
            }
        }
        fetchHistory()
    }, [])

    return (
        <div>
            <div className='flex items-center justify-between'>
                <div className='flex items-center justify-start gap-3'>
                    <img className='h-10 w-10 rounded-full object-cover' src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRdlMd7stpWUCmjpfRjUsQ72xSWikidbgaI1w&s" alt="" />
                    <h4 className='text-lg font-medium capitalize'>{captain.fullname.firstname + " " + captain.fullname.lastname}</h4>
                </div>
                <div className='text-right'>
                    <Link to='/captain-earnings' className='hover:underline'>
                        <h4 className='text-xl font-semibold text-blue-600'>₹{totalEarned}</h4>
                        <p className='text-sm text-gray-600'>Earned <i className="ri-arrow-right-s-line"></i></p>
                    </Link>
                </div>
            </div>
            <div className='flex p-3 mt-6 bg-gray-100 rounded-xl justify-around items-center'>
                <div className='text-center'>
                    <span className='text-xs font-bold text-amber-600 block'>⭐ {captain.rating || 4.8}</span>
                    <h5 className='text-base font-bold text-slate-900'>Rating</h5>
                    <p className='text-[11px] text-gray-500 font-medium'>5.0 Star Target</p>
                </div>
                <div className='text-center border-x border-gray-200 px-3'>
                    <span className='text-xs font-bold text-emerald-600 block'>{captain.acceptanceRate || 96}%</span>
                    <h5 className='text-base font-bold text-slate-900'>Acceptance</h5>
                    <p className='text-[11px] text-gray-500 font-medium'>High Priority Tier</p>
                </div>
                <div className='text-center'>
                    <span className='text-xs font-bold text-blue-600 block'>{tripsCount}</span>
                    <h5 className='text-base font-bold text-slate-900'>Completed</h5>
                    <p className='text-[11px] text-gray-500 font-medium'>Total Rides</p>
                </div>
            </div>
        </div>
    )
}

export default CaptainDetails