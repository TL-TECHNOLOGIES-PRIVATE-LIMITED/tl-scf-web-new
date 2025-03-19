import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const initialAuthState = (() => {
        const storedUserData = localStorage.getItem('user') || sessionStorage.getItem('user');
        return storedUserData ? JSON.parse(storedUserData) : { token: null, role: null };
    })();

    const [authState, setAuthState] = useState(initialAuthState);
    const authRef = useRef(authState);
    const login = (token, role, rememberMe) => {
        const userData = { token, role };
        authRef.current = userData;

        if (rememberMe) {
            localStorage.setItem('user', JSON.stringify(userData));
        } else {
            sessionStorage.setItem('user', JSON.stringify(userData));
        }

        setAuthState(userData);
    };

    const logout = () => {
        localStorage.removeItem('user');
        sessionStorage.removeItem('user');
        setAuthState({ token: null, role: null });
    };

    return (
        <AuthContext.Provider value={{ authState, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
