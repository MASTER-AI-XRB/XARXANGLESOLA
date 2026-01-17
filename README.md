# Xarxa Anglesola - Intercanvi de Productes

Aplicació web per a intercanviar productes amb sistema de xat en temps real.

## Funcionalitats

- ✅ Autenticació simple amb nickname (sense contrasenya)
- ✅ Xat general per a tots els usuaris
- ✅ Xats privats entre usuaris
- ✅ Publicació de productes amb:
  - Nom del producte
  - Fotos (màxim 4)
  - Descripció opcional
- ✅ Visualització de productes publicats

## Requisits

- Node.js 18 o superior
- npm o yarn

## Instal·lació

1. Instal·la les dependències:
```bash
npm install
```

2. Configura la base de dades:
```bash
npx prisma generate
npx prisma db push
```

3. Inicia el servidor:
```bash
npm run dev
```

L'aplicació estarà disponible a:
- Frontend: http://localhost:3000
- Socket.io: http://localhost:3001

## Estructura del Projecte

```
├── app/                    # Pàgines i components Next.js
│   ├── api/               # API routes
│   ├── app/               # Àrea d'aplicació (requereix autenticació)
│   │   ├── chat/         # Pàgina de xat
│   │   └── products/      # Pàgines de productes
│   └── page.tsx          # Pàgina d'inici (login)
├── lib/                   # Utilitats
├── prisma/                # Esquema de base de dades
├── public/                # Fitxers estàtics
│   └── uploads/          # Imatges pujades
└── server.js              # Servidor Socket.io
```

## Tecnologies

- **Next.js 14** - Framework React
- **TypeScript** - Tipat estàtic
- **Prisma** - ORM per a la base de dades
- **SQLite** - Base de dades
- **Socket.io** - Xat en temps real
- **Tailwind CSS** - Estils

## Ús

1. Accedeix a http://localhost:3000
2. Introdueix un nickname (mínim 3 caràcters)
3. Explora els productes o publica'n un de nou
4. Utilitza el xat general o inicia xats privats amb altres usuaris

## Notes

- Les imatges es guarden localment a `public/uploads/`
- La base de dades SQLite es crea automàticament a `prisma/dev.db`
- Els missatges es guarden a la base de dades per persistència

## Preparació per Producció

### 1. Variables d'Entorn

Crea un fitxer `.env` basat en `.env.example`:

```bash
# Base de dades PostgreSQL (recomanat per producció)
DATABASE_URL="postgresql://usuari:contrasenya@host:5432/nom_base_dades?schema=public"

# Entorn
NODE_ENV=production

# URL de l'aplicació
NEXT_PUBLIC_APP_URL=https://tudomini.com

# Ports
PORT=3000
SOCKET_PORT=3001

# CORS (especifica els teus dominis)
NEXT_PUBLIC_ALLOWED_ORIGINS=https://tudomini.com,https://www.tudomini.com
```

### 2. Base de Dades PostgreSQL

1. Crea una base de dades PostgreSQL
2. Actualitza `prisma/schema.prisma` per usar PostgreSQL:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
3. Executa les migracions:
   ```bash
   npx prisma migrate deploy
   npx prisma generate
   ```

### 3. Construcció i Desplegament

```bash
# Construir l'aplicació
npm run build

# Iniciar en producció
npm start
```

### 4. Recomanacions de Producció

- **Base de dades**: Usa PostgreSQL en lloc de SQLite
- **Imatges**: Considera usar un servei de cloud storage (AWS S3, Cloudinary, etc.)
- **Rate Limiting**: Per a major escala, usa Redis per rate limiting
- **Monitoring**: Afegeix monitoring i logging (Sentry, LogRocket, etc.)
- **CDN**: Usa un CDN per servir imatges estàtiques
- **HTTPS**: Assegura't d'usar HTTPS en producció
- **Backup**: Configura backups regulars de la base de dades

### 5. Seguretat

- ✅ Validacions d'inputs implementades
- ✅ Sanitització de dades
- ✅ Rate limiting bàsic
- ✅ Headers de seguretat configurats
- ✅ Validació de tipus de fitxers
- ✅ Límits de mida de fitxers

## Desenvolupament Futur

Funcionalitats que es poden afegir:
- Sistema de valoracions
- Categories de productes
- Notificacions
- Perfil d'usuari
- Historial d'intercanvis
- Integració amb serveis de pagament
- Geolocalització per productes propers

