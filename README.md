# Scratch Evolution

Entorno de creación con dos espacios integrados:

- **Blocks Studio:** programación visual mediante bloques.
- **Game Studio:** edición inicial de escenas y entidades para juegos 2D.

## Estado actual

**Pre-alpha 0.1.0.** Esta primera entrega es una base web interactiva; todavía no es una implementación completa de TurboWarp ni un motor de videojuegos terminado.

Incluye:
- Interfaz adaptable en español.
- Cambio entre Blocks Studio y Game Studio.
- Biblioteca de bloques de muestra y pila visual de scripts.
- Escena Canvas 2D con selección de entidades.
- Creación de sprites y plataformas.
- Inspector de transformaciones y propiedades básicas.
- Vista previa con movimiento de prueba y gravedad básica.
- Guardado local, autoguardado e importación/exportación JSON.

## Ejecutar

No requiere instalar dependencias. Abre `index.html` mediante un servidor estático local o publica el repositorio con GitHub Pages.

## Próximos hitos

1. Integrar los componentes de TurboWarp respetando sus licencias y avisos.
2. Implementar un modelo de proyecto compartido y versionado.
3. Conectar el editor de bloques a un runtime real.
4. Incorporar física 2D, colisiones y un editor de niveles.
5. Añadir pruebas automatizadas y exportación HTML5.

## Licencias

El código original de este repositorio está bajo MIT, según `LICENSE`. Cualquier dependencia o código de terceros que se incorpore conservará sus propios avisos y obligaciones de licencia. Los repositorios de TurboWarp tienen licencias distintas; deben revisarse antes de copiar, modificar o redistribuir sus componentes.

## Desarrollo

La documentación de TurboWarp describe su arquitectura modular y el proceso de desarrollo de GUI y VM:
https://docs.turbowarp.org/development
