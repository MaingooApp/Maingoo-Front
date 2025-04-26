export interface Proveedor {
	nombre: string;
	nif: string;
	direccion: string;
	telefono: string;
	email: string;
  }
  
  export interface FacturaInfo {
	numero: string;
	fecha_emision: string | Date;
	fecha_vencimiento: string | Date;
	forma_pago: string;
	total_con_iva: string | number;
  }
  
  export interface Producto {
	numero_albaran: string;
	referencia: string;
	descripcion: string;
	cantidad: string;
	precio: string;
	categoria?: string;
	alergenos?: string[]; 
  }
  
  export interface Invoice {
	id?: string;
	imagen?: string;
	mimeType?: string;
	proveedor: Proveedor;
	factura: FacturaInfo;
	productos: Producto[];
  }
  