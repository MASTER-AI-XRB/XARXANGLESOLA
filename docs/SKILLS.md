# Skills.sh – Comandes per al projecte

## Impacte en el pes de l’app

**No.** Incorporar skills de [skills.sh](https://skills.sh) **no augmenta el pes de l’aplicació** que es desplega.

- Les skills s’instal·len al projecte (p. ex. dins de `.cursor/` o similar) i són fitxers de configuració per a l’agent (Cursor, Claude, etc.).
- Aquests fitxers **no** formen part del bundle de Next.js ni es despleguen a Vercel.
- L’impacte és **només a nivell local** (i al repositori si es fan commit dels fitxers afegits).

---

## Comandes útils

Executa-les des de l’arrel del projecte. Es pot desactivar la telemetria amb `DISABLE_TELEMETRY=1` si ho prefereu.

### Instal·lar una skill

```bash
npx skills add <owner>/<skill-name>
```

**Quan surti la llista d’agents:** el CLI et demana per a quin agent vols la skill (Cursor, Claude Code, Windsurf, etc.). Has de **triar el que fas servir** (p. ex. Cursor): normalment es marca amb la tecla d’espai i es confirma amb Enter. Si només utilitzes Cursor, selecciona només Cursor. Un cop confirmat, la skill s’instal·la a la carpeta que toca (p. ex. `.cursor/`) i Cursor la farà servir automàticament; no cal fer res més.

### Llistar skills disponibles al repo oficial

```bash
npx skills add vercel-labs/agent-skills --list
```

### Skills recomanades per aquest projecte (Next.js, React, Vercel)

```bash
# Totes les skills del repo oficial (recomanat per tenir el màxim de suport)
npx skills add vercel-labs/agent-skills

# O només les que més interessen:
# Bones pràctiques React/Next.js (rendiment, data fetching, bundle)
npx skills add vercel-labs/agent-skills --skill vercel-react-best-practices

# Disseny web i accessibilitat
npx skills add vercel-labs/agent-skills --skill web-design-guidelines

# Patrons de composició React (incl. React 19)
npx skills add vercel-labs/agent-skills --skill vercel-composition-patterns
```

### Cercar i gestionar skills

```bash
# Cercar skills per paraules clau (o interactiu)
npx skills find [consulta]

# Comprovar actualitzacions de les skills instal·lades
npx skills check

# Actualitzar totes les skills instal·lades
npx skills update
```

### Opcions habituals

```bash
# Instal·lar sense confirmació (-y) i, si s’ofereix, global (-g)
npx skills add vercel-labs/agent-skills -y

# Sense telemetria
DISABLE_TELEMETRY=1 npx skills add vercel-labs/agent-skills
```

---

## On es desen les skills

Depèn de l’agent; en entorns Cursor sol anar a `.cursor/` dins del projecte. Aquestes carpetes es poden versionar amb Git per compartir les mateixes skills amb tot l’equip.
