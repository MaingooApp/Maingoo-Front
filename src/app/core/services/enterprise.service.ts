import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseHttpService } from './base-http.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

/**
 * Servicio para gestionar empresas/negocios
 * Endpoints: /api/enterprises/*
 */
@Injectable({
    providedIn: 'root'
})
export class EnterpriseService extends BaseHttpService {
    private readonly API_URL = `${environment.urlBackend}api/enterprises`;

    constructor(http: HttpClient) {
        super(http);
    }

    /**
     * Crea una nueva empresa
     * POST /api/enterprises
     */
    createEnterprise(enterprise: CreateEnterpriseDto): Observable<Enterprise> {
        return this.post<Enterprise>(`${this.API_URL}`, enterprise);
    }

    /**
     * Lista todas las empresas
     * GET /api/enterprises
     */
    listEnterprises(): Observable<Enterprise[]> {
        return this.get<Enterprise[]>(`${this.API_URL}`);
    }

    /**
     * Obtiene una empresa por su ID
     * GET /api/enterprises/:id
     */
    getEnterpriseById(id: string): Observable<Enterprise> {
        return this.get<Enterprise>(`${this.API_URL}/${id}`);
    }

    /**
     * Actualiza una empresa
     * PATCH /api/enterprises/:id
     */
    updateEnterprise(id: string, updates: Partial<CreateEnterpriseDto>): Observable<Enterprise> {
        return this.put<Enterprise>(`${this.API_URL}/${id}`, updates);
    }

    /**
     * Elimina una empresa
     * DELETE /api/enterprises/:id
     */
    deleteEnterprise(id: string): Observable<void> {
        return this.delete<void>(`${this.API_URL}/${id}`);
    }
}

/**
 * Tipo de empresa
 */
export type EnterpriseType = 'RESTAURANT' | 'CATERING' | 'HOTEL' | 'OTHER';

/**
 * DTO para crear una empresa
 */
export interface CreateEnterpriseDto {
    type: EnterpriseType;
    name: string;
    cifNif: string;
    email: string;
    country: string;
    city: string;
    address: string;
    postalCode: string;
    firstPhonePrefix: string;
    firstPhoneNumber: string;
    secondPhonePrefix?: string;
    secondPhoneNumber?: string;
    iban?: string;
}

/**
 * Interfaz de empresa
 */
export interface Enterprise {
    id: string;
    type: EnterpriseType;
    name: string;
    cifNif: string;
    email: string;
    country: string;
    city: string;
    address: string;
    postalCode: string;
    firstPhonePrefix: string;
    firstPhoneNumber: string;
    secondPhonePrefix?: string;
    secondPhoneNumber?: string;
    iban?: string;
    createdAt: string;
    updatedAt: string;
}
