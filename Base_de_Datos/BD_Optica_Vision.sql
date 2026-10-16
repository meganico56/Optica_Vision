create database optica_vision;
use optica_vision;



create table rol (
    id_rol int auto_increment primary key,
    nombre_rol varchar(50) not null,
    descripcion varchar(150) not null,
    es_personal boolean not null default false,
    unique key uq_rol_nombre (nombre_rol)
);


create table usuario (
    id_usuario int auto_increment primary key,
    nombre varchar(100) not null,
    apellido varchar(100) not null,
    tipo_documento enum('C.C.', 'T.I.', 'R.C.', 'C.E.', 'PAS') not null,
    num_documento varchar(20) not null,
    telefono varchar(20) not null,
    correo varchar(100),
    direccion varchar(150),
    ciudad varchar(60),
    fecha_nacimiento date,
    contrasena varchar(100),
    correo_verificado boolean not null default false,
    fecha_registro datetime not null default current_timestamp,
    estado enum('Activo', 'Inactivo') not null default 'Activo',
    id_rol int not null,
    foreign key (id_rol) references rol(id_rol),
    unique key uq_usuario_correo (correo),
    unique key uq_usuario_documento (tipo_documento, num_documento)
);


create table acudiente (
    id_acudiente int auto_increment primary key,
    nombre varchar(100) not null,
    apellido varchar(100) not null,
    tipo_documento enum('C.C.', 'C.E.', 'PAS') not null,
    num_documento varchar(20) not null,
    telefono varchar(20) not null,
    correo varchar(100),
    parentesco enum('Madre', 'Padre', 'Tutor legal', 'Otro') not null,
    id_menor int not null,
    foreign key (id_menor) references usuario(id_usuario),
    unique key uq_acudiente_menor (id_acudiente, id_menor),
    unique key uq_acudiente_documento (id_menor, tipo_documento, num_documento)
);


create table consentimiento_datos (
    id_consentimiento int auto_increment primary key,
    tipo enum('Datos personales', 'Datos de salud', 'Comunicaciones comerciales') not null,
    version_politica varchar(20) not null,
    aceptado boolean not null,
    fecha_aceptacion datetime not null default current_timestamp,
    medio enum('Web', 'Presencial') not null,
    id_usuario int not null,
    id_acudiente int,
    foreign key (id_usuario) references usuario(id_usuario),
    foreign key (id_acudiente, id_usuario) references acudiente(id_acudiente, id_menor),
    unique key uq_consentimiento (id_usuario, tipo, version_politica)
);


create table recup_contraseña (
    id_token int auto_increment primary key,
    token_hash varchar(100) not null,
    fecha_creacion datetime not null default current_timestamp,
    fecha_expiracion datetime not null,
    usado boolean not null default false,
    id_usuario int not null,
    foreign key (id_usuario) references usuario(id_usuario),
    unique key uq_token_hash (token_hash)
);


create table marca (
    id_marca int auto_increment primary key,
    nombre varchar(100) not null,
    pais_origen varchar(50),
    estado enum('Activo', 'Inactivo') not null default 'Activo',
    unique key uq_marca_nombre (nombre)
);


create table categoria (
    id_categoria int auto_increment primary key,
    nombre varchar(100) not null,
    descripcion varchar(150),
    estado enum('Activo', 'Inactivo') not null default 'Activo',
    unique key uq_categoria_nombre (nombre)
);


create table producto (
    id_producto int auto_increment primary key,
    sku varchar(30) not null,
    nombre varchar(100) not null,
    descripcion varchar(150) not null,
    precio decimal(10,2) not null,
    costo_compra decimal(10,2) not null default 0,
    imagen varchar(150) not null,
    material varchar(50),
    color varchar(50),
    calibre varchar(20),
    genero enum('Hombre', 'Mujer', 'Unisex', 'Infantil') not null default 'Unisex',
    existencia_actual int not null default 0,
    existencia_minima int not null default 5,
    maneja_inventario boolean not null default true,
    requiere_receta boolean not null default false,
    meses_garantia tinyint not null default 0,
    id_categoria int not null,
    id_marca int not null,
    estado enum('Activo', 'Inactivo') not null default 'Activo',
    foreign key (id_categoria) references categoria(id_categoria),
    foreign key (id_marca) references marca(id_marca),
    unique key uq_producto_sku (sku),
    unique key uq_producto_nombre_marca (nombre, id_marca),
    check (precio >= 0),
    check (existencia_actual >= 0)
);


create table imagen_producto (
    id_imagen int auto_increment primary key,
    ruta varchar(150) not null,
    orden tinyint not null default 1,
    id_producto int not null,
    foreign key (id_producto) references producto(id_producto),
    unique key uq_imagen_orden (id_producto, orden)
);


