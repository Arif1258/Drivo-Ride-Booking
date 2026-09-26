import React, { useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import FinishRide from '../components/FinishRide'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import LiveTracking from '../components/LiveTracking'

const CaptainRiding = () => {

    const [finishRidePanel, setFinishRidePanel] = useState(false)
    const finishRidePanelRef = useRef(null)
    const mapContainerRef = useRef(null)
    const mapHeightRef = useRef(80) // start at 80vh
    const touchStartYRef = useRef(null)
    const location = useLocation()
    const rideData = location.state?.ride

    useGSAP(function () {
        if (finishRidePanel) {
            gsap.to(finishRidePanelRef.current, { transform: 'translateY(0)' })
        } else {
            gsap.to(finishRidePanelRef.current, { transform: 'translateY(100%)' })
        }
    }, [finishRidePanel])

    const handleWheelOnPanel = (e) => {
        const newHeight = Math.min(90, Math.max(30, mapHeightRef.current - e.deltaY * 0.05))
        mapHeightRef.current = newHeight
        gsap.to(mapContainerRef.current, {
            height: `${newHeight}vh`,
            duration: 0.3,
            ease: 'power2.out'
        })
    }

    const handleTouchStart = (e) => {
        touchStartYRef.current = e.touches[0].clientY
    }

    const handleTouchMove = (e) => {
        if (touchStartYRef.current === null) return
        const deltaY = touchStartYRef.current - e.touches[0].clientY
        touchStartYRef.current = e.touches[0].clientY
        const newHeight = Math.min(90, Math.max(30, mapHeightRef.current - deltaY * 0.15))
        mapHeightRef.current = newHeight
        gsap.to(mapContainerRef.current, {
            height: `${newHeight}vh`,
            duration: 0.2,
            ease: 'power2.out'
        })
    }

    const handleTouchEnd = () => {
        touchStartYRef.current = null
    }

    return (
        <div className='h-screen relative overflow-hidden flex flex-col'>

            <div className='fixed p-4 top-0 flex items-center justify-between w-screen z-10 pointer-events-none'>
                <div className='pointer-events-auto h-10 px-3 bg-slate-900/90 backdrop-blur border border-white/20 text-white rounded-xl flex items-center gap-2 shadow-lg'>
                    <div className='h-6 w-6 bg-emerald-600 rounded-md flex items-center justify-center font-black text-xs text-white'>D</div>
                    <span className='text-xs font-bold'>Drivo Captain</span>
                </div>
                <Link to='/captain-home' className='pointer-events-auto h-10 w-10 bg-white/90 backdrop-blur shadow-md flex items-center justify-center rounded-full hover:bg-white transition-all'>
                    <i className="text-lg font-medium ri-logout-box-r-line text-slate-700"></i>
                </Link>
            </div>

            <div ref={mapContainerRef} style={{ height: '80vh' }} className='w-screen'>
                <LiveTracking ride={rideData} />
            </div>

            {/* Bottom bar — scroll/drag resizes the map */}
            <div
                onWheel={handleWheelOnPanel}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                className='flex-1 bg-slate-900 text-white rounded-t-3xl shadow-2xl flex flex-col justify-between cursor-pointer border-t border-slate-800'
                onClick={() => setFinishRidePanel(true)}
            >
                <div className='w-12 h-1.5 bg-slate-700 rounded-full mx-auto mt-3 mb-1 cursor-grab'
                    onClick={e => e.stopPropagation()}
                ></div>
                <div className='p-6 flex items-center justify-between'>
                    <div>
                        <span className='text-[10px] uppercase font-bold tracking-wider text-emerald-400 block'>In Transit</span>
                        <h4 className='text-xl font-bold text-white'>{rideData?.destination ? 'Approaching Destination' : '4 KM away'}</h4>
                    </div>
                    <button className='bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-7 rounded-xl shadow-lg shadow-emerald-950/20 transition-all'>
                        Complete Ride
                    </button>
                </div>
            </div>

            <div ref={finishRidePanelRef} className='fixed w-full z-[500] bottom-0 translate-y-full bg-white px-3 py-10 pt-12 max-h-screen overflow-y-auto'>
                <FinishRide
                    ride={rideData}
                    setFinishRidePanel={setFinishRidePanel} />
            </div>

        </div>
    )
}

export default CaptainRiding