import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BaseHttpService } from './base-http.service';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class OpenaiService extends BaseHttpService {

  constructor(http: HttpClient) {
    super(http);
  }

  analizarImagen(base64: string, mimeType: string) {
    const body = {
      base64,
      mimeType
    };
    return this.post(environment.urlBackend, body ); 
  }
}