create table proveedor (
    codigo_proveedor int auto_increment primary key,
    nombre varchar(100) not null,
    nit varchar(20) not null,
    telefono varchar(20) not null,
    correo varchar(100) not null,
    direccion varchar(150) not null,
    estado enum('Activo', 'Inactivo') not null default 'Activo',
    unique key uq_proveedor_nit (nit)
);


create table compra (
    numero_compra int auto_increment primary key,
    fecha datetime not null,
    numero_comprobante varchar(50) not null,
    sub_total decimal(12,2) not null default 0,
    impuesto decimal(12,2) not null default 0,
    total decimal(12,2) as (sub_total + impuesto) stored,
    estado enum('Pendiente', 'Confirmada', 'Cancelada') not null default 'Pendiente',
    observaciones varchar(255),
    codigo_proveedor int not null,
    id_usuario int not null,
    foreign key (codigo_proveedor) references proveedor(codigo_proveedor),
    foreign key (id_usuario) references usuario(id_usuario),
    unique key uq_compra_comprobante (codigo_proveedor, numero_comprobante)
);


create table detalle_compra (
    id_detalle_compra int auto_increment primary key,
    cantidad int not null,
    precio_unitario decimal(10,2) not null,
    subtotal decimal(12,2) as (cantidad * precio_unitario) stored,
    id_producto int not null,
    numero_compra int not null,
    foreign key (id_producto) references producto(id_producto),
    foreign key (numero_compra) references compra(numero_compra),
    unique key uq_detalle_compra_producto (numero_compra, id_producto),
    check (cantidad > 0)
);


create table cita (
    id_cita int auto_increment primary key,
    fecha_hora datetime not null,
    duracion_minutos int not null default 30,
    motivo varchar(150) not null,
    canal enum('Web', 'Presencial', 'Telefono') not null default 'Presencial',
    estado enum('Programada', 'Confirmada', 'Completada', 'Cancelada', 'No asistio') not null default 'Programada',
    observaciones varchar(255),
    id_cliente int not null,
    id_usuario_atiende int,
    foreign key (id_cliente) references usuario(id_usuario),
    foreign key (id_usuario_atiende) references usuario(id_usuario),
    unique key uq_cita_cliente (id_cita, id_cliente),
    check (duracion_minutos > 0)
);


create table receta_optica (
    id_receta int auto_increment primary key,
    tipo_receta enum('Gafas', 'Lentes de contacto', 'Ambos') not null default 'Gafas',
    fecha_emision date not null,
    fecha_vencimiento date not null,
    od_esfera decimal(4,2),
    od_cilindro decimal(4,2),
    od_eje int,
    od_adicion decimal(3,2),
    oi_esfera decimal(4,2),
    oi_cilindro decimal(4,2),
    oi_eje int,
    oi_adicion decimal(3,2),
    distancia_pupilar decimal(4,1),
    dp_od decimal(3,1),
    dp_oi decimal(3,1),
    altura_od decimal(3,1),
    altura_oi decimal(3,1),
    od_curva_base decimal(3,1),
    od_diametro decimal(3,1),
    oi_curva_base decimal(3,1),
    oi_diametro decimal(3,1),
    diagnostico varchar(150),
    entidad_examinadora varchar(150) not null,
    nombre_optometra_externo varchar(150) not null,
    registro_profesional varchar(30),
    archivo_formula varchar(255),
    observaciones varchar(255),
    id_cliente int not null,
    id_cita int not null,
    id_usuario_registra int not null,
    foreign key (id_cliente) references usuario(id_usuario),
    foreign key (id_cita, id_cliente) references cita(id_cita, id_cliente),
    foreign key (id_usuario_registra) references usuario(id_usuario),
    unique key uq_receta_cita (id_cita),
    unique key uq_receta_cliente (id_receta, id_cliente),
    check (fecha_vencimiento >= fecha_emision)
);


create table promocion (
    codigo_promocion int auto_increment primary key,
    nombre varchar(100) not null,
    descripcion varchar(150),
    tipo_descuento enum('Porcentaje', 'Valor fijo') not null,
    valor_descuento decimal(10,2) not null,
    fecha_inicio date not null,
    fecha_fin date not null,
    estado enum('Activo', 'Inactivo') not null default 'Activo',
    check (fecha_fin >= fecha_inicio)
);


create table venta (
    codigo_venta int auto_increment primary key,
    numero_factura varchar(30),
    fecha datetime not null default current_timestamp,
    canal enum('Mostrador', 'Web') not null default 'Mostrador',
    subtotal decimal(12,2) not null default 0,
    descuento decimal(12,2) not null default 0,
    impuesto decimal(12,2) not null default 0,
    total decimal(12,2) as (subtotal - descuento + impuesto) stored,
    estado enum('Pendiente', 'Pagada', 'Anulada') not null default 'Pendiente',
    observaciones varchar(255),
    id_cliente int not null,
    codigo_promocion int,
    id_receta int,
    id_usuario int,
    foreign key (id_cliente) references usuario(id_usuario),
    foreign key (codigo_promocion) references promocion(codigo_promocion),
    foreign key (id_receta, id_cliente) references receta_optica(id_receta, id_cliente),
    foreign key (id_usuario) references usuario(id_usuario),
    unique key uq_venta_factura (numero_factura),
    unique key uq_venta_cliente (codigo_venta, id_cliente),
    check (descuento <= subtotal)
);


