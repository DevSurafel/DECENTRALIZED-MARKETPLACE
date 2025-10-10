// supabase/functions/fetch-social-media-data/index.ts
// FREE VERSION - No API keys required (uses web scraping)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.43/deno-dom-wasm.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FetchRequest {
  url: string;
  platform: string;
}

// Extract username from URL
function extractUsername(url: string, platform: string): string | null {
  try {
    const urlObj = new URL(url);
    
    switch (platform) {
      case 'instagram':
        return urlObj.pathname.match(/^\/([a-zA-Z0-9._]+)\/?$/)?.[1] || null;
      
      case 'youtube':
        return urlObj.pathname.match(/^\/@([a-zA-Z0-9_-]+)\/?$/)?.[1] || 
               urlObj.pathname.match(/^\/channel\/([a-zA-Z0-9_-]+)\/?$/)?.[1] || 
               urlObj.pathname.match(/^\/c\/([a-zA-Z0-9_-]+)\/?$/)?.[1] || null;
      
      case 'tiktok':
        return urlObj.pathname.match(/^\/@([a-zA-Z0-9._]+)\/?$/)?.[1] || null;
      
      case 'twitter':
        return urlObj.pathname.match(/^\/([a-zA-Z0-9_]+)\/?$/)?.[1] || null;
      
      case 'facebook':
        return urlObj.pathname.match(/^\/([a-zA-Z0-9.]+)\/?$/)?.[1] || 
               urlObj.pathname.match(/^\/groups\/([a-zA-Z0-9.]+)\/?$/)?.[1] || 
               urlObj.searchParams.get('id') || null;
      
      case 'telegram':
        return urlObj.pathname.match(/^\/([a-zA-Z0-9_]+)\/?$/)?.[1] || null;
      
      default:
        return null;
    }
  } catch {
    return null;
  }
}

// Helper to parse numbers with K, M, B suffixes
function parseCount(text: string): number {
  if (!text) return 0;
  
  // Remove common words that might interfere
  const cleaned = text
    .replace(/subscribers?|followers?|videos?|members?/gi, '')
    .replace(/[,\s]/g, '')
    .toUpperCase()
    .trim();
  
  const match = cleaned.match(/([\d.]+)([KMB]?)/);
  
  if (!match) return 0;
  
  const num = parseFloat(match[1]);
  const suffix = match[2];
  
  switch (suffix) {
    case 'K': return Math.floor(num * 1000);
    case 'M': return Math.floor(num * 1000000);
    case 'B': return Math.floor(num * 1000000000);
    default: return Math.floor(num);
  }
}

