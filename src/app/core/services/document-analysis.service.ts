import { Injectable } from '@angular/core';
import { BaseHttpService } from './base-http.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

/**
 * Servicio para análisis de documentos con IA
 * Endpoints: /api/analyze/*
 */
@Injectable({
  providedIn: 'root'
})
export class DocumentAnalysisService extends BaseHttpService {
  private readonly API_URL = `${environment.urlBackend}api/analyze`;

  constructor(http: HttpClient) {
    super(http);
  }

  /**
   * Sube una factura para análisis con IA
   * POST /api/analyze/invoice
   * @param file Archivo de imagen (PNG, JPG, WEBP, HEIC) o PDF
   * @param notes Notas opcionales sobre la factura
   * @returns Observable con el ID del documento creado
   */
  submitInvoiceForAnalysis(
    file: File,
    data: { documentType: string; hasDeliveryNotes: boolean }
  ): Observable<{ documentId: string }> {
    const formData = new FormData();

    // Asegurar que el archivo tenga un nombre y tipo correctos
    const fileName = file.name || 'document.pdf';
    const fileType = file.type || 'application/pdf';

    // Crear un nuevo Blob con el tipo correcto si es necesario
    const fileBlob = new Blob([file], { type: fileType });

    // Append con nombre explícito y tipo
    formData.append('file', fileBlob, fileName);

    formData.append('documentType', data.documentType);
    formData.append('hasDeliveryNotes', data.hasDeliveryNotes.toString());

    console.log('Enviando FormData:', {
      fileName,
      fileType,
      fileSize: file.size
    });

    // Para FormData, no usar headers de JSON y permitir que el navegador establezca el Content-Type con boundary
    return this.http.post<{ documentId: string }>(`${this.API_URL}/invoice`, formData);
  }

  /**
   * Obtiene el estado y resultado del análisis de un documento
   * GET /api/analyze/:id
   * @param documentId ID del documento
   * @returns Observable con el estado del análisis
   * Estados posibles: PENDING, PROCESSING, DONE, FAILED
   */
  getDocumentById(documentId: string): Observable<AnalysisDocument> {
    return this.get<AnalysisDocument>(`${this.API_URL}/${documentId}`);
  }

  /**
   * Lista todos los documentos del usuario autenticado
   * GET /api/analyze
   * @returns Observable con la lista de documentos
   */
  listMyDocuments(): Observable<AnalysisDocument[]> {
    return this.get<AnalysisDocument[]>(`${this.API_URL}`);
  }
}

/**
 * Interfaz para el documento de análisis
 */
export interface AnalysisDocument {
  id: string;
  enterpriseId?: string;
  uploadedBy: string;
  filename: string;
  mimetype: string;
  hasDeliveryNotes: boolean;
  documentType: string;
  status: 'PENDING' | 'PROCESSING' | 'DONE' | 'FAILED';
  errorReason?: string;
  extraction?: {
    supplierName?: string;
    supplierCifNif?: string;
    invoiceNumber?: string;
    date?: string;
    amount?: number;
    lines?: Array<{
      description: string;
      quantity: number;
      unitPrice: number;
      tax: string;
    }>;
  };
  invoiceId?: string;
  processedAt?: string;
  createdAt: string;
  updatedAt: string;
}