create table detalle_venta (
    codigo_detalle_venta int auto_increment primary key,
    cantidad int not null,
    precio_unitario decimal(10,2) not null,
    subtotal decimal(12,2) as (cantidad * precio_unitario) stored,
    codigo_venta int not null,
    id_producto int not null,
    foreign key (codigo_venta) references venta(codigo_venta),
    foreign key (id_producto) references producto(id_producto),
    unique key uq_detalle_venta_producto (codigo_venta, id_producto),
    check (cantidad > 0)
);


create table devolucion (
    id_devolucion int auto_increment primary key,
    fecha datetime not null default current_timestamp,
    motivo enum('Producto defectuoso', 'Cambio de formula', 'Ajuste o talla incorrecta', 'Cliente se arrepintio', 'Otro') not null,
    cantidad int not null,
    destino enum('Vuelve a inventario', 'Descarte', 'Devuelto a proveedor') not null,
    valor_devuelto decimal(12,2) not null default 0,
    observaciones varchar(255),
    codigo_detalle_venta int not null,
    id_usuario int not null,
    foreign key (codigo_detalle_venta) references detalle_venta(codigo_detalle_venta),
    foreign key (id_usuario) references usuario(id_usuario),
    check (cantidad > 0)
);


create table nota_credito (
    id_nota_credito int auto_increment primary key,
    fecha_emision datetime not null default current_timestamp,
    valor decimal(12,2) not null,
    fecha_vencimiento date not null,
    estado enum('Vigente', 'Redimida', 'Vencida') not null default 'Vigente',
    id_devolucion int not null,
    foreign key (id_devolucion) references devolucion(id_devolucion),
    unique key uq_nota_devolucion (id_devolucion),
    check (valor > 0)
);


create table pago (
    id_pago int auto_increment primary key,
    fecha datetime not null default current_timestamp,
    metodo_pago enum('Efectivo', 'Tarjeta debito', 'Tarjeta credito', 'Transferencia', 'Nequi', 'Daviplata', 'PSE', 'Nota credito') not null,
    monto decimal(12,2) not null,
    cuotas tinyint not null default 1,
    referencia varchar(100),
    estado enum('Aprobado', 'Pendiente', 'Rechazado') not null default 'Aprobado',
    codigo_venta int not null,
    id_nota_credito int,
    foreign key (codigo_venta) references venta(codigo_venta),
    foreign key (id_nota_credito) references nota_credito(id_nota_credito),
    unique key uq_pago_nota (id_nota_credito),
    check (monto > 0)
);


create table movimiento_inventario (
    id_movimiento int auto_increment primary key,
    fecha datetime not null default current_timestamp,
    tipo enum('Inventario inicial', 'Compra', 'Venta', 'Devolucion de cliente', 'Anulacion de venta', 'Anulacion de compra', 'Merma', 'Ajuste') not null,
    cantidad int not null,
    observaciones varchar(255),
    id_producto int not null,
    id_usuario int,
    numero_compra int,
    codigo_venta int,
    id_devolucion int,
    foreign key (id_producto) references producto(id_producto),
    foreign key (id_usuario) references usuario(id_usuario),
    foreign key (numero_compra) references compra(numero_compra),
    foreign key (codigo_venta) references venta(codigo_venta),
    foreign key (id_devolucion) references devolucion(id_devolucion),
    check (cantidad <> 0)
);


create table orden_trabajo (
    id_orden int auto_increment primary key,
    fecha_creacion datetime not null default current_timestamp,
    tipo_lente enum('Monofocal', 'Bifocal', 'Progresivo', 'Ocupacional') not null,
    tratamiento varchar(100),
    laboratorio varchar(100),
    fecha_promesa date not null,
    fecha_entrega datetime,
    estado enum('Pendiente', 'En laboratorio', 'Listo para entrega', 'Entregado', 'Cancelado') not null default 'Pendiente',
    observaciones varchar(255),
    id_cliente int not null,
    id_venta int not null,
    id_receta int not null,
    id_producto_montura int,
    id_usuario_registra int not null,
    foreign key (id_cliente) references usuario(id_usuario),
    foreign key (id_venta, id_cliente) references venta(codigo_venta, id_cliente),
    foreign key (id_receta, id_cliente) references receta_optica(id_receta, id_cliente),
    foreign key (id_producto_montura) references producto(id_producto),
    foreign key (id_usuario_registra) references usuario(id_usuario)
);


