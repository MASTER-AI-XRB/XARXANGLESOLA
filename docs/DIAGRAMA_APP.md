## Diagrama general

```mermaid
flowchart TD
  U["Usuari"] --> UI["Frontend Next.js (Vercel)"]
  UI -->|HTTP| API["API Routes Next.js"]
  UI -->|Socket.IO| WS["Servidor Socket.IO (server.js)"]
  API --> DB[(PostgreSQL)]
  WS --> DB
  API --> BLOB["Vercel Blob"]
  WS --> NOTIF["Notificacions al navegador"]

  subgraph Frontend
    UI --> P1["Pàgina Login / Registre"]
    UI --> P2["Productes"]
    UI --> P3["Preferits"]
    UI --> P4["Els meus productes"]
    UI --> P5["Detall producte"]
    UI --> P6["Xat"]
    UI --> P7["Preferències notificacions"]
  end

  subgraph Backend
    API --> A1["/api/auth/*"]
    API --> A2["/api/products"]
    API --> A3["/api/favorites"]
    API --> A4["/api/notification-preferences"]
    WS --> S1["Events Socket.IO"]
    WS --> S2["/notify"]
  end
```

## Connexions entre components

```mermaid
flowchart LR
  UI[Frontend Next.js] -->|fetch| API[API Routes]
  UI -->|socket.io-client| WS[Socket.IO server]
  API -->|Prisma| DB[(PostgreSQL)]
  WS -->|Prisma| DB
  API -->|put| BLOB[Vercel Blob]
```

## Flux: Autenticacio i entrada a l'app

```mermaid
sequenceDiagram
  participant U as Usuari
  participant UI as Frontend
  participant API as /api/auth/login
  participant DB as PostgreSQL

  U->>UI: Introdueix nickname + contrasenya
  UI->>API: POST /api/auth/login
  API->>DB: Verifica usuari
  DB-->>API: Usuari vàlid
  API-->>UI: userId + nickname
  UI->>UI: Desa a localStorage
  UI-->>U: Navega a /app
```

## Flux: Publicar producte

```mermaid
sequenceDiagram
  participant U as Usuari
  participant UI as Frontend
  participant API as /api/products
  participant BLOB as Vercel Blob
  participant DB as PostgreSQL

  U->>UI: Omple formulari + puja imatges
  UI->>API: POST /api/products (multipart)
  API->>BLOB: Upload imatges
  BLOB-->>API: URL imatges
  API->>DB: Crear Producte
  DB-->>API: Producte creat
  API-->>UI: Producte creat
  UI-->>U: Redirigeix a /app
```

## Flux: Afegir a preferits + notificacio

```mermaid
sequenceDiagram
  participant U as Usuari
  participant UI as Frontend
  participant API as /api/favorites
  participant DB as PostgreSQL
  participant WS as Socket.IO server

  U->>UI: Clica "Preferit"
  UI->>API: POST /api/favorites
  API->>DB: Crear Favorite
  DB-->>API: OK
  API->>WS: POST /notify (tipus "favorite")
  WS->>DB: Llegir preferencies receptor
  WS-->>WS: Filtrar si cal
  WS-->>UI: app-notification (si procedeix)
```

## Flux: Xat en temps real

```mermaid
sequenceDiagram
  participant UI as Frontend
  participant WS as Socket.IO server
  participant DB as PostgreSQL

  UI->>WS: connect (userId, nickname)
  WS->>DB: Carrega últims missatges
  WS-->>UI: load-messages
  UI->>WS: general-message
  WS->>DB: Desa missatge
  WS-->>UI: general-message (broadcast)
```

## Flux: Preferencies de notificacions

```mermaid
sequenceDiagram
  participant U as Usuari
  participant UI as Frontend
  participant API as /api/notification-preferences
  participant DB as PostgreSQL

  U->>UI: Obre modal preferencies
  UI->>API: GET /api/notification-preferences
  API->>DB: Llegeix preferencies
  DB-->>API: Dades preferencies
  API-->>UI: Mostra valors
  U->>UI: Desa canvis
  UI->>API: PUT /api/notification-preferences
  API->>DB: Upsert preferencies
  DB-->>API: OK
  API-->>UI: Confirmacio
```

## Notes rapides
- El frontend i les API conviuen en Next.js.
- Socket.IO corre a `server.js` i comparteix DB amb l'API.
- Les notificacions push del navegador es gestionen al client.
- Les preferencies s'apliquen abans d'emetre notificacions via `/notify`.
