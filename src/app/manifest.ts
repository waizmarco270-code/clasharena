import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Clash Arena',
    short_name: 'ClashArena',
    description: 'The ultimate Clash of Clans tournament platform.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0F0E0D',
    theme_color: '#FF4500',
    icons: [
      {
        src: '/logo.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/logo.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
