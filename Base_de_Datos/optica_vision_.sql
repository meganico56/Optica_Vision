drop database if exists optica_vision;
create database optica_vision;
use optica_vision;


create table rol (
    id_rol int auto_increment primary key,
    nombre_rol varchar(50) not null,
    descripcion varchar(150) not null
);

insert into rol (nombre_rol, descripcion) values
('Administrador', 'Administra la optica: usuarios, catalogo, compras y reportes'),
('Vendedor', 'Atiende clientes y registra ventas en el punto de venta'),
('Optometra', 'Realiza examenes visuales, emite recetas opticas y atiende citas'),
('Cliente', 'Persona que agenda citas, recibe formulas y compra productos en la optica');


create table usuario (
    id_usuario int auto_increment primary key,
    nombre varchar(100) not null,
    apellido varchar(100) not null,
    tipo_documento enum('C.C.', 'T.I.', 'C.E.') not null,
    num_documento varchar(20) not null,
    telefono varchar(20) not null,
    correo varchar(100),
    direccion varchar(150),
    fecha_nacimiento date,
    contrasena varchar(100),
    numero_licencia_profesional varchar(50),
    estado enum('Activo', 'Inactivo') not null default 'Activo',
    id_rol int not null,
    foreign key (id_rol) references rol(id_rol),
    unique key uq_usuario_correo (correo),
    unique key uq_usuario_documento (num_documento)
);


delimiter //
create trigger tr_validar_datos_usuario
before insert on usuario
for each row
begin
    declare v_rol varchar(50);

    select nombre_rol into v_rol from rol where id_rol = new.id_rol;

    if v_rol is null then
        signal sqlstate '45000'
        set message_text = 'el rol indicado para el usuario no existe';
    end if;

    if v_rol in ('Administrador', 'Vendedor', 'Optometra') and (new.correo is null or new.contrasena is null) then
        signal sqlstate '45000'
        set message_text = 'el personal interno debe tener correo y contrasena para acceder al sistema';
    end if;

    if v_rol = 'Optometra' and new.numero_licencia_profesional is null then
        signal sqlstate '45000'
        set message_text = 'un optometra debe registrar su numero de licencia profesional';
    end if;

    if v_rol = 'Cliente' and new.fecha_nacimiento is null then
        signal sqlstate '45000'
        set message_text = 'un cliente debe registrar su fecha de nacimiento, necesaria para calcular la vigencia de sus recetas';
    end if;

    if new.tipo_documento = 'T.I.' and v_rol <> 'Cliente' then
        signal sqlstate '45000'
        set message_text = 'el tipo de documento t.i. corresponde a un menor de edad y solo aplica al rol cliente';
    end if;
end //
delimiter ;


insert into usuario (nombre, apellido, tipo_documento, num_documento, telefono, correo, contrasena, numero_licencia_profesional, estado, id_rol) values
('Camila', 'Torres', 'C.C.', '1032987651', '3115557890', 'camila.torres@visionclara.com', 'CamT2026*', null, 'Activo', 1),
('Andrés', 'Ramírez', 'C.C.', '1019456782', '3124448821', 'andres.ramirez@visionclara.com', 'AndR890!', null, 'Activo', 2),
('Diana', 'Castillo', 'C.C.', '1026773401', '3138812345', 'diana.castillo@visionclara.com', 'DiaC451$', null, 'Activo', 2),
('Julián', 'Vargas', 'C.C.', '1014229087', '3157790012', 'julian.vargas@visionclara.com', 'JulV703#', 'TO-45678', 'Activo', 3);


insert into usuario (nombre, apellido, tipo_documento, num_documento, telefono, correo, direccion, fecha_nacimiento, contrasena, estado, id_rol) values
('Sofía', 'Herrera', 'C.C.', '1032456789', '3201234567', 'sofia.herrera@gmail.com', 'Cra 45 #12-30, Bogotá', '1996-03-14', 'SofH2026*', 'Activo', 4),
('Mateo', 'Rojas', 'C.C.', '1098765432', '3112345678', 'mateo.rojas@gmail.com', 'Cll 80 #22-15, Bogotá', '1990-11-02', null, 'Activo', 4),
('Valentina', 'Cruz', 'C.C.', '52741369', '3023456789', 'valentina.cruz@gmail.com', 'Cra 7 #63-20, Bogotá', '1985-06-23', null, 'Activo', 4),
('Santiago', 'Molina', 'T.I.', '1015987456', '3134567890', 'contacto.molina@gmail.com', 'Cll 19 #4-56, Bogotá', '2010-09-30', null, 'Activo', 4);