create table carrito (
    id_carrito int auto_increment primary key,
    fecha_creacion datetime not null default current_timestamp,
    estado enum('Activo', 'Convertido', 'Abandonado') not null default 'Activo',
    id_cliente int not null,
    codigo_venta int,
    foreign key (id_cliente) references usuario(id_usuario),
    foreign key (codigo_venta) references venta(codigo_venta),
    unique key uq_carrito_venta (codigo_venta)
);


create table detalle_carrito (
    id_detalle_carrito int auto_increment primary key,
    cantidad int not null,
    id_carrito int not null,
    id_producto int not null,
    foreign key (id_carrito) references carrito(id_carrito),
    foreign key (id_producto) references producto(id_producto),
    unique key uq_detalle_carrito_producto (id_carrito, id_producto),
    check (cantidad > 0)
);


create table favorito (
    id_cliente int not null,
    id_producto int not null,
    fecha_agregado datetime not null default current_timestamp,
    primary key (id_cliente, id_producto),
    foreign key (id_cliente) references usuario(id_usuario),
    foreign key (id_producto) references producto(id_producto)
);




insert into rol (nombre_rol, descripcion, es_personal) values
('Administrador', 'Administra la optica: usuarios, catalogo, compras y reportes', true),
('Vendedor', 'Atiende clientes y registra ventas en el punto de venta', true),
('Cliente', 'Persona que agenda citas, recibe formulas y compra productos en la optica', false);


-- Usuarios 1 a 3: personal. Usuarios 4 a 8: clientes (7 y 8 son menores de edad)
insert into usuario (nombre, apellido, tipo_documento, num_documento, telefono, correo, direccion, ciudad, fecha_nacimiento, contrasena, correo_verificado, fecha_registro, estado, id_rol) values
('Camila', 'Torres', 'C.C.', '1032987651', '3115557890', 'camila.torres@boutiquevision.com', null, 'Bogotá', null, '$2b$10$VimUxLrTF27lzO0u1k2qpO2FmSWDfEAZn7ODazomWF7il1qapY3SG', true, '2026-07-01 08:00:00', 'Activo', 1),
('Andrés', 'Ramírez', 'C.C.', '1019456782', '3124448821', 'andres.ramirez@boutiquevision.com', null, 'Bogotá', null, '$2b$10$6TuJGK7pnHzOn3O47MLiNuoM/rVYqo6mB2kLSsXN5KcvybUgA5iF2', true, '2026-07-01 08:00:00', 'Activo', 2),
('Diana', 'Castillo', 'C.C.', '1026773401', '3138812345', 'diana.castillo@boutiquevision.com', null, 'Bogotá', null, '$2b$10$QBf.QjHoStrbRhfXVvIK.OX8lAqVfQiPnvrL1EEt3vtdZfqiW.w/q', true, '2026-07-01 08:00:00', 'Activo', 2),
('Sofía', 'Herrera', 'C.C.', '1032456789', '3201234567', 'sofia.herrera@gmail.com', 'Cra 45 #12-30', 'Bogotá', '1996-03-14', '$2b$10$0YOM74TV59TEn/z73QMgNe9/m7cLb1mt/EzTMuk5.4wjfhTX.pfXm', true, '2026-08-05 10:00:00', 'Activo', 3),
('Mateo', 'Rojas', 'C.C.', '1098765432', '3112345678', 'mateo.rojas@gmail.com', 'Cll 80 #22-15', 'Bogotá', '1990-11-02', '$2b$10$PD2fASr/bzOQkYEPWMjDuu8I9RRdG0Fb8asd713lwdOzd77Vv3Hvu', true, '2026-08-19 14:00:00', 'Activo', 3),
('Valentina', 'Cruz', 'C.C.', '52741369', '3023456789', 'valentina.cruz@gmail.com', 'Cra 7 #63-20', 'Bogotá', '1985-06-23', '$2b$10$RA91b67ZH0L7sSZlkTAmZeTpZp6wCcVyygg72bwnJXB5Q5nZpwQDW', true, '2026-08-14 14:30:00', 'Activo', 3),
('Santiago', 'Molina', 'T.I.', '1015987456', '3134567890', 'contacto.molina@gmail.com', 'Cll 19 #4-56', 'Bogotá', '2010-09-30', null, false, '2026-08-19 10:00:00', 'Activo', 3),
('Isabella', 'Gómez', 'T.I.', '1100456321', '3145556677', 'contacto.gomez@gmail.com', 'Cra 30 #45-10', 'Bogotá', '2013-04-12', null, false, '2026-10-10 11:00:00', 'Activo', 3);


insert into acudiente (nombre, apellido, tipo_documento, num_documento, telefono, correo, parentesco, id_menor) values
('Laura', 'Molina', 'C.C.', '52987456', '3134567890', 'laura.molina@gmail.com', 'Madre', 7),
('Jorge', 'Molina', 'C.C.', '80123456', '3167778899', 'jorge.molina@gmail.com', 'Padre', 7),
('Carlos', 'Gómez', 'C.C.', '79654321', '3145556677', 'carlos.gomez@gmail.com', 'Padre', 8);


