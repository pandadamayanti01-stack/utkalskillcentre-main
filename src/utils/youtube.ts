export const getYouTubeId = (id: string) => {
  if (!id) return '';
  if (id.includes('youtube.com/watch?v=')) return id.split('v=')[1].split('&')[0];
  if (id.includes('youtu.be/')) return id.split('youtu.be/')[1].split('?')[0];
  if (id.includes('youtube.com/playlist?list=')) return id.split('list=')[1].split('&')[0];
  if (id.includes('list=')) return id.split('list=')[1].split('&')[0];
  return id;
};

export const getYouTubeEmbedUrl = (id: string) => {
  if (!id) return '';
  
  // Handle youtu.be with list
  if (id.includes('youtu.be/') && id.includes('list=')) {
    const videoId = id.split('youtu.be/')[1].split('?')[0];
    const listId = id.split('list=')[1].split('&')[0];
    return `https://www.youtube.com/embed/${videoId}?list=${listId}`;
  }

  const cleanId = getYouTubeId(id);
  
  if (id.includes('playlist') || id.startsWith('PL') || id.includes('list=')) {
    // If it's a playlist, or contains list=, we might want to show the video with the list
    if (id.includes('v=')) {
      const videoId = id.split('v=')[1].split('&')[0];
      const listId = id.split('list=')[1].split('&')[0];
      return `https://www.youtube.com/embed/${videoId}?list=${listId}`;
    }
    return `https://www.youtube.com/embed/videoseries?list=${cleanId}`;
  }
  return `https://www.youtube.com/embed/${cleanId}`;
};

export const getYouTubeThumbnail = (id: string) => {
  if (!id) return 'https://picsum.photos/seed/edu/400/225';
  if (id.startsWith('PL') || id.includes('playlist')) {
    // For playlists, we can't easily get a thumbnail without the first video ID
    // Fallback to a generic educational image or a placeholder
    return `https://picsum.photos/seed/${id}/400/225`;
  }
  const videoId = getYouTubeId(id);
  return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
};
