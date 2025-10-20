export interface Note {
  id: number;
  title: string;
  content: string;
  media: 'image' | 'audio' | null; 
  isFollowing: boolean;
  mediaUrl: string | null; 
}