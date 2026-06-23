import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SectionNavigationService {
  private readonly homeRequestSubject = new Subject<string>();

  readonly homeRequest$: Observable<string> = this.homeRequestSubject.asObservable();

  requestHome(route: string): void {
    this.homeRequestSubject.next(route);
  }
}
