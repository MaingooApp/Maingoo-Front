# Guía funcional del TPV

Esta guía explica para qué sirve cada opción de **Ventas**, cómo se relacionan sus distintas áreas y qué significa cada apartado de **Configuración del TPV**.

La pantalla **Ventas** es el centro de acceso al punto de venta. No sirve únicamente para cobrar: separa las tareas de camareros, cocina, responsables de caja y administradores. Cada usuario solo ve las opciones permitidas por su rol.

## Opciones de Ventas

### Terminal

Es la pantalla principal para camareros y personal de venta.

Permite:

- seleccionar una caja o dispositivo;
- abrir una mesa libre o recuperar una ocupada;
- crear pedidos para llevar;
- añadir productos de la carta;
- elegir modificadores, como puntos de cocción, tamaños o extras;
- añadir notas;
- cambiar cantidades o anular líneas indicando el motivo;
- enviar la comanda a cocina;
- cobrar en efectivo, tarjeta u otro medio;
- registrar pagos parciales;
- finalizar el pedido;
- mostrar o imprimir el ticket;
- guardar temporalmente determinadas operaciones sin conexión y sincronizarlas cuando vuelva la red.

**Terminal** crea y cobra pedidos. **Caja**, en cambio, controla el dinero físico del turno.

### Cocina

Es la pantalla KDS utilizada por el personal de cocina.

Muestra las comandas enviadas desde Terminal y permite moverlas por estos estados:

1. **Nueva**: la comanda acaba de llegar.
2. **En preparación**: cocina ha comenzado a trabajar en ella.
3. **Lista**: está terminada y esperando ser entregada.
4. **Servida**: ya ha salido de cocina.

También permite:

- seleccionar una pantalla de cocina;
- filtrar comandas por estación;
- identificar si el pedido pertenece a una mesa o es para llevar;
- comprobar cuánto tiempo lleva esperando;
- consultar notas y modificadores.

### Caja

Gestiona el turno de efectivo de una caja registradora.

Permite:

- abrir la caja indicando el efectivo inicial;
- consultar cuánto efectivo debería haber;
- registrar entradas manuales, como añadir cambio;
- registrar salidas, como pagar una compra pequeña;
- registrar ajustes indicando el motivo;
- consultar ventas y devoluciones en efectivo;
- cerrar la caja introduciendo el dinero contado;
- comparar el efectivo esperado con el contado;
- detectar si existe sobrante, faltante o un cuadre correcto;
- imprimir el resumen del cierre.

La caja debe estar abierta para registrar pagos o devoluciones en efectivo. Los pagos con tarjeta no representan dinero físico dentro del cajón.

### Historial

Sirve para consultar las operaciones realizadas.

Permite filtrar por:

- fechas;
- estado del pedido;
- canal de venta: sala o para llevar;
- mesa;
- dispositivo;
- cantidad de resultados por página.

Desde el detalle de un pedido se pueden revisar:

- productos y cantidades;
- costes y estado del cálculo del coste;
- pagos registrados;
- devoluciones;
- tickets y documentos fiscales;
- usuario que abrió y cerró el pedido;
- fechas y trazabilidad;
- versión del pedido.

También permite reimprimir documentos y registrar devoluciones. Una devolución crea un nuevo registro y su documento rectificativo; no modifica el ticket original.

### Configuración TPV

