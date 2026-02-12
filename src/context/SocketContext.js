import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import { useSelector } from 'react-redux';
import { API_URL } from '../constants/api'; // Ensure this points to your server URL

const SocketContext = createContext();

export const useSocket = () => {
  return useContext(SocketContext);
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const token = useSelector((state) => state.auth?.token); // Adjust based on your Redux state structure
    // If not using redux for auth, we might need to retrieve token from AsyncStorage

  useEffect(() => {
    if (token) {
      const newSocket = io(API_URL, {
        auth: {
          token: token,
        },
        transports: ['polling', 'websocket'], // Try polling if websocket fails (Requires Session Affinity!)
        autoConnect: true,
      });

      newSocket.on('connect', () => {
        console.log('[Socket] Connected to server');
      });

      newSocket.on('disconnect', () => {
        console.log('[Socket] Disconnected from server');
      });
      
      newSocket.on('connect_error', (err) => {
          console.log(`[Socket] Connection Error: ${err.message}`);
      });

      setSocket(newSocket);

      return () => {
        newSocket.disconnect();
      };
    } else {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
    }
  }, [token]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};
