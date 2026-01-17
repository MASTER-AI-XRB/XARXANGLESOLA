# Guia de Desplegament - Xarxa Anglesola

Aquesta guia t'ajudarà a desplegar l'aplicació per a ús global en producció.

## Requisits Previs

- Node.js 18+ instal·lat
- Base de dades PostgreSQL (recomanat) o MySQL
- Domini configurat amb SSL/HTTPS
- Servidor amb suficient memòria i CPU

## Pas 1: Preparar el Codi

### 1.1 Actualitzar Schema de Base de Dades

Per producció, canvia `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"  // Canvia de "sqlite" a "postgresql"
  url      = env("DATABASE_URL")
}
```

### 1.2 Configurar Variables d'Entorn

Crea un fitxer `.env` amb:

```env
DATABASE_URL="postgresql://usuari:contrasenya@host:5432/nom_base_dades?schema=public"
NODE_ENV=production
PORT=3000
SOCKET_PORT=3001
NEXT_PUBLIC_APP_URL=https://tudomini.com
NEXT_PUBLIC_ALLOWED_ORIGINS=https://tudomini.com,https://www.tudomini.com
```

## Pas 2: Configurar Base de Dades

### 2.1 Crear Base de Dades PostgreSQL

```sql
CREATE DATABASE xarxanglesola;
CREATE USER xarxanglesola_user WITH PASSWORD 'contrasenya_segura';
GRANT ALL PRIVILEGES ON DATABASE xarxanglesola TO xarxanglesola_user;
```

### 2.2 Executar Migracions

```bash
npx prisma migrate deploy
npx prisma generate
```

## Pas 3: Construir l'Aplicació

```bash
npm install
npm run build
```

## Pas 4: Configurar Servidor

### Opció A: Usant PM2 (Recomanat)

```bash
npm install -g pm2
pm2 start server.js --name xarxanglesola
pm2 save
pm2 startup
```

### Opció B: Usant systemd

Crea `/etc/systemd/system/xarxanglesola.service`:

```ini
[Unit]
Description=Xarxa Anglesola App
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/ruta/al/projecte
Environment=NODE_ENV=production
ExecStart=/usr/bin/node server.js
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable xarxanglesola
sudo systemctl start xarxanglesola
```

## Pas 5: Configurar Nginx (Recomanat)

Crea `/etc/nginx/sites-available/xarxanglesola`:

```nginx
server {
    listen 80;
    server_name tudomini.com www.tudomini.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name tudomini.com www.tudomini.com;

    ssl_certificate /ruta/al/certificat.crt;
    ssl_certificate_key /ruta/al/clau.key;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /socket.io/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

## Pas 6: Configurar Backups

### Backup de Base de Dades

Crea un script de backup (`backup-db.sh`):

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -U usuari nom_base_dades > /ruta/backups/backup_$DATE.sql
# Mantenir només últims 7 dies
find /ruta/backups -name "backup_*.sql" -mtime +7 -delete
```

Afegeix a crontab:
```bash
0 2 * * * /ruta/al/backup-db.sh
```

## Pas 7: Monitoring

### Opcions Recomanades

- **Sentry**: Per tracking d'errors
- **Uptime Robot**: Per monitoring de disponibilitat
- **New Relic / Datadog**: Per monitoring de performance

## Pas 8: Optimitzacions

### 8.1 Imatges

Considera migrar a un servei de cloud storage:
- AWS S3
- Cloudinary
- ImageKit

### 8.2 CDN

Configura un CDN per servir assets estàtics:
- Cloudflare
- AWS CloudFront
- Vercel Edge Network

### 8.3 Rate Limiting Avançat

Per major escala, implementa rate limiting amb Redis:
```bash
npm install ioredis
```

## Checklist de Producció

- [ ] Base de dades PostgreSQL configurada
- [ ] Variables d'entorn configurades
- [ ] HTTPS/SSL configurat
- [ ] Backups automàtics configurats
- [ ] Monitoring configurat
- [ ] Rate limiting activat
- [ ] Logs configurats
- [ ] Firewall configurat
- [ ] Domini configurat correctament
- [ ] Tests realitzats en entorn de staging

## Suport

Per problemes o preguntes, consulta la documentació o obre un issue al repositori.

