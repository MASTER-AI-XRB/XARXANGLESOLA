# Instruccions d'Instal·lació i Ús

## Pas 1: Instal·lar Dependències

```bash
npm install
```

## Pas 2: Configurar la Base de Dades

```bash
npx prisma generate
npx prisma db push
```

Això crearà la base de dades SQLite i generarà el client de Prisma.

## Pas 3: Iniciar l'Aplicació

```bash
npm run dev
```

Això iniciarà:
- El servidor Next.js a http://localhost:3000
- El servidor Socket.io a http://localhost:3001

## Pas 4: Utilitzar l'Aplicació

1. Obre el navegador a http://localhost:3000
2. Introdueix un nickname (mínim 3 caràcters)
3. Explora els productes o publica'n un de nou
4. Utilitza el xat general o inicia xats privats amb altres usuaris

## Estructura de Carpetes Importants

- `app/` - Pàgines i components de Next.js
- `app/api/` - Endpoints de l'API
- `app/app/` - Àrea protegida (requereix autenticació)
- `prisma/` - Esquema de base de dades
- `public/uploads/` - Imatges pujades (es crea automàticament)
- `server.js` - Servidor Socket.io personalitzat

## Notes Importants

- Les imatges es guarden a `public/uploads/`
- La base de dades SQLite es troba a `prisma/dev.db`
- Els missatges es guarden a la base de dades per persistència
- Per producció, hauràs de configurar una base de dades PostgreSQL o MySQL

## Solució de Problemes

### Error: "Cannot find module '@prisma/client'"
```bash
npx prisma generate
```

### Error: "Port 3000 already in use"
Canvia el port al fitxer `server.js` o tanca l'altre procés.

### Les imatges no es mostren
Assegura't que la carpeta `public/uploads/` existeix i té permisos d'escriptura.

