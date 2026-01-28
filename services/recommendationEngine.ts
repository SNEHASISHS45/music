/**
 * Recommendation Engine
 * Content-based filtering with serendipity factor
 */

import { Track } from '../types';
import {
    UserProfile,
    loadUserProfile,
    getTopInterests,
    AVAILABLE_TAGS
} from './userProfile';

interface ScoredTrack {
    track: Track;
    score: number;
    matchedTags: string[];
    isDiscovery: boolean;
}

// Serendipity factor: 10% of recommendations should be discovery content
const SERENDIPITY_RATIO = 0.1;

/**
 * Extract tags from a track (genre + inferred mood)
 */
export function extractTags(track: Track): string[] {
    const tags: string[] = [];

    // Add genre if it matches known tags
    if (track.genre) {
        const normalizedGenre = track.genre.trim();
        tags.push(normalizedGenre);

        // Infer related tags based on genre
        const genreToMoods: Record<string, string[]> = {
            'Synthwave': ['Electronic', 'Energetic', 'Cinematic'],
            'Phonk': ['Hip-Hop', 'Energetic', 'Party'],
            'Lo-fi': ['Lofi', 'Chill', 'Relax', 'Focus'],
            'Jazz': ['Chill', 'Relax', 'Classical'],
            'Techno': ['Electronic', 'Energetic', 'Party', 'Workout'],
            'Deep Tech': ['Electronic', 'Focus', 'Chill'],
            'Hyperpop': ['Pop', 'Energetic', 'Electronic'],
        };

        if (genreToMoods[normalizedGenre]) {
            tags.push(...genreToMoods[normalizedGenre]);
        }
    }

    // Infer mood from title keywords
    const title = track.title.toLowerCase();
    const moodKeywords: Record<string, string[]> = {
        'chill': ['Chill', 'Relax'],
        'relax': ['Relax', 'Chill', 'Ambient'],
        'energy': ['Energetic', 'Workout'],
        'focus': ['Focus', 'Ambient'],
        'sad': ['Sad', 'Chill'],
        'happy': ['Happy', 'Energetic'],
        'night': ['Chill', 'Ambient'],
        'dream': ['Ambient', 'Chill', 'Cinematic'],
        'dark': ['Cinematic', 'Ambient'],
        'cyber': ['Electronic', 'Synthwave'],
        'neon': ['Synthwave', 'Electronic'],
    };

    Object.entries(moodKeywords).forEach(([keyword, moods]) => {
        if (title.includes(keyword)) {
            tags.push(...moods);
        }
    });

    // Remove duplicates
    return [...new Set(tags)];
}

/**
 * Calculate match score between a track and user interests
 */
function calculateTrackScore(track: Track, profile: UserProfile): { score: number; matchedTags: string[] } {
    const trackTags = extractTags(track);
    let score = 0;
    const matchedTags: string[] = [];

    trackTags.forEach(tag => {
        if (profile.interestMap[tag]) {
            const tagScore = profile.interestMap[tag].score;
            score += tagScore;
            if (tagScore > 0) {
                matchedTags.push(tag);
            }
        }
    });

    // Boost for songs not yet played (novelty bonus)
    if (!profile.listenHistory[track.id]) {
        score += 1;
    }

    // Penalty for disliked songs
    if (profile.dislikedSongs.includes(track.id)) {
        score -= 100;
    }

    // Boost for liked songs (but not too much to encourage variety)
    if (profile.likedSongs.includes(track.id)) {
        score += 2;
    }

    return { score, matchedTags };
}

/**
 * Main recommendation function
 * Returns tracks sorted by relevance to user interests
 */