Define cómo funciona el punto de venta: dispositivos, sala, carta, modificadores y cocina. Todos sus apartados se explican en [Configuración del TPV](#configuración-del-tpv).

### Informes de ventas

Es la parte analítica del TPV.

Muestra:

- venta bruta;
- descuentos;
- devoluciones;
- impuestos netos;
- venta neta;
- número de pedidos;
- coste teórico;
- margen;
- ventas por hora;
- ventas por categoría;
- ventas por artículo;
- ventas por medio de pago;
- diferencias de caja;
- artículos con receta o coste incompleto.

Los informes pueden consultarse por fecha y, opcionalmente, limitarse a una caja concreta. Actualmente la caja se filtra introduciendo su UUID.

## Configuración del TPV

### General

#### TPV habilitado

Es el interruptor principal.

Si está desactivado se puede preparar la configuración, pero no se pueden crear nuevos pedidos. Debe activarse cuando el establecimiento esté listo para comenzar a operar.

#### Moneda

Es la moneda utilizada para precios, cobros, tickets e informes.

Debe escribirse mediante su código de tres letras, por ejemplo:

- `EUR`;
- `USD`;
- `GBP`.

#### Zona horaria

Determina el día y la hora local del establecimiento.

Afecta especialmente a:

- numeración diaria de pedidos;
- fechas fiscales;
- informes diarios;
- ventas agrupadas por hora;
- aperturas y cierres.

Para un establecimiento en la España peninsular normalmente debe utilizarse `Europe/Madrid`.

#### Los precios incluyen impuestos

Indica que los precios de la carta representan el precio final que paga el cliente.

En la implementación actual, los pedidos siempre se calculan a partir del **precio con impuestos** y del porcentaje de IVA. Esta opción queda guardada, pero todavía no activa una segunda forma de cálculo basada en precios netos.

#### Permitir existencias negativas

Controla qué sucede cuando una venta necesita más ingredientes de los disponibles.

- **Activado**: la venta se completa y el inventario puede quedar negativo.
- **Desactivado**: la sincronización de stock impide consumir más existencias de las disponibles.

Puede ser útil activarlo durante una puesta en marcha mientras se regulariza el inventario. En una operación estable es preferible mantenerlo desactivado.

#### Pie del recibo

Es el texto que aparece al final del ticket impreso.

Puede utilizarse para mostrar:

- un mensaje de agradecimiento;
- la política de devoluciones;
- la dirección web;
- información de contacto.

### Dispositivos

Representa los equipos autorizados para operar con el TPV.

#### Nombre

Es el nombre comprensible para el personal, por ejemplo:

- Caja barra;
- Caja terraza;
- Pantalla cocina;
- KDS postres.

#### Código

Es un identificador interno único, por ejemplo `CAJA_BARRA_01`.

Solo se establece al crear el dispositivo y después no puede modificarse.

#### Tipo

Existen tres tipos:

- **Caja**: se utiliza en Terminal y Caja para crear pedidos, cobrar y controlar el turno.
- **Pantalla de cocina**: se utiliza en Cocina para recibir comandas.
- **Administración**: identifica dispositivos de backoffice. Actualmente no existe una vista operativa que necesite seleccionar este tipo.

#### Versión de la aplicación

Permite registrar qué versión del software utiliza el dispositivo. Es útil para soporte y diagnóstico, pero no actualiza automáticamente el equipo.

Los dispositivos pueden estar activos o revocados. Terminal y Cocina solo muestran dispositivos activos.

### Áreas

Divide físicamente el establecimiento.

Ejemplos:

- Salón;
- Terraza;
- Barra;
- Planta superior;
- Reservado.

Campos:

- **Nombre**: nombre visible para el personal.
- **Orden**: posición en la que aparecerá; los números menores aparecen primero.
- **Activo**: permite ocultar el área sin borrar su histórico.

Las áreas deben crearse antes que las mesas.

### Mesas

Representa las mesas disponibles en cada área.

Campos:

- **Nombre**: por ejemplo, Mesa 1, Barra 3 o Terraza 8.
- **Área**: zona a la que pertenece.
- **Capacidad**: número de comensales.
- **Orden**: posición en el listado.
- **Activo**: permite retirar temporalmente una mesa sin borrar su histórico.

En Terminal, una mesa puede aparecer libre u ocupada. Al seleccionar una mesa libre se crea un pedido; al seleccionar una ocupada se recupera su pedido abierto.

### Categorías

Organiza los productos de la carta.

Ejemplos:

- Entrantes;
- Hamburguesas;
- Pizzas;
- Bebidas;
- Postres.

Campos:

- **Nombre**.
- **Color**: ayuda a identificar visualmente la categoría.
- **Orden**.
- **Activo**.

Debe existir al menos una categoría antes de añadir productos a la carta.

### Carta

Contiene los productos que se venden desde Terminal.

#### Nombre

Nombre mostrado al personal y en el pedido.

#### Categoría

Determina dónde aparece el producto dentro de la carta.

#### Precio con impuestos

Precio final del producto antes de añadir modificadores.

#### Impuesto

Porcentaje de IVA utilizado para calcular la base imponible y la cuota fiscal.

#### Controlar existencias

Indica si vender el artículo debe descontar ingredientes del inventario.

- **Desactivado**: se vende sin afectar a las existencias.
- **Activado**: al completar la venta se utiliza su receta para calcular el consumo.

#### Receta

Conecta el producto de la carta con una elaboración de **Artículos**.

Ejemplo:

```text
Hamburguesa completa
├── 180 g de carne
├── 1 pan
├── 20 g de queso
└── 30 g de salsa
```

Cuando se controla el stock, la receta es obligatoria. Esta relación permite calcular consumo, coste y margen.

#### Estación de cocina

Decide a qué zona se envía la comanda.

Ejemplos:

- una cerveza se envía a Barra;
- una hamburguesa se envía a Cocina caliente;
- una tarta se envía a Postres.

Si no se asigna una estación, el artículo no queda dirigido a una zona de preparación concreta.

#### Grupos de modificadores

Permite asociar extras u opciones al producto.

Ejemplos:

- punto de la carne;
- tipo de pan;
- extras;
- salsas.

Se pueden asociar varios grupos manteniendo `Ctrl` o `⌘` durante la selección.

#### Orden

Posición del producto dentro de su categoría.

#### Activo

Permite retirar temporalmente el producto de la venta sin eliminar su histórico.

El backend también admite descripción, SKU e imagen, pero actualmente esos campos no aparecen en este formulario.

### Modificadores

Son opciones que el personal elige al añadir un producto.

Ejemplos:

- Sin cebolla;
- Extra de queso `+1,00 €`;
- Tamaño grande `+2,00 €`;
- Poco hecha, al punto o muy hecha;
- Leche normal, sin lactosa o vegetal.

#### Nombre

Nombre del grupo, por ejemplo, Punto de la carne.

#### Selecciones mínimas

Número mínimo de opciones que deben seleccionarse.

#### Selecciones máximas

Número máximo de opciones permitidas.

#### Obligatorio

Obliga a elegir al menos una opción.

#### Opciones

Cada opción incluye:

- nombre;
- variación de precio;
- estado activo o inactivo;
- orden.

Ejemplo de selección única:

```text
Grupo: Tamaño
Mínimo: 1
Máximo: 1
Obligatorio: sí

Normal    +0,00 €
Grande    +2,00 €
```

Ejemplo de selección múltiple:

```text
Grupo: Extras
Mínimo: 0
Máximo: 3
Obligatorio: no

Queso extra    +1,00 €
Bacon          +1,50 €
Huevo          +1,20 €
```

### Estaciones de cocina

Representa los puntos de preparación.

Ejemplos:

- Cocina caliente;
- Freidora;
- Barra;
- Postres;
- Cafetería.

Campos:

- **Nombre**.
- **Orden**.
- **Activo**.

Después se asigna cada producto de la carta a una estación. La pantalla Cocina puede filtrar las comandas utilizando estas estaciones.

## Orden recomendado de configuración

1. Completar **General**.
2. Crear al menos un dispositivo tipo **Caja**.
3. Crear dispositivos tipo **Pantalla de cocina** si se utilizará KDS.
4. Crear **Áreas**.
5. Crear **Mesas**.
6. Crear **Estaciones de cocina**.
7. Crear **Categorías**.
8. Crear **Modificadores**.
9. Crear productos en **Carta**, vinculando receta, estación y modificadores.
10. Habilitar el TPV.
11. Abrir la sesión desde **Caja**.
12. Comenzar a vender desde **Terminal**.

## Flujo operativo resumido

```text
Configuración
    ↓
Apertura de Caja
    ↓
Terminal: crear pedido
    ↓
Enviar a Cocina
    ↓
Cocina: preparar y servir
    ↓
Terminal: cobrar y finalizar
    ↓
Historial e Informes
    ↓
Cierre de Caja
```
