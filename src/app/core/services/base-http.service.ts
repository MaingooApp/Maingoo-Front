import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class BaseHttpService {
  constructor(protected http: HttpClient) {}

  protected createHeaders(customHeaders?: { [key: string]: string }): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json',
      ...customHeaders
    });
  }

  protected get<T>(url: string, headers?: { [key: string]: string }, params?: HttpParams): Observable<T> {
    return this.http.get<T>(url, {
      headers: this.createHeaders(headers),
      params
    });
  }

  protected post<T>(url: string, body: any, headers?: { [key: string]: string }): Observable<T> {
    return this.http.post<T>(url, body, {
      headers: this.createHeaders(headers)
    });
  }

  protected put<T>(url: string, body: any, headers?: { [key: string]: string }): Observable<T> {
    return this.http.put<T>(url, body, {
      headers: this.createHeaders(headers)
    });
  }

  protected delete<T>(url: string, headers?: { [key: string]: string }): Observable<T> {
    return this.http.delete<T>(url, {
      headers: this.createHeaders(headers)
    });
  }

  protected postBlob(url: string, body: any, customHeaders?: { [key: string]: string }): Observable<Blob> {
    return this.http.post(`${url}`, body, {
      headers: this.createHeaders(customHeaders),
      responseType: 'blob'
    });
  }
}