export function getRecommendations(
    allTracks: Track[],
    profile?: UserProfile,
    limit: number = 20
): ScoredTrack[] {
    const userProfile = profile || loadUserProfile();

    // Score all tracks
    const scoredTracks: ScoredTrack[] = allTracks.map(track => {
        const { score, matchedTags } = calculateTrackScore(track, userProfile);
        return {
            track,
            score,
            matchedTags,
            isDiscovery: false,
        };
    });

    // Sort by score (highest first)
    scoredTracks.sort((a, b) => b.score - a.score);

    // Calculate discovery slots
    const discoveryCount = Math.max(1, Math.floor(limit * SERENDIPITY_RATIO));
    const contentCount = limit - discoveryCount;

    // Get top content-based recommendations
    const contentRecommendations = scoredTracks
        .filter(st => st.score > -50) // Exclude heavily disliked
        .slice(0, contentCount);

    // Get discovery tracks (random from lower-scored or unheard tracks)
    const discoveryPool = scoredTracks
        .filter(st => !profile?.dislikedSongs.includes(st.track.id))
        .filter(st => !contentRecommendations.some(cr => cr.track.id === st.track.id));

    const discoveryRecommendations: ScoredTrack[] = [];
    for (let i = 0; i < discoveryCount && discoveryPool.length > 0; i++) {
        const randomIndex = Math.floor(Math.random() * discoveryPool.length);
        const discovery = discoveryPool.splice(randomIndex, 1)[0];
        discovery.isDiscovery = true;
        discoveryRecommendations.push(discovery);
    }

    // Interleave discovery tracks into results
    const finalRecommendations: ScoredTrack[] = [...contentRecommendations];
    discoveryRecommendations.forEach((discovery, i) => {
        // Insert discovery tracks at varied positions
        const insertPosition = Math.min(
            3 + i * Math.floor(contentCount / discoveryCount),
            finalRecommendations.length
        );
        finalRecommendations.splice(insertPosition, 0, discovery);
    });

    return finalRecommendations.slice(0, limit);
}

/**
 * Get personalized "For You" mix based on top interests
 */
export function getForYouMix(allTracks: Track[], limit: number = 10): Track[] {
    const profile = loadUserProfile();
    const topInterests = getTopInterests(profile, 3);

    if (topInterests.length === 0 || topInterests[0].score <= 0) {
        // New user or no clear preferences - return diverse mix
        return shuffleArray(allTracks).slice(0, limit);
    }

    const recommendations = getRecommendations(allTracks, profile, limit);
    return recommendations.map(r => r.track);
}

/**
 * Get tracks similar to a specific track
 */
export function getSimilarTracks(targetTrack: Track, allTracks: Track[], limit: number = 5): Track[] {
    const targetTags = extractTags(targetTrack);

    const scoredTracks = allTracks
        .filter(t => t.id !== targetTrack.id)
        .map(track => {
            const trackTags = extractTags(track);
            const commonTags = trackTags.filter(tag => targetTags.includes(tag));
            return {
                track,
                similarity: commonTags.length / Math.max(targetTags.length, 1),
            };
        })
        .sort((a, b) => b.similarity - a.similarity);

    return scoredTracks.slice(0, limit).map(st => st.track);
}

/**
 * Get tracks for a specific mood/genre
 */
export function getTracksByMood(allTracks: Track[], mood: string, limit: number = 10): Track[] {
    const profile = loadUserProfile();

    const matchingTracks = allTracks.filter(track => {
        const tags = extractTags(track);
        return tags.some(tag => tag.toLowerCase() === mood.toLowerCase());
    });

    // Sort by user preference within the mood
    const scored = matchingTracks.map(track => ({
        track,
        score: calculateTrackScore(track, profile).score,
    }));

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map(s => s.track);
}

/**
 * Utility: Shuffle array
 */
function shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

/**
 * Debug: Get user's taste profile summary
 */
export function getTasteProfileSummary(): {
    topGenres: string[];
    recentActivity: number;
    totalLikes: number;
    totalDislikes: number;
} {
    const profile = loadUserProfile();
    const topInterests = getTopInterests(profile, 5);

    return {
        topGenres: topInterests.filter(i => i.score > 0).map(i => i.tag),
        recentActivity: profile.interactions.filter(
            i => Date.now() - i.timestamp < 7 * 24 * 60 * 60 * 1000
        ).length,
        totalLikes: profile.likedSongs.length,
        totalDislikes: profile.dislikedSongs.length,
    };
}