// Scrape Instagram (public data) - Enhanced parsing with multiple patterns
async function scrapeInstagram(username: string) {
  try {
    const url = `https://www.instagram.com/${username}/`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      }
    });

    if (!response.ok) {
      return { success: false, error: 'Account not found or private' };
    }

    const html = await response.text();
    console.log('Instagram HTML length:', html.length);
    
    let followers = 0;
    let accountName = username;
    let isVerified = false;

    // Pattern 1: Look for edge_followed_by in any JSON structure
    const edgeFollowMatch = html.match(/"edge_followed_by":\{"count":(\d+)\}/);
    if (edgeFollowMatch) {
      followers = parseInt(edgeFollowMatch[1]);
      console.log('Found followers via edge_followed_by:', followers);
    }

    // Pattern 2: Look for follower_count
    if (followers === 0) {
      const followerCountMatch = html.match(/"follower_count":(\d+)/);
      if (followerCountMatch) {
        followers = parseInt(followerCountMatch[1]);
        console.log('Found followers via follower_count:', followers);
      }
    }

    // Pattern 3: Meta description pattern
    if (followers === 0) {
      const metaDescription = html.match(/<meta property="og:description" content="(.*?)"/);
      if (metaDescription) {
        const followersMatch = metaDescription[1].match(/([\d,KMB.]+)\s*Followers/i);
        if (followersMatch) {
          followers = parseCount(followersMatch[1]);
          console.log('Found followers via meta description:', followers);
        }
      }
    }

    // Pattern 4: JSON-LD structured data
    if (followers === 0) {
      const jsonLdMatches = html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs);
      for (const match of jsonLdMatches) {
        try {
          const data = JSON.parse(match[1]);
          if (data.interactionStatistic) {
            const followerStat = Array.isArray(data.interactionStatistic) 
              ? data.interactionStatistic.find((s: any) => s.name === 'Follows')
              : data.interactionStatistic;
            
            if (followerStat?.userInteractionCount) {
              followers = parseCount(followerStat.userInteractionCount.toString());
              console.log('Found followers via JSON-LD:', followers);
            }
          }
          if (data.name) {
            accountName = data.name;
          }
        } catch (e) {
          console.error('Instagram JSON-LD parse error:', e);
        }
      }
    }

    // Pattern 5: window._sharedData
    if (followers === 0) {
      const sharedDataMatch = html.match(/window\._sharedData\s*=\s*({.*?});<\/script>/s);
      if (sharedDataMatch) {
        try {
          const sharedData = JSON.parse(sharedDataMatch[1]);
          const userData = sharedData?.entry_data?.ProfilePage?.[0]?.graphql?.user;
          if (userData) {
            followers = userData.edge_followed_by?.count || 0;
            accountName = userData.full_name || userData.username || username;
            isVerified = userData.is_verified || false;
            console.log('Found followers via sharedData:', followers);
          }
        } catch (e) {
          console.error('Instagram shared data parse error:', e);
        }
      }
    }

    // Get account name from title tag if not found
    if (accountName === username) {
      const titleMatch = html.match(/<title>([^(]+)\s*\(/);
      if (titleMatch) {
        accountName = titleMatch[1].trim();
      }
    }

    // Check verification status
    isVerified = isVerified || html.includes('"is_verified":true') || html.includes('verified');

    console.log('Instagram final parsed data:', { accountName, followers, isVerified });
    
    return {
      success: followers > 0,
      data: {
        accountName: accountName,
        followers: followers,
        isVerified: isVerified,
        accountExists: true
      }
    };

  } catch (error) {
    console.error('Instagram scrape error:', error);
    return { success: false, error: String(error instanceof Error ? error.message : error) };
  }
}

