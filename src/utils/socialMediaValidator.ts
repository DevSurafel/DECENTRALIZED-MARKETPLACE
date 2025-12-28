// src/utils/socialMediaValidator.ts

export type SocialMediaPlatform = 'instagram' | 'youtube' | 'tiktok' | 'twitter' | 'facebook' | 'telegram';

interface ValidationResult {
  isValid: boolean;
  errorMessage?: string;
  username?: string;
}

/**
 * Validates social media URLs and extracts username/handle
 * @param url - The social media account URL to validate
 * @param platform - The platform type (instagram, youtube, tiktok, etc.)
 * @returns ValidationResult with isValid flag, optional errorMessage and username
 */

export const validateSocialMediaURL = (url: string, platform: SocialMediaPlatform): ValidationResult => {
  // Check if URL is empty
  if (!url || url.trim() === '') {
    return { 
      isValid: false, 
      errorMessage: 'URL cannot be empty' 
    };
  }

  try {
    // Parse the URL
    const urlObj = new URL(url);
    
    switch (platform) {
      case 'instagram': {
        // Valid Instagram URL patterns:
        // https://www.instagram.com/username
        // https://instagram.com/username/
        // https://www.instagram.com/username/?hl=en
        
        if (!urlObj.hostname.includes('instagram.com')) {
          return { 
            isValid: false, 
            errorMessage: 'Please enter a valid Instagram URL (e.g., https://instagram.com/username)' 
          };
        }
        
        // Extract username from path
        const pathMatch = urlObj.pathname.match(/^\/([a-zA-Z0-9._]+)\/?$/);
        
        if (!pathMatch) {
          return { 
            isValid: false, 
            errorMessage: 'Invalid Instagram username format. URL should be: instagram.com/username' 
          };
        }
        
        const username = pathMatch[1];
        
        // Validate username format (Instagram rules)
        if (username.length < 1 || username.length > 30) {
          return { 
            isValid: false, 
            errorMessage: 'Instagram username must be between 1-30 characters' 
          };
        }
        
        return { 
          isValid: true, 
          username: username 
        };
      }

      case 'youtube': {
        // Valid YouTube URL patterns:
        // https://www.youtube.com/@username
        // https://www.youtube.com/channel/CHANNEL_ID
        // https://www.youtube.com/c/customname
        // https://youtube.com/@username
        
        if (!urlObj.hostname.includes('youtube.com')) {
          return { 
            isValid: false, 
            errorMessage: 'Please enter a valid YouTube URL (e.g., https://youtube.com/@username)' 
          };
        }
        
        // Try to match different YouTube URL formats
        const handleMatch = urlObj.pathname.match(/^\/@([a-zA-Z0-9_-]+)\/?$/);
        const channelMatch = urlObj.pathname.match(/^\/channel\/([a-zA-Z0-9_-]+)\/?$/);
        const customMatch = urlObj.pathname.match(/^\/c\/([a-zA-Z0-9_-]+)\/?$/);
        const userMatch = urlObj.pathname.match(/^\/user\/([a-zA-Z0-9_-]+)\/?$/);
        
        if (handleMatch) {
          return { 
            isValid: true, 
            username: handleMatch[1] 
          };
        } else if (channelMatch) {
          return { 
            isValid: true, 
            username: channelMatch[1] 
          };
        } else if (customMatch) {
          return { 
            isValid: true, 
            username: customMatch[1] 
          };
        } else if (userMatch) {
          return { 
            isValid: true, 
            username: userMatch[1] 
          };
        }
        
        return { 
          isValid: false, 
          errorMessage: 'Invalid YouTube channel format. Use: youtube.com/@username or youtube.com/channel/ID' 
        };
      }

      case 'tiktok': {
        // Valid TikTok URL patterns:
        // https://www.tiktok.com/@username
        // https://tiktok.com/@username
        // https://www.tiktok.com/@username?lang=en
        
        if (!urlObj.hostname.includes('tiktok.com')) {
          return { 
            isValid: false, 
            errorMessage: 'Please enter a valid TikTok URL (e.g., https://tiktok.com/@username)' 
          };
        }
        
        // Extract username from path
        const pathMatch = urlObj.pathname.match(/^\/@([a-zA-Z0-9._]+)\/?$/);
        
        if (!pathMatch) {
          return { 
            isValid: false, 
            errorMessage: 'Invalid TikTok username format. URL should be: tiktok.com/@username' 
          };
        }
        
        const username = pathMatch[1];
        
        // Validate username format (TikTok rules)
        if (username.length < 2 || username.length > 24) {
          return { 
            isValid: false, 
            errorMessage: 'TikTok username must be between 2-24 characters' 
          };
        }
        
        return { 
          isValid: true, 
          username: username 
        };
      }

      case 'twitter': {
        // Valid Twitter/X URL patterns:
        // https://twitter.com/username
        // https://x.com/username
        // https://www.twitter.com/username
        // https://www.x.com/username
        
        if (!urlObj.hostname.includes('twitter.com') && !urlObj.hostname.includes('x.com')) {
          return { 
            isValid: false, 
            errorMessage: 'Please enter a valid Twitter/X URL (e.g., https://twitter.com/username or https://x.com/username)' 
          };
        }
        
        // Extract username from path
        const pathMatch = urlObj.pathname.match(/^\/([a-zA-Z0-9_]+)\/?$/);
        
        if (!pathMatch) {
          return { 
            isValid: false, 
            errorMessage: 'Invalid Twitter username format. URL should be: twitter.com/username' 
          };
        }
        
        const username = pathMatch[1];
        
        // Validate username format (Twitter rules)
        if (username.length < 1 || username.length > 15) {
          return { 
            isValid: false, 
            errorMessage: 'Twitter username must be between 1-15 characters' 
          };
        }
        
        return { 
          isValid: true, 
          username: username 
        };
      }

      case 'facebook': {
        // Valid Facebook URL patterns:
        // https://www.facebook.com/username
        // https://www.facebook.com/profile.php?id=100012345678
        // https://www.facebook.com/groups/groupname
        // https://facebook.com/username
        
        if (!urlObj.hostname.includes('facebook.com') && !urlObj.hostname.includes('fb.com')) {
          return { 
            isValid: false, 
            errorMessage: 'Please enter a valid Facebook URL (e.g., https://facebook.com/username)' 
          };
        }
        
        // Try different Facebook URL formats
        const profileMatch = urlObj.pathname.match(/^\/([a-zA-Z0-9.]+)\/?$/);
        const groupMatch = urlObj.pathname.match(/^\/groups\/([a-zA-Z0-9.]+)\/?$/);
        const idMatch = urlObj.searchParams.get('id');
        
        if (profileMatch && profileMatch[1] !== 'profile.php') {
          return { 
            isValid: true, 
            username: profileMatch[1] 
          };
        } else if (groupMatch) {
          return { 
            isValid: true, 
            username: groupMatch[1] 
          };
        } else if (idMatch && urlObj.pathname.includes('profile.php')) {
          return { 
            isValid: true, 
            username: idMatch 
          };
        }
        
        return { 
          isValid: false, 
          errorMessage: 'Invalid Facebook page/group format. Use: facebook.com/username or facebook.com/groups/groupname' 
        };
      }

      case 'telegram': {
        // Valid Telegram URL patterns:
        // https://t.me/username
        // https://telegram.me/username
        // https://t.me/username
        
        if (!urlObj.hostname.includes('t.me') && !urlObj.hostname.includes('telegram.me')) {
          return { 
            isValid: false, 
            errorMessage: 'Please enter a valid Telegram URL (e.g., https://t.me/username)' 
          };
        }
        
        // Extract username from path
        const pathMatch = urlObj.pathname.match(/^\/([a-zA-Z0-9_]+)\/?$/);
        
        if (!pathMatch) {
          return { 
            isValid: false, 
            errorMessage: 'Invalid Telegram username format. URL should be: t.me/username' 
          };
        }
        
        const username = pathMatch[1];
        
        // Validate username format (Telegram rules)
        if (username.length < 5 || username.length > 32) {
          return { 
            isValid: false, 
            errorMessage: 'Telegram username must be between 5-32 characters' 
          };
        }
        
        return { 
          isValid: true, 
          username: username 
        };
      }

      default:
        return { 
          isValid: false, 
          errorMessage: 'Unsupported social media platform' 
        };
    }
    
  } catch (error) {
    // If URL parsing fails, it's an invalid URL
    return { 
      isValid: false, 
      errorMessage: 'Invalid URL format. Please enter a complete URL starting with https://' 
    };
  }
};

/**
 * Helper function to check if a platform supports auto-fetch
 * @param platform - The social media platform
 * @returns boolean indicating if auto-fetch is supported
 */
export const supportsAutoFetch = (platform: SocialMediaPlatform): boolean => {
  const supportedPlatforms: SocialMediaPlatform[] = ['instagram', 'youtube', 'tiktok'];
  return supportedPlatforms.includes(platform);
};

/**
 * Get example URL for a platform
 * @param platform - The social media platform
 * @returns Example URL string
 */
export const getExampleURL = (platform: SocialMediaPlatform): string => {
  const examples: Record<SocialMediaPlatform, string> = {
    instagram: 'https://instagram.com/username',
    youtube: 'https://youtube.com/@username',
    tiktok: 'https://tiktok.com/@username',
    twitter: 'https://twitter.com/username',
    facebook: 'https://facebook.com/username',
    telegram: 'https://t.me/username'
  };
  
  return examples[platform] || 'https://...';
};
