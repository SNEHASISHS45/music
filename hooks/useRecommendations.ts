/**
 * React Hook for Recommendation Engine
 * Provides easy integration with React components
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Track } from '../types';
import {
    UserProfile,
    loadUserProfile,
    saveUserProfile,
    recordInteraction,
    getSongStatus,
    getTopInterests,
} from '../services/userProfile';
import {
    getRecommendations,
    getForYouMix,
    getSimilarTracks,
    extractTags,
    getTasteProfileSummary,
} from '../services/recommendationEngine';

interface UseRecommendationsReturn {
    // User profile
    profile: UserProfile | null;
    topInterests: { tag: string; score: number }[];
    tasteSummary: ReturnType<typeof getTasteProfileSummary> | null;

    // Track status
    isLiked: (songId: string) => boolean;
    isDisliked: (songId: string) => boolean;
    isSaved: (songId: string) => boolean;

    // Actions
    like: (track: Track) => void;
    dislike: (track: Track) => void;
    unlike: (track: Track) => void;
    save: (track: Track) => void;
    recordPlay: (track: Track) => void;
    recordSkip: (track: Track) => void;
    recordComplete: (track: Track, completionRate: number) => void;

    // Recommendations
    getPersonalizedTracks: (allTracks: Track[], limit?: number) => Track[];
    getForYou: (allTracks: Track[], limit?: number) => Track[];
    getSimilar: (track: Track, allTracks: Track[], limit?: number) => Track[];
}

export function useRecommendations(): UseRecommendationsReturn {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [topInterests, setTopInterests] = useState<{ tag: string; score: number }[]>([]);
    const [tasteSummary, setTasteSummary] = useState<ReturnType<typeof getTasteProfileSummary> | null>(null);

    // Track playback state for completion tracking
    const playStartTime = useRef<{ [songId: string]: number }>({});

    // Load profile on mount
    useEffect(() => {
        const loaded = loadUserProfile();
        setProfile(loaded);
        setTopInterests(getTopInterests(loaded, 5));
        setTasteSummary(getTasteProfileSummary());
    }, []);

    const refreshProfile = useCallback(() => {
        const loaded = loadUserProfile();
        setProfile(loaded);
        setTopInterests(getTopInterests(loaded, 5));
        setTasteSummary(getTasteProfileSummary());
    }, []);

    const isLiked = useCallback((songId: string) => {
        return profile?.likedSongs.includes(songId) ?? false;
    }, [profile]);

    const isDisliked = useCallback((songId: string) => {
        return profile?.dislikedSongs.includes(songId) ?? false;
    }, [profile]);

    const isSaved = useCallback((songId: string) => {
        return profile?.savedSongs.includes(songId) ?? false;
    }, [profile]);

    const like = useCallback((track: Track) => {
        if (!profile) return;
        const tags = extractTags(track);
        recordInteraction(profile, track.id, 'like', tags);
        refreshProfile();
        console.log(`[RecommendationEngine] Liked: ${track.title}`, tags);
    }, [profile, refreshProfile]);

    const dislike = useCallback((track: Track) => {
        if (!profile) return;
        const tags = extractTags(track);
        recordInteraction(profile, track.id, 'dislike', tags);
        refreshProfile();
        console.log(`[RecommendationEngine] Disliked: ${track.title}`, tags);
    }, [profile, refreshProfile]);

    const unlike = useCallback((track: Track) => {
        if (!profile) return;
        // Remove from liked songs
        profile.likedSongs = profile.likedSongs.filter(id => id !== track.id);
        saveUserProfile(profile);
        refreshProfile();
    }, [profile, refreshProfile]);

    const save = useCallback((track: Track) => {
        if (!profile) return;
        const tags = extractTags(track);
        recordInteraction(profile, track.id, 'save', tags);
        refreshProfile();
        console.log(`[RecommendationEngine] Saved: ${track.title}`, tags);
    }, [profile, refreshProfile]);

    const recordPlay = useCallback((track: Track) => {
        if (!profile) return;
        playStartTime.current[track.id] = Date.now();
        const tags = extractTags(track);
        recordInteraction(profile, track.id, 'play', tags);
        // Don't refresh on every play start to avoid re-renders
    }, [profile]);

    const recordSkip = useCallback((track: Track) => {
        if (!profile) return;
        const startTime = playStartTime.current[track.id];

        // Only count as skip if played less than 10 seconds
        if (startTime && (Date.now() - startTime) < 10000) {
            const tags = extractTags(track);
            recordInteraction(profile, track.id, 'skip', tags);
            console.log(`[RecommendationEngine] Early skip: ${track.title}`);
        }

        delete playStartTime.current[track.id];
    }, [profile]);

    const recordComplete = useCallback((track: Track, completionRate: number) => {
        if (!profile) return;
        const tags = extractTags(track);
        recordInteraction(profile, track.id, 'complete', tags, completionRate);
        delete playStartTime.current[track.id];

        if (completionRate > 0.8) {
            console.log(`[RecommendationEngine] High completion (${(completionRate * 100).toFixed(0)}%): ${track.title}`);
        }
    }, [profile]);

    const getPersonalizedTracks = useCallback((allTracks: Track[], limit: number = 20) => {
        if (!profile) return allTracks.slice(0, limit);
        return getRecommendations(allTracks, profile, limit).map(r => r.track);
    }, [profile]);

    const getForYou = useCallback((allTracks: Track[], limit: number = 10) => {
        return getForYouMix(allTracks, limit);
    }, []);

    const getSimilar = useCallback((track: Track, allTracks: Track[], limit: number = 5) => {
        return getSimilarTracks(track, allTracks, limit);
    }, []);

    return {
        profile,
        topInterests,
        tasteSummary,
        isLiked,
        isDisliked,
        isSaved,
        like,
        dislike,
        unlike,
        save,
        recordPlay,
        recordSkip,
        recordComplete,
        getPersonalizedTracks,
        getForYou,
        getSimilar,
    };
}
