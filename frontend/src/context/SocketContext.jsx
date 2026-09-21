
import React, { createContext, useEffect } from 'react';
import { io } from 'socket.io-client';

export const SocketContext = createContext();

const socket = io(`${import.meta.env.VITE_BASE_URL}`, {
    transports: ['polling', 'websocket'],
    reconnection: true,
    reconnectionAttempts: 20,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    withCredentials: true
});

const SocketProvider = ({ children }) => {
    useEffect(() => {
        const handleConnect = () => {
            console.log('✅ Connected to Drivo real-time server (socketId:', socket.id, ')');
        };

        const handleDisconnect = (reason) => {
            console.log('🔌 Disconnected from real-time server:', reason);
        };

        const handleConnectError = (error) => {
            console.debug('Socket connection attempt notice:', error.message);
        };

        socket.on('connect', handleConnect);
        socket.on('disconnect', handleDisconnect);
        socket.on('connect_error', handleConnectError);

        return () => {
            socket.off('connect', handleConnect);
            socket.off('disconnect', handleDisconnect);
            socket.off('connect_error', handleConnectError);
        };
    }, []);



    return (
        <SocketContext.Provider value={{ socket }}>
            {children}
        </SocketContext.Provider>
    );
};

export default SocketProvider;