// Scrape YouTube (public data) - Enhanced with improved pattern matching
async function scrapeYouTube(handle: string) {
  try {
    const url = `https://www.youtube.com/@${handle}`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    });

    if (!response.ok) {
      return { success: false, error: 'Channel not found' };
    }

    const html = await response.text();
    console.log('YouTube HTML length:', html.length);
    
    let subscriberCount = 0;
    let videoCount = 0;
    let channelName = handle;
    let isVerified = false;

    // Enhanced Pattern 1: Search for subscriber count with multiple formats
    const subscriberPatterns = [
      /"subscriberCountText":\{"simpleText":"([\d.KMB]+)\s+subscribers?"\}/i,
      /"subscriberCountText":\{"accessibility":\{"accessibilityData":\{"label":"([\d.KMB]+)\s+subscribers?"\}\}/i,
      /"subscriberCountText":\{"runs":\[\{"text":"([\d.KMB]+)"\}/i,
      /"subscribers?":\s*"([\d.KMB]+)"/i,
      /"subscriberCount":\s*"?(\d+)"?/i,
      /"text":"([\d.KMB]+)\s+subscribers?"/i,
      /subscriberCountText[^}]*simpleText[^"]*"([^"]*\d+[^"]*)"/i,
      // NEW: Direct text search
      /([\d.]+[KMB]?)\s+subscriber/i,
    ];

    for (const pattern of subscriberPatterns) {
      const match = html.match(pattern);
      if (match) {
        const count = parseCount(match[1]);
        if (count > 0) {
          subscriberCount = count;
          console.log('Found subscribers via pattern:', subscriberCount);
          break;
        }
      }
    }

    // Enhanced Pattern 2: Search for video count with multiple formats
    const videoPatterns = [
      /"videosCountText":\{"runs":\[\{"text":"([\d,KMB]+)"\}/i,
      /"videoCount":\s*"?(\d+)"?/i,
      /"videoCount":"([\d,KMB]+)"/i,
      /videosCountText[^}]*text[^"]*"([^"]*\d+[^"]*)"/i,
      /"videosCount":"([\d,KMB]+)"/i,
      // Look for videos in stats
      /"videosCountText":\{"simpleText":"([\d,KMB]+)\s+videos?"\}/i,
      // Direct text patterns
      /([\d,KMB]+)\s+videos?/i,
    ];

    for (const pattern of videoPatterns) {
      const match = html.match(pattern);
      if (match) {
        const count = parseCount(match[1]);
        if (count > 0) {
          videoCount = count;
          console.log('Found video count via pattern:', videoCount);
          break;
        }
      }
    }

    // Pattern 3: Parse ytInitialData JSON structure
    const ytInitialDataMatch = html.match(/var ytInitialData\s*=\s*({.*?});<\/script>/s) ||
                               html.match(/ytInitialData\s*=\s*({.*?});<\/script>/s);
    if (ytInitialDataMatch) {
      try {
        const data = JSON.parse(ytInitialDataMatch[1]);
        
        const header = data.header?.c4TabbedHeaderRenderer || 
                      data.header?.pageHeaderRenderer ||
                      data.header?.carouselHeaderRenderer;
        
        if (header) {
          channelName = header.title || header.channelTitle?.simpleText || handle;
          
          if (subscriberCount === 0) {
            const subText = header.subscriberCountText?.simpleText || 
                           header.subscriberCountText?.runs?.[0]?.text ||
                           header.subscriberCountText?.accessibility?.accessibilityData?.label ||
                           header.subtitle?.simpleText;
            
            if (subText) {
              const count = parseCount(subText);
              if (count > 0) {
                subscriberCount = count;
                console.log('Found subscribers via ytInitialData:', subscriberCount);
              }
            }
          }
          
          if (videoCount === 0) {
            const vidText = header.videosCountText?.runs?.[0]?.text ||
                           header.videosCountText?.simpleText ||
                           header.videosCountText?.accessibility?.accessibilityData?.label;
            if (vidText) {
              const count = parseCount(vidText);
              if (count > 0) {
                videoCount = count;
                console.log('Found video count via ytInitialData:', videoCount);
              }
            }
          }
          
          // Also check in tabs for video count
          if (videoCount === 0 && data.contents?.twoColumnBrowseResultsRenderer?.tabs) {
            const tabs = data.contents.twoColumnBrowseResultsRenderer.tabs;
            for (const tab of tabs) {
              const tabRenderer = tab.tabRenderer;
              if (tabRenderer?.content?.richGridRenderer?.header) {
                const tabHeader = tabRenderer.content.richGridRenderer.header;
                const feedFilterChipBarRenderer = tabHeader.feedFilterChipBarRenderer;
                if (feedFilterChipBarRenderer) {
                  const videoTab = feedFilterChipBarRenderer.contents?.find((c: any) => 
                    c.chipCloudChipRenderer?.text?.simpleText?.toLowerCase().includes('video')
                  );
                  if (videoTab) {
                    const tabCount = videoTab.chipCloudChipRenderer?.navigationEndpoint?.browseEndpoint?.params;
                    // Extract count if available
                    console.log('Found video tab, checking for count');
                  }
                }
              }
            }
          }
          
          isVerified = !!header.badges?.find((b: any) => 
            b.metadataBadgeRenderer?.style === 'BADGE_STYLE_TYPE_VERIFIED' ||
            b.metadataBadgeRenderer?.tooltip?.toLowerCase().includes('verified')
          );
        }
      } catch (e) {
        console.error('YouTube ytInitialData parse error:', e);
      }
    }

    // Pattern 4: Get channel name from meta tags
    if (channelName === handle) {
      const channelNameMatch = html.match(/<meta property="og:title" content="(.*?)"/);
      if (channelNameMatch) {
        channelName = channelNameMatch[1];
      }
    }

    // Pattern 5: Try JSON-LD structured data
    if (subscriberCount === 0) {
      const jsonLdMatch = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s);
      if (jsonLdMatch) {
        try {
          const jsonLd = JSON.parse(jsonLdMatch[1]);
          if (jsonLd.interactionStatistic) {
            const subStat = Array.isArray(jsonLd.interactionStatistic)
              ? jsonLd.interactionStatistic.find((s: any) => 
                  s['@type'] === 'InteractionCounter' && 
                  (s.interactionType === 'http://schema.org/SubscribeAction' || 
                   s.interactionType?.includes('Subscribe'))
                )
              : jsonLd.interactionStatistic;
            
            if (subStat?.userInteractionCount) {
              subscriberCount = parseInt(subStat.userInteractionCount);
              console.log('Found subscribers via JSON-LD:', subscriberCount);
            }
          }
        } catch (e) {
          console.error('YouTube JSON-LD parse error:', e);
        }
      }
    }

    console.log('YouTube final parsed data:', { channelName, subscriberCount, videoCount, isVerified });
    
    return {
      success: subscriberCount > 0 || videoCount > 0,
      data: {
        accountName: channelName,
        followers: subscriberCount,
        isVerified: isVerified,
        videoCount: videoCount,
        accountExists: true
      },
      message: subscriberCount === 0 || videoCount === 0 ? 'Some data could not be auto-filled. Please enter manually.' : undefined
    };

  } catch (error) {
    console.error('YouTube scrape error:', error);
    return { success: false, error: String(error instanceof Error ? error.message : error) };
  }
}

// Scrape TikTok (public data)
async function scrapeTikTok(username: string) {
  try {
    const url = `https://www.tiktok.com/@${username}`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      }
    });

    if (!response.ok) {
      return { success: false, error: 'Account not found' };
    }

    const html = await response.text();
    
    // TikTok embeds data in JSON
    const jsonMatch = html.match(/<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application\/json">(.*?)<\/script>/);
    
    if (jsonMatch) {
      try {
        const data = JSON.parse(jsonMatch[1]);
        const userDetail = data.__DEFAULT_SCOPE__?.['webapp.user-detail']?.userInfo?.user;
        const stats = data.__DEFAULT_SCOPE__?.['webapp.user-detail']?.userInfo?.stats;
        
        if (userDetail) {
          return {
            success: true,
            data: {
              accountName: userDetail.nickname || username,
              followers: stats?.followerCount || 0,
              isVerified: userDetail.verified || false,
              accountExists: true
            }
          };
        }
      } catch (e) {
        console.error('TikTok JSON parse error:', e);
      }
    }

    return { success: false, error: 'Could not extract data' };

  } catch (error) {
    console.error('TikTok scrape error:', error);
    return { success: false, error: String(error instanceof Error ? error.message : error) };
  }
}

