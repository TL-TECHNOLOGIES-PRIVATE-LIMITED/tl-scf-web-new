import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, role = null }) => {
    const { authState } = useAuth();
    const location = useLocation();
    
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
    
    // First check for invalid URL characters
    if (hasInvalidChars()) {
        return <Navigate to="/error/400" replace />;
    }
    
    // Then check authentication
    if (!authState.token) {
        return <Navigate to="/login" replace />;
    }
    
    // Finally check role permissions
    if (role && !role.includes(authState.role)) {
        return <Navigate to="/error/403" replace />;
    }
    
    return children;
};

export default ProtectedRoute;