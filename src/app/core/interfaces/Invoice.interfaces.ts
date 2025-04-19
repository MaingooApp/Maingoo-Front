export interface Invoice {
  id?: string;
  imagen?: string;
  mimeType?: string;
  proveedor: {
    nombre: string;
    nif: string;
    direccion: string;
    telefono: string;
    email: string;
  };
  factura: {
    numero: string;
    fecha_emision: string | Date;
    fecha_vencimiento: string | Date;
    forma_pago: string;
    total_con_iva:  string | number;
  };
  productos: {
    numero_albaran: string;
    referencia: string;
    descripcion: string;
    cantidad: string;
    precio: string;
  }[];
}