// Scrape Twitter/X (public data) - Note: X requires login now for most data
async function scrapeTwitter(username: string) {
  try {
    const url = `https://twitter.com/${username}`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      }
    });

    if (!response.ok) {
      return { success: false, error: 'Account not found or requires login' };
    }

    const html = await response.text();
    
    // Twitter blocks scraping heavily, return limited info
    return {
      success: true,
      data: {
        accountName: username,
        followers: 0, // Requires API or login
        isVerified: false,
        accountExists: true,
        message: 'Twitter requires manual entry due to anti-scraping measures'
      }
    };

  } catch (error) {
    return { success: false, error: 'Twitter scraping blocked' };
  }
}

// Main handler
serve(async (req) => {
  console.log('Fetch social media data function called');
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log('Request body:', body);
    const { url, platform }: FetchRequest = body;

    if (!url || !platform) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing url or platform' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const username = extractUsername(url, platform);
    console.log('Extracted username:', username, 'for platform:', platform);
    
    if (!username) {
      console.log('Failed to extract username from URL');
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid URL format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let result;
    console.log('Starting data fetch for platform:', platform);

    switch (platform) {
      case 'instagram':
        console.log('Calling scrapeInstagram');
        result = await scrapeInstagram(username);
        break;
      
      case 'youtube':
        console.log('Calling scrapeYouTube');
        result = await scrapeYouTube(username);
        break;
      
      case 'tiktok':
        console.log('Calling scrapeTikTok');
        result = await scrapeTikTok(username);
        break;
      
      case 'twitter':
        console.log('Calling scrapeTwitter');
        result = await scrapeTwitter(username);
        break;
      
      case 'facebook':
      case 'telegram':
        console.log('Platform requires manual entry:', platform);
        result = { 
          success: false, 
          error: `${platform} requires manual entry. Scraping not reliable.` 
        };
        break;
      
      default:
        console.log('Unsupported platform:', platform);
        result = { success: false, error: 'Unsupported platform' };
    }

    console.log('Scraping result:', result);

    return new Response(
      JSON.stringify(result),
      { 
        status: result.success ? 200 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: String(error instanceof Error ? error.message : error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
