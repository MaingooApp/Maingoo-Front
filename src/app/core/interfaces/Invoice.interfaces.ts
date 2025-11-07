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

// Nueva interfaz que coincide con la estructura del backend
export interface Supplier {
    id: string;
    name: string;
    cifNif: string;
    address: string | null;
    phoneNumber: string | null;
    commercialName: string | null;
    commercialPhoneNumber: string | null;
    deliveryDays: string | null;
    minPriceDelivery: number | null;
    sanitaryRegistrationNumber: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface InvoiceFromBackend {
    id: string;
    enterpriseId: string;
    supplierId: string;
    type: string | null;
    invoiceNumber: string | null;
    imageUrl: string | null;
    amount: string;
    date: string;
    createdAt: string;
    supplier: Supplier;
}

export interface Invoice {
    id?: string;
    imagen?: string;
    mimeType?: string;
    proveedor: Proveedor;
    factura: FacturaInfo;
    productos: Producto[];
}
