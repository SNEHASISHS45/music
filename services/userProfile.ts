/**
 * User Profile & Behavioral Tracking System
 * Stores implicit and explicit user signals for recommendation engine
 */

// Points configuration
const POINTS = {
    LIKE: 5,
    DISLIKE: -10,
    SAVE: 3,
    COMPLETION_HIGH: 2,    // >80% played
    SKIP_EARLY: -3,        // skipped within 10 seconds
    RELISTEN: 4,
};

// Time decay configuration (scores decay by 10% per week)
const DECAY_RATE = 0.9;
const DECAY_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000; // 1 week

// Available genres/moods for the interest map
export const AVAILABLE_TAGS = [
    'Lofi', 'Cinematic', 'Electronic', 'Hip-Hop', 'Rock', 'Pop',
    'Jazz', 'Classical', 'R&B', 'Indie', 'Metal', 'Country',
    'Synthwave', 'Phonk', 'Techno', 'Ambient', 'Focus', 'Workout',
    'Relax', 'Party', 'Sad', 'Happy', 'Energetic', 'Chill'
];

export interface SongInteraction {
    songId: string;
    timestamp: number;
    action: 'like' | 'dislike' | 'save' | 'play' | 'skip' | 'complete';
    completionRate?: number; // 0-1
    tags: string[];
}

export interface InterestMap {
    [tag: string]: {
        score: number;
        lastUpdated: number;
    };
}

export interface ListenHistory {
    songId: string;
    playCount: number;
    lastPlayed: number;
    totalTimeListened: number;
}

export interface UserProfile {
    id: string;
    interestMap: InterestMap;
    listenHistory: { [songId: string]: ListenHistory };
    interactions: SongInteraction[];
    likedSongs: string[];
    dislikedSongs: string[];
    savedSongs: string[];
    createdAt: number;
    lastActive: number;
}

const PROFILE_STORAGE_KEY = 'NOVE_USER_PROFILE_V1';

// Initialize or load user profile
export function loadUserProfile(): UserProfile {
    try {
        const stored = localStorage.getItem(PROFILE_STORAGE_KEY);
        if (stored) {
            const profile = JSON.parse(stored) as UserProfile;
            // Apply time decay on load
            applyTimeDecay(profile);
            return profile;
        }
    } catch (e) {
        console.warn('[RecommendationEngine] Failed to load profile:', e);
    }

    // Create new profile
    const newProfile: UserProfile = {
        id: `user_${Date.now()}`,
        interestMap: {},
        listenHistory: {},
        interactions: [],
        likedSongs: [],
        dislikedSongs: [],
        savedSongs: [],
        createdAt: Date.now(),
        lastActive: Date.now(),
    };

    // Initialize interest map with neutral scores
    AVAILABLE_TAGS.forEach(tag => {
        newProfile.interestMap[tag] = { score: 0, lastUpdated: Date.now() };
    });

    saveUserProfile(newProfile);
    return newProfile;
}

export function saveUserProfile(profile: UserProfile): void {
    profile.lastActive = Date.now();
    try {
        localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
    } catch (e) {
        console.warn('[RecommendationEngine] Failed to save profile:', e);
    }
}

// Apply time decay to all interest scores
function applyTimeDecay(profile: UserProfile): void {
    const now = Date.now();

    Object.keys(profile.interestMap).forEach(tag => {
        const interest = profile.interestMap[tag];
        const timeSinceUpdate = now - interest.lastUpdated;
        const decayPeriods = Math.floor(timeSinceUpdate / DECAY_INTERVAL_MS);

        if (decayPeriods > 0) {
            interest.score = interest.score * Math.pow(DECAY_RATE, decayPeriods);
            interest.lastUpdated = now;
        }
    });
}

/**
 * Update interest scores based on song tags and interaction type
 */
export function updateInterestScore(
    profile: UserProfile,
    songTags: string[],
    action: 'like' | 'dislike' | 'save' | 'complete_high' | 'skip_early' | 'relisten'
): void {
    let points = 0;

    switch (action) {
        case 'like': points = POINTS.LIKE; break;
        case 'dislike': points = POINTS.DISLIKE; break;
        case 'save': points = POINTS.SAVE; break;
        case 'complete_high': points = POINTS.COMPLETION_HIGH; break;
        case 'skip_early': points = POINTS.SKIP_EARLY; break;
        case 'relisten': points = POINTS.RELISTEN; break;
    }

    const now = Date.now();

    songTags.forEach(tag => {
        const normalizedTag = tag.trim();
        if (!profile.interestMap[normalizedTag]) {
            profile.interestMap[normalizedTag] = { score: 0, lastUpdated: now };
        }

        profile.interestMap[normalizedTag].score += points;
        profile.interestMap[normalizedTag].lastUpdated = now;
    });

    saveUserProfile(profile);
}

/**
 * Record a song interaction
 */
export function recordInteraction(
    profile: UserProfile,
    songId: string,
    action: SongInteraction['action'],
    tags: string[],
    completionRate?: number
): void {
    const interaction: SongInteraction = {
        songId,
        timestamp: Date.now(),
        action,
        completionRate,
        tags,
    };

    profile.interactions.push(interaction);

    // Keep only last 500 interactions
    if (profile.interactions.length > 500) {
        profile.interactions = profile.interactions.slice(-500);
    }

    // Update lists based on action
    switch (action) {
        case 'like':
            if (!profile.likedSongs.includes(songId)) {
                profile.likedSongs.push(songId);
                profile.dislikedSongs = profile.dislikedSongs.filter(id => id !== songId);
            }
            updateInterestScore(profile, tags, 'like');
            break;
        case 'dislike':
            if (!profile.dislikedSongs.includes(songId)) {
                profile.dislikedSongs.push(songId);
                profile.likedSongs = profile.likedSongs.filter(id => id !== songId);
            }
            updateInterestScore(profile, tags, 'dislike');
            break;
        case 'save':
            if (!profile.savedSongs.includes(songId)) {
                profile.savedSongs.push(songId);
            }
            updateInterestScore(profile, tags, 'save');
            break;
        case 'complete':
            if (completionRate && completionRate > 0.8) {
                updateInterestScore(profile, tags, 'complete_high');
            }
            break;
        case 'skip':
            // Assuming skip within 10 seconds
            updateInterestScore(profile, tags, 'skip_early');
            break;
    }

    // Update listen history
    if (!profile.listenHistory[songId]) {
        profile.listenHistory[songId] = {
            songId,
            playCount: 0,
            lastPlayed: Date.now(),
            totalTimeListened: 0,
        };
    }

    if (action === 'play' || action === 'complete') {
        const history = profile.listenHistory[songId];
        const isRelisten = Date.now() - history.lastPlayed < 24 * 60 * 60 * 1000; // Within 24 hours

        if (isRelisten && history.playCount > 1) {
            updateInterestScore(profile, tags, 'relisten');
        }

        history.playCount++;
        history.lastPlayed = Date.now();
    }

    saveUserProfile(profile);
}

/**
 * Get the user's top interests sorted by score
 */
export function getTopInterests(profile: UserProfile, limit: number = 5): { tag: string; score: number }[] {
    return Object.entries(profile.interestMap)
        .map(([tag, data]) => ({ tag, score: data.score }))
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
}

/**
 * Check if a song was liked/disliked/saved
 */
export function getSongStatus(profile: UserProfile, songId: string): {
    liked: boolean;
    disliked: boolean;
    saved: boolean;
} {
    return {
        liked: profile.likedSongs.includes(songId),
        disliked: profile.dislikedSongs.includes(songId),
        saved: profile.savedSongs.includes(songId),
    };
}
