import { firebaseAdmin, logger } from '../config/index.js';

/**
 * Optional authentication middleware that gracefully handles missing Firebase
 * Provides mock user for development when Firebase is unavailable
 * Use this for routes that can work with or without authentication
 */
const optionalAuthMiddleware = async (req, res, next) => {
  try {
    // Check if we're in development mode
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    // Check Firebase availability
    if (!firebaseAdmin) {
      if (isDevelopment) {
        // Provide mock user for development
        req.user = {
          uid: 'dev-user-123',
          email: 'developer@bookkeeping.local',
          emailVerified: true,
          displayName: 'Development User',
          provider: 'mock',
          customClaims: {},
          authTime: new Date(),
          issuedAt: new Date(),
          expiresAt: new Date(Date.now() + 3600000) // 1 hour from now
        };
        
        logger.warn('Using mock authentication - Firebase not available', {
          mode: 'development',
          mockUser: req.user.email
        });
        
        return next();
      } else {
        logger.error('Firebase Admin not available in production mode');
        return res.status(503).json({
          error: 'Service Unavailable',
          message: 'Authentication service is temporarily unavailable'
        });
      }
    }

    // Get the authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.info('No authorization header provided for optional auth', {
        path: req.path,
        ip: req.ip
      });
      
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication token is required'
      });
    }

    // Extract the token
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    try {
      // Verify the token with Firebase Admin
      const decodedToken = await firebaseAdmin.auth().verifyIdToken(token);
      
      // Add comprehensive user information to request object
      req.user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        emailVerified: decodedToken.email_verified,
        displayName: decodedToken.name || decodedToken.email,
        photoURL: decodedToken.picture,
        provider: decodedToken.firebase.sign_in_provider,
        customClaims: decodedToken.customClaims || {},
        authTime: new Date(decodedToken.auth_time * 1000),
        issuedAt: new Date(decodedToken.iat * 1000),
        expiresAt: new Date(decodedToken.exp * 1000),
        firebaseClaims: decodedToken
      };

      logger.debug('User authenticated via optional middleware', {
        uid: req.user.uid,
        email: req.user.email,
        provider: req.user.provider
      });

      next();
    } catch (tokenError) {
      logger.warn('Token verification failed in optional auth', {
        error: tokenError.message,
        errorCode: tokenError.code,
        path: req.path,
        ip: req.ip
      });
      
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired authentication token'
      });
    }
  } catch (error) {
    logger.error('Optional auth middleware error', {
      error: error.message,
      stack: error.stack,
      path: req.path,
      ip: req.ip
    });
    
    return res.status(500).json({
      error: 'Authentication Error',
      message: 'Internal authentication service error'
    });
  }
};

export default optionalAuthMiddleware;