insert into consentimiento_datos (tipo, version_politica, aceptado, fecha_aceptacion, medio, id_usuario, id_acudiente) values
('Datos personales', 'v1.0', true, '2026-08-05 10:00:00', 'Presencial', 4, null),
('Datos de salud', 'v1.0', true, '2026-08-05 10:00:00', 'Presencial', 4, null),
('Comunicaciones comerciales', 'v1.0', true, '2026-08-05 10:00:00', 'Presencial', 4, null),
('Datos personales', 'v1.0', true, '2026-08-19 14:00:00', 'Web', 5, null),
('Datos de salud', 'v1.0', true, '2026-08-19 14:00:00', 'Web', 5, null),
('Datos personales', 'v1.0', true, '2026-08-14 14:30:00', 'Presencial', 6, null),
('Datos de salud', 'v1.0', true, '2026-08-14 14:30:00', 'Presencial', 6, null),
('Comunicaciones comerciales', 'v1.0', false, '2026-08-14 14:30:00', 'Presencial', 6, null),
('Datos personales', 'v1.0', true, '2026-08-19 10:00:00', 'Presencial', 7, 1),
('Datos de salud', 'v1.0', true, '2026-08-19 10:00:00', 'Presencial', 7, 1),
('Datos personales', 'v1.0', true, '2026-10-10 11:00:00', 'Web', 8, 3),
('Datos de salud', 'v1.0', true, '2026-10-10 11:00:00', 'Web', 8, 3);


insert into token_recuperacion (token_hash, fecha_creacion, fecha_expiracion, usado, id_usuario) values
(sha2('token-prueba-sofia', 256), '2026-09-01 10:00:00', '2026-09-01 11:00:00', true, 4),
(sha2('token-prueba-mateo', 256), '2026-10-10 18:30:00', '2026-10-10 19:30:00', false, 5),
(sha2('token-prueba-valentina', 256), '2026-10-16 09:00:00', '2026-10-16 10:00:00', false, 6);


insert into marca (nombre, pais_origen, estado) values
('Ray-Ban', 'Italia', 'Activo'),
('Vogue Eyewear', 'Italia', 'Activo'),
('Essilor', 'Francia', 'Activo'),
('Acuvue', 'Estados Unidos', 'Activo'),
('Boutique de la Visión (marca propia)', 'Colombia', 'Activo');


insert into categoria (nombre, descripcion, estado) values
('Monturas', 'Armazones para lentes oftálmicos', 'Activo'),
('Gafas de sol', 'Gafas con protección UV, con o sin fórmula', 'Activo'),
('Lentes de contacto', 'Lentes de contacto blandos y rígidos', 'Activo'),
('Lentes oftálmicos', 'Cristales graduados para montar en armazón', 'Activo'),
('Soluciones de limpieza', 'Líquidos y accesorios de mantenimiento', 'Activo'),
('Accesorios', 'Estuches, cordones y paños de limpieza', 'Activo');


-- existencia_actual ya refleja los movimientos de inventario de abajo
insert into producto (sku, nombre, descripcion, precio, costo_compra, imagen, material, color, calibre, genero, existencia_actual, existencia_minima, maneja_inventario, requiere_receta, meses_garantia, id_categoria, id_marca) values
('MON-0001', 'Montura clásica acetato negro', 'Montura de pasta color negro, forma rectangular', 180000.00, 95000.00, 'montura-clasica-negro.png', 'Acetato', 'Negro', '52-18-145', 'Unisex', 19, 5, true, false, 12, 1, 2),
('MON-0002', 'Montura metálica redonda', 'Montura metálica ultraliviana, forma redonda', 320000.00, 160000.00, 'montura-metalica-redonda.png', 'Metal', 'Dorado', '49-20-140', 'Unisex', 13, 5, true, false, 12, 1, 1),
('SOL-0001', 'Gafa de sol aviador', 'Gafa de sol clásica estilo aviador con protección UV400', 350000.00, 180000.00, 'gafa-sol-aviador.png', 'Metal', 'Dorado', '58-14-135', 'Hombre', 0, 5, true, false, 12, 2, 1),
('SOL-0002', 'Gafa de sol oversized', 'Gafa de sol de pasta, montura grande, protección UV400', 250000.00, 120000.00, 'gafa-sol-oversized.png', 'Acetato', 'Carey', '56-17-140', 'Mujer', 15, 5, true, false, 12, 2, 2),
('LCO-0001', 'Lentes de contacto mensuales', 'Caja x6 lentes de contacto blandos de uso mensual', 85000.00, 45000.00, 'lentes-contacto-mensual.png', null, null, null, 'Unisex', 48, 10, true, true, 0, 3, 4),
('LOF-0001', 'Lente oftálmico antirreflejo', 'Par de cristales graduados con tratamiento antirreflejo', 220000.00, 110000.00, 'lente-antireflejo.png', null, null, null, 'Unisex', 0, 0, false, true, 6, 4, 3),
('LIM-0001', 'Líquido limpiador para lentes de contacto', 'Solución multipropósito 355ml para lentes de contacto', 32000.00, 15000.00, 'liquido-limpiador.png', null, null, null, 'Unisex', 29, 10, true, false, 0, 5, 4),
('ACC-0001', 'Estuche rígido para gafas', 'Estuche rígido acolchado, protege armazón y lentes', 18000.00, 7000.00, 'estuche-rigido.png', null, null, null, 'Unisex', 25, 8, true, false, 0, 6, 5),
('ACC-0002', 'Paño de microfibra', 'Paño de microfibra para limpieza de lentes', 8000.00, 2500.00, 'pano-microfibra.png', null, null, null, 'Unisex', 38, 15, true, false, 0, 6, 5);


