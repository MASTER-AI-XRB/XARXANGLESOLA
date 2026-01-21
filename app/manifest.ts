import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Xarxa Anglesola',
    short_name: 'Xarxa',
    description: 'Plataforma per a intercanviar productes',
    start_url: '/app',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#ffffff',
    icons: [
      {
        src: '/xarxa_logo.jpg',
        sizes: '640x640',
        type: 'image/jpeg',
      },
    ],
  }
}
