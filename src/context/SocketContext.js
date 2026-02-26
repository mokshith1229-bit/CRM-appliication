import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import { useSelector, useDispatch } from 'react-redux';
import { API_URL } from '../constants/api'; // Ensure this points to your server URL
import { receiveMessage } from '../store/slices/whatsappSlice';

const SocketContext = createContext();

export const useSocket = () => {
  return useContext(SocketContext);
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const token = useSelector((state) => state.auth?.token); // Adjust based on your Redux state structure
  const dispatch = useDispatch();
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

      // Handle WhatsApp incoming events globally
      newSocket.on('whatsapp:message', (payload) => {
          console.log('[Socket] WhatsApp Message received:', payload);
          if (payload) {
              dispatch(receiveMessage(payload));
          }
      });

      setSocket(newSocket);

      return () => {
        newSocket.off('whatsapp:message');
        newSocket.disconnect();
      };
    } else {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
    }
  }, [token, dispatch]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};