insert into imagen_producto (ruta, orden, id_producto) values
('montura-clasica-negro-lateral.png', 1, 1),
('montura-clasica-negro-frontal.png', 2, 1),
('montura-metalica-redonda-lateral.png', 1, 2),
('gafa-sol-aviador-frontal.png', 1, 3);


insert into proveedor (nombre, nit, telefono, correo, direccion, estado) values
('Distribuciones Ópticas del Norte S.A.S.', '900123456-1', '6017894521', 'ventas@distribucionesnorte.com', 'Cra 15 #93-42, Bogotá', 'Activo'),
('Import Visión Ltda.', '900234567-2', '6013321098', 'contacto@importvision.com', 'Cll 72 #10-34, Bogotá', 'Activo'),
('Accesorios Ópticos Andinos S.A.S.', '900345678-3', '6015550199', 'pedidos@andinosopticos.com', 'Cra 13 #45-20, Bogotá', 'Activo');


insert into compra (fecha, numero_comprobante, sub_total, impuesto, estado, observaciones, codigo_proveedor, id_usuario) values
('2026-07-05 09:20:00', 'FE-1001', 4300000.00, 817000.00, 'Confirmada', 'Reposición de monturas', 1, 1),
('2026-07-12 11:05:00', 'FE-2044', 2700000.00, 513000.00, 'Confirmada', 'Lentes de contacto y solución', 2, 1),
('2026-08-01 08:40:00', 'FE-1050', 1800000.00, 342000.00, 'Pendiente', 'A la espera de confirmación del proveedor', 1, 1),
('2026-08-10 15:00:00', 'FE-3012', 250000.00, 47500.00, 'Cancelada', 'Cancelada por falta de existencias del proveedor', 3, 1);


insert into detalle_compra (cantidad, precio_unitario, id_producto, numero_compra) values
(20, 95000.00, 1, 1),
(15, 160000.00, 2, 1),
(50, 45000.00, 5, 2),
(30, 15000.00, 7, 2),
(10, 180000.00, 3, 3),
(100, 2500.00, 9, 4);


insert into cita (fecha_hora, duracion_minutos, motivo, canal, estado, observaciones, id_cliente, id_usuario_atiende) values
('2026-08-10 09:00:00', 30, 'Entrega de resultados de examen visual y asesoría de montura', 'Presencial', 'Completada', 'La cliente trae resultados con miopía y astigmatismo leve, se registra receta', 4, 2),
('2026-08-14 15:00:00', 30, 'Entrega de resultados de examen visual', 'Web', 'Completada', 'La cliente trae resultados con hipermetropía y presbicia, se recomienda lente progresivo', 6, 3),
('2026-08-19 10:30:00', 30, 'Entrega de resultados de examen visual pediátrico', 'Presencial', 'Completada', 'Paciente menor de edad acompañado por su acudiente, se registra receta con vigencia reducida', 7, 2),
('2026-10-20 11:00:00', 30, 'Primera asesoría para elección de montura', 'Web', 'Programada', null, 5, null),
('2026-09-21 09:00:00', 30, 'Control de seguimiento', 'Telefono', 'Cancelada', 'La cliente reprogramará más adelante', 4, 2),
('2026-10-22 15:00:00', 30, 'Primera asesoría para elección de montura', 'Presencial', 'Confirmada', 'Asistirá con su acudiente', 8, 2);