-- ---------------------------------------------------------------------
-- marca
-- ---------------------------------------------------------------------
create table marca (
    id_marca int auto_increment primary key,
    nombre varchar(100) not null,
    pais_origen varchar(50),
    estado enum('Activo', 'Inactivo') not null default 'Activo',
    unique key uq_marca_nombre (nombre)
);

insert into marca (nombre, pais_origen, estado) values
('Ray-Ban', 'Italia', 'Activo'),
('Vogue Eyewear', 'Italia', 'Activo'),
('Essilor', 'Francia', 'Activo'),
('Acuvue', 'Estados Unidos', 'Activo'),
('Vision Clara (marca propia)', 'Colombia', 'Activo');


create table categoria (
    id_categoria int auto_increment primary key,
    nombre varchar(100) not null,
    descripcion varchar(150),
    estado enum('Activo', 'Inactivo') not null default 'Activo'
);

insert into categoria (nombre, descripcion, estado) values
('Monturas', 'Armazones para lentes oftalmicos', 'Activo'),
('Gafas de sol', 'Gafas con proteccion uv, con o sin formula', 'Activo'),
('Lentes de contacto', 'Lentes de contacto blandos y rigidos', 'Activo'),
('Lentes oftalmicos', 'Cristales graduados para montar en armazon', 'Activo'),
('Soluciones de limpieza', 'Liquidos y accesorios de mantenimiento', 'Activo'),
('Accesorios', 'Estuches, cordones y paños de limpieza', 'Activo');


create table producto (
    id_producto int auto_increment primary key,
    nombre varchar(100) not null,
    descripcion varchar(150) not null,
    precio decimal(10,2) not null,
    imagen varchar(150) not null,
    material varchar(50),
    genero enum('Hombre', 'Mujer', 'Unisex', 'Infantil'),
    existencia_actual int not null default 0,
    existencia_minima int not null default 5,
    id_categoria int not null,
    id_marca int not null,
    estado enum('Activo', 'Inactivo') not null default 'Activo',
    foreign key (id_categoria) references categoria(id_categoria),
    foreign key (id_marca) references marca(id_marca)
);


insert into producto (nombre, descripcion, precio, imagen, material, genero, existencia_actual, existencia_minima, id_categoria, id_marca) values
('Montura clasica acetato negro', 'Montura de pasta color negro, forma rectangular', 180000.00, 'montura-clasica-negro.png', 'Acetato', 'Unisex', 0, 5, 1, 2),
('Montura metalica redonda', 'Montura metalica ultraliviana, forma redonda', 320000.00, 'montura-metalica-redonda.png', 'Metal', 'Unisex', 0, 5, 1, 1),
('Gafa de sol aviador', 'Gafa de sol clasica estilo aviador con proteccion uv400', 350000.00, 'gafa-sol-aviador.png', 'Metal', 'Hombre', 0, 5, 2, 1),
('Gafa de sol oversized', 'Gafa de sol de pasta, montura grande, proteccion uv400', 250000.00, 'gafa-sol-oversized.png', 'Acetato', 'Mujer', 15, 5, 2, 2),
('Lentes de contacto mensuales', 'Caja x6 lentes de contacto blandos de uso mensual', 85000.00, 'lentes-contacto-mensual.png', null, 'Unisex', 0, 10, 3, 4),
('Lente oftalmico antireflejo', 'Par de cristales graduados con tratamiento antireflejo', 220000.00, 'lente-antireflejo.png', null, 'Unisex', 20, 5, 4, 3),
('Liquido limpiador para lentes de contacto', 'Solucion multipropósito 355ml para lentes de contacto', 32000.00, 'liquido-limpiador.png', null, 'Unisex', 0, 10, 5, 4),
('Estuche rigido para gafas', 'Estuche rigido acolchado, protege armazon y lentes', 18000.00, 'estuche-rigido.png', null, 'Unisex', 25, 8, 6, 5),
('Paño de microfibra', 'Paño de microfibra para limpieza de lentes', 8000.00, 'pano-microfibra.png', null, 'Unisex', 40, 15, 6, 5);


