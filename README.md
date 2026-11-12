# Scratch Evolution

Entorno de creación con dos espacios integrados:

- **Blocks Studio:** programación visual mediante bloques.
- **Game Studio:** edición inicial de escenas y entidades para juegos 2D.

## Estado actual

**Pre-alpha 0.1.0.** Esta primera entrega es una base web interactiva; todavía no es una implementación completa de TurboWarp ni un motor de videojuegos terminado.

Incluye:
- Interfaz adaptable en español.
- Cambio entre Blocks Studio y Game Studio.
- Biblioteca de bloques y pila visual de scripts.
- Parámetros numéricos editables directamente en los bloques.
- Reordenación de scripts mediante arrastrar y soltar o controles de flecha.
- Movimiento de objetos en Game Studio arrastrándolos directamente sobre el escenario.
- Bloques adicionales para cambiar/fijar X e Y, orientación y tamaño.
- Primer intérprete de bloques: movimiento, dirección, tamaño, mostrar/ocultar, variables `puntos`, esperas y bucles básicos.
- Ejecución y pausa del programa desde el botón principal.
- Escena Canvas 2D con selección de entidades.
- Creación de sprites y plataformas.
- Inspector de transformaciones y propiedades básicas.
- Vista previa con movimiento de prueba y gravedad básica.
- Guardado local, autoguardado e importación/exportación JSON.

## Ejecutar

No requiere instalar dependencias. Abre `index.html` mediante un servidor estático local.

### Publicar en GitHub Pages

1. En el repositorio, abre **Settings → Pages**.
2. En **Build and deployment**, selecciona **GitHub Actions** como fuente.
3. El workflow `.github/workflows/deploy.yml` publicará automáticamente el sitio al hacer push a `main`.
4. La URL publicada aparecerá en **Settings → Pages** y en la ejecución del workflow.

## Próximos hitos

1. Integrar los componentes de TurboWarp respetando sus licencias y avisos.
2. Implementar un modelo de proyecto compartido y versionado.
3. Ampliar el intérprete con bloques anidados, condiciones, eventos de teclado y parámetros editables.
4. Incorporar física 2D, colisiones y un editor de niveles.
5. Integrar TurboWarp VM, añadir pruebas automatizadas y exportación HTML5.

## Licencias

El código original de este repositorio está bajo MIT, según `LICENSE`. Cualquier dependencia o código de terceros que se incorpore conservará sus propios avisos y obligaciones de licencia. Los repositorios de TurboWarp tienen licencias distintas; deben revisarse antes de copiar, modificar o redistribuir sus componentes.

## Desarrollo

La documentación de TurboWarp describe su arquitectura modular y el proceso de desarrollo de GUI y VM:
https://docs.turbowarp.org/development


### Limitaciones del intérprete inicial

El intérprete actual es experimental: los bloques de repetición y por siempre toman como cuerpo los bloques que aparecen después de ellos en la pila; todavía no hay bloques anidados ni conexiones visuales entre bloques. No sustituye a la VM de Scratch/TurboWarp.