-- Vigencia: 12 meses para adultos y 6 meses para menores de 18
insert into receta_optica (tipo_receta, fecha_emision, fecha_vencimiento, od_esfera, od_cilindro, od_eje, od_adicion, oi_esfera, oi_cilindro, oi_eje, oi_adicion, distancia_pupilar, dp_od, dp_oi, altura_od, altura_oi, od_curva_base, od_diametro, oi_curva_base, oi_diametro, diagnostico, entidad_examinadora, nombre_optometra_externo, registro_profesional, observaciones, id_cliente, id_cita, id_usuario_registra) values
('Gafas', '2026-08-06', '2027-08-06', -2.25, -0.50, 180, null, -2.00, -0.75, 175, null, 62.0, null, null, null, null, null, null, null, null, 'Miopía y astigmatismo leve', 'Centro de Optometría VisiónTotal S.A.S.', 'Julián Vargas', 'RP-45213', 'Control en un año', 4, 1, 2),
('Ambos', '2026-08-12', '2027-08-12', 1.00, null, null, 1.75, 1.25, null, null, 1.75, 60.5, 30.5, 30.0, 22.0, 22.0, 8.6, 14.2, 8.6, 14.2, 'Hipermetropía y presbicia', 'Centro de Optometría VisiónTotal S.A.S.', 'Julián Vargas', 'RP-45213', 'Recomendado lente progresivo', 6, 2, 3),
('Gafas', '2026-08-18', '2027-02-18', -1.00, -0.25, 90, null, -1.25, -0.25, 85, null, 55.0, null, null, null, null, null, null, null, null, 'Miopía leve bilateral', 'Centro de Optometría VisiónTotal S.A.S.', 'Julián Vargas', 'RP-45213', 'Paciente pediátrico, control cada 6 meses', 7, 3, 2);


insert into promocion (nombre, descripcion, tipo_descuento, valor_descuento, fecha_inicio, fecha_fin, estado) values
('Segunda montura al 50%', 'Al comprar una montura, la segunda tiene 50% de descuento', 'Porcentaje', 50.00, '2026-07-01', '2026-12-31', 'Activo'),
('Descuento fidelidad', 'Descuento fijo para clientes frecuentes', 'Valor fijo', 20000.00, '2026-01-01', '2026-12-31', 'Activo'),
('Lentes de contacto al 10%', 'Descuento en lentes de contacto mensuales durante el último trimestre', 'Porcentaje', 10.00, '2026-10-01', '2026-12-31', 'Activo');


insert into venta (numero_factura, fecha, canal, subtotal, descuento, impuesto, estado, id_cliente, codigo_promocion, id_receta, id_usuario) values
('FV-0001', '2026-08-18 10:15:00', 'Mostrador', 400000.00, 0, 0, 'Pagada', 4, null, 1, 2),
('FV-0002', '2026-08-19 14:30:00', 'Mostrador', 250000.00, 0, 0, 'Pagada', 5, null, null, 3),
('FV-0003', '2026-08-20 09:00:00', 'Mostrador', 202000.00, 0, 0, 'Pagada', 6, null, 2, 2),
('FV-0004', '2026-08-21 16:45:00', 'Mostrador', 540000.00, 20000.00, 0, 'Pagada', 7, 2, 3, 1),
('FV-0005', '2026-09-05 19:20:00', 'Web', 48000.00, 0, 0, 'Pagada', 4, null, null, null),
('FV-0006', '2026-10-05 11:00:00', 'Mostrador', 540000.00, 0, 0, 'Pagada', 6, null, 2, 3);


insert into detalle_venta (cantidad, precio_unitario, codigo_venta, id_producto) values
(1, 180000.00, 1, 1),
(1, 220000.00, 1, 6),
(1, 250000.00, 2, 4),
(2, 85000.00, 3, 5),
(1, 32000.00, 3, 7),
(1, 320000.00, 4, 2),
(1, 220000.00, 4, 6),
(1, 32000.00, 5, 7),
(2, 8000.00, 5, 9),
(1, 320000.00, 6, 2),
(1, 220000.00, 6, 6);


insert into devolucion (fecha, motivo, cantidad, destino, valor_devuelto, observaciones, codigo_detalle_venta, id_usuario) values
('2026-08-26 15:00:00', 'Producto defectuoso', 1, 'Devuelto a proveedor', 250000.00, 'El cliente reportó que la gafa llegó con la bisagra floja; se genera nota de crédito', 3, 3),
('2026-08-28 11:30:00', 'Cliente se arrepintio', 1, 'Vuelve a inventario', 32000.00, 'Producto sellado, regresa al inventario; se genera nota de crédito', 5, 2),
('2026-09-01 10:00:00', 'Cambio de formula', 1, 'Descarte', 85000.00, 'Caja abierta, no se puede reingresar; se genera nota de crédito', 4, 2);


insert into nota_credito (fecha_emision, valor, fecha_vencimiento, estado, id_devolucion) values
('2026-08-26 15:05:00', 250000.00, '2027-08-26', 'Vigente', 1),
('2026-08-28 11:35:00', 32000.00, '2027-08-28', 'Vigente', 2),
('2026-09-01 10:05:00', 85000.00, '2027-09-01', 'Redimida', 3);


