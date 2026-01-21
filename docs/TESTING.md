# Tests

## Base de dades de test
Per evitar tocar la BD de producció, crea un fitxer `.env.test` (no versionat) amb:

```
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DB_NAME?schema=public"
# Opcional
AUTH_SECRET="change-me-for-tests"
```

Playwright carregarà automàticament `.env.test` i arrencarà el servidor amb aquesta BD.

## Com executar

1) Instal·lar navegadors (1 vegada):

```
npx playwright install
```

2) Tests unitaris:

```
npm run test:unit
```

3) Tests e2e:

```
npm run test:e2e
```

## Neteja automàtica
- Després d’executar els e2e, la BD de test es reinicia automàticament.
- Si ho vols fer manualment:

```
npm run test:db:reset
```
