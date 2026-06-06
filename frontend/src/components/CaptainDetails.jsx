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
            <div className='flex p-3 mt-8 bg-gray-100 rounded-xl justify-center gap-5 items-start'>
                <div className='text-center'>
                    <i className="text-3xl mb-2 font-thin ri-timer-2-line"></i>
                    <h5 className='text-lg font-medium'>10.2</h5>
                    <p className='text-sm text-gray-600'>Hours Online</p>
                </div>
                <div className='text-center'>
                    <i className="text-3xl mb-2 font-thin ri-speed-up-line"></i>
                    <h5 className='text-lg font-medium'>30 KM</h5>
                    <p className='text-sm text-gray-600'>Distance Cover</p>
                </div>
                <div className='text-center'>
                    <i className="text-3xl mb-2 font-thin ri-booklet-line"></i>
                    <h5 className='text-lg font-medium'>{tripsCount}</h5>
                    <p className='text-sm text-gray-600'>Completed Trips</p>
                </div>

            </div>
        </div>
    )
}

export default CaptainDetails