insert into pago (fecha, metodo_pago, monto, cuotas, referencia, estado, codigo_venta, id_nota_credito) values
('2026-08-18 10:20:00', 'Tarjeta credito', 400000.00, 3, 'AUT-88231', 'Aprobado', 1, null),
('2026-08-19 14:35:00', 'Efectivo', 250000.00, 1, null, 'Aprobado', 2, null),
('2026-08-20 09:05:00', 'Tarjeta debito', 150000.00, 1, 'AUT-77410', 'Aprobado', 3, null),
('2026-08-20 09:06:00', 'Efectivo', 52000.00, 1, null, 'Aprobado', 3, null),
('2026-08-21 16:50:00', 'Transferencia', 300000.00, 1, 'TRX-556021', 'Aprobado', 4, null),
('2026-08-21 17:10:00', 'Efectivo', 220000.00, 1, null, 'Aprobado', 4, null),
('2026-09-05 19:20:30', 'PSE', 48000.00, 1, 'PSE-902100', 'Rechazado', 5, null),
('2026-09-05 19:22:00', 'PSE', 48000.00, 1, 'PSE-902114', 'Aprobado', 5, null),
('2026-10-05 11:05:00', 'Nota credito', 85000.00, 1, null, 'Aprobado', 6, 3),
('2026-10-05 11:06:00', 'Tarjeta credito', 455000.00, 6, 'AUT-90112', 'Aprobado', 6, null);


insert into movimiento_inventario (fecha, tipo, cantidad, observaciones, id_producto, id_usuario, numero_compra, codigo_venta, id_devolucion) values
('2026-07-01 08:00:00', 'Inventario inicial', 16, 'Conteo inicial de apertura', 4, 1, null, null, null),
('2026-07-01 08:00:00', 'Inventario inicial', 25, 'Conteo inicial de apertura', 8, 1, null, null, null),
('2026-07-01 08:00:00', 'Inventario inicial', 40, 'Conteo inicial de apertura', 9, 1, null, null, null),
('2026-07-05 09:20:00', 'Compra', 20, null, 1, 1, 1, null, null),
('2026-07-05 09:20:00', 'Compra', 15, null, 2, 1, 1, null, null),
('2026-07-12 11:05:00', 'Compra', 50, null, 5, 1, 2, null, null),
('2026-07-12 11:05:00', 'Compra', 30, null, 7, 1, 2, null, null),
('2026-08-18 10:15:00', 'Venta', -1, null, 1, 2, null, 1, null),
('2026-08-19 14:30:00', 'Venta', -1, null, 4, 3, null, 2, null),
('2026-08-20 09:00:00', 'Venta', -2, null, 5, 2, null, 3, null),
('2026-08-20 09:00:00', 'Venta', -1, null, 7, 2, null, 3, null),
('2026-08-21 16:45:00', 'Venta', -1, null, 2, 1, null, 4, null),
('2026-09-05 19:20:00', 'Venta', -1, 'Venta web', 7, null, null, 5, null),
('2026-09-05 19:20:00', 'Venta', -2, 'Venta web', 9, null, null, 5, null),
('2026-08-28 11:30:00', 'Devolucion de cliente', 1, 'Producto sellado', 7, 2, null, null, 2),
('2026-10-05 11:00:00', 'Venta', -1, null, 2, 3, null, 6, null);


insert into orden_trabajo (fecha_creacion, tipo_lente, tratamiento, laboratorio, fecha_promesa, fecha_entrega, estado, observaciones, id_cliente, id_venta, id_receta, id_producto_montura, id_usuario_registra) values
('2026-08-18 10:30:00', 'Monofocal', 'Antirreflejo', 'Laboratorio Óptico Central', '2026-08-25', '2026-08-24 11:00:00', 'Entregado', null, 4, 1, 1, 1, 2),
('2026-08-21 17:15:00', 'Monofocal', 'Antirreflejo', 'Laboratorio Óptico Central', '2026-08-28', '2026-08-27 10:00:00', 'Entregado', null, 7, 4, 3, 2, 1),
('2026-10-05 11:15:00', 'Progresivo', 'Antirreflejo', 'Laboratorio Óptico Central', '2026-10-15', null, 'Listo para entrega', 'La cliente fue avisada por WhatsApp', 6, 6, 2, 2, 3);


insert into carrito (fecha_creacion, estado, id_cliente, codigo_venta) values
('2026-10-14 20:10:00', 'Activo', 5, null),
('2026-09-10 18:30:00', 'Abandonado', 6, null),
('2026-09-05 19:05:00', 'Convertido', 4, 5);


insert into detalle_carrito (cantidad, id_carrito, id_producto) values
(1, 1, 7),
(1, 1, 8),
(1, 2, 2),
(1, 2, 4),
(1, 3, 7),
(2, 3, 9);


insert into favorito (id_cliente, id_producto) values
(4, 4),
(6, 2),
(5, 1),
(5, 3);