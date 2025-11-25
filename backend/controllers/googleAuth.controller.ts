import { Request, Response } from "express";
import { getGoogleAuthURL, getGoogleUser } from "../config/googleAuth.js";
import { User } from "../models/user.model.js";
import { generateTokenAndSetCookie } from "../utils/generateTokenAndSetCookie.js";

export const getGoogleAuthUrl = (req: Request, res: Response): Response | void => {
    try {
        const { url, state } = getGoogleAuthURL();
        
        // Store state in httpOnly cookie for CSRF protection
        res.cookie('oauth_state', state, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 10 * 60 * 1000, // 10 minutes
            path: '/', // Ensure cookie is available for all paths
        });
        
        console.log('Setting oauth_state cookie:', state);
        
        res.status(200).json({ url });
    } catch (error) {
        console.error('Error generating Google URL:', error);
        res.status(500).json({ success: false, message: 'Error generating Google URL' });
    }
};

export const googleAuthCallback = async (req: Request, res: Response): Promise<void> => {
    try {
        const { code, state } = req.query;
        const storedState = req.cookies.oauth_state;
        
        console.log('OAuth callback - All cookies:', req.cookies);
        console.log('OAuth callback - State from query:', state);
        console.log('OAuth callback - State from cookie:', storedState);
        
        // Verify CSRF state parameter
        if (!state || !storedState || state !== storedState) {
            console.error('CSRF state mismatch:', { 
                received: state, 
                stored: storedState,
                allCookies: req.cookies 
            });
            const redirectUrl = `${process.env.CLIENT_URL}/login?error=invalid_state`;
            res.redirect(redirectUrl);
            return;
        }
        
        // Clear the state cookie after verification
        res.clearCookie('oauth_state');
        
        if (!code || typeof code !== 'string') {
            res.redirect(`${process.env.CLIENT_URL}/login?error=no_code`);
            return;
        }

        // Get the user's profile with the code
        const googleUser = await getGoogleUser(code);
        
        // Check if user already exists with Google ID or email in a single query
        let user = await User.findOne({ 
            $or: [
                { googleId: googleUser.id },
                { email: googleUser.email }
            ]
        });

        if (!user) {
            // Create new user with Google OAuth (no password required)
            user = new User({
                googleId: googleUser.id,
                email: googleUser.email,
                name: googleUser.name,
                profilePicture: googleUser.picture,
                isVerified: true,
                lastLogin: new Date(),
                // Note: password is not required for Google OAuth users
            });
        } else {
            // Update existing user - consolidate all updates into single operation
            const updates: Partial<{
                lastLogin: Date;
                isVerified: boolean;
                googleId: string;
                profilePicture: string;
            }> = {
                lastLogin: new Date(),
                isVerified: true, // Google emails are verified
            };
            
            // Link Google account if not already linked
            if (!user.googleId) {
                updates.googleId = googleUser.id;
            }
            
            // Update profile picture if not set
            if (!user.profilePicture && googleUser.picture) {
                updates.profilePicture = googleUser.picture;
            }
            
            // Apply all updates at once
            Object.assign(user, updates);
        }
        
        // Single save operation instead of multiple
        await user.save();

        // Generate JWT token and set cookie
        generateTokenAndSetCookie(res, user._id);

        // Redirect to frontend with user data
        const userData = {
            _id: user._id,
            name: user.name,
            email: user.email,
            profilePicture: user.profilePicture,
            isVerified: user.isVerified
        };

        // Redirect to frontend with user data
        const redirectUrl = `${process.env.CLIENT_URL}/oauth-redirect?${new URLSearchParams({
            success: 'true',
            user: JSON.stringify(userData)
        })}`;

        res.redirect(redirectUrl);

    } catch (error) {
        console.error('Error in Google OAuth callback:', error);
        const redirectUrl = `${process.env.CLIENT_URL}/login?error=google_auth_failed`;
        res.redirect(redirectUrl);
    }
};
