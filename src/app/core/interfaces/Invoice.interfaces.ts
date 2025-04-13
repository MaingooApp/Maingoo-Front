export interface Invoice {
  id?: string;
  proveedor: {
    nombre: string;
    nif: string;
    direccion: string;
    telefono: string;
    email: string;
  };
  factura: {
    numero: string;
    fecha_emision: string;
    fecha_vencimiento: string;
    forma_pago: string;
    total_con_iva: string;
  };
  productos: {
    numero_albaran: string;
    referencia: string;
    descripcion: string;
    cantidad: string;
    precio: string;
  }[];
}


