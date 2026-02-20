# Format d’importació de projectes — Gestor

Aquest document descriu com una altra aplicació (o un agent d’IA) ha de generar el contingut per importar **un** projecte al Gestor de projectes (via la UI «Importar» o l’API `POST /api/import`).

---

## 0. Instruccions obligatòries per a qui genera l’export

**Heu de generar un sol arxiu.** No genereu diversos arxius (ni diversos formats, ni exemples alternatius en fitxers separats). Un projecte = un fitxer.

- **Format òptim (recomanat):** un **únic fitxer JSON** amb extensió `.json` que contingui **un sol objecte** projecte amb tots els camps que tinguem (vegeu secció 3). Aquest format permet que el Gestor creï la fitxa amb nom, descripció, estat, dates, enllaços i etiquetes.
- **Nom del fitxer:** podeu usar per exemple `projecte-gestor.json` o un nom descriptiu del projecte (ex.: `santistaks-gestor.json`).
- **Contingut:** l’arxiu ha de ser vàlid JSON: un objecte amb les propietats `name`, `description` i, si n’hi ha, `status`, `startDate`, `endDate`, `links`, `tags` (sense `id`, `createdAt` ni `updatedAt`).

Si per restriccions del context només es pot generar text pla o Markdown, genereu **un sol** fitxer `.md` o `.txt`: primera línia = nom del projecte, la resta = descripció (vegeu secció 4). En aquest cas el Gestor no podrà importar enllaços ni etiquetes; per a la millor fitxa possible, useu JSON.

---

## 1. Opcions d’importació (referència)

El Gestor accepta tres tipus d’entrada:

| Tipus     | Camp `type`  | Descripció |
|----------|--------------|------------|
| JSON     | `json`       | Estructura amb camps del projecte (nom, descripció, enllaços, etc.). |
| Markdown | `markdown`   | Text amb títol (opcionalment `# Títol`) i cos com a descripció. |
| Text     | `text`       | Mateix tractament que Markdown: primera línia = nom, la resta = descripció. |

---

## 2. Importació via API

L’endpoint és:

```http
POST /api/import
Content-Type: application/json
```

Cos de la petició:

```json
{
  "type": "json",
  "content": "<contingut segons el tipus>"
}
```

- **`type`**: `"json"` | `"markdown"` | `"text"`.
- **`content`**: 
  - Si `type` és `"json"`: string amb JSON vàlid **o** objecte JSON (segons el que accepti el teu client).
  - Si `type` és `"markdown"` o `"text"`: string amb el text/Markdown.

En tots els casos, el Gestor genera ell mateix `id`, `createdAt` i `updatedAt` del projecte; no cal enviar-los.

---

## 3. Format JSON

### 3.1 Objecte projecte (contingut del fitxer JSON)

El fitxer que genereu ha de contenir **un únic objecte** amb els camps que conegueu. Els que no s’enviïn es prenen per defecte al Gestor.

```json
{
  "name": "Nom del projecte",
  "description": "Descripció o objectius del projecte. Text llarg.",
  "status": "actiu",
  "startDate": "2025-01-15",
  "endDate": "2025-06-30",
  "links": [
    { "title": "Repositori", "url": "https://github.com/usuari/repo" },
    { "title": "Pàgina Web", "url": "https://wiki.example.com" }
  ],
  "tags": ["frontend", "prioritat-alta"]
}
```

**Camps acceptats:**

| Camp          | Tipus   | Obligatori | Descripció |
|---------------|---------|------------|------------|
| `name`        | string  | No         | Nom del projecte. Per defecte: «Importat». |
| `description` | string  | No         | Descripció o notes. |
| `status`      | string  | No         | `"actiu"`, `"pausat"` o `"acabat"`. Per defecte: `"actiu"`. |
| `startDate`   | string  | No         | Data d’inici en format ISO (ex.: `YYYY-MM-DD`). |
| `endDate`     | string  | No         | Data prevista de fi en format ISO. |
| `links`       | array   | No         | Llista d’objectes `{ "title": string, "url": string }`. |
| `tags`        | array   | No         | Llista de strings (etiquetes). |

**No s’utilitzen** en la importació (el Gestor els genera): `id`, `createdAt`, `updatedAt`.

### 3.2 Un sol objecte (el que heu de generar)

Per a la importació al Gestor, **genereu un únic objecte** projecte dins d’un únic fitxer JSON. No genereu arrays amb diversos projectes ni diversos fitxers: un projecte per importar = un arxiu amb un objecte.

El Gestor accepta també (per compatibilitat) un array o `{ "projects": [ ... ] }`, però en tots els casos **només s’importa el primer element**. Per tant, el format directe i òptim és un sol objecte en un sol arxiu.

### 3.3 Exemple mínim (nom i descripció)

```json
{
  "name": "El meu projecte",
  "description": "Objectius i notes del projecte."
}
```

### 3.4 Exemple amb enllaços i etiquetes

```json
{
  "name": "App mòbil",
  "description": "Desenvolupament d’una app de gestió de tasques.",
  "status": "actiu",
  "endDate": "2025-09-01",
  "links": [
    { "title": "Figma", "url": "https://figma.com/file/xxx" },
    { "title": "Backlog", "url": "https://trello.com/b/yyy" }
  ],
  "tags": ["react-native", "MVP"]
}
```

---

## 4. Format Markdown / text

Quan `type` és **`markdown`** o **`text`**, el Gestor interpreta el `content` així:

1. **Nom del projecte**: la **primera línia** del text.
   - Si comença amb un o més `#` (per exemple `# Títol` o `## Títol`), es pren el text després dels `#` (sense espais inicials).
   - Si no hi ha `#`, es pren tota la primera línia.
2. **Descripció**: tot el que ve **després** de la primera línia (incloent salts de línia). Si no n’hi ha, es pot usar tot el text com a descripció.

No es reconeixen enllaços ni etiquetes dins del Markdown; només es deriva nom + descripció. Per enllaços i etiquetes cal usar **JSON**.

### 4.1 Exemple Markdown (títol amb #)

```markdown
# Nom del projecte

Aquesta és la descripció o l’objectiu del projecte.
Puc escriure diverses línies.

- Punt 1
- Punt 2
```

Resultat a Gestor: **Nom** = «Nom del projecte», **Descripció** = el paràgraf i la llista.

### 4.2 Exemple text (sense #)

```
El meu projecte
Descripció breu en una o més línies.
```

Resultat: **Nom** = «El meu projecte», **Descripció** = «Descripció breu en una o més línies.»

### 4.3 Exemple només descripció

Si la primera línia es deixa buida o no es vol títol, es pot enviar només text; el nom del projecte quedarà per defecte («Importat») i tot el text serà la descripció.

```markdown

Aquesta és només la descripció sense títol.
```

---

## 5. Resum per a qui genera l’export

- **Genereu un sol arxiu.** No diversos arxius ni diversos formats.
- **Format òptim:** un fitxer `.json` amb un **únic objecte** que tingui com a mínim `name` i `description`, i si n’hi ha: `status`, `startDate`, `endDate`, `links` (array d’objectes `{ "title", "url" }`), `tags` (array de strings). Dates en ISO (`YYYY-MM-DD`). Sense `id`, `createdAt` ni `updatedAt`.
- **Alternativa (si no es pot JSON):** un sol fitxer `.md` o `.txt`: primera línia = nom, la resta = descripció (enllaços i etiquetes no s’importen).

Amb un sol arxiu en aquest format, el Gestor pot crear la fitxa del projecte de forma òptima.
