# SYNC — Denarius ⇄ stars (monorepo)

Este repo (`lucifxr63/Denarius`) es la **fuente de verdad** del proyecto. La misma
base de código vive además como subcarpeta `cashflow/` del monorepo
`lucifxr63/stars`. El puente entre ambos es **`git subtree`**.

## Modelo mental

- **Denarius** (este repo) → se trabaja acá día a día.
- **`stars/cashflow/`** (subcarpeta del monorepo) → se traen los cambios cuando se necesita.

Regla de oro: **editar en un solo lugar** (Denarius) y reflejar en `stars` con
`subtree pull`. No editar las dos copias en paralelo o habrá conflictos.

## Trabajar en Denarius (normal)

```bash
git clone https://github.com/lucifxr63/Denarius.git
cd Denarius
# … editar …
git add -A
git commit -m "mi cambio"
git push
```

## Bajar cambios de Denarius → stars/cashflow

Desde la **raíz del monorepo** `stars` (no desde `cashflow/`):

```bash
cd /ruta/al/monorepo/stars        # ej: E:/DEV/Respos/Trabajo/startups
git fetch denarius
git subtree pull --prefix=cashflow denarius main -m "sync: Denarius -> cashflow"
git push origin <tu-rama>          # sube el merge a stars
```

Aplica **solo** los cambios de Denarius dentro de `cashflow/`; no toca el resto
del monorepo (p. ej. `validateai`).

## (Opcional) Sentido inverso: stars/cashflow → Denarius

Si se editó dentro de la subcarpeta del monorepo y se quiere empujar a Denarius:

```bash
cd /ruta/al/monorepo/stars
git subtree push --prefix=cashflow denarius main
```

## Configuración del remoto (una sola vez, en el monorepo stars)

Ya está hecho, pero si se clona el monorepo en otra máquina:

```bash
git remote add denarius https://github.com/lucifxr63/Denarius.git
git fetch denarius
```

## Notas

- **`.env.local` no viaja** (gitignored en ambos repos). Los secretos se gestionan
  localmente en cada copia.
- Siempre `git fetch denarius` antes de un `subtree pull`.
- El primer `subtree pull` puede pedir resolver algún conflicto trivial (las
  historias se reescribieron al hacer el split inicial); de ahí en adelante es limpio.
- El historial de Denarius arranca del `subtree split` de `cashflow/` (12 commits).
