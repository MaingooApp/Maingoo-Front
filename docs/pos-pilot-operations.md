# Operación del piloto TPV

Esta guía cubre el piloto del TPV web de Maingoo. El navegador del terminal debe ser un dispositivo dedicado y no debe compartir la sesión con otros usuarios.

## Antes de habilitar una empresa

- Confirmar que `PosSettings.enabled` está activo solo para la empresa piloto.
- Crear dispositivos separados por función (`REGISTER` para venta/caja y `KDS` para cocina) y verificar que están `ACTIVE`.
- Asignar permisos mínimos: venta, caja, cocina, lectura, anulaciones y configuración solo a los roles que los necesitan.
- Cargar zonas, mesas, carta, impuestos, estaciones de cocina y métodos de pago.
- Verificar impresora mediante la impresión normal del navegador; la impresión silenciosa queda fuera del MVP.
- Hacer una venta de prueba completa y comprobar pedido, cocina, pago, ticket fiscal, stock e historial.

## Apertura de jornada

1. Abrir una sola pestaña del TPV y autenticar al operador.
2. Entrar en **Ventas > Terminal** y seleccionar el dispositivo asignado.
3. Confirmar estado **En línea**, cero comandos pendientes y una sincronización reciente.
4. Abrir caja con el efectivo inicial y comprobar el resumen.
5. Crear un pedido de prueba, enviarlo a cocina y anularlo según el procedimiento del negocio.

No iniciar la jornada si el dispositivo aparece revocado, el almacenamiento local falla o la empresa tiene el TPV deshabilitado.

## Operación normal

- Usar una mesa o pedido para llevar por operación.
- Enviar las líneas a cocina antes de cobrar.
- Cobrar y finalizar únicamente con conexión; importes, fiscalidad, stock y ticket definitivos vienen del servidor.
- Ante doble toque o respuesta lenta, esperar el resultado antes de repetir. Los reintentos conservan la clave idempotente.
- No editar en dos terminales el mismo pedido salvo que sea imprescindible.

## Pérdida de conexión

La cabecera indica **Sin conexión** y muestra los comandos pendientes. Se permite preparar pedidos, añadir/editar/quitar líneas no confirmadas y enviarlos a la cola local.

Mientras no haya conexión:

- no cobrar ni finalizar;
- no abrir, mover ni cerrar caja;
- no anular líneas ya enviadas, devolver ventas ni ajustar inventario;
- no cambiar de dispositivo, cerrar sesión, borrar datos del sitio ni usar modo privado;
- no prometer al cliente un ticket fiscal definitivo.

Al volver la red, mantener la pestaña abierta. La cola se reproduce en orden y reintenta fallos transitorios. Continuar con cobro o cierre solo cuando el estado vuelva a **En línea**, no queden pendientes y no exista conflicto.

## Conflictos y errores

- `ORDER_VERSION_CONFLICT`: detener la edición de ese pedido, comparar con el terminal que lo modificó y pulsar **Usar versión del servidor** solo cuando se acepte descartar los cambios locales pendientes.
- `POS_OFFLINE_LINE_RETARGET_AMBIGUOUS`: no recrear la línea manualmente hasta revisar la versión del servidor.
- `DEVICE_REVOKED` o `POS_DISABLED`: detener ventas y contactar con soporte; no crear otro dispositivo para eludir el bloqueo.
- Error de almacenamiento local: detener operación offline. No borrar IndexedDB mientras existan comandos pendientes.
- Error transitorio de sync: mantener la pestaña abierta; el reintento es automático. Escalar si persiste cinco minutos.

Para soporte, registrar hora, empresa, nombre visible del dispositivo, código mostrado, estado de conexión, número de comandos pendientes y pasos realizados. No enviar tokens, documentos fiscales, NIF/CIF, nombres de clientes, líneas del pedido ni capturas con datos personales.

## Cierre de jornada

1. Confirmar estado **En línea**, sincronización reciente, cero pendientes y cero conflictos.
2. Revisar pedidos abiertos y finalizar o dejar documentado cada caso.
3. Cuadrar efectivo, registrar movimientos pendientes y cerrar caja con el contado real.
4. Imprimir o guardar el resumen de cierre.
5. Comprobar historial, ticket fiscal y estado de stock de una venta de la jornada.
6. Cerrar sesión únicamente después de completar los pasos anteriores.

## Diagnóstico y telemetría

El frontend conserva en memoria, con un máximo de 100 entradas, ciclos y errores de sincronización. Solo incluye fecha, fase, resultado, latencia, tamaño de cola, código de error saneado y si el fallo es transitorio. No guarda IDs, payloads, importes, productos, clientes, impuestos, tokens ni documentos; se elimina al recargar. El operador puede desplegar **Diagnóstico de sincronización** en el terminal y comunicar esas entradas seguras a soporte.

No existe todavía un endpoint central de telemetría. Centralizar eventos requiere un contrato backend aprobado con retención, permisos y política de privacidad; no debe reutilizarse un endpoint genérico ni añadirse envío desde el navegador sin esa revisión.

## Soporte y rollback

1. Poner `PosSettings.enabled=false` para la empresa afectada. No crear un sistema paralelo de feature flags.
2. Mantener el dispositivo y la pestaña si hay pendientes; deshabilitar el TPV no sustituye la reconciliación.
3. Exportar la información operativa indicada arriba y escalar al equipo técnico.
4. Comparar pedidos, pagos, caja, documentos fiscales y movimientos de stock en servidor.
5. Resolver o descartar explícitamente cada conflicto antes de limpiar datos locales.
6. Volver al flujo anterior de venta solo después de confirmar que no quedan operaciones TPV en tránsito.

La limpieza del almacenamiento del navegador es el último recurso y requiere confirmación técnica de que no quedan comandos recuperables.

## Checklist de salida del piloto

- [ ] Empresa piloto y dispositivos correctos.
- [ ] Roles y permisos verificados.
- [ ] Carta, mesas, cocina, impuestos y pagos cargados.
- [ ] Flujo completo online validado.
- [ ] Reload con pedido pendiente validado.
- [ ] Corte y recuperación de red validados sin duplicados.
- [ ] Conflicto entre dos terminales resuelto explícitamente.
- [ ] Caja abierta, movimiento, cierre y resumen validados.
- [ ] Ticket fiscal, devolución e inventario validados.
- [ ] Prueba a 1024x768, escritorio, teclado y lector táctil completada.
- [ ] Personal formado en offline, conflictos, soporte y cierre.
- [ ] Responsable y ventana de rollback acordados.