create table movimiento_inventario (
    id_movimiento int auto_increment primary key,
    fecha datetime not null default current_timestamp,
    tipo_movimiento enum('Entrada por compra', 'Salida por venta', 'Entrada por devolucion', 'Ajuste manual') not null,
    cantidad int not null,
    existencia_resultante int not null,
    id_producto int not null,
    id_usuario int not null,
    referencia varchar(100),
    foreign key (id_producto) references producto(id_producto),
    foreign key (id_usuario) references usuario(id_usuario)
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

insert into proveedor (nombre, nit, telefono, correo, direccion, estado) values
('Distribuciones Ópticas del Norte S.A.S.', '900123456-1', '6017894521', 'ventas@distribucionesnorte.com', 'Cra 15 #93-42, Bogotá', 'Activo'),
('Import Visión Ltda.', '900234567-2', '6013321098', 'contacto@importvision.com', 'Cll 72 #10-34, Bogotá', 'Activo');


create table compra (
    numero_compra int auto_increment primary key,
    fecha datetime not null,
    numero_comprobante varchar(50) not null,
    sub_total decimal(10,2) not null,
    impuesto decimal(10,2) not null default 0,
    total decimal(10,2) not null,
    estado enum('Confirmada', 'Pendiente', 'Cancelada') not null default 'Pendiente',
    observaciones varchar(255),
    codigo_proveedor int not null,
    id_usuario int not null,
    foreign key (codigo_proveedor) references proveedor(codigo_proveedor),
    foreign key (id_usuario) references usuario(id_usuario)
);


delimiter //
create trigger tr_validar_usuario_compra
before insert on compra
for each row
begin
    declare v_rol varchar(50);

    select r.nombre_rol into v_rol
    from usuario u
    join rol r on r.id_rol = u.id_rol
    where u.id_usuario = new.id_usuario;

    if v_rol is null or v_rol <> 'Administrador' then
        signal sqlstate '45000'
        set message_text = 'la compra debe quedar registrada a nombre de un usuario con rol administrador';
    end if;
end //
delimiter ;

insert into compra (fecha, numero_comprobante, sub_total, impuesto, total, estado, observaciones, codigo_proveedor, id_usuario) values
('2026-07-05 09:20:00', 'FE-1001', 4300000.00, 800000.00, 5100000.00, 'Confirmada', 'Reposicion de monturas', 1, 1),
('2026-07-12 11:05:00', 'FE-2044', 2700000.00, 500000.00, 3200000.00, 'Confirmada', 'Lentes de contacto y solucion', 2, 1),
('2026-08-01 08:40:00', 'FE-1050', 1800000.00, 0.00, 1800000.00, 'Pendiente', 'A la espera de confirmacion del proveedor', 1, 1);


create table detalle_compra (
    id_detalle_compra int auto_increment primary key,
    cantidad int not null,
    precio_unitario decimal(10,2) not null,
    subtotal decimal(10,2) not null,
    id_producto int not null,
    numero_compra int not null,
    foreign key (id_producto) references producto(id_producto),
    foreign key (numero_compra) references compra(numero_compra)
);


delimiter //
create trigger tr_sumar_existencia_compra
after insert on detalle_compra
for each row
begin
    declare v_estado varchar(20);
    declare v_id_usuario int;
    declare v_existencia_nueva int;

    select estado, id_usuario into v_estado, v_id_usuario from compra where numero_compra = new.numero_compra;

    if v_estado = 'Confirmada' then
        update producto
        set existencia_actual = existencia_actual + new.cantidad
        where id_producto = new.id_producto;

        select existencia_actual into v_existencia_nueva from producto where id_producto = new.id_producto;

        insert into movimiento_inventario (tipo_movimiento, cantidad, existencia_resultante, id_producto, id_usuario, referencia)
        values ('Entrada por compra', new.cantidad, v_existencia_nueva, new.id_producto, v_id_usuario, concat('Compra #', new.numero_compra));
    end if;
end //
delimiter ;


insert into detalle_compra (cantidad, precio_unitario, subtotal, id_producto, numero_compra) values
(20, 95000.00, 1900000.00, 1, 1),
(15, 160000.00, 2400000.00, 2, 1);


insert into detalle_compra (cantidad, precio_unitario, subtotal, id_producto, numero_compra) values
(50, 45000.00, 2250000.00, 5, 2),
(30, 15000.00, 450000.00, 7, 2);


insert into detalle_compra (cantidad, precio_unitario, subtotal, id_producto, numero_compra) values
(10, 180000.00, 1800000.00, 3, 3);


create table cita (
    id_cita int auto_increment primary key,
    fecha_hora datetime not null,
    duracion_minutos int not null default 30,
    motivo varchar(150) not null,
    estado enum('Programada', 'Confirmada', 'Completada', 'Cancelada', 'No asistio') not null default 'Programada',
    observaciones varchar(255),
    id_cliente int not null,
    id_optometra int not null,
    foreign key (id_cliente) references usuario(id_usuario),
    foreign key (id_optometra) references usuario(id_usuario)
);


delimiter //
create trigger tr_validar_cita
before insert on cita
for each row
begin
    declare v_rol_cliente varchar(50);
    declare v_rol_optometra varchar(50);
    declare v_choques int;

    select r.nombre_rol into v_rol_cliente
    from usuario u join rol r on r.id_rol = u.id_rol
    where u.id_usuario = new.id_cliente;

    if v_rol_cliente is null or v_rol_cliente <> 'Cliente' then
        signal sqlstate '45000'
        set message_text = 'la cita debe quedar registrada a nombre de un usuario con rol cliente';
    end if;

    select r.nombre_rol into v_rol_optometra
    from usuario u join rol r on r.id_rol = u.id_rol
    where u.id_usuario = new.id_optometra;

    if v_rol_optometra is null or v_rol_optometra <> 'Optometra' then
        signal sqlstate '45000'
        set message_text = 'la cita debe ser atendida por un usuario con rol optometra';
    end if;

    select count(*) into v_choques
    from cita
    where id_optometra = new.id_optometra
      and estado in ('Programada', 'Confirmada')
      and new.fecha_hora < date_add(fecha_hora, interval duracion_minutos minute)
      and date_add(new.fecha_hora, interval new.duracion_minutos minute) > fecha_hora;

    if v_choques > 0 then
        signal sqlstate '45000'
        set message_text = 'el optometra ya tiene una cita programada que se cruza con este horario';
    end if;
end //
delimiter ;


insert into cita (fecha_hora, duracion_minutos, motivo, estado, observaciones, id_cliente, id_optometra) values
('2026-08-09 09:00:00', 30, 'Examen visual de rutina', 'Completada', 'Se detecta miopia y astigmatismo leve, se emite receta', 5, 4),
('2026-08-14 15:00:00', 30, 'Control visual por hipermetropia y presbicia', 'Completada', 'Se recomienda lente progresivo, se emite receta', 7, 4),
('2026-08-19 10:30:00', 30, 'Control visual pediatrico', 'Completada', 'Paciente menor de edad, se emite receta con vigencia reducida', 8, 4),
('2026-09-15 11:00:00', 30, 'Primera valoracion visual', 'Programada', null, 6, 4),
('2026-09-20 09:00:00', 30, 'Control de seguimiento', 'Cancelada', 'La cliente reprogramara mas adelante', 5, 4);


create table receta_optica (
    id_receta int auto_increment primary key,
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
    diagnostico varchar(150),
    observaciones varchar(255),
    id_cliente int not null,
    id_usuario int not null,
    id_cita int,
    foreign key (id_cliente) references usuario(id_usuario),
    foreign key (id_usuario) references usuario(id_usuario),
    foreign key (id_cita) references cita(id_cita)
);


delimiter //
create trigger tr_validar_receta
before insert on receta_optica
for each row
begin
    declare v_rol_optometra varchar(50);
    declare v_rol_cliente varchar(50);
    declare v_fecha_nacimiento date;
    declare v_edad int;

    select r.nombre_rol into v_rol_optometra
    from usuario u join rol r on r.id_rol = u.id_rol
    where u.id_usuario = new.id_usuario;

    if v_rol_optometra is null or v_rol_optometra <> 'Optometra' then
        signal sqlstate '45000'
        set message_text = 'la receta optica debe quedar registrada a nombre de un usuario con rol optometra';
    end if;

    select r.nombre_rol, u.fecha_nacimiento into v_rol_cliente, v_fecha_nacimiento
    from usuario u join rol r on r.id_rol = u.id_rol
    where u.id_usuario = new.id_cliente;

    if v_rol_cliente is null or v_rol_cliente <> 'Cliente' then
        signal sqlstate '45000'
        set message_text = 'la receta optica debe quedar asociada a un usuario con rol cliente';
    end if;

    set v_edad = timestampdiff(year, v_fecha_nacimiento, new.fecha_emision);

    if v_edad < 18 then
        set new.fecha_vencimiento = date_add(new.fecha_emision, interval 6 month);
    else
        set new.fecha_vencimiento = date_add(new.fecha_emision, interval 1 year);
    end if;
end //
delimiter ;


insert into receta_optica (fecha_emision, fecha_vencimiento, od_esfera, od_cilindro, od_eje, od_adicion, oi_esfera, oi_cilindro, oi_eje, oi_adicion, distancia_pupilar, diagnostico, observaciones, id_cliente, id_usuario, id_cita) values
('2026-08-10', '2027-08-10', -2.25, -0.50, 180, null, -2.00, -0.75, 175, null, 62.0, 'Miopia y astigmatismo leve', 'Control en un año', 5, 4, 1),
('2026-08-15', '2027-08-15', 1.00, null, null, 1.75, 1.25, null, null, 1.75, 60.5, 'Hipermetropia y presbicia', 'Recomendado lente progresivo', 7, 4, 2),
('2026-08-20', '2027-02-20', -1.00, -0.25, 90, null, -1.25, -0.25, 85, null, 55.0, 'Miopia leve bilateral', 'Paciente pediatrico, control cada 6 meses', 8, 4, 3);


create table promocion (
    codigo_promocion int auto_increment primary key,
    nombre varchar(100) not null,
    descripcion varchar(150),
    tipo_descuento enum('Porcentaje', 'Valor fijo') not null,
    valor_descuento decimal(10,2) not null,
    fecha_inicio date not null,
    fecha_fin date not null,
    estado enum('Activo', 'Inactivo') not null default 'Activo'
);

insert into promocion (nombre, descripcion, tipo_descuento, valor_descuento, fecha_inicio, fecha_fin, estado) values
('Segunda montura al 50%', 'Al comprar una montura, la segunda tiene 50% de descuento', 'Porcentaje', 50.00, '2026-07-01', '2026-12-31', 'Activo'),
('Descuento fidelidad', 'Descuento fijo para clientes frecuentes', 'Valor fijo', 20000.00, '2026-01-01', '2026-12-31', 'Activo');


create table venta (
    codigo_venta int auto_increment primary key,
    fecha datetime not null default current_timestamp,
    total decimal(10,2) not null,
    estado enum('Completada', 'Pendiente', 'Anulada') not null default 'Completada',
    es_cotizacion boolean not null default false,
    id_cliente int not null,
    codigo_promocion int,
    id_receta int,
    id_usuario int not null,
    foreign key (id_cliente) references usuario(id_usuario),
    foreign key (codigo_promocion) references promocion(codigo_promocion),
    foreign key (id_receta) references receta_optica(id_receta),
    foreign key (id_usuario) references usuario(id_usuario)
);


delimiter //
create trigger tr_validar_venta
before insert on venta
for each row
begin
    declare v_rol_vendedor varchar(50);
    declare v_rol_cliente varchar(50);

    select r.nombre_rol into v_rol_vendedor
    from usuario u join rol r on r.id_rol = u.id_rol
    where u.id_usuario = new.id_usuario;

    if v_rol_vendedor is null or v_rol_vendedor not in ('Vendedor', 'Administrador') then
        signal sqlstate '45000'
        set message_text = 'la venta debe quedar registrada a nombre de un vendedor o del administrador';
    end if;

    select r.nombre_rol into v_rol_cliente
    from usuario u join rol r on r.id_rol = u.id_rol
    where u.id_usuario = new.id_cliente;

    if v_rol_cliente is null or v_rol_cliente <> 'Cliente' then
        signal sqlstate '45000'
        set message_text = 'la venta debe quedar asociada a un usuario con rol cliente';
    end if;
end //
delimiter ;


insert into venta (fecha, total, estado, es_cotizacion, id_cliente, codigo_promocion, id_receta, id_usuario) values
('2026-08-18 10:15:00', 400000.00, 'Completada', false, 5, null, 1, 2),
('2026-08-19 14:30:00', 250000.00, 'Completada', false, 6, null, null, 3),
('2026-08-20 09:00:00', 202000.00, 'Completada', false, 7, null, 2, 2),
('2026-08-21 16:45:00', 520000.00, 'Completada', false, 8, 2, 3, 1),
('2026-08-25 11:00:00', 26000.00, 'Pendiente', true, 5, null, null, 3);


create table detalle_venta (
    codigo_detalle_venta int auto_increment primary key,
    cantidad int not null,
    precio_unitario decimal(10,2) not null,
    subtotal decimal(10,2) not null,
    codigo_venta int not null,
    id_producto int not null,
    foreign key (codigo_venta) references venta(codigo_venta),
    foreign key (id_producto) references producto(id_producto)
);


delimiter //
create trigger tr_restar_existencia_venta
after insert on detalle_venta
for each row
begin
    declare v_es_cotizacion boolean;
    declare v_id_usuario int;
    declare v_existencia_nueva int;

    select es_cotizacion, id_usuario into v_es_cotizacion, v_id_usuario from venta where codigo_venta = new.codigo_venta;

    if v_es_cotizacion = false then
        update producto
        set existencia_actual = existencia_actual - new.cantidad
        where id_producto = new.id_producto;

        select existencia_actual into v_existencia_nueva from producto where id_producto = new.id_producto;

        insert into movimiento_inventario (tipo_movimiento, cantidad, existencia_resultante, id_producto, id_usuario, referencia)
        values ('Salida por venta', new.cantidad, v_existencia_nueva, new.id_producto, v_id_usuario, concat('Venta #', new.codigo_venta));
    end if;
end //
delimiter ;

insert into detalle_venta (cantidad, precio_unitario, subtotal, codigo_venta, id_producto) values

(1, 180000.00, 180000.00, 1, 1),
(1, 220000.00, 220000.00, 1, 6),

(1, 250000.00, 250000.00, 2, 4),

(2, 85000.00, 170000.00, 3, 5),
(1, 32000.00, 32000.00, 3, 7),

(1, 320000.00, 320000.00, 4, 2),
(1, 220000.00, 220000.00, 4, 6),

(1, 18000.00, 18000.00, 5, 8),
(1, 8000.00, 8000.00, 5, 9);


create table pago (
    id_pago int auto_increment primary key,
    fecha datetime not null default current_timestamp,
    metodo_pago enum('Efectivo', 'Tarjeta débito', 'Tarjeta crédito', 'Transferencia') not null,
    monto decimal(10,2) not null,
    referencia varchar(100),
    codigo_venta int not null,
    foreign key (codigo_venta) references venta(codigo_venta)
);

delimiter //
create trigger tr_validar_pago
before insert on pago
for each row
begin
    declare v_es_cotizacion boolean;
    declare v_estado varchar(20);
    declare v_total decimal(10,2);
    declare v_pagado decimal(10,2);

    select es_cotizacion, estado, total into v_es_cotizacion, v_estado, v_total
    from venta where codigo_venta = new.codigo_venta;

    if v_estado is null then
        signal sqlstate '45000'
        set message_text = 'la venta indicada para el pago no existe';
    end if;

    if v_es_cotizacion = true then
        signal sqlstate '45000'
        set message_text = 'una cotizacion no puede recibir pagos, primero debe convertirse en una venta';
    end if;

    if v_estado = 'Anulada' then
        signal sqlstate '45000'
        set message_text = 'no se pueden registrar pagos sobre una venta anulada';
    end if;

    select coalesce(sum(monto), 0) into v_pagado from pago where codigo_venta = new.codigo_venta;

    if (v_pagado + new.monto) > v_total then
        signal sqlstate '45000'
        set message_text = 'el pago excede el saldo pendiente de la venta';
    end if;
end //
delimiter ;

insert into pago (fecha, metodo_pago, monto, referencia, codigo_venta) values
('2026-08-18 10:20:00', 'Tarjeta crédito', 400000.00, 'AUT-88231', 1),
('2026-08-19 14:35:00', 'Efectivo', 250000.00, null, 2),
('2026-08-20 09:05:00', 'Tarjeta débito', 150000.00, 'AUT-77410', 3),
('2026-08-20 09:06:00', 'Efectivo', 52000.00, null, 3),
('2026-08-21 16:50:00', 'Transferencia', 300000.00, 'TRX-556021', 4);


create table devolucion (
    id_devolucion int auto_increment primary key,
    fecha datetime not null default current_timestamp,
    motivo enum('Producto defectuoso', 'Cambio de formula', 'Ajuste o talla incorrecta', 'Cliente se arrepintio', 'Otro') not null,
    cantidad int not null,
    observaciones varchar(255),
    codigo_detalle_venta int not null,
    id_usuario int not null,
    foreign key (codigo_detalle_venta) references detalle_venta(codigo_detalle_venta),
    foreign key (id_usuario) references usuario(id_usuario)
);

delimiter //
create trigger tr_validar_devolucion
before insert on devolucion
for each row
begin
    declare v_rol varchar(50);
    declare v_cantidad_vendida int;
    declare v_cantidad_devuelta_previa int;

    select r.nombre_rol into v_rol
    from usuario u join rol r on r.id_rol = u.id_rol
    where u.id_usuario = new.id_usuario;

    if v_rol is null or v_rol not in ('Vendedor', 'Administrador') then
        signal sqlstate '45000'
        set message_text = 'la devolucion debe quedar registrada a nombre de un vendedor o del administrador';
    end if;

    select cantidad into v_cantidad_vendida from detalle_venta where codigo_detalle_venta = new.codigo_detalle_venta;

    select coalesce(sum(cantidad), 0) into v_cantidad_devuelta_previa
    from devolucion where codigo_detalle_venta = new.codigo_detalle_venta;

    if (v_cantidad_devuelta_previa + new.cantidad) > v_cantidad_vendida then
        signal sqlstate '45000'
        set message_text = 'la cantidad devuelta no puede superar la cantidad originalmente vendida';
    end if;
end //
delimiter ;


delimiter //
create trigger tr_restaurar_existencia_devolucion
after insert on devolucion
for each row
begin
    declare v_id_producto int;
    declare v_existencia_nueva int;

    select id_producto into v_id_producto from detalle_venta where codigo_detalle_venta = new.codigo_detalle_venta;

    update producto
    set existencia_actual = existencia_actual + new.cantidad
    where id_producto = v_id_producto;

    select existencia_actual into v_existencia_nueva from producto where id_producto = v_id_producto;

    insert into movimiento_inventario (tipo_movimiento, cantidad, existencia_resultante, id_producto, id_usuario, referencia)
    values ('Entrada por devolucion', new.cantidad, v_existencia_nueva, v_id_producto, new.id_usuario, concat('Devolucion #', new.id_devolucion));
end //
delimiter ;


insert into devolucion (motivo, cantidad, observaciones, codigo_detalle_venta, id_usuario) values
('Producto defectuoso', 1, 'El cliente reportó que la gafa llegó con la bisagra floja; se genera nota de crédito', 3, 3);


create table reporte (
    id_reporte int auto_increment primary key,
    titulo varchar(150) not null,
    tipo_reporte enum('General', 'Ventas', 'Existencias', 'Clientes', 'Recetas', 'Citas') not null,
    fecha_generacion datetime not null default current_timestamp,
    id_usuario_genera int not null,
    descripcion varchar(255),
    contenido text not null,
    foreign key (id_usuario_genera) references usuario(id_usuario)
);

delimiter //
create trigger tr_validar_generador_reporte
before insert on reporte
for each row
begin
    declare v_rol varchar(50);

    select r.nombre_rol into v_rol
    from usuario u
    join rol r on r.id_rol = u.id_rol
    where u.id_usuario = new.id_usuario_genera;

    if v_rol is null then
        signal sqlstate '45000'
        set message_text = 'el usuario que genera el reporte no existe';
    end if;

    if new.tipo_reporte = 'Recetas' and v_rol not in ('Optometra', 'Administrador') then
        signal sqlstate '45000'
        set message_text = 'solo un optometra o el administrador pueden generar reportes de recetas, por tratarse de datos clinicos de los clientes';
    end if;
end //
delimiter ;


insert into reporte (titulo, tipo_reporte, id_usuario_genera, descripcion, contenido) values (
    'Estado general de óptica visión clara',
    'General',
    1,
    'Resumen de clientes, ventas y existencias',
    concat(
        'Clientes registrados: ', (select count(*) from usuario u join rol r on r.id_rol = u.id_rol where r.nombre_rol = 'Cliente'),
        ' | ventas completadas: ', (select count(*) from venta where estado = 'Completada'),
        ' | ingresos totales: $', (select coalesce(sum(total), 0) from venta where estado = 'Completada'),
        ' | productos con existencia por debajo del minimo: ',
        (select count(*) from producto where existencia_actual < existencia_minima)
    )
);


insert into reporte (titulo, tipo_reporte, id_usuario_genera, descripcion, contenido) values (
    'Reporte de ventas',
    'Ventas',
    1,
    'Totales de ventas y vendedor con mejor desempeño',
    concat(
        'Ventas completadas: ', (select count(*) from venta where estado = 'Completada'),
        ' | ingresos totales: $', (select coalesce(sum(total), 0) from venta where estado = 'Completada'),
        ' | ticket promedio: $', (select round(coalesce(avg(total), 0), 2) from venta where estado = 'Completada'),
        ' | vendedor con mas ventas: ',
        (select concat(u.nombre, ' ', u.apellido) from venta v join usuario u on u.id_usuario = v.id_usuario
         where v.estado = 'Completada' group by u.id_usuario order by count(*) desc limit 1)
    )
);


insert into reporte (titulo, tipo_reporte, id_usuario_genera, descripcion, contenido) values (
    'Reporte de existencias bajas',
    'Existencias',
    1,
    'Productos cuya existencia actual esta por debajo de la existencia minima definida',
    concat(
        'Productos con alerta de existencia baja: ',
        (select count(*) from producto where existencia_actual < existencia_minima),
        ' | detalle: ',
        coalesce(
            (select group_concat(nombre, ' (', existencia_actual, '/', existencia_minima, ')' separator '; ')
             from producto
             where existencia_actual < existencia_minima),
            'sin alertas de existencia baja en este momento'
        )
    )
);


insert into reporte (titulo, tipo_reporte, id_usuario_genera, descripcion, contenido) values (
    'Reporte de recetas emitidas',
    'Recetas',
    4,
    'Estado de las recetas opticas emitidas a los clientes',
    concat(
        'Recetas emitidas: ', (select count(*) from receta_optica),
        ' | recetas vigentes: ', (select count(*) from receta_optica where fecha_vencimiento >= curdate()),
        ' | recetas vencidas: ', (select count(*) from receta_optica where fecha_vencimiento < curdate())
    )
);


insert into reporte (titulo, tipo_reporte, id_usuario_genera, descripcion, contenido) values (
    'Reporte de clientes',
    'Clientes',
    2,
    'Estado actual de los clientes registrados en el sistema',
    concat(
        'Clientes registrados: ', (select count(*) from usuario u join rol r on r.id_rol = u.id_rol where r.nombre_rol = 'Cliente'),
        ' | clientes con receta vigente: ',
        (select count(distinct id_cliente) from receta_optica where fecha_vencimiento >= curdate()),
        ' | clientes sin ninguna receta registrada: ',
        (select count(*) from usuario c join rol r on r.id_rol = c.id_rol
         where r.nombre_rol = 'Cliente' and not exists (select 1 from receta_optica re where re.id_cliente = c.id_usuario))
    )
);


insert into reporte (titulo, tipo_reporte, id_usuario_genera, descripcion, contenido) values (
    'Reporte de citas',
    'Citas',
    1,
    'Estado de las citas agendadas con los optometras',
    concat(
        'Citas totales: ', (select count(*) from cita),
        ' | completadas: ', (select count(*) from cita where estado = 'Completada'),
        ' | programadas: ', (select count(*) from cita where estado = 'Programada'),
        ' | canceladas: ', (select count(*) from cita where estado = 'Cancelada')
    )
);



select p.nombre as producto, c.nombre as categoria, m.nombre as marca,
       p.existencia_actual, p.existencia_minima
from producto p
join categoria c on c.id_categoria = p.id_categoria
join marca m on m.id_marca = p.id_marca
order by c.nombre, p.nombre;


select v.codigo_venta, v.fecha,
       concat(cl.nombre, ' ', cl.apellido) as cliente,
       concat(u.nombre, ' ', u.apellido) as atendida_por,
       v.estado, v.es_cotizacion, v.total,
       coalesce((select sum(p.monto) from pago p where p.codigo_venta = v.codigo_venta), 0) as total_pagado,
       v.total - coalesce((select sum(p.monto) from pago p where p.codigo_venta = v.codigo_venta), 0) as saldo_pendiente
from venta v
join usuario cl on cl.id_usuario = v.id_cliente
join usuario u on u.id_usuario = v.id_usuario
order by v.fecha;


select v.codigo_venta, p.fecha, p.metodo_pago, p.monto, p.referencia
from pago p
join venta v on v.codigo_venta = p.codigo_venta
order by v.codigo_venta, p.fecha;


select c.id_cita, c.fecha_hora, c.duracion_minutos, c.motivo, c.estado,
       concat(cl.nombre, ' ', cl.apellido) as cliente,
       concat(o.nombre, ' ', o.apellido) as optometra
from cita c
join usuario cl on cl.id_usuario = c.id_cliente
join usuario o on o.id_usuario = c.id_optometra
order by c.fecha_hora;


select concat(cl.nombre, ' ', cl.apellido) as cliente, r.fecha_emision, r.fecha_vencimiento,
       r.od_esfera, r.od_cilindro, r.od_eje, r.oi_esfera, r.oi_cilindro, r.oi_eje,
       concat(u.nombre, ' ', u.apellido) as emitida_por, r.id_cita
from receta_optica r
join usuario cl on cl.id_usuario = r.id_cliente
join usuario u on u.id_usuario = r.id_usuario
order by r.fecha_emision;


select d.id_devolucion, d.fecha, d.motivo, d.cantidad,
       p.nombre as producto, concat(u.nombre, ' ', u.apellido) as registrada_por
from devolucion d
join detalle_venta dv on dv.codigo_detalle_venta = d.codigo_detalle_venta
join producto p on p.id_producto = dv.id_producto
join usuario u on u.id_usuario = d.id_usuario
order by d.fecha;


select m.id_movimiento, m.fecha, m.tipo_movimiento, m.cantidad, m.existencia_resultante,
       p.nombre as producto, concat(u.nombre, ' ', u.apellido) as registrado_por, m.referencia
from movimiento_inventario m
join producto p on p.id_producto = m.id_producto
join usuario u on u.id_usuario = m.id_usuario
order by m.fecha, m.id_movimiento;

select r.id_reporte, r.titulo, r.tipo_reporte, r.fecha_generacion,
       u.nombre as generado_por, r.contenido
from reporte r
join usuario u on u.id_usuario = r.id_usuario_genera
order by r.id_reporte;
