import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const PublicRoute = ({ children }) => {
    const { authState } = useAuth();
    const location = useLocation();
    
    // Redirect location (where to send after login)
    const from = location.state?.from || '/';
    
    // Check for special characters in URL
    const hasInvalidChars = () => {
        // Define pattern for invalid characters
        const invalidPattern = /[@#!$%^&*()_+|~=`{}\[\]:";'<>?,\\]/;
        
        // Check pathname, search params, and hash
        const currentPath = location.pathname;
        const currentSearch = location.search;
        const currentHash = location.hash;
        
        return (
            invalidPattern.test(currentPath) || 
            invalidPattern.test(currentSearch) || 
            invalidPattern.test(currentHash)
        );
    };
    
    // Show loading screen while checking authentication
 
    
    // First check for invalid URL characters
    if (hasInvalidChars()) {
        return <Navigate to="/error/400" replace />;
    }
    
    // If user is already authenticated, redirect to dashboard
    if (authState.token) {
        return <Navigate to={from} replace />;
    }
    
    // Otherwise, show the login page
    return children;
};

export default PublicRoute;