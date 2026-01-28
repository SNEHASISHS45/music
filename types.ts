
export type Screen = 'home' | 'discover' | 'library' | 'player' | 'profile';

export interface Track {
  id: string;
  title: string;
  artist: string;
  albumArt: string;
  genre: string;
  duration: string;
  audioUrl: string;
  videoId?: string;
  isPlaying?: boolean;
  lyrics?: string[];
}

export interface Story {
  id: string;
  title: string;
  image: string;
  isLive?: boolean;
  isHot?: boolean;
}

export interface Node {
  id: string;
  label: string;
  type: 'core' | 'sub' | 'minor';
  color: string;
}
