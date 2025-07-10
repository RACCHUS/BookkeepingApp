import { firebaseAdmin } from '../config/index.js';
import { logger } from '../config/index.js';

/**
 * Strict authentication middleware that requires valid Firebase token
 * Use this for routes that absolutely require authentication
 */
const authMiddleware = async (req, res, next) => {
  try {
    // Check if Firebase is initialized
    if (!firebaseAdmin) {
      logger.error('Firebase Admin not initialized for strict auth');
      return res.status(503).json({
        error: 'Service Unavailable',
        message: 'Authentication service is not available'
      });
    }

    // Get the authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('Missing or invalid authorization header', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path
      });
      
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Valid authorization token is required'
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
        displayName: decodedToken.name,
        photoURL: decodedToken.picture,
        provider: decodedToken.firebase.sign_in_provider,
        customClaims: decodedToken.customClaims || {},
        authTime: new Date(decodedToken.auth_time * 1000),
        issuedAt: new Date(decodedToken.iat * 1000),
        expiresAt: new Date(decodedToken.exp * 1000)
      };

      logger.debug('User authenticated successfully', {
        uid: req.user.uid,
        email: req.user.email,
        provider: req.user.provider
      });

      next();
    } catch (tokenError) {
      logger.warn('Token verification failed', {
        error: tokenError.message,
        ip: req.ip,
        path: req.path
      });
      
      return res.status(401).json({
        error: 'Invalid Token',
        message: 'The provided token is invalid, expired, or malformed'
      });
    }
  } catch (error) {
    logger.error('Authentication middleware error', {
      error: error.message,
      stack: error.stack,
      ip: req.ip,
      path: req.path
    });
    
    return res.status(500).json({
      error: 'Authentication Error',
      message: 'An internal error occurred during authentication'
    });
  }
};

export default authMiddleware;
