
import { Track, Story, Node } from './types';

// Using high-quality royalty free loops and creative placeholders for demonstration
export const TRACKS: Track[] = [
  {
    id: 't1',
    title: 'Etheric Dreams',
    artist: 'NIGHTCALL',
    albumArt: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=400&h=400&auto=format&fit=crop',
    genre: 'Synthwave',
    duration: '04:18',
    audioUrl: 'https://www.youtube.com/watch?v=MV_3Dpw-BRY',
    videoId: 'MV_3Dpw-BRY',
    lyrics: [
      "[Instrumental Intro]",
      "In the neon glow of the midnight sun",
      "We're chasing dreams that have just begun",
      "The static hum of the city streets",
      "Echoes the rhythm of our own heartbeats",
      "Floating away into the etheric blue",
      "Finding a path that leads back to you",
      "[Synth Solo]",
      "Digital whispers in the silicon wind",
      "A story told where the stars begin",
      "Lost in the waves of a synthwave sea",
      "Setting the spirit of the night-time free"
    ]
  },
  {
    id: 't2',
    title: 'Midnight Pulse',
    artist: 'DEEP TECH',
    albumArt: 'https://images.unsplash.com/photo-1557672172-298e090bd0f1?q=80&w=400&h=400&auto=format&fit=crop',
    genre: 'Deep Tech',
    duration: '05:42',
    audioUrl: 'https://www.youtube.com/watch?v=79N_w2S-2Uo',
    videoId: '79N_w2S-2Uo',
    lyrics: [
      "Through the static and the haze",
      "Lost within this neon maze",
      "Electric pulse beneath the skin",
      "Where the city light begins",
      "Midnight driving, nowhere bound",
      "Silence is the only sound",
      "Shadows dance upon the glass",
      "Watching all the ghosts we pass",
      "Pulse... Pulse...",
      "Can you feel the rhythm now?",
      "Deep within the tech somehow"
    ]
  },
  {
    id: 't3',
    title: 'Organic Flow',
    artist: 'NEO SOUL',
    albumArt: 'https://images.unsplash.com/photo-1526218626217-dc65a29bb444?q=80&w=400&h=400&auto=format&fit=crop',
    genre: 'Jazz',
    duration: '03:15',
    audioUrl: 'https://www.youtube.com/watch?v=5W_Y7tNoq8U',
    videoId: '5W_Y7tNoq8U'
  },
  {
    id: 't4',
    title: 'Cyber City',
    artist: 'PHONK DRIVE',
    albumArt: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=400&h=400&auto=format&fit=crop',
    genre: 'Phonk',
    duration: '02:45',
    audioUrl: 'https://www.youtube.com/watch?v=Xw6k6_YFv6M',
    videoId: 'Xw6k6_YFv6M'
  },
  {
    id: 't5',
    title: 'Neon Nights',
    artist: 'RETRO FUTURE',
    albumArt: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=400&h=400&auto=format&fit=crop',
    genre: 'Synthwave',
    duration: '03:50',
    audioUrl: 'https://www.youtube.com/watch?v=fS5vL6f933k',
    videoId: 'fS5vL6f933k'
  },
  {
    id: 't6',
    title: 'Deep State',
    artist: 'TECHNO ARCHIVE',
    albumArt: 'https://images.unsplash.com/photo-1493225255756-d9584f8606e9?q=80&w=400&h=400&auto=format&fit=crop',
    genre: 'Techno',
    duration: '06:12',
    audioUrl: 'https://www.youtube.com/watch?v=W_2865pQitQ',
    videoId: 'W_2865pQitQ'
  },
  {
    id: 't7',
    title: 'Liquid Soul',
    artist: 'LO-FI BEATS',
    albumArt: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?q=80&w=400&h=400&auto=format&fit=crop',
    genre: 'Lo-fi',
    duration: '02:55',
    audioUrl: 'https://www.youtube.com/watch?v=8XvjVv65y9Q',
    videoId: '8XvjVv65y9Q'
  },
  {
    id: 't8',
    title: 'Hyper-Drive',
    artist: 'SPEEDCORE',
    albumArt: 'https://images.unsplash.com/photo-1514525253361-bee8718a7439?q=80&w=400&h=400&auto=format&fit=crop',
    genre: 'Hyperpop',
    duration: '02:10',
    audioUrl: 'https://www.youtube.com/watch?v=Yp69I5vH9_g',
    videoId: 'Yp69I5vH9_g'
  }
];

export const STORIES: Story[] = [
  {
    id: 's1',
    title: 'Vibe Late Night Show',
    image: 'https://images.unsplash.com/photo-1493225255756-d9584f8606e9?q=80&w=400&h=600&auto=format&fit=crop',
    isLive: true
  },
  {
    id: 's2',
    title: 'Jazz Session: Live',
    image: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?q=80&w=400&h=600&auto=format&fit=crop',
  },
  {
    id: 's3',
    title: 'Tech Pulse with Neo',
    image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=400&h=600&auto=format&fit=crop',
    isHot: true
  }
];

export const NODES: Node[] = [
  { id: 'n1', label: 'PHONK', type: 'core', color: 'primary' },
  { id: 'n2', label: 'HYPERPOP', type: 'sub', color: 'accent' },
  { id: 'n3', label: 'SYNTH', type: 'sub', color: 'white' },
  { id: 'n4', label: 'GLITCH', type: 'minor', color: 'primary' },
  { id: 'n5', label: 'DARK TECH', type: 'sub', color: 'zinc' },
];
