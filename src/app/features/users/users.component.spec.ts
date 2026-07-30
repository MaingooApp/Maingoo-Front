import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { Confirmation, ConfirmationService } from 'primeng/api';
import { NgxPermissionsModule } from 'ngx-permissions';
import { TranslateModule } from '@ngx-translate/core';
import { EMPTY, Subject, of } from 'rxjs';

import { SectionHeaderService } from '../../layout/service/section-header.service';
import { SectionNavigationService } from '../../layout/service/section-navigation.service';
import { ToastService } from '../../shared/services/toast.service';
import { ManagedUser, PosPinStatus } from './interfaces/user-management.interface';
import { UserService } from './services/user.service';
import { UsersComponent } from './users.component';

describe('UsersComponent POS PIN', () => {
  let userService: jasmine.SpyObj<UserService>;
  let confirmation: jasmine.SpyObj<ConfirmationService>;
  let user: ManagedUser;

  beforeEach(() => {
    user = {
      id: 'user-1',
      name: 'Camarero',
      email: 'camarero@example.test',
      permissions: ['pos.sell'],
      posPinConfigured: false
    };
    userService = jasmine.createSpyObj<UserService>('UserService', [
      'getUsers',
      'getAllPermissions',
      'setPosPin',
      'disablePosPin'
    ]);
    userService.getUsers.and.returnValue(of([user]));
    userService.getAllPermissions.and.returnValue(of([]));
    confirmation = jasmine.createSpyObj<ConfirmationService>('ConfirmationService', ['confirm']);

    TestBed.configureTestingModule({
      imports: [UsersComponent, NgxPermissionsModule.forRoot(), TranslateModule.forRoot()],
      providers: [
        { provide: UserService, useValue: userService },
        { provide: ConfirmationService, useValue: confirmation },
        {
          provide: ToastService,
          useValue: jasmine.createSpyObj<ToastService>('ToastService', ['success', 'error'])
        },
        {
          provide: SectionHeaderService,
          useValue: jasmine.createSpyObj<SectionHeaderService>('SectionHeaderService', ['setContent', 'reset'])
        },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap({}) } }
        },
        { provide: SectionNavigationService, useValue: { homeRequest$: EMPTY } }
      ]
    });
  });

  it('validates, confirms and clears the PIN before the request completes', () => {
    const response = new Subject<PosPinStatus>();
    userService.setPosPin.and.returnValue(response);
    confirmation.confirm.and.callFake((options: Confirmation) => options.accept?.());
    const fixture = TestBed.createComponent(UsersComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.selectUser(user);
    component.openPosPinForm();

    component.updatePosPin('48a26');
    component.updatePosPinConfirmation('4826');
    expect(component.posPinValid()).toBeTrue();
    component.confirmSetPosPin();

    expect(confirmation.confirm).toHaveBeenCalled();
    expect(userService.setPosPin).toHaveBeenCalledOnceWith('user-1', '4826');
    expect(component.posPin()).toBe('');
    expect(component.posPinConfirmation()).toBe('');
    expect(JSON.stringify(component.users())).not.toContain('4826');

    response.next({
      userId: 'user-1',
      posPinConfigured: true,
      updatedAt: '2026-07-29T10:00:00.000Z'
    });
    response.complete();
    expect(component.selectedUser()?.posPinConfigured).toBeTrue();
    fixture.destroy();
  });

  it('requires confirmation before disabling the PIN', () => {
    user = { ...user, posPinConfigured: true };
    userService.getUsers.and.returnValue(of([user]));
    userService.disablePosPin.and.returnValue(
      of({
        userId: 'user-1',
        posPinConfigured: false,
        updatedAt: '2026-07-29T10:00:00.000Z'
      })
    );
    confirmation.confirm.and.callFake((options: Confirmation) => options.accept?.());
    const fixture = TestBed.createComponent(UsersComponent);
    fixture.detectChanges();
    fixture.componentInstance.selectUser(user);

    fixture.componentInstance.confirmDisablePosPin();

    expect(confirmation.confirm).toHaveBeenCalled();
    expect(userService.disablePosPin).toHaveBeenCalledOnceWith('user-1');
    expect(fixture.componentInstance.selectedUser()?.posPinConfigured).toBeFalse();
    fixture.destroy();
  });
});
