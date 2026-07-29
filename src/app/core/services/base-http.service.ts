import { HttpClient, HttpContext, HttpHeaders, HttpParams } from '@angular/common/http';
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

  protected get<T>(
    url: string,
    headers?: { [key: string]: string },
    params?: HttpParams,
    context?: HttpContext
  ): Observable<T> {
    return this.http.get<T>(url, {
      headers: this.createHeaders(headers),
      params,
      context
    });
  }

  protected post<T>(
    url: string,
    body: unknown,
    headers?: { [key: string]: string },
    context?: HttpContext
  ): Observable<T> {
    return this.http.post<T>(url, body, {
      headers: this.createHeaders(headers),
      context
    });
  }

  protected put<T>(
    url: string,
    body: unknown,
    headers?: { [key: string]: string },
    context?: HttpContext
  ): Observable<T> {
    return this.http.put<T>(url, body, {
      headers: this.createHeaders(headers),
      context
    });
  }

  protected patch<T>(
    url: string,
    body: unknown,
    headers?: { [key: string]: string },
    context?: HttpContext
  ): Observable<T> {
    return this.http.patch<T>(url, body, {
      headers: this.createHeaders(headers),
      context
    });
  }

  protected delete<T>(url: string, headers?: { [key: string]: string }, context?: HttpContext): Observable<T> {
    return this.http.delete<T>(url, {
      headers: this.createHeaders(headers),
      context
    });
  }

  protected postBlob(
    url: string,
    body: unknown,
    customHeaders?: { [key: string]: string },
    context?: HttpContext
  ): Observable<Blob> {
    return this.http.post(`${url}`, body, {
      headers: this.createHeaders(customHeaders),
      context,
      responseType: 'blob'
    });
  }
}
